import { TRACKED_EVENTS, type StoredEvent, type TrackPayload } from '../shared/analytics.js';
import { CONTACT_PREFS, STATUSES, type ContactPref, type RequestPatch } from '../shared/booking.js';
import { TOPICS, isContentKey, normalizePhone, safeUrl, type ContentOverrides, type Insert, type NewRequestPayload, type PageEdits } from '../shared/content.js';
import type { WorkHours } from '../shared/schedule.js';
import {
  SESSION_COOKIE,
  UI_COOKIE,
  checkPassword,
  clearLoginAttempts,
  createSessionToken,
  isAdminRequest,
  loginBlocked,
  noteFailedLogin,
} from './auth.js';
import { MAX_UPLOAD, acceptedType, getOverrides, readMedia, saveOverrides, saveUpload } from './data.js';
import { adminConfigured, env } from './env.js';
import { analyticsEnabled, deviceInfo, geoFromHeaders, recordEvent, visitorId } from './events.js';
import { allowedOrigin, clientIp, cookie, error, json, noContent, rateLimiter, readCookie, readJsonBody, sameOrigin, siteHost, siteOriginHosts } from './http.js';
import { readLogins, recordLogin } from './logins.js';
import { createRequest, deleteRequest, listRequests, updateRequest } from './requests.js';
import { getLiveCount, getStats, isRangeId } from './stats.js';
import { StorageUnavailableError, backend } from './store.js';

/**
 * All API routes. `route` is the path after /api/ ("admin/requests/abc").
 * Runs unchanged as a Vercel Function (api/index.ts) and inside the Vite dev server.
 */

const requestFlood = rateLimiter(5, 10 * 60_000);
const trackFlood = rateLimiter(120, 60_000);

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const optionalText = (value: unknown, max: number) => text(value, max) || undefined;
const finite = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Validates the studio hours sent from the panel's settings. */
function cleanHours(value: unknown): WorkHours | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const days = Array.isArray(v.days) ? [...new Set(v.days.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))].sort() : [];
  const start = text(v.start, 5);
  const end = text(v.end, 5);
  if (!isTime(start) || !isTime(end) || start >= end) return null;
  const slot = finite(v.slotMinutes);
  return { days, start, end, slotMinutes: slot === null ? 60 : Math.round(Math.min(Math.max(slot, 15), 240)) };
}

/** Fields the panel may change on a request (as in ISPANA). */
function cleanPatch(body: Record<string, unknown>): RequestPatch {
  const patch: RequestPatch = {};
  if (typeof body.status === 'string' && (STATUSES as readonly string[]).includes(body.status)) patch.status = body.status as RequestPatch['status'];
  if ('name' in body) patch.name = text(body.name, 80);
  if ('phone' in body) patch.phone = normalizePhone(text(body.phone, 30)) || text(body.phone, 30);
  if (typeof body.contactPref === 'string' && (CONTACT_PREFS as readonly string[]).includes(body.contactPref)) patch.contactPref = body.contactPref as ContactPref;
  if ('serviceId' in body) patch.serviceId = text(body.serviceId, 40) || null;
  if ('serviceTitle' in body) patch.serviceTitle = text(body.serviceTitle, 80) || null;
  if ('masterId' in body) patch.masterId = text(body.masterId, 40) || null;
  if ('question' in body) patch.question = text(body.question, 2000);
  if ('notes' in body) patch.notes = text(body.notes, 4000);
  if ('preferredAt' in body) patch.preferredAt = finite(body.preferredAt);
  if ('scheduledAt' in body) patch.scheduledAt = finite(body.scheduledAt);
  if ('durationMin' in body) patch.durationMin = Math.round(Math.min(Math.max(finite(body.durationMin) ?? 60, 10), 600));
  if ('price' in body) patch.price = finite(body.price) === null ? null : Math.max(0, Math.round(finite(body.price)!));
  if ('paid' in body) patch.paid = body.paid === true;
  if ('seen' in body) patch.seen = body.seen === true;
  return patch;
}

