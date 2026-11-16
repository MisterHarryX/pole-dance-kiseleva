import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EMPTY_PAGE, type ContentOverrides, type Insert, type PageEdits } from '../../shared/content.ts';
import { getPublished } from '../lib/content.ts';
import { areaOf, freeKey, mediaFrameOf, mediaKeyOf, normalize, originalText, setPageEdits } from '../lib/liveLayer.ts';
import { mediaUrl } from '../lib/paths.ts';
import { Wordmark } from '../components/ui/Wordmark.tsx';
import { areaName, replaceOnPage, textNodeAt, textRect } from './dom.ts';
import { entriesOf, sectionTitle, withTextEdits } from './model.ts';
import { ContactsPanel, MediaPopover, PhotosPanel, TextsPanel, type ContactValues, type MediaItem } from './panels.tsx';
import { NotePopover, TextPopover, type TextTarget } from './TextPopover.tsx';
import { pickImage, uploadPhoto } from './upload.ts';
import './site-admin.css';

interface Drafts {
  /** Section text path ("faq.2.a") → new value. */
  texts: Record<string, string>;
  /** Free text key → new wording, or null = back to the original. */
  free: Record<string, string | null>;
  /** Photo key → new URL, "" = hidden, null = back to the original photo. */
  media: Record<string, string | null>;
  /** The full list of inserted photos once changed; null = unchanged. */
  inserts: Insert[] | null;
}
const NO_DRAFTS: Drafts = { texts: {}, free: {}, media: {}, inserts: null };

type TextRef = { path: string; line?: number };
type Hover =
  | { kind: 'text'; refs: TextRef[]; rect: DOMRect; shown: string }
  | { kind: 'free'; key: string; original: string; area: string; rect: DOMRect; shown: string }
  | { kind: 'price'; rect: DOMRect }
  | { kind: 'media'; element: Element; rect: DOMRect; label: string }
  | { kind: 'insert-spot'; anchor: Element; section: string; rect: DOMRect };
type PanelId = 'texts' | 'contacts' | 'photos' | null;
type Popover = TextTarget & { free?: { key: string } };

const FLASH_KEY = 'pdk-admin-flash';
/** Blocks a new photo can follow, and where an editable page area starts. */
const BLOCKS = 'h2, h3, h4, p, li, blockquote, dd';
const PAGE = 'main, .site-header, .site-footer';
const PRICE = /\d\s?₽|₽\s?\d/;

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Not faded out or hidden (itself or a parent): slideshows keep inactive photos at opacity 0. */
function shownOnScreen(element: Element) {
  const el = element as Element & { checkVisibility?: (o: object) => boolean };
  if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.opacity === '0' || style.visibility === 'hidden') return false;
  }
  return true;
}

const mediaLabel = (element: Element, img: HTMLImageElement | null) => `${areaName(areaOf(element))}${img?.alt ? ` · ${img.alt.slice(0, 60)}` : ''}`;

/**
 * The studio's floating toolbar on the live site (ported from ISPANA): every text on the page
 * can be clicked and rewritten, every photo replaced, hidden or brought back, new photos
 * inserted after any paragraph. Texts the cabinet's form knows go into the same sections the
 * form edits; everything previews at once and goes live with one «Опубликовать».
 */
