import { normalize } from '../lib/liveLayer.ts';

/**
 * DOM helpers for live text editing (ported from ISPANA). The page is React-rendered;
 * only text node values are touched, and a reload after publishing re-renders it cleanly.
 */

const insideAdminUi = (node: Node) => Boolean(node.parentElement?.closest('[data-site-admin], script, style, noscript, title, svg'));

/** Every text node on the page whose text equals `value` (whitespace-insensitive). */
export function findTextNodes(value: string, area?: (node: Text) => boolean): Text[] {
  const target = normalize(value);
  if (!target) return [];
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (normalize(node.nodeValue ?? '') === target && !insideAdminUi(node) && (!area || area(node as Text))) nodes.push(node as Text);
  }
  return nodes;
}

/** Replaces a node's text but keeps the whitespace JSX left around it. */
function setNodeText(node: Text, original: string, value: string) {
  const lead = /^\s*/.exec(original)?.[0] ?? '';
  const trail = /\s*$/.exec(original)?.[0] ?? '';
  node.nodeValue = `${lead}${value}${trail}`;
}

export type CapturedText = { node: Text; original: string }[];

/** Remembers the nodes showing `value` and their exact text, for preview and cancel. */
export const captureText = (value: string, area?: (node: Text) => boolean): CapturedText =>
  findTextNodes(value, area).map((node) => ({ node, original: node.nodeValue ?? '' }));

export function previewText(captured: CapturedText, value: string) {
  for (const { node, original } of captured) setNodeText(node, original, value);
}

export function restoreText(captured: CapturedText) {
  for (const { node, original } of captured) node.nodeValue = original;
}

/** Swaps every on-page occurrence of `from` for `to`. */
export function replaceOnPage(from: string, to: string) {
  for (const node of findTextNodes(from)) setNodeText(node, node.nodeValue ?? '', to);
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/** The text node actually under the pointer (not merely the nearest caret position). */
export function textNodeAt(x: number, y: number): Text | null {
  const doc = document as CaretDocument;
  const node = doc.caretPositionFromPoint ? doc.caretPositionFromPoint(x, y)?.offsetNode : doc.caretRangeFromPoint?.(x, y)?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE || insideAdminUi(node)) return null;
  const range = document.createRange();
  range.selectNodeContents(node);
  for (const rect of range.getClientRects()) {
    if (x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2) return node as Text;
  }
  return null;
}

export function textRect(node: Text) {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

/** Page areas by section id, for labels in the editor. */
export const AREA_NAMES: Record<string, string> = {
  hero: 'Первый экран',
  studio: 'Студия',
  directions: 'Направления',
  gallery: 'Галерея',
  prices: 'Цены',
  promos: 'Акции',
  team: 'Тренеры',
  care: 'Массаж и уход',
  visit: 'Первое занятие',
  reviews: 'Отзывы',
  faq: 'Вопросы',
  contacts: 'Контакты',
  header: 'Шапка',
  footer: 'Подвал',
  news: 'Объявление',
  'mobile-bar': 'Нижняя панель',
  page: 'Страница',
};

export const areaName = (area: string) => AREA_NAMES[area] ?? area;