/** A request taken by phone or in a chat, added in the panel. */
async function createManual(body: Record<string, unknown>) {
  const name = text(body.name, 80);
  if (!name) return error('invalid', 422);
  const scheduledAt = finite(body.scheduledAt);
  const duration = finite(body.durationMin);
  const item = await createRequest({
    // Added with a time already agreed: straight to «Записана».
    status: scheduledAt ? 'scheduled' : 'in_progress',
    name,
    phone: normalizePhone(text(body.phone, 30)) || text(body.phone, 30),
    contactPref: (CONTACT_PREFS as readonly string[]).includes(body.contactPref as string) ? (body.contactPref as ContactPref) : 'call',
    serviceId: text(body.serviceId, 40) || null,
    serviceTitle: text(body.serviceTitle, 80) || null,
    masterId: text(body.masterId, 40) || null,
    question: text(body.question, 2000),
    preferredAt: null,
    scheduledAt,
    durationMin: duration ? Math.round(Math.min(Math.max(duration, 10), 600)) : 60,
    price: finite(body.price),
    paid: false,
    notes: text(body.notes, 4000),
    source: 'manual',
    seen: true,
  });
  return json({ item }, { status: 201 });
}

/** Drops links the panel must never store (javascript: and the like), recursively. */
function cleanLinks(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => cleanLinks(v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanLinks(v, k)]));
  }
  if (typeof value === 'string' && /^(href|link|src|photo|url)$/i.test(key) && value && !safeUrl(value)) return '';
  return value;
}

