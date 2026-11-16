import { EMPTY_PAGE, type PageEdits } from '../../shared/content.ts';
import { mediaUrl } from './paths.ts';

/**
 * Applies the edits made right on the page (ported from ISPANA), after React renders:
 * - free texts (any wording on the page, keyed by its area and original text),
 * - swapped or hidden photos,
 * - photos inserted after a block of text.
 * A MutationObserver re-applies them when React re-renders a part of the page, and
 * originals are remembered so an edit can be undone without a reload.
 */

export const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const SKIP = '[data-site-admin], script, style, noscript, textarea, title, svg';

/** Where a text lives: section id, header or footer. Free edits are scoped to it. */
export function areaOf(element: Element | null): string {
  if (!element) return 'page';
  const section = element.closest('section[id]');
  if (section) return section.id === 'top' ? 'hero' : section.id;
  if (element.closest('.site-header, .mobile-menu')) return 'header';
  if (element.closest('footer')) return 'footer';
  if (element.closest('.news')) return 'news';
  if (element.closest('.mobile-bar')) return 'mobile-bar';
  return 'page';
}

export const freeKey = (area: string, original: string) => `${area}::${normalize(original)}`;

/** Text nodes we changed: their original wording and the value we put in. */
const originals = new WeakMap<Text, string>();
const applied = new WeakMap<Text, string>();

let edits: PageEdits = EMPTY_PAGE;
let observer: MutationObserver | null = null;
let frame = 0;

function setText(node: Text, value: string) {
  const current = node.nodeValue ?? '';
  const lead = /^\s*/.exec(current)?.[0] ?? '';
  const trail = /\s*$/.exec(current)?.[0] ?? '';
  const next = `${lead}${value}${trail}`;
  if (current !== next) node.nodeValue = next;
  applied.set(node, next);
}

/** The wording a text node had before any free-text edit. */
export function originalText(node: Text) {
  return originals.get(node) ?? node.nodeValue ?? '';
}

function applyTexts(root: Node) {
  const hasFree = Object.keys(edits.free).length > 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) continue;
    // React (or the editor's preview) wrote something new: that becomes the original.
    if (applied.has(node) && applied.get(node) !== node.nodeValue) {
      originals.delete(node);
      applied.delete(node);
    }
    if (!hasFree && !originals.has(node)) continue;
    const original = originals.get(node) ?? node.nodeValue ?? '';
    const replacement = hasFree ? edits.free[freeKey(areaOf(parent), original)] : undefined;
    if (replacement !== undefined) {
      if (!originals.has(node)) originals.set(node, original);
      setText(node, replacement);
    } else if (originals.has(node)) {
      node.nodeValue = originals.get(node)!;
      originals.delete(node);
      applied.delete(node);
    }
  }
}

const BASE = import.meta.env.BASE_URL;

/**
 * The stable name of a photo: its file on this site without the folder the site is served
 * from, the "-sm" preview suffix or the extension ("/photos/hall-neon"). Both copies of the
 * site (Vercel and GitHub Pages) get the same key.
 */
export function mediaKey(src: string) {
  try {
    const url = new URL(src, location.href);
    let path = url.pathname;
    if (url.origin === location.origin && BASE !== '/' && path.startsWith(BASE)) path = `/${path.slice(BASE.length)}`;
    return path.replace(/-(sm|\d{3,4})(?=\.\w+$)/, '').replace(/\.(jpe?g|png|webp|avif|gif|svg)$/i, '');
  } catch {
    return src;
  }
}

/** The stable key of a photo element: its named slot, or its original file. */
export function mediaKeyOf(element: Element): string | null {
  const slot = element.getAttribute('data-media-slot');
  if (slot) return `slot:${slot}`;
  if (!(element instanceof HTMLImageElement) || element.closest('[data-insert-id], [data-site-admin]')) return null;
  const src = element.dataset.origSrc ?? element.getAttribute('src');
  return src ? mediaKey(src) : null;
}

