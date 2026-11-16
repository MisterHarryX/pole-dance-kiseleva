import { useEffect, useState } from 'react';
import { DEFAULT_WORK_HOURS, type WorkHours } from '../../../shared/schedule.ts';
import type { ContentOverrides } from '../../../shared/content.ts';
import { AdminIcon } from '../icons.tsx';
import { useAdmin } from '../store.tsx';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const STORAGE_TEXT = {
  redis: { title: 'Онлайн-база подключена', text: 'Заявки, статистика и правки хранятся в Upstash Redis и доступны с любого устройства.' },
  files: {
    title: 'Данные хранятся в папке на компьютере',
    text: 'Так работает запуск на своём компьютере: всё лежит в папке .data. На Vercel подключается онлайн-база.',
  },
  none: {
    title: 'Хранилище не подключено',
    text: 'Сайт работает, но заявки, статистика и правки не сохраняются. Подключите онлайн-базу.',
  },
} as const;

/** Studio hours, the live editor, notifications, storage status and data export (as in ISPANA). */
export function Settings({ onLogout }: { onLogout: () => void }) {
  const { overrides, saveOverrides, toast, status, notifications, setNotifications } = useAdmin();
  const [hours, setHours] = useState<WorkHours>(overrides.hours ?? DEFAULT_WORK_HOURS);
  const [busy, setBusy] = useState(false);
  useEffect(() => setHours(overrides.hours ?? DEFAULT_WORK_HOURS), [overrides.hours]);

  const changed = JSON.stringify(hours) !== JSON.stringify(overrides.hours ?? DEFAULT_WORK_HOURS);
  const valid = hours.start < hours.end && hours.days.length > 0;
  const pageEdits = overrides.page ? Object.keys(overrides.page.free ?? {}).length + Object.keys(overrides.page.media ?? {}).length + (overrides.page.inserts?.length ?? 0) : 0;

  const withoutStamp = (): ContentOverrides => {
    const next = { ...overrides };
    delete next.updatedAt;
    return next;
  };

  const save = async () => {
    setBusy(true);
    const ok = await saveOverrides({ ...withoutStamp(), hours });
    setBusy(false);
    if (ok) toast('Часы студии сохранены — расписание уже подсвечивает новое время.');
  };

  const resetPage = async () => {
    if (!confirm('Убрать все правки, сделанные прямо на странице (тексты вне разделов, заменённые, скрытые и вставленные фото)?')) return;
    const next = withoutStamp();
    delete next.page;
    if (await saveOverrides(next)) toast('Правки на странице сброшены — сайт снова как в исходной версии.');
  };

  const toggleNotifications = async () => {
    if (notifications) return setNotifications(false);
    if (!('Notification' in window)) return toast('Этот браузер не умеет показывать уведомления.', 'error');
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission === 'granted') {
      setNotifications(true);
      toast('Готово: о новой заявке браузер сообщит, даже если кабинет в фоновой вкладке.');
    } else toast('Браузер не разрешил уведомления. Их можно включить в настройках сайта в браузере.', 'error');
  };

  const storage = STORAGE_TEXT[status.backend];

  return (
    <div className="a-settings">
      <section className="a-panel">
        <h3 className="a-block__title">Часы студии</h3>
        <p className="a-meta">По ним расписание подсвечивает рабочее время и предупреждает, если занятие поставлено вне его. Время — {status.tz.replace('Europe/', '').replace('_', ' ')}.</p>
        <div className="a-days" role="group" aria-label="Рабочие дни">
          {WEEKDAYS.map((label, i) => {
            const day = i + 1;
            const on = hours.days.includes(day);
            return (
              <button key={day} type="button" aria-pressed={on} onClick={() => setHours({ ...hours, days: on ? hours.days.filter((d) => d !== day) : [...hours.days, day].sort() })}>
                {label}
              </button>
            );
          })}
        </div>
        <div className="a-grid3">
          <label className="a-field">
            <span>С</span>
            <input type="time" className="a-input" step={900} value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} />
          </label>
          <label className="a-field">
            <span>До</span>
            <input type="time" className="a-input" step={900} value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} />
          </label>
          <label className="a-field">
            <span>Длина занятия</span>
            <select className="a-input" value={hours.slotMinutes} onChange={(e) => setHours({ ...hours, slotMinutes: Number(e.target.value) })}>
              {[30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} мин
                </option>
              ))}
            </select>
          </label>
        </div>
        {!valid && <p className="a-warn">Начало дня должно быть раньше конца, и хотя бы один день — рабочим.</p>}
        <div className="a-row">
          <button type="button" className="a-btn a-btn--primary a-btn--sm" disabled={!changed || !valid || busy} onClick={save}>
            {busy ? 'Сохраняю…' : 'Сохранить часы'}
          </button>
          {changed && (
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setHours(overrides.hours ?? DEFAULT_WORK_HOURS)}>
              Отменить
            </button>
          )}
        </div>
      </section>

      <section className="a-panel">
        <h3 className="a-block__title">Редактор на сайте</h3>
        <p className="a-meta">
          Откройте сайт в режиме правки и нажмите на любой текст или фото: поменяйте, скройте, вставьте новое фото после абзаца. Внизу экрана — золотая панель с кнопкой «Опубликовать».
        </p>
        <div className="a-row">
          <a className="a-btn a-btn--primary a-btn--sm" href="/?edit">
            <AdminIcon name="content" size={15} /> Редактировать сайт
          </a>
          {pageEdits > 0 && (
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={resetPage}>
              Сбросить правки на странице · {pageEdits}
            </button>
          )}
        </div>
        <p className="a-meta">Тексты из разделов (первый экран, вопросы, тренеры…) редактор меняет там же, где и «Разделы сайта», — они всегда совпадают.</p>
      </section>

      <section className="a-panel">
        <h3 className="a-block__title">Уведомления</h3>
        <label className="a-switch">
          <input type="checkbox" checked={notifications} onChange={toggleNotifications} />
          <span className="a-switch__track" aria-hidden="true" />
          Сообщать о новых заявках в браузере
        </label>
        <p className="a-meta">Кабинет проверяет новые заявки каждые 15 секунд, пока открыт. Число новых видно и в названии вкладки.</p>
      </section>

      <section className="a-panel" data-tone={status.backend}>
        <h3 className="a-block__title">Хранилище</h3>
        <p className="a-storage">
          <span className="a-storage__dot" data-backend={status.backend} aria-hidden="true" />
          <strong>{storage.title}</strong>
        </p>
        <p className="a-meta">{storage.text}</p>
        <p className="a-meta">
          Фото из редактора и разделов сайта:{' '}
          {status.media === 'blob'
            ? 'Vercel Blob — быстрые ссылки для любых размеров.'
            : status.media === 'redis'
              ? 'в онлайн-базе. Для множества больших фото лучше подключить Vercel Blob (Storage → Blob).'
              : status.media === 'files'
                ? 'в папке .data/media.'
                : 'не подключено — загрузка фото недоступна.'}
        </p>
        {status.backend !== 'redis' && (
          <ol className="a-steps-list">
            <li>В проекте на Vercel откройте Storage → Marketplace → Upstash → Redis и подключите базу к проекту.</li>
            <li>Vercel сам добавит переменные KV_REST_API_URL и KV_REST_API_TOKEN.</li>
            <li>Задайте ADMIN_PASSWORD в Settings → Environment Variables и сделайте Redeploy.</li>
          </ol>
        )}
      </section>

      <section className="a-panel">
        <h3 className="a-block__title">Данные</h3>
        <div className="a-row">
          <a className="a-btn a-btn--ghost a-btn--sm" href="/api/admin/export" download>
            <AdminIcon name="download" size={15} /> Выгрузить всё (JSON)
          </a>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={onLogout}>
            <AdminIcon name="logout" size={15} /> Выйти из кабинета
          </button>
        </div>
        <p className="a-meta">Пароль задаётся переменной ADMIN_PASSWORD (тот же, что у панели ISPANA). Вход действует 14 дней на каждом устройстве.</p>
      </section>
    </div>
  );
}
