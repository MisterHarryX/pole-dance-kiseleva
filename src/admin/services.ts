import { TOPICS } from '../../shared/content.ts';
import type { ContentOverrides } from '../../shared/content.ts';
import { mergeValue, targets } from '../lib/content.ts';
import type { pricing as Pricing } from '../config/site.ts';

/**
 * Session formats for requests (ISPANA's «услуги»): the topics of the «Перезвоните мне» form,
 * with prices taken from the published price list, so the archive adds up.
 */
export interface Service {
  id: string;
  title: string;
  price: number | null;
  minutes: number;
}

const pristinePricing = structuredClone(targets.pricing) as typeof Pricing;

/** "3 000 ₽" → 3000; "2 000 + 2 000 ₽" → 2000. */
const amount = (value: unknown) => {
  if (typeof value === 'number') return value;
  const digits = typeof value === 'string' ? /\d[\d\s ]*/.exec(value)?.[0].replace(/\D/g, '') : '';
  return digits ? Number(digits) : null;
};

/** Row «Разовая тренировка» of an individual price table. */
const single = (table: (typeof Pricing)['personal'][number] | undefined) => amount(table?.rows.find((r) => /разов/i.test(r.label))?.price ?? table?.rows[0]?.price);

export function buildServices(overrides: ContentOverrides): Service[] {
  const p = (overrides.pricing === undefined ? pristinePricing : mergeValue(structuredClone(pristinePricing), overrides.pricing)) as typeof Pricing;
  const topic = (id: string) => TOPICS.find((t) => t.id === id)?.label ?? id;
  const [coach, founder] = p.personal ?? [];
  return [
    { id: 'trial', title: topic('trial'), price: amount(p.trial?.paid), minutes: 60 },
    { id: 'group', title: `${topic('group')} · ${p.base?.title ?? 'BASE'}`, price: amount(p.base?.single), minutes: 60 },
    { id: 'group-vip', title: `${topic('group')} · ${p.vip?.title ?? 'VIP'}`, price: amount(p.vip?.single), minutes: 60 },
    { id: 'personal', title: topic('personal'), price: single(coach), minutes: 60 },
    ...(founder ? [{ id: 'personal-founder', title: `Индивидуальная · ${founder.title.replace(/^С\s+/i, 'с ')}`, price: single(founder), minutes: 60 }] : []),
    { id: 'kids', title: topic('kids'), price: null, minutes: 60 },
    { id: 'care', title: topic('care'), price: null, minutes: 60 },
    { id: 'other', title: topic('other'), price: null, minutes: 30 },
  ];
}
