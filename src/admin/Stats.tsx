import { useEffect, useState } from 'react';
import type { DayStats } from '../../shared/content.ts';
import { api, errorText } from './api.ts';

const label = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

export function Stats() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<DayStats[] | null>(null);
  const [problem, setProblem] = useState('');
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    api
      .stats(days)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setProblem(errorText(e)));
    return () => {
      alive = false;
    };
  }, [days]);

  if (problem) return <p className="a-error">{problem}</p>;
  if (!rows) return <p className="a-muted">Загружаем…</p>;

  const sum = (k: keyof Omit<DayStats, 'day'>) => rows.reduce((a, r) => a + r[k], 0);
  const views = sum('view');
  const books = sum('book');
  const conversion = views ? Math.round((books / views) * 100) : 0;
  const max = Math.max(1, ...rows.map((r) => r.view));
  const h = hover !== null ? rows[hover] : null;

  return (
    <div className="a-stats">
      <div className="a-filter">
        {[7, 30, 90].map((d) => (
          <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>
            {d} дней
          </button>
        ))}
      </div>
      <div className="a-kpis">
        <div className="a-kpi">
          <span>Посещения</span>
          <strong>{views}</strong>
        </div>
        <div className="a-kpi a-kpi--gold">
          <span>Нажали «Записаться»</span>
          <strong>{books}</strong>
          <small>{conversion}% посетителей</small>
        </div>
        <div className="a-kpi">
          <span>Звонки с сайта</span>
          <strong>{sum('call')}</strong>
        </div>
        <div className="a-kpi">
          <span>Заявки «Перезвоните»</span>
          <strong>{sum('request')}</strong>
        </div>
      </div>

      <div className="a-chart" onPointerLeave={() => setHover(null)}>
        <div className="a-chart__tip" aria-live="polite">
          {h ? (
            <>
              <b>{label(h.day)}</b> · посещений {h.view} · «Записаться» {h.book} · звонков {h.call} · заявок {h.request}
            </>
          ) : (
            'Наведите на столбик, чтобы увидеть день'
          )}
        </div>
        <div className="a-chart__bars" role="img" aria-label="Посещения и нажатия «Записаться» по дням">
          {rows.map((r, i) => (
            <span key={r.day} className={`a-bar ${hover === i ? 'is-hover' : ''}`} onPointerEnter={() => setHover(i)}>
              <span className="a-bar__view" style={{ height: `${(r.view / max) * 100}%` }} />
              <span className="a-bar__book" style={{ height: `${(r.book / max) * 100}%` }} />
            </span>
          ))}
        </div>
        <div className="a-chart__axis">
          <span>{label(rows[0].day)}</span>
          <span>{label(rows[rows.length - 1].day)}</span>
        </div>
        <div className="a-legend">
          <span>
            <i className="a-legend__view" /> посещения
          </span>
          <span>
            <i className="a-legend__book" /> нажали «Записаться»
          </span>
        </div>
      </div>
      <p className="a-muted">Посещение считается один раз за визит. Собственные визиты из кабинета не учитываются.</p>
    </div>
  );
}