export function AdminBar({ onHide, onLogout }: { onHide: () => void; onLogout: () => void }) {
  const [published, setPublished] = useState<ContentOverrides | null>(null);
  const [fresh, setFresh] = useState(0);
  const [drafts, setDrafts] = useState<Drafts>(NO_DRAFTS);
  const [editing, setEditing] = useState(() => new URLSearchParams(location.search).has('edit'));
  const [inserting, setInserting] = useState(false);
  const [panel, setPanel] = useState<PanelId>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [note, setNote] = useState<DOMRect | null>(null);
  const [mediaPop, setMediaPop] = useState<{ item: MediaItem; rect: DOMRect } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(() => {
    const flash = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    return flash ? { text: flash, tone: 'ok' } : null;
  });
  const [publishing, setPublishing] = useState(false);
  const [listVersion, setListVersion] = useState(0);

  // --- What is published, and how many new requests wait ------------------------------

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/content', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: ContentOverrides) => !cancelled && setPublished(data ?? {}))
      .catch(() => !cancelled && setPublished(getPublished() ?? {}));
    const loadFresh = () =>
      fetch('/api/admin/requests', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { items?: { status: string }[] } | null) => Array.isArray(data?.items) && !cancelled && setFresh(data.items.filter((i) => i.status === 'new').length))
        .catch(() => {});
    void loadFresh();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && void loadFresh(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const live = useMemo<ContentOverrides>(() => published ?? getPublished() ?? {}, [published]);
  const livePage = useMemo<PageEdits>(() => ({ ...EMPTY_PAGE, ...live.page }), [live]);

  /** Code texts and published texts of every section the cabinet edits. */
  const codeTexts = useMemo(() => Object.fromEntries(entriesOf(null).map((e) => [e.path, e.value])), []);
  const liveEntries = useMemo(() => entriesOf(live), [live]);

  /** Path → what the page shows right now (published + drafts). */
  const values = useMemo(() => {
    const out: Record<string, string> = {};
    for (const entry of liveEntries) out[entry.path] = drafts.texts[entry.path] ?? entry.value;
    return out;
  }, [liveEntries, drafts.texts]);
  const liveValue = useCallback((path: string) => liveEntries.find((e) => e.path === path)?.value ?? '', [liveEntries]);
  const entries = useMemo(() => liveEntries.map((e) => ({ ...e, value: values[e.path] ?? e.value })), [liveEntries, values]);
  const changedTexts = useMemo(() => new Set(Object.keys(values).filter((p) => codeTexts[p] !== undefined && values[p] !== codeTexts[p])), [values, codeTexts]);

  /** Shown text → where it is saved, to recognise text under the pointer. */
  const index = useMemo(() => {
    const map = new Map<string, TextRef[]>();
    const add = (text: string, ref: TextRef) => {
      const key = normalize(text);
      if (key.length >= 1) map.set(key, [...(map.get(key) ?? []), ref]);
    };
    for (const [path, text] of Object.entries(values)) {
      add(text, { path });
      if (text.includes('\n')) text.split('\n').forEach((line, i) => add(line, { path, line: i }));
    }
    return map;
  }, [values]);

  /** Published edits with drafts on top, the way the page should look now. */
  const merged = useMemo((): PageEdits => {
    const free: Record<string, string> = { ...livePage.free };
    for (const [k, v] of Object.entries(drafts.free)) {
      if (v === null) delete free[k];
      else free[k] = v;
    }
    const media: Record<string, string> = { ...livePage.media };
    for (const [k, v] of Object.entries(drafts.media)) {
      if (v === null) delete media[k];
      else media[k] = v;
    }
    return { free, media, inserts: drafts.inserts ?? livePage.inserts };
  }, [livePage, drafts.free, drafts.media, drafts.inserts]);

  // Free texts and photos preview through the same layer that shows them to visitors.
  useEffect(() => {
    if (!published) return;
    setPageEdits(merged);
    setListVersion((v) => v + 1);
  }, [merged, published]);

  const insertsChanged = drafts.inserts !== null && JSON.stringify(drafts.inserts) !== JSON.stringify(livePage.inserts);
  const draftCount = Object.keys(drafts.texts).length + Object.keys(drafts.free).length + Object.keys(drafts.media).length + (insertsChanged ? 1 : 0);

  // --- Drafts: texts ------------------------------------------------------------------------

  const setText = useCallback(
    (path: string, next: string) =>
      setDrafts((current) => {
        const texts = { ...current.texts };
        if (next === liveValue(path)) delete texts[path];
        else texts[path] = next;
        return { ...current, texts };
      }),
    [liveValue],
  );

  const applyTarget = (target: Popover, value: string) => {
    if (target.free) {
      const key = target.free.key;
      setDrafts((current) => {
        const free = { ...current.free };
        const original = key.slice(key.indexOf('::') + 2);
        const now = livePage.free[key] ?? original;
        if (normalize(value) === normalize(now)) delete free[key];
        else free[key] = normalize(value) === original ? null : value;
        return { ...current, free };
      });
      return;
    }
    for (const path of target.paths) {
      let next = value;
      if (target.line !== undefined) {
        const lines = values[path].split('\n');
        lines[target.line] = value;
        next = lines.join('\n');
      }
      setText(path, next);
    }
  };

  /** Edits from the list also update every place the text shows. */
  const applyFromList = (path: string, value: string) => {
    replaceOnPage(values[path], value);
    setText(path, value);
  };

  // --- Contacts -------------------------------------------------------------------------------

  const linkEntries = useMemo(() => entriesOf(live, true), [live]);
  const contacts: ContactValues = {
    phone: values['contacts.phone'] ?? '',
    booking: drafts.texts['contacts.booking'] ?? linkEntries.find((e) => e.path === 'contacts.booking')?.value ?? '',
    socials: linkEntries
      .filter((e) => /^contacts\.socials\.\d+\.href$/.test(e.path))
      .map((e) => ({ path: e.path, label: e.label.split(' · ')[0], href: drafts.texts[e.path] ?? e.value })),
  };

  const applyContacts = (next: ContactValues) => {
    if (next.phone !== contacts.phone) {
      replaceOnPage(contacts.phone, next.phone);
      setText('contacts.phone', next.phone);
    }
    const link = (path: string, value: string) => {
      const now = linkEntries.find((e) => e.path === path)?.value ?? '';
      setDrafts((current) => {
        const texts = { ...current.texts };
        if (value === now) delete texts[path];
        else texts[path] = value;
        return { ...current, texts };
      });
    };
    link('contacts.booking', next.booking);
    next.socials.forEach((s) => link(s.path, s.href));
  };

  // --- Drafts: photos -----------------------------------------------------------------------

  const setMedia = (key: string, value: string | null) =>
    setDrafts((current) => {
      const media = { ...current.media };
      const now = livePage.media[key];
      if ((value === null && now === undefined) || value === now) delete media[key];
      else media[key] = value;
      return { ...current, media };
    });

  const setInserts = (update: (list: Insert[]) => Insert[]) => setDrafts((current) => ({ ...current, inserts: update(current.inserts ?? livePage.inserts) }));

  /** Picks a file, uploads it and hands back the URL; null when cancelled or failed. */
  const choosePhoto = async (busyKey: string) => {
    const file = await pickImage();
    if (!file) return null;
    setBusy(busyKey);
    try {
      return await uploadPhoto(file);
    } catch (reason) {
      setToast({ text: reason instanceof Error ? reason.message : 'Не удалось загрузить фото.', tone: 'error' });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const replacePhoto = async (item: MediaItem) => {
    const url = await choosePhoto(item.key);
    if (!url) return;
    if (item.insert) setInserts((list) => list.map((i) => (i.id === item.key ? { ...i, src: url } : i)));
    else setMedia(item.key, url);
    setMediaPop(null);
  };

  const insertPhoto = async (anchor: Element, section: string) => {
    setInserting(false);
    const url = await choosePhoto('insert');
    if (!url) return;
    const after = normalize(anchor.textContent ?? '');
    const id = `i${Date.now().toString(36)}`;
    setInserts((list) => [...list, { id, section, after, src: url, alt: '' }]);
    setToast({ text: 'Фото вставлено. Опубликуйте, чтобы его увидели посетители.', tone: 'ok' });
  };

  /** Every photo on the page (hidden ones too) and every inserted photo, for the list and the popover. */
  const mediaItems = useMemo((): MediaItem[] => {
    void listVersion;
    const seen = new Map<string, MediaItem>();
    for (const element of document.querySelectorAll('main img, .site-header img, .site-footer img')) {
      if (element.closest('[data-site-admin], [data-insert-id]')) continue;
      const key = mediaKeyOf(element);
      if (!key || seen.has(key)) continue;
      const value = merged.media[key];
      const img = element as HTMLImageElement;
      seen.set(key, {
        key,
        thumb: value ? mediaUrl(value) : img.currentSrc || img.src,
        label: mediaLabel(element, img),
        state: value === '' ? 'hidden' : value ? 'replaced' : 'original',
      });
    }
    const inserted = merged.inserts.map((i) => ({ key: i.id, insert: true, thumb: mediaUrl(i.src), label: `${areaName(i.section)} · вставленное фото`, state: 'inserted' as const }));
    return [...inserted, ...seen.values()];
  }, [merged, listVersion]);

  const mediaItemFor = (element: Element): MediaItem | null => {
    const figure = element.closest('[data-insert-id]') as HTMLElement | null;
    if (figure) return mediaItems.find((i) => i.key === figure.dataset.insertId) ?? null;
    const key = mediaKeyOf(element);
    return key ? (mediaItems.find((i) => i.key === key) ?? null) : null;
  };

  // --- Publish / discard --------------------------------------------------------------------

  const publish = useCallback(async () => {
    if (!draftCount || publishing || !published) return;
    setPublishing(true);
    const base: ContentOverrides = { ...published };
    delete base.updatedAt;
    const next = withTextEdits(base, drafts.texts);
    next.page = merged;
    try {
      const response = await fetch('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(error === 'storage' ? 'Хранилище не подключено: правки нельзя сохранить.' : error === 'unauthorized' ? 'Сессия закончилась — войдите снова.' : '');
      }
      setDrafts(NO_DRAFTS);
      // Re-render from the published content so every component shows the new version.
      sessionStorage.setItem(FLASH_KEY, 'Опубликовано. Посетители уже видят изменения.');
      location.reload();
    } catch (reason) {
      setToast({ text: reason instanceof Error && reason.message ? reason.message : 'Не получилось опубликовать. Попробуйте ещё раз.', tone: 'error' });
      setPublishing(false);
    }
  }, [draftCount, drafts.texts, merged, published, publishing]);

  const discard = () => {
    if (!window.confirm('Отменить все неопубликованные правки?')) return;
    setDrafts(NO_DRAFTS);
    location.reload();
  };

  const logout = async () => {
    if (draftCount && !window.confirm('Есть неопубликованные правки. Всё равно выйти?')) return;
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    onLogout();
    location.reload();
  };

  // Warn before leaving with unpublished work; Ctrl/⌘+S publishes.
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (draftCount && !publishing) event.preventDefault();
    };
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void publish();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('keydown', onKey);
    };
  }, [draftCount, publish, publishing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // --- Edit mode: hover and click anything ------------------------------------------------------

  useEffect(() => {
    if ((!editing && !inserting) || popover || mediaPop || note) return;
    const root = document.documentElement;
    root.dataset.siteEditing = '';
    let frame = 0;
    let lastX = -1;
    let lastY = -1;

    const hitTest = (x: number, y: number): Hover | null => {
      const under = document.elementFromPoint(x, y);
      if (!under || under.closest('[data-site-admin]') || !under.closest(PAGE)) return null;

      if (inserting) {
        const block = under.closest(BLOCKS);
        const section = block?.closest('main section[id]');
        if (!block || !section || block.closest('[data-insert-id], form, nav, button')) return null;
        const anchor = block.closest('ul, ol, dl') ?? block;
        return { kind: 'insert-spot', anchor: block, section: section.id === 'top' ? 'hero' : section.id, rect: anchor.getBoundingClientRect() };
      }

      const node = textNodeAt(x, y);
      if (node && !node.parentElement?.closest('input, textarea, select')) {
        const shown = normalize(node.nodeValue ?? '');
        const refs = index.get(shown);
        if (refs) return { kind: 'text', refs, rect: textRect(node), shown };
        if (PRICE.test(shown)) return { kind: 'price', rect: textRect(node) };
        const original = normalize(originalText(node));
        if (original.length >= 1 && /[\p{L}\d]/u.test(original) && node.parentElement?.closest(PAGE)) {
          const area = areaOf(node.parentElement);
          return { kind: 'free', key: freeKey(area, original), original, area, rect: textRect(node), shown };
        }
      }

      for (const element of document.elementsFromPoint(x, y)) {
        if (element.closest('[data-site-admin]')) return null;
        if (element.matches('img') || element.closest('[data-insert-id]')) {
          // Slideshows stack their photos: take the one actually on screen.
          if (element.matches('img') && !shownOnScreen(element)) continue;
          const target = (element.closest('[data-insert-id]') as Element | null) ?? element;
          if (!target.closest('[data-insert-id]') && !mediaKeyOf(target)) continue;
          const frameEl = target.closest('[data-insert-id]') ? target : mediaFrameOf(target);
          const img = target instanceof HTMLImageElement ? target : target.querySelector('img');
          return { kind: 'media', element: target, rect: frameEl.getBoundingClientRect(), label: mediaLabel(target, img) };
        }
      }
      return null;
    };

    const update = () => {
      frame = 0;
      const next = hitTest(lastX, lastY);
      setHover(next);
      root.toggleAttribute('data-site-hover', Boolean(next));
    };
    const onMove = (event: PointerEvent) => {
      lastX = event.clientX;
      lastY = event.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onScroll = () => {
      if (lastX >= 0 && !frame) frame = requestAnimationFrame(update);
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element).closest?.('[data-site-admin]')) return;
      const hit = hitTest(event.clientX, event.clientY);
      if (!hit) return;
      // Editing wins over the page's own behaviour (links, flipping cards, the lightbox…).
      event.preventDefault();
      event.stopPropagation();
      if (hit.kind === 'insert-spot') return void insertPhoto(hit.anchor, hit.section);
      if (hit.kind === 'price') return setNote(hit.rect);
      if (hit.kind === 'media') {
        const item = mediaItemFor(hit.element);
        if (item) setMediaPop({ item, rect: hit.rect });
        return;
      }
      if (hit.kind === 'free') {
        setPopover({
          paths: [],
          free: { key: hit.key },
          title: areaName(hit.area),
          detail: 'текст на странице',
          value: hit.shown,
          original: hit.original,
          shown: hit.shown,
          area: hit.area,
          rect: hit.rect,
        });
        return;
      }
      const ref = hit.refs[0];
      const paths = [...new Set(hit.refs.filter((r) => r.line === ref.line).map((r) => r.path))];
      const code = codeTexts[ref.path] ?? hit.shown;
      const original = ref.line !== undefined ? (code.split('\n')[ref.line] ?? hit.shown) : code;
      const label = liveEntries.find((e) => e.path === ref.path)?.label ?? '';
      setPopover({
        paths,
        line: ref.line,
        title: sectionTitle(ref.path.split('.')[0]),
        detail: `${label}${paths.length > 1 ? ` · в ${paths.length} местах` : ''}`,
        value: hit.shown,
        original,
        shown: hit.shown,
        rect: hit.rect,
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[data-site-admin][role=dialog]')) return;
      if (inserting) setInserting(false);
      else setEditing(false);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      setHover(null);
      delete root.dataset.siteEditing;
      root.removeAttribute('data-site-hover');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('keydown', onKey);
    };
    // insertPhoto and mediaItemFor read the latest drafts through state setters and mediaItems.
  }, [editing, inserting, popover, mediaPop, note, index, codeTexts, liveEntries, mediaItems]);

  const showOnPage = (item: MediaItem) => {
    const element = item.insert
      ? document.querySelector(`[data-insert-id="${CSS.escape(item.key)}"]`)
      : [...document.querySelectorAll('main img, .site-header img, .site-footer img')].find((el) => mediaKeyOf(el) === item.key);
    const frameEl = element && !item.insert ? mediaFrameOf(element) : element;
    if (!frameEl) return;
    frameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    frameEl.animate([{ outline: '2px solid #e9d29b', outlineOffset: '6px' }, { outline: '2px solid transparent', outlineOffset: '16px' }], { duration: 1400, easing: 'ease-out' });
  };

  const ready = published !== null;
  const outline = hover && (editing || inserting) && !popover && !mediaPop && !note ? hover : null;
  const outlineLabel = (h: Hover) => {
    switch (h.kind) {
      case 'text':
        return `${sectionTitle(h.refs[0].path.split('.')[0])}${h.refs.some((r) => changedTexts.has(r.path)) ? ' · изменено' : ''}`;
      case 'free':
        return `${areaName(h.area)}${merged.free[h.key] !== undefined ? ' · изменено' : ''}`;
      case 'price':
        return 'Цена · меняется в кабинете';
      case 'media':
        return `${h.label} · заменить или скрыть`;
      case 'insert-spot':
        return '+ вставить фото после этого';
    }
  };

  return (
    <>
      {outline && outline.kind !== 'insert-spot' && (
        <div
          data-site-admin
          aria-hidden="true"
          className="sa-outline"
          data-kind={outline.kind}
          style={{ top: outline.rect.top - 4, left: outline.rect.left - 6, width: outline.rect.width + 12, height: outline.rect.height + 8 }}
        >
          <span>{outlineLabel(outline)}</span>
        </div>
      )}
      {outline && outline.kind === 'insert-spot' && (
        <div data-site-admin aria-hidden="true" className="sa-insert-line" style={{ top: outline.rect.bottom + 8, left: outline.rect.left, width: outline.rect.width }}>
          <span>{outlineLabel(outline)}</span>
        </div>
      )}
      {popover && (
        <div data-site-admin aria-hidden="true" className="sa-outline sa-outline--fixed" style={{ top: popover.rect.top - 4, left: popover.rect.left - 6, width: popover.rect.width + 12, height: popover.rect.height + 8 }} />
      )}
      {popover && <TextPopover target={popover} onApply={(target, value) => applyTarget(target as Popover, value)} onClose={() => setPopover(null)} />}
      {note && (
        <NotePopover
          rect={note}
          title="Цены"
          text="Цены и абонементы считает калькулятор на сайте, поэтому они меняются в кабинете: раздел «Цены»."
          href="/admin#pricing"
          action="Открыть «Цены»"
          onClose={() => setNote(null)}
        />
      )}
      {mediaPop && (
        <MediaPopover
          item={mediaPop.item}
          rect={mediaPop.rect}
          busy={busy === mediaPop.item.key}
          onReplace={() => void replacePhoto(mediaPop.item)}
          onHide={() => {
            setMedia(mediaPop.item.key, '');
            setMediaPop(null);
          }}
          onRestore={() => {
            setMedia(mediaPop.item.key, null);
            setMediaPop(null);
          }}
          onRemove={() => {
            setInserts((list) => list.filter((i) => i.id !== mediaPop.item.key));
            setMediaPop(null);
          }}
          onClose={() => setMediaPop(null)}
        />
      )}

      {panel === 'texts' && <TextsPanel entries={entries} original={codeTexts} changed={changedTexts} onApply={applyFromList} onClose={() => setPanel(null)} />}
      {panel === 'contacts' && <ContactsPanel value={contacts} onApply={applyContacts} onClose={() => setPanel(null)} />}
      {panel === 'photos' && (
        <PhotosPanel
          items={mediaItems}
          busyKey={busy}
          onReplace={(item) => void replacePhoto(item)}
          onHide={(item) => setMedia(item.key, '')}
          onRestore={(item) => setMedia(item.key, null)}
          onRemove={(item) => setInserts((list) => list.filter((i) => i.id !== item.key))}
          onShow={showOnPage}
          onClose={() => setPanel(null)}
        />
      )}

      {(editing || inserting) && !outline && !popover && !panel && !mediaPop && !note && (
        <p data-site-admin className="sa-hint">
          {inserting ? 'Наведите на абзац — фото встанет сразу после него · Esc — отмена' : busy === 'insert' ? 'Загружаю фото…' : 'Нажмите на любой текст или фото, чтобы изменить · Esc — выйти'}
        </p>
      )}
      {toast && (
        <p data-site-admin role="status" className="sa-toast" data-tone={toast.tone}>
          {toast.text}
        </p>
      )}

      <div data-site-admin role="toolbar" aria-label="Панель редактирования сайта" className="sa-bar">
        <a className="sa-bar__brand" href="/admin" aria-label="Открыть кабинет Pole Dance Kiseleva">
          <Wordmark className="sa-bar__logo" />
          <small>кабинет</small>
        </a>
        <Divider />
        <BarLink href="/admin#requests" icon={<path d="M3.5 5h13v10h-13zM3.5 5.6 10 10.5l6.5-4.9" />} label="Заявки">
          Заявки
          {fresh > 0 && <span className="sa-bar__badge">{fresh}</span>}
        </BarLink>
        <BarLink href="/admin#stats" icon={<path d="M4 16V10m4 6V5m4 11v-4m4 4V7" />} label="Статистика">
          Статистика
        </BarLink>
        <Divider />
        <BarButton
          active={editing && !inserting}
          disabled={!ready}
          onClick={() => {
            setInserting(false);
            setEditing((v) => !v);
            setPanel(null);
          }}
          icon={<path d="m12.5 3.5 4 4L7 17H3v-4zM10.5 5.5l4 4" />}
        >
          {editing && !inserting ? 'Редактирую' : 'Редактировать'}
        </BarButton>
        <BarButton
          active={inserting}
          disabled={!ready || busy === 'insert'}
          onClick={() => {
            setInserting((v) => !v);
            setPanel(null);
          }}
          label="Вставить фото"
          icon={
            <>
              <rect x="3" y="4" width="14" height="12" rx="1.5" />
              <path d="M10 7.5v5M7.5 10h5" />
            </>
          }
        >
          {busy === 'insert' ? 'Загружаю…' : 'Вставить фото'}
        </BarButton>
        <BarButton
          active={panel === 'photos'}
          disabled={!ready}
          onClick={() => {
            setListVersion((v) => v + 1);
            setPanel(panel === 'photos' ? null : 'photos');
          }}
          label="Фото"
          icon={
            <>
              <rect x="3" y="4" width="14" height="12" rx="1.5" />
              <path d="m3.5 13.5 4-4 3 3 2-2 4 4" />
            </>
          }
        >
          Фото
        </BarButton>
        <BarButton active={panel === 'texts'} disabled={!ready} onClick={() => setPanel(panel === 'texts' ? null : 'texts')} label="Тексты" icon={<path d="M4 5h12M4 10h12M4 15h7" />}>
          Тексты
        </BarButton>
        <BarButton
          active={panel === 'contacts'}
          disabled={!ready}
          onClick={() => setPanel(panel === 'contacts' ? null : 'contacts')}
          label="Контакты"
          icon={<path d="M5.5 3h2.5l1.2 3.2-1.6 1.2a9 9 0 0 0 5 5l1.2-1.6L17 12v2.5a1.5 1.5 0 0 1-1.5 1.5A12.5 12.5 0 0 1 4 4.5 1.5 1.5 0 0 1 5.5 3z" />}
        >
          Контакты
        </BarButton>
        <Divider />
        {draftCount > 0 ? (
          <>
            <span className="sa-bar__count">
              {draftCount} {plural(draftCount, 'правка', 'правки', 'правок')}
            </span>
            <button type="button" className="sa-bar__item sa-bar__discard" onClick={discard}>
              Отменить
            </button>
          </>
        ) : (
          <span className="sa-bar__count sa-bar__count--quiet">Всё опубликовано</span>
        )}
        <button type="button" className="sa-bar__publish" onClick={publish} disabled={!draftCount || publishing} title="Ctrl + S">
          {publishing ? 'Публикую…' : 'Опубликовать'}
        </button>
        <Divider />
        <button type="button" className="sa-bar__item sa-bar__logout" onClick={logout}>
          Выйти
        </button>
        <button
          type="button"
          className="sa-bar__item sa-bar__hide"
          onClick={() => {
            setEditing(false);
            setInserting(false);
            setPanel(null);
            onHide();
          }}
          aria-label="Скрыть панель (вернуть — золотым ключиком в подвале)"
          title="Скрыть панель"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 6.5 8 10.5l4-4" />
          </svg>
        </button>
      </div>
    </>
  );
}

const Divider = () => <span aria-hidden="true" className="sa-bar__divider" />;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function BarButton({ active, disabled, onClick, icon, label, children }: { active: boolean; disabled?: boolean; onClick: () => void; icon: ReactNode; label?: string; children: ReactNode }) {
  return (
    <button type="button" className="sa-bar__item" onClick={onClick} disabled={disabled} aria-pressed={active} aria-label={label} title={label}>
      <Icon>{icon}</Icon>
      <span className="sa-bar__label">{children}</span>
    </button>
  );
}

function BarLink({ href, icon, label, children }: { href: string; icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <a className="sa-bar__item sa-bar__link" href={href} aria-label={label} title={label}>
      <Icon>{icon}</Icon>
      <span className="sa-bar__label">{children}</span>
    </a>
  );
}
