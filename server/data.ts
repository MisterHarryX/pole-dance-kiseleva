import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { put } from '@vercel/blob';
import type { ContentOverrides } from '../shared/content.js';
import { backend, dataPath, readJson, redis, requireStorage, withLock, writeJsonAtomic } from './store.js';

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