const isImageUrl = (value: string) => /^\/api\/media\/[\w.-]+$/.test(value) || /^\/(photos|team)\/[\w./-]+$/.test(value) || /^https:\/\/[\w.-]+\/[^\s"'<>]+$/.test(value);

/** Free texts, photo swaps and inserted photos from the live editor, each checked and capped. */
function cleanPageEdits(raw: unknown): PageEdits {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Partial<PageEdits>;
  const free: PageEdits['free'] = {};
  for (const [key, value] of Object.entries(body.free ?? {}).slice(0, 600)) {
    const k = text(key, 460);
    if (k.length >= 1 && typeof value === 'string') free[k] = value.slice(0, 2000);
  }
  const media: PageEdits['media'] = {};
  for (const [key, value] of Object.entries(body.media ?? {}).slice(0, 200)) {
    const k = text(key, 300);
    if (!/^(slot:[\w-]+|\/[\w./%-]+)$/.test(k) || typeof value !== 'string') continue;
    // "" hides the photo; anything else must be one of our files or an https image.
    if (value === '' || isImageUrl(value)) media[k] = value;
  }
  const inserts: Insert[] = [];
  for (const item of (Array.isArray(body.inserts) ? body.inserts : []).slice(0, 60) as Partial<Insert>[]) {
    if (!item || typeof item !== 'object') continue;
    const src = text(item.src, 500);
    const section = text(item.section, 40);
    const after = text(item.after, 400);
    if (!isImageUrl(src) || !/^[\w-]+$/.test(section) || !after) continue;
    inserts.push({ id: text(item.id, 40) || `i${inserts.length}`, section, after, src, alt: text(item.alt, 200) });
  }
  return { free, media, inserts };
}

function referrerHost(ref: string | undefined, ownHost: string | null) {
  if (!ref) return undefined;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '');
    const own = [ownHost?.split(':')[0].replace(/^www\./, ''), ...siteOriginHosts()];
    return host && !own.includes(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

/** Stores one analytics event: device and country worked out here, no IP and no cookie kept. */
async function track(request: Request, body: Pick<TrackPayload, 'type'> & Partial<TrackPayload>) {
  if (!analyticsEnabled() || isAdminRequest(request)) return;
  const ua = request.headers.get('user-agent') ?? '';
  const device = deviceInfo(ua, typeof body.touch === 'number' ? body.touch : 0);
  if (device.isBot) return;
  const geo = geoFromHeaders(request);
  const event: StoredEvent = {
    ts: Date.now(),
    type: body.type,
    v: await visitorId(clientIp(request), ua),
    path: optionalText(body.path, 200),
    country: optionalText(geo.country, 2)?.toUpperCase(),
    city: optionalText(geo.city, 80),
    os: device.os,
    device: device.device,
    browser: device.browser,
    ref: referrerHost(optionalText(body.ref, 500), siteHost(request)),
    utm: optionalText(body.utm, 60)?.toLowerCase(),
    lang: optionalText(body.lang, 20),
    tz: optionalText(body.tz, 60),
    sw: typeof body.sw === 'number' ? Math.round(Math.min(Math.max(body.sw, 0), 10_000)) : undefined,
    place: optionalText(body.place, 40),
    dur: typeof body.dur === 'number' ? Math.round(Math.min(Math.max(body.dur, 0), 6 * 3600)) : undefined,
    seen: Array.isArray(body.seen) ? body.seen.filter((id): id is string => typeof id === 'string').slice(0, 20).map((id) => id.slice(0, 40)) : undefined,
  };
  await recordEvent(event).catch((cause) => console.error('[track] could not store event', cause));
}

async function createCallback(request: Request) {
  if (!sameOrigin(request) && !allowedOrigin(request)) return error('origin', 403);
  if (requestFlood(clientIp(request))) return error('too_many', 429);
  const body = await readJsonBody<NewRequestPayload>(request, 4_000);
  if (!body) return error('bad_request', 400);
  if (text(body.website, 100)) return json({ ok: true }); // honeypot: pretend success
  const name = text(body.name, 80);
  const phone = normalizePhone(text(body.phone, 40));
  const topic = TOPICS.find((t) => t.id === body.topic) ?? TOPICS.find((t) => t.id === 'other')!;
  if (!name || !phone) return error('invalid', 422);
  if (body.consent !== true) return error('consent', 422);
  await createRequest({
    status: 'new',
    name,
    phone,
    contactPref: 'call',
    serviceId: topic.id,
    serviceTitle: topic.label,
    masterId: null,
    question: text(body.comment, 600),
    preferredAt: null,
    scheduledAt: null,
    durationMin: 60,
    price: null,
    paid: false,
    notes: '',
    source: 'site',
  });
  await track(request, { type: 'request', place: 'contacts' });
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
      await recordLogin(request, false);
      // A short pause makes guessing slower without bothering a real person.
      await new Promise((resolve) => setTimeout(resolve, 400));
      return error('wrong_password', 401);
    }
    await clearLoginAttempts(ip);
    await recordLogin(request, true);
    const { token, expires } = createSessionToken();
    const headers = new Headers();
    headers.append('Set-Cookie', cookie(SESSION_COOKIE, token, { expires, httpOnly: true, secure }));
    headers.append('Set-Cookie', cookie(UI_COOKIE, '1', { expires, secure }));
    return json({ ok: true }, { headers });
  }
  if (section === 'logout' && method === 'POST') {
    const headers = new Headers();
    headers.append('Set-Cookie', cookie(SESSION_COOKIE, '', { maxAge: 0, httpOnly: true, secure }));
    headers.append('Set-Cookie', cookie(UI_COOKIE, '', { maxAge: 0, secure }));
    return json({ ok: true }, { headers });
  }
  if (section === 'session' && method === 'GET') {
    const signedIn = isAdminRequest(request);
    // Sessions opened before the on-site editor existed have no hint cookie:
    // give it back, so "Редактировать сайт" works without signing in again.
    const headers = new Headers();
    if (signedIn && readCookie(request, UI_COOKIE) !== '1') {
      const expires = Number(readCookie(request, SESSION_COOKIE)?.split('.')[0]);
      headers.append('Set-Cookie', cookie(UI_COOKIE, '1', { expires: new Date(expires), secure }));
    }
    return json({
      authenticated: signedIn,
      configured: adminConfigured(),
      storage: backend(),
      blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      analytics: analyticsEnabled(),
      tz: env.tz,
    }, { headers });
  }

  if (!isAdminRequest(request)) return error('unauthorized', 401);
  if (method !== 'GET' && !sameOrigin(request)) return error('origin', 403);

  if (section === 'status' && method === 'GET') {
    const media = process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : backend();
    return json({ backend: backend(), media, tz: env.tz, analytics: analyticsEnabled() });
  }

  if (section === 'content') {
    if (method === 'GET') return json(await getOverrides());
    if (method === 'PUT') {
      const body = await readJsonBody<ContentOverrides>(request, 400_000);
      if (!body || typeof body !== 'object') return error('bad_request', 400);
      const clean: ContentOverrides = {};
      for (const [key, value] of Object.entries(body)) {
        if (isContentKey(key) && value !== null && value !== undefined) clean[key] = cleanLinks(value);
      }
      if (body.page) clean.page = cleanPageEdits(body.page);
      // Hours stay as they are unless the panel sends new valid ones (the live editor never touches them).
      const hours = body.hours === undefined ? (await getOverrides()).hours : cleanHours(body.hours);
      if (hours) clean.hours = hours;
      return json(await saveOverrides(clean));
    }
  }

  if (section === 'requests') {
    if (!id && method === 'GET') return json({ items: await listRequests(), now: Date.now() });
    if (!id && method === 'POST') {
      const body = await readJsonBody<Record<string, unknown>>(request, 12_000);
      return body ? await createManual(body) : error('bad_request', 400);
    }
    if (id && method === 'PATCH') {
      const body = await readJsonBody<Record<string, unknown>>(request, 12_000);
      if (!body) return error('bad_request', 400);
      const item = await updateRequest(id, cleanPatch(body));
      return item ? json({ item }) : error('not_found', 404);
    }
    if (id && method === 'DELETE') return (await deleteRequest(id)) ? json({ ok: true }) : error('not_found', 404);
  }

  if (section === 'stats' && method === 'GET') {
    const range = new URL(request.url).searchParams.get('range');
    return json(await getStats(isRangeId(range) ? range : '7d'));
  }
  if (section === 'live' && method === 'GET') return json({ live: await getLiveCount() });
  if (section === 'logins' && method === 'GET') return json({ items: await readLogins() });
  if (section === 'export' && method === 'GET') {
    const day = new Date().toISOString().slice(0, 10);
    const data = { exportedAt: new Date().toISOString(), requests: await listRequests(), content: await getOverrides() };
    return json(data, { headers: { 'Content-Disposition': `attachment; filename="pole-dance-kiseleva-${day}.json"` } });
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

/** The form request is counted by the server itself, never on the browser's word. */
const TRACKABLE = new Set<string>(TRACKED_EVENTS.filter((t) => t !== 'request'));

async function route_(request: Request, parts: string[]): Promise<Response> {
  const method = request.method;
  try {
    if (parts[0] === 'content' && method === 'GET') {
      // Not cached: an edit saved in the panel shows up on the next page load.
      return json(await getOverrides());
    }
    if (parts[0] === 'requests' && method === 'POST') return await createCallback(request);
    if (parts[0] === 'track' && method === 'POST') {
      if (trackFlood(clientIp(request))) return noContent();
      const body = await readJsonBody<TrackPayload>(request, 4_000);
      if (body && TRACKABLE.has(body.type)) await track(request, body);
      return noContent();
    }
    if (parts[0] === 'media' && method === 'GET' && parts[1]) {
      const file = await readMedia(parts[1]);
      if (!file) return error('not_found', 404);
      return new Response(Buffer.from(file.data), {
        headers: { 'Content-Type': file.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
      });
    }
    if (parts[0] === 'admin') return await admin(request, parts);
    return error('not_found', 404);
  } catch (cause) {
    if (cause instanceof StorageUnavailableError) return error('storage', 503);
    console.error('[api]', cause);
    return error('server', 500);
  }
}
