/**
 * Shared between the site, the panel and the server: what can be edited in the panel
 * and what the «Перезвоните мне» form sends (requests themselves are in booking.ts).
 */
import type { WorkHours } from './schedule.js';

/** Sections of src/config/site.ts the panel may override. */
export const CONTENT_KEYS = [
  'announcement',
  'hero',
  'pricing',
  'promos',
  'directions',
  'team',
  'founder',
  'care',
  'steps',
  'reviews',
  'faq',
  'contacts',
] as const;

export type ContentKey = (typeof CONTENT_KEYS)[number];

/** A photo the studio added to the page from the live editor, placed right after a block of text. */
export interface Insert {
  id: string;
  /** Section id the anchor lives in ("studio", "faq"…). */
  section: string;
  /** Normalised text of the block the photo goes after. */
  after: string;
  src: string;
  alt: string;
}

/**
 * Edits made right on the page (the live editor), on top of the section overrides:
 * - `free`: any wording not covered by a section, keyed "<area>::<original text>" → new text;
 * - `media`: photo key (its original file without size or extension, see liveLayer) → new URL, "" hides it;
 * - `inserts`: photos added after a block of text.
 */
export interface PageEdits {
  free: Record<string, string>;
  media: Record<string, string>;
  inserts: Insert[];
}
export const EMPTY_PAGE: PageEdits = { free: {}, media: {}, inserts: [] };

export type ContentOverrides = Partial<Record<ContentKey, unknown>> & {
  page?: PageEdits;
  /** Studio hours for the panel's schedule (Настройки). */
  hours?: WorkHours;
  updatedAt?: number;
};

export const isContentKey = (key: string): key is ContentKey => (CONTENT_KEYS as readonly string[]).includes(key);

/** Topics a visitor can pick in the callback form. */
export const TOPICS = [
  { id: 'trial', label: 'Пробное занятие' },
  { id: 'group', label: 'Групповые тренировки' },
  { id: 'personal', label: 'Индивидуальная тренировка' },
  { id: 'kids', label: 'Детская группа' },
  { id: 'care', label: 'Массаж и уход' },
  { id: 'other', label: 'Другой вопрос' },
] as const;
export type TopicId = (typeof TOPICS)[number]['id'];
export const topicLabel = (id: string) => TOPICS.find((t) => t.id === id)?.label ?? 'Другой вопрос';

export type NewRequestPayload = {
  name: string;
  phone: string;
  topic: string;
  comment?: string;
  consent: boolean;
  /** Honeypot: people never fill it, bots do. */
  website?: string;
};

/** Russian-style phone to +7XXXXXXXXXX; other countries keep their digits. Null when it cannot be a phone. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

/** +79104734253 → +7 (910) 473-42-53 */
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('7')) return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  return phone;
}

/** Links the panel may store: web, phone, mail or a path on this site. */
export const safeUrl = (value: string) => /^(https?:\/\/|tel:|mailto:|\/(?!\/))/i.test(value.trim());
