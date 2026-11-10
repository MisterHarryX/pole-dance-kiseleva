import type { CallbackRequest, ContentOverrides, DayStats, RequestStatus } from '../../shared/content.ts';

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...init });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError((data as { error?: string }).error ?? 'server', response.status);
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export type Session = { authenticated: boolean; configured: boolean; storage: 'redis' | 'files' | 'none'; blob: boolean };

export const api = {
  session: () => call<Session>('admin/session'),
  login: (password: string) => call<{ ok: true }>('admin/login', jsonInit('POST', { password })),
  logout: () => call<{ ok: true }>('admin/logout', { method: 'POST' }),
  content: () => call<ContentOverrides>('admin/content'),
  saveContent: (overrides: ContentOverrides) => call<ContentOverrides>('admin/content', jsonInit('PUT', overrides)),
  requests: () => call<CallbackRequest[]>('admin/requests'),
  updateRequest: (id: string, patch: { status?: RequestStatus; note?: string }) => call<CallbackRequest>(`admin/requests/${id}`, jsonInit('PATCH', patch)),
  deleteRequest: (id: string) => call<void>(`admin/requests/${id}`, { method: 'DELETE' }),
  stats: (days: number) => call<DayStats[]>(`admin/stats?days=${days}`),
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

export function errorText(e: unknown) {
  const code = e instanceof ApiError ? e.code : 'network';
  const texts: Record<string, string> = {
    wrong_password: 'Неверный пароль',
    blocked: 'Слишком много попыток. Подождите 15 минут',
    not_configured: 'Пароль кабинета не задан на сервере (ADMIN_PASSWORD)',
    storage: 'Хранилище не подключено: на Vercel подключите Upstash Redis',
    unauthorized: 'Сессия истекла — войдите снова',
    type: 'Можно загрузить только JPG, PNG или WebP',
    size: 'Файл слишком большой (до 4 МБ)',
    network: 'Нет связи с сервером',
  };
  return texts[code] ?? 'Что-то пошло не так, попробуйте ещё раз';
}
