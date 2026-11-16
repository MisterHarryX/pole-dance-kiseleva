import type { ContentKey, ContentOverrides } from '../../shared/content.ts';
import { pick, sections, type Field } from '../admin/schema.ts';
import { mergeValue, pristine } from '../lib/content.ts';

/**
 * Texts the cabinet's form knows about (src/admin/schema.ts), flattened to paths like
 * "hero.lead" or "faq.2.a". The live editor recognises them on the page and saves them
 * back into the same section overrides the form uses, so both always agree.
 */
export interface Entry {
  path: string;
  section: ContentKey;
  /** "Вопросы · Можно ли без подготовки? · Ответ" */
  label: string;
  value: string;
}

type Obj = Record<string, unknown>;

const looksLikeLink = (value: string) => /^(https?:|tel:|mailto:|\/)/i.test(value.trim());

/** A section as the site shows it: code defaults with published overrides on top. */
export function sectionValue(key: ContentKey, overrides: ContentOverrides | null | undefined): unknown {
  const base = structuredClone(pristine[key]);
  const value = overrides?.[key];
  return value === undefined || value === null ? base : mergeValue(base, structuredClone(value));
}

function walkFields(value: unknown, fields: Field[], path: string[], labels: string[], out: Entry[], section: ContentKey, links: boolean): void {
  if (fields.length === 1 && fields[0].key === '') return walkField(value, fields[0], path, labels, out, section, links);
  for (const field of fields) walkField((value as Obj | undefined)?.[field.key], field, [...path, field.key], labels, out, section, links);
}

function walkField(value: unknown, field: Field, path: string[], labels: string[], out: Entry[], section: ContentKey, links: boolean): void {
  const add = (v: unknown, p: string[], label: string) => {
    if (typeof v !== 'string' || !v.trim()) return;
    if (looksLikeLink(v) !== links) return;
    out.push({ path: [section, ...p].join('.'), section, label: [...labels, label].filter(Boolean).join(' · '), value: v });
  };
  switch (field.kind) {
    case 'text':
    case 'textarea':
      return add(value, path, field.label);
    case 'strings':
      if (Array.isArray(value)) value.forEach((v, i) => add(v, [...path, String(i)], `${field.label} · ${i + 1}`));
      return;
    case 'list':
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          const title = field.title ? field.title(item as Obj, i) : `${field.label} ${i + 1}`;
          walkFields(item, field.item, [...path, String(i)], [...labels, title.length > 48 ? `${title.slice(0, 46)}…` : title], out, section, links);
        });
      }
      return;
    case 'group':
      return walkFields(value, field.fields, path, [...labels, field.label], out, section, links);
    default:
      return; // numbers, switches and photos are edited in the cabinet's form
  }
}

/** Every editable text of every section (or every link, with `links`). */
export function entriesOf(overrides: ContentOverrides | null | undefined, links = false): Entry[] {
  const out: Entry[] = [];
  for (const section of sections) {
    const value = pick(sectionValue(section.key, overrides), section.fields);
    walkFields(value, section.fields, [], [], out, section.key, links);
  }
  return out;
}

export const sectionTitle = (key: string) => sections.find((s) => s.key === key)?.title ?? key;

function setIn(target: unknown, keys: string[], value: string) {
  let node = target as Obj;
  for (const key of keys.slice(0, -1)) {
    if (!node || typeof node !== 'object') return;
    node = node[key] as Obj;
  }
  if (node && typeof node === 'object') node[keys[keys.length - 1]] = value;
}

/**
 * Folds text edits ("faq.2.a" → value) into section overrides, keeping each section in the
 * shape the cabinet's form saves (only its declared fields).
 */
export function withTextEdits(overrides: ContentOverrides, edits: Record<string, string>): ContentOverrides {
  const next: ContentOverrides = { ...overrides };
  const bySection = new Map<ContentKey, [string[], string][]>();
  for (const [path, value] of Object.entries(edits)) {
    const [key, ...rest] = path.split('.');
    const list = bySection.get(key as ContentKey) ?? [];
    list.push([rest, value]);
    bySection.set(key as ContentKey, list);
  }
  for (const [key, list] of bySection) {
    const section = sections.find((s) => s.key === key);
    if (!section) continue;
    const value = sectionValue(key, overrides);
    for (const [rest, text] of list) {
      if (rest.length === 0) continue;
      setIn(value, rest, text);
    }
    next[key] = pick(value, section.fields);
  }
  return next;
}
