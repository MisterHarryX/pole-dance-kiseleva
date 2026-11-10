import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CallbackRequest, ContentKey, ContentOverrides, RequestStatus } from '../../shared/content.ts';
import { mergeValue, targets } from '../lib/content.ts';
import { api, errorText, type Session } from './api.ts';
import { Fields } from './Form.tsx';
import { Requests } from './Requests.tsx';
import { pick, sections } from './schema.ts';
import { Stats } from './Stats.tsx';

type View = 'requests' | 'stats' | ContentKey;

/** Pristine defaults from site.ts (the panel never applies overrides to them). */
const defaults = Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, structuredClone(v)])) as Record<ContentKey, unknown>;

const current = (key: ContentKey, overrides: ContentOverrides) =>
  overrides[key] === undefined ? structuredClone(defaults[key]) : mergeValue(structuredClone(defaults[key]), overrides[key]);

function GoldDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="a-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="120">
          <stop offset="0" stopColor="#f2dfa9" />
          <stop offset=".5" stopColor="#c8a25a" />
          <stop offset="1" stopColor="#8e6c2f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Mark() {
  return (
    <span className="a-mark" aria-label="Pole Dance Kiseleva">
      <span className="a-mark__l">
        Po
        <br />K
      </span>
      <span className="a-mark__pole" />
      <span>
        eDance
        <br />
        seleva
      </span>
    </span>
  );
}

