import {
  EVENTS,
  STATUSES,
  TOPICS,
  isContentKey,
  normalizePhone,
  safeUrl,
  type CallbackRequest,
  type ContentOverrides,
  type EventType,
  type NewRequestPayload,
  type RequestStatus,
  type TopicId,
} from '../shared/content.js';
import { SESSION_COOKIE, checkPassword, clearLoginAttempts, createSessionToken, isAdminRequest, loginBlocked, noteFailedLogin } from './auth.js';
import {
  MAX_UPLOAD,
  acceptedType,
  addRequest,
  countEvent,
  deleteRequest,
  getOverrides,
  getStats,
  listRequests,
  newId,
  readMedia,
  saveOverrides,
  saveUpload,
  updateRequest,
} from './data.js';
import { adminConfigured, env } from './env.js';
import { allowedOrigin, clientIp, cookie, error, json, noContent, rateLimiter, readJsonBody, sameOrigin } from './http.js';
import { StorageUnavailableError, backend } from './store.js';

/**
 * All API routes. `route` is the path after /api/ ("admin/requests/abc").
 * Runs unchanged as a Vercel Function (api/index.ts) and inside the Vite dev server.
 */

const requestFlood = rateLimiter(5, 10 * 60_000);
const trackFlood = rateLimiter(60, 60_000);

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Drops links the panel must never store (javascript: and the like), recursively. */
function cleanLinks(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => cleanLinks(v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanLinks(v, k)]));
  }
  if (typeof value === 'string' && /^(href|link|src|photo|url)$/i.test(key) && value && !safeUrl(value)) return '';
  return value;
}

async function createCallback(request: Request) {
  if (!sameOrigin(request) && !allowedOrigin(request)) return error('origin', 403);
  if (requestFlood(clientIp(request))) return error('too_many', 429);
  const body = await readJsonBody<NewRequestPayload>(request, 4_000);
  if (!body) return error('bad_request', 400);
  if (text(body.website, 100)) return json({ ok: true }); // honeypot: pretend success
  const name = text(body.name, 80);
  const phone = normalizePhone(text(body.phone, 40));
  const topic = (TOPICS.some((t) => t.id === body.topic) ? body.topic : 'other') as TopicId;
  if (!name || !phone) return error('invalid', 422);
  if (body.consent !== true) return error('consent', 422);
  const item: CallbackRequest = { id: newId(), ts: Date.now(), name, phone, topic, comment: text(body.comment, 600) || undefined, status: 'new' };
  await addRequest(item);
  await countEvent('request').catch(() => {});
  return json({ ok: true }, { status: 201 });
}

async function admin(request: Request, parts: string[]): Promise<Response> {
  const method = request.method;
  const [, section, id] = parts;
  const secure = env.production;

  if (section === 'login' && method === 'POST') {
    if (!adminConfigured()) return error('not_configured', 503);
    if (!sameOrigin(request)) return error('origin', 403);
    const ip = clientIp(request);
    if (await loginBlocked(ip)) return error('blocked', 429);
    const body = await readJsonBody<{ password?: string }>(request, 1_000);
    if (!body?.password || !checkPassword(body.password)) {
      await noteFailedLogin(ip);
      return error('wrong_password', 401);
    }
    await clearLoginAttempts(ip);
    const { token, expires } = createSessionToken();
    return json({ ok: true }, { headers: { 'Set-Cookie': cookie(SESSION_COOKIE, token, { expires, httpOnly: true, secure }) } });
  }
  if (section === 'logout' && method === 'POST') {
    return json({ ok: true }, { headers: { 'Set-Cookie': cookie(SESSION_COOKIE, '', { maxAge: 0, httpOnly: true, secure }) } });
  }
  if (section === 'session' && method === 'GET') {
    return json({ authenticated: isAdminRequest(request), configured: adminConfigured(), storage: backend(), blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN) });
  }

  if (!isAdminRequest(request)) return error('unauthorized', 401);
  if (method !== 'GET' && !sameOrigin(request)) return error('origin', 403);

  if (section === 'content') {
    if (method === 'GET') return json(await getOverrides());
    if (method === 'PUT') {
      const body = await readJsonBody<ContentOverrides>(request, 400_000);
      if (!body || typeof body !== 'object') return error('bad_request', 400);
      const clean: ContentOverrides = {};
      for (const [key, value] of Object.entries(body)) {
        if (isContentKey(key) && value !== null && value !== undefined) clean[key] = cleanLinks(value);
      }
      return json(await saveOverrides(clean));
    }
  }

  if (section === 'requests') {
    if (!id && method === 'GET') return json(await listRequests());
    if (id && method === 'PATCH') {
      const body = await readJsonBody<{ status?: string; note?: string }>(request, 4_000);
      if (!body) return error('bad_request', 400);
      const patch: { status?: RequestStatus; note?: string } = {};
      if (body.status && STATUSES.some((s) => s.id === body.status)) patch.status = body.status as RequestStatus;
      if (typeof body.note === 'string') patch.note = text(body.note, 1_000);
      const updated = await updateRequest(id, patch);
      return updated ? json(updated) : error('not_found', 404);
    }
    if (id && method === 'DELETE') {
      await deleteRequest(id);
      return noContent();
    }
  }

  if (section === 'stats' && method === 'GET') {
    const days = Math.min(90, Math.max(7, Number(new URL(request.url).searchParams.get('days')) || 30));
    return json(await getStats(days));
  }

  if (section === 'upload' && method === 'POST') {
    const type = (request.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!acceptedType(type)) return error('type', 415);
    const data = new Uint8Array(await request.arrayBuffer());
    if (data.byteLength === 0 || data.byteLength > MAX_UPLOAD) return error('size', 413);
    return json({ url: await saveUpload(data, type) }, { status: 201 });
  }

  return error('not_found', 404);
}

/** Public routes the GitHub Pages copy calls from another origin. */
const PUBLIC = ['content', 'requests', 'track', 'media'];

export async function handle(request: Request, route: string): Promise<Response> {
  const parts = route.replace(/^\/+|\/+$/g, '').split('/');
  const cors = PUBLIC.includes(parts[0]) ? allowedOrigin(request) : null;
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: cors
        ? { 'Access-Control-Allow-Origin': cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
        : {},
    });
  }
  const response = await route_(request, parts);
  if (cors) {
    response.headers.set('Access-Control-Allow-Origin', cors);
    response.headers.append('Vary', 'Origin');
  }
  return response;
}

async function route_(request: Request, parts: string[]): Promise<Response> {
  const method = request.method;
  try {
    if (parts[0] === 'content' && method === 'GET') {
      // Not cached: an edit saved in the panel shows up on the next page load.
      return json(await getOverrides());
    }
    if (parts[0] === 'requests' && method === 'POST') return await createCallback(request);
    if (parts[0] === 'track' && method === 'POST') {
      if (isAdminRequest(request) || trackFlood(clientIp(request))) return noContent();
      const body = await readJsonBody<{ type?: string }>(request, 500);
      const type = body?.type as EventType;
      if (EVENTS.includes(type) && type !== 'request') await countEvent(type).catch(() => {});
      return noContent();
    }
    if (parts[0] === 'media' && method === 'GET' && parts[1]) {
      const file = await readMedia(parts[1]);
      if (!file) return error('not_found', 404);
      return new Response(Buffer.from(file.data), { headers: { 'Content-Type': file.type, 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    if (parts[0] === 'admin') return await admin(request, parts);
    return error('not_found', 404);
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) return error('storage', 503);
    console.error('[api]', cause);
    return error('server', 500);
  }
}
