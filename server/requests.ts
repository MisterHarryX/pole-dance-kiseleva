import { randomBytes } from 'node:crypto';
import { upgradeRequest, type BookingRequest, type RequestPatch } from '../shared/booking.js';
import { backend, dataPath, readJson, redis, requireStorage, withLock, writeJsonAtomic } from './store.js';

/**
 * Requests, as in ISPANA. Redis keeps them in one hash (id → JSON); without Redis they live
 * in `.data/requests.json`. Volumes are small, so whole-list reads are fine.
 * Records from the old «Перезвоните мне» list (an array in the file, the same hash in Redis)
 * are read through `upgradeRequest` and saved in the new shape on their next change.
 */
const HASH = 'pdk:requests';
const FILE = () => dataPath('requests.json');

type FileShape = { items: BookingRequest[] };

const newId = () => `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;

async function readFile(): Promise<BookingRequest[]> {
  const raw = await readJson<FileShape | unknown[]>(FILE(), { items: [] });
  const list: unknown[] = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
  return list.map(upgradeRequest).filter((r): r is BookingRequest => r !== null);
}

async function readAll(): Promise<BookingRequest[]> {
  requireStorage();
  if (backend() === 'redis') {
    const flat = (await redis<string[] | null>(['HGETALL', HASH])) ?? [];
    const items: BookingRequest[] = [];
    for (let i = 1; i < flat.length; i += 2) {
      try {
        const item = upgradeRequest(JSON.parse(flat[i]));
        if (item) items.push(item);
      } catch {
        // Skip a damaged entry rather than hiding every request.
      }
    }
    return items;
  }
  return readFile();
}

export async function listRequests() {
  if (backend() === 'none') return [];
  return (await readAll()).sort((a, b) => b.createdAt - a.createdAt);
}

async function save(item: BookingRequest) {
  if (backend() === 'redis') {
    await redis(['HSET', HASH, item.id, JSON.stringify(item)]);
    return;
  }
  await withLock('requests', async () => {
    const items = await readFile();
    const index = items.findIndex((r) => r.id === item.id);
    if (index === -1) items.push(item);
    else items[index] = item;
    await writeJsonAtomic(FILE(), { items } satisfies FileShape);
  });
}

export async function getRequest(id: string) {
  requireStorage();
  if (backend() === 'redis') {
    const raw = await redis<string | null>(['HGET', HASH, id]);
    return raw ? upgradeRequest(JSON.parse(raw)) : null;
  }
  return (await readFile()).find((r) => r.id === id) ?? null;
}

export type NewRequest = Omit<BookingRequest, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'completedAt' | 'seen'> & Partial<Pick<BookingRequest, 'seen'>>;

export async function createRequest(data: NewRequest) {
  requireStorage();
  const now = Date.now();
  const item: BookingRequest = {
    ...data,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    seen: data.seen ?? false,
    completedAt: data.status === 'done' ? now : null,
    history: [{ ts: now, status: data.status }],
  };
  await save(item);
  return item;
}

export async function updateRequest(id: string, patch: RequestPatch) {
  requireStorage();
  const current = await getRequest(id);
  if (!current) return null;
  const now = Date.now();
  const next: BookingRequest = { ...current, ...patch, id, updatedAt: now };
  if (patch.status && patch.status !== current.status) {
    next.history = [...current.history, { ts: now, status: patch.status }].slice(-40);
    next.completedAt = patch.status === 'done' ? now : patch.status === 'cancelled' ? (current.completedAt ?? now) : null;
  }
  await save(next);
  return next;
}

export async function deleteRequest(id: string) {
  requireStorage();
  if (backend() === 'redis') {
    return (await redis<number>(['HDEL', HASH, id])) > 0;
  }
  return withLock('requests', async () => {
    const items = await readFile();
    const left = items.filter((r) => r.id !== id);
    await writeJsonAtomic(FILE(), { items: left } satisfies FileShape);
    return left.length < items.length;
  });
}
