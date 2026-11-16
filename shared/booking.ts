/**
 * Requests in the panel, shared by the site form, the panel and the server (as in ISPANA).
 * Times are epoch milliseconds; wall-clock dates and times are in the studio's time zone
 * (ADMIN_TZ, Moscow by default).
 */
import { TOPICS, formatPhone, normalizePhone } from './content.js';

export { formatPhone, normalizePhone };

export const STATUSES = ['new', 'in_progress', 'scheduled', 'done', 'cancelled'] as const;
export type RequestStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  scheduled: 'Записана',
  done: 'Завершена',
  cancelled: 'Отменена',
};

/** How the client would like to be contacted back. */
export const CONTACT_PREFS = ['call', 'telegram', 'whatsapp'] as const;
export type ContactPref = (typeof CONTACT_PREFS)[number];

export const CONTACT_PREF_LABELS: Record<ContactPref, string> = {
  call: 'Звонок',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};

export interface HistoryEntry {
  ts: number;
  status: RequestStatus;
}

export interface BookingRequest {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: RequestStatus;
  name: string;
  /** "+7XXXXXXXXXX"-style digits with a leading plus. */
  phone: string;
  contactPref: ContactPref;
  /** Format of the session (see src/admin/services.ts); the site form sends its topic here. */
  serviceId: string | null;
  /** Format title at the time of the request, kept even if the format is renamed. */
  serviceTitle: string | null;
  /** Trainer set in the panel (src/admin/masters.ts); null — any. */
  masterId?: string | null;
  question: string;
  /** What the client asked for: a date and time in the studio's time zone. */
  preferredAt: number | null;
  /** Confirmed session. */
  scheduledAt: number | null;
  durationMin: number;
  price: number | null;
  paid: boolean;
  /** Private notes, never shown to the client. */
  notes: string;
  /** "site" for the «Перезвоните мне» form, "manual" when added in the panel. */
  source: 'site' | 'manual';
  /** Has the studio opened it in the panel yet. */
  seen: boolean;
  completedAt: number | null;
  history: HistoryEntry[];
}

/** Fields the panel may change. */
export type RequestPatch = Partial<
  Pick<
    BookingRequest,
    'status' | 'name' | 'phone' | 'contactPref' | 'serviceId' | 'serviceTitle' | 'masterId' | 'question' | 'preferredAt' | 'scheduledAt' | 'durationMin' | 'price' | 'paid' | 'notes' | 'seen'
  >
>;

/** A request saved before the panel moved to the ISPANA model: «Перезвоните мне» with three statuses. */
interface LegacyRequest {
  id: string;
  ts: number;
  name: string;
  phone: string;
  topic?: string;
  comment?: string;
  status?: string;
  note?: string;
}

const LEGACY_STATUS: Record<string, RequestStatus> = { new: 'new', work: 'in_progress', done: 'done' };

/** Reads either shape; old records are upgraded in memory and saved in the new shape on the next change. */
export function upgradeRequest(raw: unknown): BookingRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<BookingRequest> & Partial<LegacyRequest>;
  if (typeof value.id !== 'string') return null;
  if (typeof value.createdAt === 'number') return value as BookingRequest;
  const old = value as LegacyRequest;
  const ts = typeof old.ts === 'number' ? old.ts : Date.now();
  const status = LEGACY_STATUS[old.status ?? ''] ?? 'new';
  const topic = TOPICS.find((t) => t.id === old.topic);
  return {
    id: old.id,
    createdAt: ts,
    updatedAt: ts,
    status,
    name: old.name ?? '',
    phone: old.phone ?? '',
    contactPref: 'call',
    serviceId: topic?.id ?? null,
    serviceTitle: topic?.label ?? null,
    masterId: null,
    question: old.comment ?? '',
    preferredAt: null,
    scheduledAt: null,
    durationMin: 60,
    price: null,
    paid: false,
    notes: old.note ?? '',
    source: 'site',
    seen: status !== 'new',
    completedAt: status === 'done' ? ts : null,
    history: [{ ts, status }],
  };
}
