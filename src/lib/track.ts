import type { TrackPayload, TrackedEvent } from '../../shared/analytics.ts';
import { serverUrl } from './paths.ts';

/**
 * Cookie-free visit analytics (same model as ISPANA): one pageview, clicks on «Записаться»
 * (YCLIENTS), the phone and messengers, and on leave how long the tab was visible plus which
 * sections reached the screen. Device and country are worked out on the server.
 */

function send(payload: TrackPayload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(serverUrl('/api/track'), new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    /* fall through to fetch */
  }
  fetch(serverUrl('/api/track'), { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
}

/** Section id (or header/footer) a link sits in, for "where do people press «Записаться»". */
function placeOf(element: Element) {
  if (element.closest('.mobile-bar')) return 'mobile-bar';
  if (element.closest('.mobile-menu')) return 'menu';
  if (element.closest('.news')) return 'news';
  const section = element.closest('section[id]');
  if (section) return section.id === 'top' ? 'hero' : section.id;
  if (element.closest('.site-header')) return 'header';
  if (element.closest('footer')) return 'footer';
  return 'page';
}

function kindOf(href: string): TrackedEvent | null {
  if (/yclients\.com/i.test(href)) return 'book';
  if (href.startsWith('tel:')) return 'call';
  if (/^(https?:)?\/\/(t\.me|telegram\.me)\//i.test(href)) return 'telegram';
  if (/^(https?:)?\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) return 'whatsapp';
  if (/^(https?:)?\/\/(vk\.com|vk\.ru|vk\.me)\//i.test(href)) return 'vk';
  return null;
}

export function startTracking() {
  const params = new URLSearchParams(location.search);
  // The owner editing the site is not a visitor.
  if (params.has('edit')) return;
  const context: Partial<TrackPayload> = {
    path: location.pathname,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
    sw: screen.width,
    touch: navigator.maxTouchPoints ?? 0,
  };

  send({ ...context, type: 'pageview', ref: document.referrer || undefined, utm: params.get('utm_source') ?? undefined });

  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.closest('[data-site-admin]')) return;
      const type = kindOf(link.getAttribute('href') ?? '');
      if (type) send({ ...context, type, place: placeOf(link) });
    },
    { capture: true },
  );

  // Sections that were at least a third on screen.
  const seen = new Set<string>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) seen.add((entry.target as HTMLElement).id || 'footer');
    },
    { threshold: [0, 0.35], rootMargin: '-30% 0px -30% 0px' },
  );
  document.querySelectorAll('main section[id], footer').forEach((element) => observer.observe(element));

  // Visible time, flushed whenever the tab is hidden (the reliable "leave" signal on phones).
  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
  let pending = 0;
  const flush = () => {
    if (visibleSince) {
      pending += performance.now() - visibleSince;
      visibleSince = 0;
    }
    const dur = Math.round(pending / 1000);
    if (dur < 1 && seen.size === 0) return;
    send({ ...context, type: 'engage', dur, seen: [...seen] });
    pending = 0;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else visibleSince = performance.now();
  });
  window.addEventListener('pagehide', flush);
}
