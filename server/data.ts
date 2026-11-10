import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { put } from '@vercel/blob';
import { EVENTS, type CallbackRequest, type ContentOverrides, type DayStats, type EventType } from '../shared/content.js';
import { env } from './env.js';
import { backend, dataPath, readJson, redis, redisPipeline, requireStorage, withLock, writeJsonAtomic } from './store.js';

// --- Content edited in the panel ------------------------------------------------

const CONTENT_KEY = 'pdk:content';
const contentFile = () => dataPath('content.json');

export async function getOverrides(): Promise<ContentOverrides> {
  const b = backend();
  if (b === 'redis') {
    const raw = await redis<string | null>(['GET', CONTENT_KEY]);
    return raw ? (JSON.parse(raw) as ContentOverrides) : {};
  }
  if (b === 'files') return readJson<ContentOverrides>(contentFile(), {});
  return {};
}

export async function saveOverrides(overrides: ContentOverrides) {
  requireStorage();
  const value = { ...overrides, updatedAt: Date.now() };
  if (backend() === 'redis') await redis(['SET', CONTENT_KEY, JSON.stringify(value)]);
  else await withLock('content', () => writeJsonAtomic(contentFile(), value));
  return value;
}

// --- Callback requests ------------------------------------------------------------

const REQ_KEY = 'pdk:requests';
const reqFile = () => dataPath('requests.json');

export const newId = () => `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;

export async function listRequests(): Promise<CallbackRequest[]> {
  const b = backend();
  let list: CallbackRequest[] = [];
  if (b === 'redis') {
    const values = await redis<string[]>(['HVALS', REQ_KEY]);
    list = values.map((v) => JSON.parse(v) as CallbackRequest);
  } else if (b === 'files') {
    list = await readJson<CallbackRequest[]>(reqFile(), []);
  }
  return list.sort((a, b2) => b2.ts - a.ts);
}

export async function addRequest(request: CallbackRequest) {
  requireStorage();
  if (backend() === 'redis') {
    await redis(['HSET', REQ_KEY, request.id, JSON.stringify(request)]);
    return;
  }
  await withLock('requests', async () => {
    const list = await readJson<CallbackRequest[]>(reqFile(), []);
    list.push(request);
    await writeJsonAtomic(reqFile(), list);
  });
}

export async function updateRequest(id: string, patch: Partial<Pick<CallbackRequest, 'status' | 'note'>>) {
  requireStorage();
  if (backend() === 'redis') {
    const raw = await redis<string | null>(['HGET', REQ_KEY, id]);
    if (!raw) return null;
    const next = { ...(JSON.parse(raw) as CallbackRequest), ...patch };
    await redis(['HSET', REQ_KEY, id, JSON.stringify(next)]);
    return next;
  }
  return withLock('requests', async () => {
    const list = await readJson<CallbackRequest[]>(reqFile(), []);
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch };
    await writeJsonAtomic(reqFile(), list);
    return list[i];
  });
}

export async function deleteRequest(id: string) {
  requireStorage();
  if (backend() === 'redis') {
    await redis(['HDEL', REQ_KEY, id]);
    return;
  }
  await withLock('requests', async () => {
    const list = await readJson<CallbackRequest[]>(reqFile(), []);
    await writeJsonAtomic(
      reqFile(),
      list.filter((r) => r.id !== id),
    );
  });
}

// --- Daily counters ------------------------------------------------------------------

const dayOf = (ts = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: env.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts);
const statKey = (type: EventType, day: string) => `pdk:stat:${type}:${day}`;
const statsFile = () => dataPath('stats.json');

export async function countEvent(type: EventType) {
  const b = backend();
  const day = dayOf();
  if (b === 'redis') {
    await redisPipeline([
      ['INCR', statKey(type, day)],
      ['EXPIRE', statKey(type, day), 400 * 86_400],
    ]);
  } else if (b === 'files') {
    await withLock('stats', async () => {
      const all = await readJson<Record<string, Partial<Record<EventType, number>>>>(statsFile(), {});
      all[day] = { ...all[day], [type]: (all[day]?.[type] ?? 0) + 1 };
      await writeJsonAtomic(statsFile(), all);
    });
  }
}

export async function getStats(days = 30): Promise<DayStats[]> {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) list.push(dayOf(Date.now() - i * 86_400_000));
  const empty = (day: string): DayStats => ({ day, view: 0, book: 0, call: 0, request: 0 });
  const b = backend();
  if (b === 'redis') {
    const keys = list.flatMap((day) => EVENTS.map((t) => statKey(t, day)));
    const values = await redis<(string | null)[]>(['MGET', ...keys]);
    return list.map((day, i) => {
      const row = empty(day);
      EVENTS.forEach((t, j) => (row[t] = Number(values[i * EVENTS.length + j] ?? 0)));
      return row;
    });
  }
  if (b === 'files') {
    const all = await readJson<Record<string, Partial<Record<EventType, number>>>>(statsFile(), {});
    return list.map((day) => ({ ...empty(day), ...all[day] }));
  }
  return list.map(empty);
}

// --- Uploaded photos ------------------------------------------------------------------

export const MAX_UPLOAD = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };
const EXT_OF: Record<string, string> = Object.fromEntries(Object.entries(TYPES).map(([ext, type]) => [type, ext]));
export const acceptedType = (type: string) => EXT_OF[type] !== undefined;

/** Vercel Blob when its token is set, else Redis (a few small photos), else `.data/media/`. */
export async function saveUpload(data: Uint8Array, type: string): Promise<string> {
  requireStorage();
  const name = `${Date.now().toString(36)}-${randomBytes(5).toString('hex')}.${EXT_OF[type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`pole-dance-kiseleva/${name}`, Buffer.from(data), {
      access: 'public',
      contentType: type,
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    });
    return blob.url;
  }
  if (backend() === 'redis') {
    await redis(['SET', `pdk:media:${name}`, Buffer.from(data).toString('base64')]);
    return `/api/media/${name}`;
  }
  await fs.mkdir(dataPath('media'), { recursive: true });
  await fs.writeFile(dataPath('media', name), data);
  return `/api/media/${name}`;
}

export async function readMedia(name: string): Promise<{ data: Uint8Array; type: string } | null> {
  const match = /^[a-z0-9]+-[a-f0-9]{10}\.(webp|jpg|png)$/.exec(name);
  if (!match) return null;
  const type = TYPES[match[1]];
  try {
    if (backend() === 'redis') {
      const base64 = await redis<string | null>(['GET', `pdk:media:${name}`]);
      return base64 ? { data: Buffer.from(base64, 'base64'), type } : null;
    }
    return { data: await fs.readFile(dataPath('media', name)), type };
  } catch {
    return null;
  }
}
