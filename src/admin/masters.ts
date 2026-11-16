import type { ContentOverrides } from '../../shared/content.ts';
import { mergeValue, targets } from '../lib/content.ts';
import type { Person } from '../config/site.ts';

/**
 * Trainers for the schedule (ISPANA's «мастера»): the studio's team as published in the panel.
 * The list is refreshed by the store whenever the published content changes.
 */
export interface Trainer {
  id: string;
  name: string;
}

const LETTERS: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** «Евгения Киселёва» → "evgeniya-kiseleva": a stable id that survives reordering the team. */
const slug = (name: string) =>
  [...name.toLowerCase()]
    .map((c) => LETTERS[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'trainer';

const pristineTeam = structuredClone(targets.team) as Person[];

export const MASTERS: Trainer[] = [];

/** Rebuilds the list from the published team (called by the store). */
export function syncMasters(overrides: ContentOverrides) {
  const team = (overrides.team === undefined ? pristineTeam : mergeValue(structuredClone(pristineTeam), overrides.team)) as Person[];
  const seen = new Set<string>();
  const list = team
    .filter((p) => p && typeof p.name === 'string' && p.name.trim())
    .map((p) => {
      let id = slug(p.name);
      while (seen.has(id)) id = `${id}-2`;
      seen.add(id);
      return { id, name: p.name.trim() };
    });
  MASTERS.splice(0, MASTERS.length, ...list);
}
syncMasters({});

/** One colour per trainer, so the calendar reads at a glance; «любой» stays neutral. */
const COLORS = ['#D4AF6A', '#C98F86', '#86B5A8', '#93ABD8', '#DDA27A', '#AE97D0', '#BAC47F', '#D99AB8', '#8EC1C9'];
const NEUTRAL = '#8F8C86';

export function masterColor(id: string | null | undefined): string {
  const i = MASTERS.findIndex((m) => m.id === id);
  return i === -1 ? NEUTRAL : COLORS[i % COLORS.length];
}

export function masterName(id: string | null | undefined): string {
  return MASTERS.find((m) => m.id === id)?.name ?? 'Любой тренер';
}

/** Short label for tight calendar blocks: «Евгения», «Анна». */
export const masterShort = (id: string | null | undefined) => masterName(id).split(' ')[0];