function Login({ session, onDone }: { session: Session; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem('');
    try {
      await api.login(password);
      onDone();
    } catch (err) {
      setProblem(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="a-login">
      <form className="a-login__card" onSubmit={submit}>
        <Mark />
        <h1>Кабинет студии</h1>
        <p className="a-muted">Заявки, статистика и редактирование сайта.</p>
        {!session.configured ? (
          <p className="a-error">Пароль не задан. Добавьте ADMIN_PASSWORD в переменные окружения (локально — в файл .env.local).</p>
        ) : (
          <>
            <label className="a-field">
              <span className="a-label">Пароль</span>
              <input type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {problem && <p className="a-error">{problem}</p>}
            <button className="a-btn a-btn--gold a-btn--wide" type="submit" disabled={busy || !password}>
              {busy ? 'Входим…' : 'Войти'}
            </button>
          </>
        )}
        <a className="a-link" href="/">
          ← На сайт
        </a>
      </form>
    </main>
  );
}

const icons: Record<string, string> = {
  requests: 'M4 6h16v12H4zM4 7l8 6 8-6',
  stats: 'M5 19V11M12 19V5M19 19v-6',
  sparkle: 'M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  calendar: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  pole: 'M12 2v20M8 22h8M9 2h6',
  spa: 'M12 20c-4 0-7-3-7-7 3 0 5 1 7 3 2-2 4-3 7-3 0 4-3 7-7 7z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
};
const Ico = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={icons[name] ?? icons.sparkle} />
  </svg>
);

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>('requests');
  const [saved, setSaved] = useState<ContentOverrides>({});
  const [draft, setDraft] = useState<Partial<Record<ContentKey, unknown>>>({});
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState(false);

  const say = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 3200);
  }, []);

  const loadSession = useCallback(() => {
    api
      .session()
      .then(setSession)
      .catch(() => setSession({ authenticated: false, configured: true, storage: 'none', blob: false }));
  }, []);
  useEffect(loadSession, [loadSession]);

  const loadRequests = useCallback(async () => {
    setLoadingReq(true);
    try {
      setRequests(await api.requests());
    } catch (e) {
      say(errorText(e), true);
    } finally {
      setLoadingReq(false);
    }
  }, [say]);

  useEffect(() => {
    if (!session?.authenticated) return;
    api
      .content()
      .then(setSaved)
      .catch((e) => say(errorText(e), true));
    void loadRequests();
    const t = window.setInterval(() => api.requests().then(setRequests).catch(() => {}), 30_000);
    return () => window.clearInterval(t);
  }, [session?.authenticated, loadRequests, say]);

  const fresh = requests.filter((r) => r.status === 'new').length;
  useEffect(() => {
    document.title = `${fresh ? `(${fresh}) ` : ''}Кабинет · Pole Dance Kiseleva`;
  }, [fresh]);

  const dirty = Object.keys(draft) as ContentKey[];
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.length) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty.length]);

  const section = useMemo(() => sections.find((s) => s.key === view), [view]);
  const value = section ? (draft[section.key] ?? current(section.key, saved)) : null;

  const save = async () => {
    setSaving(true);
    try {
      const next: ContentOverrides = { ...saved };
      delete next.updatedAt;
      for (const key of dirty) {
        const sec = sections.find((s) => s.key === key)!;
        next[key] = pick(draft[key], sec.fields);
      }
      setSaved(await api.saveContent(next));
      setDraft({});
      say('Сохранено. Изменения уже на сайте ✨');
    } catch (e) {
      say(errorText(e), true);
    } finally {
      setSaving(false);
    }
  };

  const resetSection = async (key: ContentKey) => {
    if (!confirm('Вернуть этот раздел к исходному тексту? Ваши правки в нём будут удалены.')) return;
    const next: ContentOverrides = { ...saved };
    delete next.updatedAt;
    delete next[key];
    try {
      setSaved(await api.saveContent(next));
      setDraft((d) => {
        const copy = { ...d };
        delete copy[key];
        return copy;
      });
      say('Раздел возвращён к исходному');
    } catch (e) {
      say(errorText(e), true);
    }
  };

  const setStatus = async (id: string, status: RequestStatus) => {
    setRequests((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await api.updateRequest(id, { status });
    } catch (e) {
      say(errorText(e), true);
      void loadRequests();
    }
  };
  const setNote = async (id: string, note: string) => {
    try {
      const updated = await api.updateRequest(id, { note });
      setRequests((list) => list.map((r) => (r.id === id ? updated : r)));
      say('Заметка сохранена');
    } catch (e) {
      say(errorText(e), true);
    }
  };
  const remove = async (id: string) => {
    try {
      await api.deleteRequest(id);
      setRequests((list) => list.filter((r) => r.id !== id));
    } catch (e) {
      say(errorText(e), true);
    }
  };

  if (!session) return <div className="a-boot">Загружаем кабинет…</div>;
  if (!session.authenticated) return <Login session={session} onDone={loadSession} />;

  const go = (v: View) => {
    setView(v);
    setMenu(false);
    window.scrollTo({ top: 0 });
  };

  const title = view === 'requests' ? 'Заявки' : view === 'stats' ? 'Статистика' : section?.title;
  const description =
    view === 'requests' ? 'Заявки из формы «Перезвоните мне». Новые проверяются каждые 30 секунд.' : view === 'stats' ? 'Сколько людей заходит на сайт и нажимает «Записаться».' : section?.description;

  return (
    <div className={`a-app ${menu ? 'menu-open' : ''}`}>
      <GoldDefs />
      <aside className="a-side">
        <div className="a-side__brand">
          <Mark />
          <span>Кабинет</span>
        </div>
        <nav className="a-nav">
          <button type="button" aria-current={view === 'requests' || undefined} onClick={() => go('requests')}>
            <Ico name="requests" /> Заявки {fresh > 0 && <span className="a-badge">{fresh}</span>}
          </button>
          <button type="button" aria-current={view === 'stats' || undefined} onClick={() => go('stats')}>
            <Ico name="stats" /> Статистика
          </button>
          <p className="a-nav__group">Содержимое сайта</p>
          {sections.map((s) => (
            <button key={s.key} type="button" aria-current={view === s.key || undefined} onClick={() => go(s.key)}>
              <Ico name={s.icon} /> {s.title}
              {draft[s.key] !== undefined && <span className="a-dot" title="Есть несохранённые изменения" />}
              {draft[s.key] === undefined && saved[s.key] !== undefined && <span className="a-edited" title="Изменено в кабинете" />}
            </button>
          ))}
        </nav>
        <div className="a-side__foot">
          <span className={`a-storage a-storage--${session.storage}`}>
            {session.storage === 'redis' ? 'База: онлайн' : session.storage === 'files' ? 'База: локальная папка .data' : 'База не подключена'}
          </span>
          <a className="a-link" href="/" target="_blank" rel="noopener noreferrer">
            Открыть сайт ↗
          </a>
          <button type="button" className="a-link" onClick={() => api.logout().then(loadSession)}>
            Выйти
          </button>
        </div>
      </aside>

      <header className="a-topbar">
        <button type="button" className="a-burger" aria-label="Меню" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <span />
          <span />
        </button>
        <Mark />
        {fresh > 0 && (
          <button type="button" className="a-badge a-badge--top" onClick={() => go('requests')}>
            {fresh} новых
          </button>
        )}
      </header>

      <main className="a-main">
        <div className="a-head">
          <div>
            <h1>{title}</h1>
            <p className="a-muted">{description}</p>
          </div>
          {section && saved[section.key] !== undefined && (
            <button type="button" className="a-link" onClick={() => resetSection(section.key)}>
              Вернуть исходный текст
            </button>
          )}
        </div>

        {view === 'requests' && <Requests list={requests} loading={loadingReq} onStatus={setStatus} onNote={setNote} onDelete={remove} onRefresh={loadRequests} />}
        {view === 'stats' && <Stats />}
        {section && (
          <div className="a-panel" key={section.key}>
            <Fields fields={section.fields} value={value} onChange={(v) => setDraft((d) => ({ ...d, [section.key]: v }))} />
          </div>
        )}
      </main>

      {dirty.length > 0 && (
        <div className="a-savebar" role="region" aria-label="Несохранённые изменения">
          <span>
            Изменено: {dirty.map((k) => sections.find((s) => s.key === k)?.title).join(', ')}
          </span>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setDraft({})} disabled={saving}>
            Отменить
          </button>
          <button type="button" className="a-btn a-btn--gold" onClick={save} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить на сайте'}
          </button>
        </div>
      )}
      {toast && <div className={`a-toast ${toast.bad ? 'is-bad' : ''}`}>{toast.text}</div>}
    </div>
  );
}
