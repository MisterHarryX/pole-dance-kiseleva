import type { LoginEntry, RangeId, Stats } from '../../shared/analytics.ts';
import type { BookingRequest, RequestPatch } from '../../shared/booking.ts';
import type { ContentOverrides } from '../../shared/content.ts';

/** Panel calls to /api/admin/* (as in ISPANA). A 401 anywhere means the session ended. */

export class Unauthorized extends Error {}

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...init,
    headers: typeof init.body === 'string' ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
  });
  if (response.status === 401 && path !== 'admin/login') throw new Unauthorized('unauthorized');
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new ApiError(body.error ?? 'server', response.status);
  return body;
}

export type { LoginEntry };

export interface Status {
  backend: 'redis' | 'files' | 'none';
  media: 'blob' | 'redis' | 'files' | 'none';
  tz: string;
  analytics: boolean;
}

export const adminApi = {
  session: () => call<{ authenticated: boolean; configured: boolean }>('admin/session'),
  login: (password: string) => call<{ ok: true }>('admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => call<{ ok: true }>('admin/logout', { method: 'POST' }),
  status: () => call<Status>('admin/status'),
  requests: () => call<{ items: BookingRequest[]; now: number }>('admin/requests'),
  create: (data: Record<string, unknown>) => call<{ item: BookingRequest }>('admin/requests', { method: 'POST', body: JSON.stringify(data) }),
  patch: (id: string, patch: RequestPatch) => call<{ item: BookingRequest }>(`admin/requests/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => call<{ ok: true }>(`admin/requests/${id}`, { method: 'DELETE' }),
  stats: (range: RangeId) => call<Stats>(`admin/stats?range=${range}`),
  live: () => call<{ live: number }>('admin/live'),
  logins: () => call<{ items: LoginEntry[] }>('admin/logins'),
  content: () => call<ContentOverrides>('admin/content'),
  saveContent: (data: ContentOverrides) => call<ContentOverrides>('admin/content', { method: 'PUT', body: JSON.stringify(data) }),
  upload: (file: Blob) => call<{ url: string }>('admin/upload', { method: 'POST', headers: { 'Content-Type': file.type }, body: file }),
};

/** Shrinks a photo in the browser (max side `max`, WebP) before upload; returns the blob and its size. */
export async function shrinkImage(file: File, max = 1400): Promise<{ blob: Blob; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob>((done, fail) => canvas.toBlob((b) => (b ? done(b) : fail(new Error('encode'))), 'image/webp', 0.86));
  return { blob, w, h };
}

export const ERROR_TEXT: Record<string, string> = {
  wrong_password: 'Пароль не подошёл.',
  blocked: 'Слишком много попыток. Подождите пятнадцать минут.',
  not_configured: 'Пароль не задан: добавьте ADMIN_PASSWORD в переменные окружения (локально — в файл .env.local).',
  storage: 'Хранилище не подключено. Откройте «Настройки», там написано, что сделать.',
  unauthorized: 'Сессия закончилась — войдите снова.',
  invalid: 'Заполните имя.',
  type: 'Можно загрузить только JPG, PNG или WebP.',
  size: 'Файл слишком большой (до 4 МБ).',
  network: 'Нет связи с сервером.',
};

export function errorText(cause: unknown) {
  const code = cause instanceof ApiError || cause instanceof Unauthorized ? cause.message : 'network';
  return ERROR_TEXT[code] ?? 'Что-то пошло не так, попробуйте ещё раз.';
}
