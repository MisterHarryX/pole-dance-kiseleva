import { useState } from 'react';
import { STATUSES, formatPhone, topicLabel, type CallbackRequest, type RequestStatus } from '../../shared/content.ts';

const when = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `сегодня, ${time}`;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `вчера, ${time}`;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${time}`;
};

export function Requests({
  list,
  loading,
  onStatus,
  onNote,
  onDelete,
  onRefresh,
}: {
  list: CallbackRequest[];
  loading: boolean;
  onStatus: (id: string, status: RequestStatus) => void;
  onNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<RequestStatus | 'all'>('new');
  const shown = filter === 'all' ? list : list.filter((r) => r.status === filter);
  const count = (s: RequestStatus) => list.filter((r) => r.status === s).length;

  return (
    <div className="a-requests">
      <div className="a-filter">
        {STATUSES.map((s) => (
          <button key={s.id} type="button" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
            {s.label}
            <span>{count(s.id)}</span>
          </button>
        ))}
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Все<span>{list.length}</span>
        </button>
        <button type="button" className="a-filter__refresh" onClick={onRefresh} disabled={loading}>
          {loading ? 'Обновляем…' : '↻ Обновить'}
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="a-empty">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <path d="M60 10V110M48 110H72" stroke="url(#a-gold)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M60 40C78 40 92 50 92 66" stroke="url(#a-gold)" strokeWidth="1.6" fill="none" opacity=".6" />
            <path d="M92 20C93 26 96 29 102 30C96 31 93 34 92 40C91 34 88 31 82 30C88 29 91 26 92 20Z" stroke="url(#a-gold)" strokeWidth="1.4" fill="none" />
          </svg>
          <p>{filter === 'new' ? 'Новых заявок нет — все обработаны' : 'Здесь пока пусто'}</p>
          <small>Заявки приходят из формы «Перезвоните мне» на сайте.</small>
        </div>
      ) : (
        <ul className="a-cards">
          {shown.map((r) => {
            const digits = r.phone.replace(/\D/g, '');
            return (
              <li key={r.id} className={`a-card a-card--${r.status}`}>
                <div className="a-card__head">
                  <div>
                    <p className="a-card__name">{r.name}</p>
                    <p className="a-card__meta">
                      {when(r.ts)} · <span className="a-chip">{topicLabel(r.topic)}</span>
                    </p>
                  </div>
                  <span className={`a-status a-status--${r.status}`}>{STATUSES.find((s) => s.id === r.status)?.label}</span>
                </div>
                <div className="a-card__contact">
                  <a href={`tel:+${digits}`} className="a-card__phone">
                    {formatPhone(r.phone)}
                  </a>
                  <a className="a-pill" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                  <a className="a-pill" href={`https://t.me/+${digits}`} target="_blank" rel="noopener noreferrer">
                    Telegram
                  </a>
                </div>
                {r.comment && <p className="a-card__comment">«{r.comment}»</p>}
                <textarea
                  className="a-card__note"
                  rows={2}
                  defaultValue={r.note ?? ''}
                  placeholder="Заметка для себя: когда перезвонить, куда записали…"
                  onBlur={(e) => e.target.value !== (r.note ?? '') && onNote(r.id, e.target.value)}
                />
                <div className="a-card__actions">
                  {STATUSES.filter((s) => s.id !== r.status).map((s) => (
                    <button key={s.id} type="button" className={`a-btn ${s.id === 'done' ? 'a-btn--gold' : 'a-btn--ghost'}`} onClick={() => onStatus(r.id, s.id)}>
                      {s.id === 'work' ? 'Взять в работу' : s.id === 'done' ? 'Готово ✓' : 'Вернуть в новые'}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="a-link a-link--danger"
                    onClick={() => {
                      if (confirm(`Удалить заявку от ${r.name}? Это нельзя отменить.`)) onDelete(r.id);
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