/** What hides along with a photo: its card or frame where there is one. */
export function mediaFrameOf(element: Element): HTMLElement {
  return (element.closest('.orbit__card, .filmstrip__item, .promo, .founder__photo, .quiz__result-photo') as HTMLElement | null) ?? (element as HTMLElement);
}

function applyMedia() {
  for (const element of document.querySelectorAll<HTMLElement>('img, [data-media-slot]')) {
    if (element.closest(SKIP)) continue;
    const key = mediaKeyOf(element);
    if (!key) continue;
    const value = edits.media[key];
    if (element instanceof HTMLImageElement) {
      const shown = value ? mediaUrl(value) : '';
      if (shown && shown !== element.dataset.swapped) {
        if (element.dataset.origSrc === undefined) {
          element.dataset.origSrc = element.getAttribute('src') ?? '';
          element.dataset.origSrcset = element.getAttribute('srcset') ?? '';
        }
        element.removeAttribute('srcset');
        element.src = shown;
        element.dataset.swapped = shown;
      } else if (!shown && element.dataset.swapped) {
        element.src = element.dataset.origSrc ?? element.src;
        if (element.dataset.origSrcset) element.setAttribute('srcset', element.dataset.origSrcset);
        delete element.dataset.swapped;
      }
    }
    const holder = mediaFrameOf(element);
    if (value === '') holder.setAttribute('data-media-hidden', '');
    else holder.removeAttribute('data-media-hidden');
  }
}

/** The block an inserted photo follows, found by its text inside the section. */
function anchorFor(section: string, after: string): Element | null {
  const root = document.getElementById(section === 'hero' ? 'top' : section);
  if (!root) return null;
  for (const element of root.querySelectorAll('h2, h3, h4, p, li, blockquote, dd, figcaption')) {
    if (element.closest(SKIP) || element.closest('[data-insert-id]')) continue;
    if (normalize(element.textContent ?? '') === after) {
      // Photos go after a whole list, not inside it.
      return element.closest('ul, ol, dl') ?? element;
    }
  }
  return null;
}

function applyInserts() {
  const wanted = new Set(edits.inserts.map((i) => i.id));
  for (const figure of document.querySelectorAll<HTMLElement>('[data-insert-id]')) {
    if (!wanted.has(figure.dataset.insertId!)) figure.remove();
  }
  for (const insert of edits.inserts) {
    let figure = document.querySelector<HTMLElement>(`[data-insert-id="${CSS.escape(insert.id)}"]`);
    const anchor = anchorFor(insert.section, insert.after);
    if (!anchor) continue;
    if (!figure) {
      figure = document.createElement('figure');
      figure.className = 'user-figure';
      figure.dataset.insertId = insert.id;
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      figure.append(img);
    }
    const img = figure.querySelector('img')!;
    const src = mediaUrl(insert.src);
    if (img.getAttribute('src') !== src) img.src = src;
    img.alt = insert.alt;
    if (anchor.nextElementSibling !== figure) anchor.after(figure);
  }
}

function applyAll() {
  frame = 0;
  observer?.disconnect();
  try {
    applyTexts(document.body);
    applyMedia();
    applyInserts();
  } finally {
    observer?.takeRecords();
    observer?.observe(document.body, { subtree: true, childList: true, characterData: true });
  }
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(applyAll);
};

/** Starts (once) and sets the edits to show; the editor calls it again for previews. */
export function setPageEdits(next: Partial<PageEdits> | undefined) {
  edits = { free: next?.free ?? {}, media: next?.media ?? {}, inserts: next?.inserts ?? [] };
  if (!observer) observer = new MutationObserver(schedule);
  applyAll();
}

export const hasPageEdits = (c: Partial<PageEdits> | undefined) =>
  Boolean(c) && (Object.keys(c!.free ?? {}).length > 0 || Object.keys(c!.media ?? {}).length > 0 || (c!.inserts?.length ?? 0) > 0);
