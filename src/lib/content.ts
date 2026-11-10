import type { ContentKey, ContentOverrides } from '../../shared/content.ts';
import * as site from '../config/site.ts';
import { mediaUrl, serverUrl } from './paths.ts';

/** The objects in site.ts that the panel may override, by section key. */
export const targets: Record<ContentKey, object> = {
  announcement: site.announcement,
  hero: site.hero,
  pricing: site.pricing,
  promos: site.promos,
  directions: site.directions,
  team: site.team,
  founder: site.founder,
  care: site.care,
  steps: site.steps,
  reviews: site.reviews,
  faq: site.faq,
  contacts: site.contacts,
};

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/**
 * Merges an override into a default value. Objects merge key by key; arrays whose items
 * carry an `id` merge item by item (so photos and drawings of a direction stay), other arrays are replaced.
 */
export function mergeValue(base: unknown, value: unknown): unknown {
  if (Array.isArray(value)) {
    const baseList = Array.isArray(base) ? base : [];
    return value.map((item) => {
      if (isObj(item) && typeof item.id === 'string') {
        const match = baseList.find((b) => isObj(b) && b.id === item.id);
        return match ? mergeValue(match, item) : item;
      }
      return item;
    });
  }
  if (isObj(value) && isObj(base)) {
    const out: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(value)) out[k] = mergeValue(base[k], v);
    return out;
  }
  return value === undefined ? base : value;
}

/** Writes the merged result into the live object, so every import sees it. */
function assignInPlace(target: object, merged: unknown) {
  if (Array.isArray(target) && Array.isArray(merged)) {
    target.splice(0, target.length, ...merged);
    return;
  }
  if (isObj(merged)) Object.assign(target, merged);
}

/** Photo paths saved in the panel are relative to the Vercel copy; point them at the right place here. */
function resolveMedia(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => resolveMedia(v));
  if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveMedia(v, k)]));
  if (typeof value === 'string' && (key === 'src' || key === 'photo') && value.startsWith('/')) return mediaUrl(value);
  return value;
}

export function applyOverrides(overrides: ContentOverrides) {
  for (const [key, target] of Object.entries(targets) as [ContentKey, object][]) {
    const value = overrides[key];
    if (value === undefined || value === null) continue;
    try {
      assignInPlace(target, mergeValue(structuredClone(target), resolveMedia(value)));
    } catch {
      /* a broken section never takes the site down */
    }
  }
  // The phone link always follows the edited phone number.
  const digits = site.contacts.phone.replace(/\D/g, '');
  if (digits.length >= 10) site.contacts.phoneHref = `tel:+${digits.length === 10 ? `7${digits}` : digits.replace(/^8/, '7')}`;
}

/** Fetches the panel's edits; gives up quickly so a slow API never holds the first paint. */
export async function loadOverrides(timeout = 900): Promise<ContentOverrides | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(serverUrl('/api/content'), { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as ContentOverrides;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
