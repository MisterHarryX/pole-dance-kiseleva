import { lazy, Suspense, useEffect, useState } from 'react';

// The editor downloads only for the signed-in studio, never for visitors.
const AdminBar = lazy(() => import('../../site-admin/AdminBar.tsx').then((m) => ({ default: m.AdminBar })));

export const ADMIN_OPEN_EVENT = 'pdk-admin-open';
const HIDDEN_KEY = 'pdk-admin-hidden';

/** The readable hint cookie set at sign-in (on the Vercel copy); grants nothing by itself. */
export const hasAdminHint = () => document.cookie.split('; ').some((c) => c === 'pdk_admin_ui=1');

const hidden = () => {
  try {
    return Boolean(sessionStorage.getItem(HIDDEN_KEY));
  } catch {
    return false;
  }
};
const remember = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(HIDDEN_KEY, '1');
    else sessionStorage.removeItem(HIDDEN_KEY);
  } catch {
    /* private mode: the toolbar just comes back on reload */
  }
};

type State = 'visitor' | 'admin' | 'hidden';

/** Mounted on every page; renders nothing for visitors. */
export function AdminHost() {
  const [state, setState] = useState<State>('visitor');

  // Bring the toolbar back after a reload while the session is valid.
  useEffect(() => {
    if (!hasAdminHint()) return;
    let cancelled = false;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((session: { authenticated?: boolean }) => {
        if (cancelled || !session.authenticated) return;
        setState(hidden() && !new URLSearchParams(location.search).has('edit') ? 'hidden' : 'admin');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const open = () => {
      remember(false);
      setState('admin');
    };
    window.addEventListener(ADMIN_OPEN_EVENT, open);
    return () => window.removeEventListener(ADMIN_OPEN_EVENT, open);
  }, []);

  if (state !== 'admin') return null;
  return (
    <Suspense fallback={null}>
      <AdminBar
        onHide={() => {
          remember(true);
          setState('hidden');
        }}
        onLogout={() => setState('visitor')}
      />
    </Suspense>
  );
}
