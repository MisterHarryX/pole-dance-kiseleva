/**
 * Anonymous counters for the panel: one page view per visit, and clicks on «Записаться»
 * (links to YCLIENTS) and on the phone. No cookies, no personal data.
 */
import { serverUrl } from './paths.ts';

function send(type: 'view' | 'book' | 'call') {
  const body = JSON.stringify({ type });
  try {
    if (navigator.sendBeacon?.(serverUrl('/api/track'), new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    /* fall through */
  }
  fetch(serverUrl('/api/track'), { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
}

export function startTracking() {
  try {
    if (!sessionStorage.getItem('pdk-view')) {
      sessionStorage.setItem('pdk-view', '1');
      send('view');
    }
  } catch {
    send('view');
  }
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      if (link.href.includes('yclients.com')) send('book');
      else if (link.href.startsWith('tel:')) send('call');
    },
    { capture: true },
  );
}
