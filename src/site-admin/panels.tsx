import { useMemo, useState, type ReactNode } from 'react';
import { sections } from '../admin/schema.ts';
import { sectionTitle, type Entry } from './model.ts';

const Close = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

export function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div data-site-admin role="dialog" aria-label={title} className="sa-panel" onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onClose();
      }}>
      <div className="sa-panel__head">
        <h2>
          <span className="sa-diamond" aria-hidden="true" />
          {title}
        </h2>
        <button type="button" className="sa-icon" onClick={onClose} aria-label="Закрыть">
          <Close />
        </button>
      </div>
      <div className="sa-panel__body">{children}</div>
    </div>
  );
}

/** Every text the cabinet knows, in one searchable list: for what is hard to click (moving words, hidden tabs). */
export function TextsPanel({
  entries,
  original,
  changed,
  onApply,
  onClose,
}: {
  entries: Entry[];
  original: Record<string, string>;
  changed: Set<string>;
  onApply: (path: string, value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (section === 'changed' && !changed.has(e.path)) return false;
      if (section !== 'all' && section !== 'changed' && e.section !== section) return false;
      return !q || e.value.toLowerCase().includes(q) || e.label.toLowerCase().includes(q);
    });
  }, [entries, query, section, changed]);

  const tabs: [string, string][] = [['all', 'Все'], ['changed', `Изменённые · ${changed.size}`], ...sections.filter((s) => entries.some((e) => e.section === s.key)).map((s) => [s.key, s.title] as [string, string])];

  return (
    <Panel title="Все тексты" onClose={onClose}>
      <div className="sa-panel__tools">
        <input type="search" className="sa-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти текст…" aria-label="Поиск по текстам" />
        <div className="sa-tabs">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="sa-list">
        {rows.map((entry) => (
          <li key={entry.path}>
            {open === entry.path ? (
              <div className="sa-list__edit">
                <p>
                  {sectionTitle(entry.section)} · {entry.label}
                </p>
                <textarea autoFocus className="sa-input" value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(7, Math.max(2, Math.ceil(draft.length / 46)))} />
                <div className="sa-pop__actions">
                  {draft !== original[entry.path] && original[entry.path] !== undefined && (
                    <button type="button" className="sa-btn sa-btn--quiet" onClick={() => setDraft(original[entry.path])}>
                      Исходный
                    </button>
                  )}
                  <span className="sa-spacer" />
                  <button type="button" className="sa-btn sa-btn--quiet" onClick={() => setOpen(null)}>
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="sa-btn sa-btn--gold"
                    onClick={() => {
                      if (draft.trim()) onApply(entry.path, draft.trim());
                      setOpen(null);
                    }}
                  >
                    Применить
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="sa-list__row"
                onClick={() => {
                  setOpen(entry.path);
                  setDraft(entry.value);
                }}
              >
                <span>
                  <span className="sa-list__text">{entry.value}</span>
                  <small>
                    {sectionTitle(entry.section)} · {entry.label}
                  </small>
                </span>
                {changed.has(entry.path) && <span className="sa-dot" aria-label="изменено" />}
              </button>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="sa-empty">Ничего не найдено</li>}
      </ul>
    </Panel>
  );
}

export interface ContactValues {
  phone: string;
  booking: string;
  socials: { path: string; label: string; href: string }[];
}

const phoneOk = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};
const urlOk = (value: string) => !value.trim() || /^https:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(value.trim());

/** Phone, online booking and socials: validated so a typo cannot break the buttons. */
export function ContactsPanel({ value, onApply, onClose }: { value: ContactValues; onApply: (next: ContactValues) => void; onClose: () => void }) {
  const [phone, setPhone] = useState(value.phone);
  const [booking, setBooking] = useState(value.booking);
  const [socials, setSocials] = useState(value.socials);
  const bookingOk = urlOk(booking) && Boolean(booking.trim());
  const allOk = phoneOk(phone) && bookingOk && socials.every((s) => urlOk(s.href));

  return (
    <Panel title="Контакты" onClose={onClose}>
      <form
        className="sa-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!allOk) return;
          onApply({ phone: phone.trim(), booking: booking.trim(), socials: socials.map((s) => ({ ...s, href: s.href.trim() })) });
          onClose();
        }}
      >
        <label className="sa-field">
          <span>Телефон</span>
          <input className="sa-input" data-bad={!phoneOk(phone)} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (910) 473-42-53" inputMode="tel" autoComplete="off" />
          <small data-bad={!phoneOk(phone)}>{phoneOk(phone) ? 'Номер на сайте и ссылка «позвонить» поменяются вместе.' : 'Проверьте номер: 10–15 цифр'}</small>
        </label>
        <label className="sa-field">
          <span>Онлайн-запись (YCLIENTS)</span>
          <input className="sa-input" data-bad={!bookingOk} value={booking} onChange={(e) => setBooking(e.target.value)} placeholder="https://…yclients.com/" autoComplete="off" spellCheck={false} />
          {!bookingOk && <small data-bad>Нужна ссылка, начинающаяся с https://</small>}
        </label>
        {socials.map((s, i) => (
          <label className="sa-field" key={s.path}>
            <span>{s.label}</span>
            <input
              className="sa-input"
              data-bad={!urlOk(s.href)}
              value={s.href}
              onChange={(e) => setSocials((list) => list.map((item, j) => (j === i ? { ...item, href: e.target.value } : item)))}
              placeholder="https://…"
              autoComplete="off"
              spellCheck={false}
            />
            {!urlOk(s.href) && <small data-bad>Нужна ссылка, начинающаяся с https://</small>}
          </label>
        ))}
        <p className="sa-note">Кнопки «Записаться», телефон и значки соцсетей обновятся после публикации.</p>
        <div className="sa-pop__actions">
          <span className="sa-spacer" />
          <button type="button" className="sa-btn sa-btn--quiet" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="sa-btn sa-btn--gold" disabled={!allOk}>
            Применить
          </button>
        </div>
      </form>
    </Panel>
  );
}

// --- Photos -----------------------------------------------------------------------------

export type MediaState = 'original' | 'replaced' | 'hidden' | 'inserted';

export interface MediaItem {
  /** Media key ("/photos/hall-neon") or the insert id for added photos. */
  key: string;
  insert?: boolean;
  thumb: string;
  label: string;
  state: MediaState;
}

const STATE_TEXT: Record<MediaState, string> = {
  original: 'исходное',
  replaced: 'заменено',
  hidden: 'скрыто',
  inserted: 'добавлено вами',
};

/** Actions on one photo, anchored next to it (replace, hide, restore, remove). */
export function MediaPopover({
  item,
  rect,
  busy,
  onReplace,
  onHide,
  onRestore,
  onRemove,
  onClose,
}: {
  item: MediaItem;
  rect: DOMRect;
  busy: boolean;
  onReplace: () => void;
  onHide: () => void;
  onRestore: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const width = 300;
  const top = Math.min(Math.max(12, rect.top + 12), window.innerHeight - 330);
  const left = Math.min(Math.max(12, rect.left + 12), window.innerWidth - width - 12);
  return (
    <div data-site-admin role="dialog" aria-label={`Фото: ${item.label}`} className="sa-pop sa-media" style={{ top, left, width }} onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onClose();
      }}>
      <div className="sa-pop__head">
        <p>
          <span>Фото</span> · {item.label}
        </p>
        <button type="button" className="sa-icon" onClick={onClose} aria-label="Закрыть">
          <Close />
        </button>
      </div>
      <div className="sa-pop__body">
        {item.thumb ? <img className="sa-media__thumb" src={item.thumb} alt="" /> : <div className="sa-media__thumb sa-media__thumb--empty">Нет фото</div>}
        <p className="sa-note">Сейчас: {STATE_TEXT[item.state]}</p>
        <div className="sa-media__actions">
          <button type="button" className="sa-btn sa-btn--gold" onClick={onReplace} disabled={busy} autoFocus>
            {busy ? 'Загружаю…' : 'Заменить фото'}
          </button>
          {item.insert ? (
            <button type="button" className="sa-btn sa-btn--quiet" onClick={onRemove} disabled={busy}>
              Убрать с сайта
            </button>
          ) : (
            <>
              {item.state !== 'hidden' && (
                <button type="button" className="sa-btn sa-btn--quiet" onClick={onHide} disabled={busy}>
                  Скрыть
                </button>
              )}
              {(item.state === 'replaced' || item.state === 'hidden') && (
                <button type="button" className="sa-btn sa-btn--quiet" onClick={onRestore} disabled={busy}>
                  Вернуть исходное
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Every photo on the page, to replace, hide or bring back, including ones hidden earlier. */
export function PhotosPanel({
  items,
  busyKey,
  onReplace,
  onHide,
  onRestore,
  onRemove,
  onShow,
  onClose,
}: {
  items: MediaItem[];
  busyKey: string | null;
  onReplace: (item: MediaItem) => void;
  onHide: (item: MediaItem) => void;
  onRestore: (item: MediaItem) => void;
  onRemove: (item: MediaItem) => void;
  onShow: (item: MediaItem) => void;
  onClose: () => void;
}) {
  return (
    <Panel title="Фото на сайте" onClose={onClose}>
      <p className="sa-panel__intro">
        Нажмите на фото прямо на странице в режиме «Редактировать» или выберите здесь. Новое фото можно вставить кнопкой «Вставить фото» после любого абзаца.
      </p>
      <ul className="sa-photos">
        {items.map((item) => (
          <li key={item.key} data-state={item.state}>
            <button type="button" className="sa-photos__thumb" onClick={() => onShow(item)} aria-label={`Показать на странице: ${item.label}`}>
              {item.thumb ? <img src={item.thumb} alt="" loading="lazy" /> : <span>нет</span>}
            </button>
            <span className="sa-photos__text">
              <span>{item.label}</span>
              <small>{STATE_TEXT[item.state]}</small>
            </span>
            <span className="sa-photos__actions">
              <button type="button" className="sa-btn sa-btn--quiet" onClick={() => onReplace(item)} disabled={busyKey === item.key}>
                {busyKey === item.key ? '…' : 'Заменить'}
              </button>
              {item.insert ? (
                <button type="button" className="sa-btn sa-btn--quiet" onClick={() => onRemove(item)}>
                  Убрать
                </button>
              ) : item.state === 'hidden' || item.state === 'replaced' ? (
                <button type="button" className="sa-btn sa-btn--quiet" onClick={() => onRestore(item)}>
                  Вернуть
                </button>
              ) : (
                <button type="button" className="sa-btn sa-btn--quiet" onClick={() => onHide(item)}>
                  Скрыть
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
