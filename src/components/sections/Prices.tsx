import { useState } from 'react';
import { contacts, pricing, type Package } from '../../config/site.ts';
import { Heading } from '../ui/Heading.tsx';
import { Icon } from '../ui/Icon.tsx';
import { AnimatedNumber } from '../ui/Motion.tsx';

const rub = (n: number) => `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;

type Tab = 'base' | 'vip' | 'personal';

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function Calculator({ plan }: { plan: typeof pricing.base | typeof pricing.vip }) {
  const options: Package[] = [{ count: 1, price: plan.single }, ...plan.packages];
  const [count, setCount] = useState(8);
  const pick = options.find((o) => o.count === count) ?? options[0];
  const per = Math.round(pick.price / pick.count);
  const saving = plan.single * pick.count - pick.price;
  const maxPer = plan.single;

  return (
    <div className="calc">
      <div className="calc__controls">
        <p className="calc__label" id={`calc-${plan.id}`}>
          Сколько тренировок?
        </p>
        <div className="calc__chips" role="radiogroup" aria-labelledby={`calc-${plan.id}`}>
          {options.map((o) => (
            <button
              key={o.count}
              type="button"
              role="radio"
              aria-checked={o.count === count}
              className="calc__chip"
              onClick={() => setCount(o.count)}
            >
              {o.count === 1 ? 'Разовое' : o.count}
            </button>
          ))}
        </div>

        <div className="calc__chart" aria-hidden="true">
          {options.map((o) => {
            const p = o.price / o.count;
            return (
              <button
                key={o.count}
                type="button"
                tabIndex={-1}
                className={`calc__bar ${o.count === count ? 'is-on' : ''}`}
                style={{ ['--h' as string]: `${(p / maxPer) * 100}%` }}
                onClick={() => setCount(o.count)}
              >
                <span className="calc__bar-fill" />
                <span className="calc__bar-val">{Math.round(p)}</span>
                <span className="calc__bar-cap">{o.count === 1 ? '1' : o.count}</span>
              </button>
            );
          })}
        </div>
        <p className="calc__chart-note">Цена одной тренировки, ₽</p>
      </div>

      <div className="calc__result" aria-live="polite">
        <p className="calc__plan">
          Абонемент <strong className="gold-text">{plan.title}</strong>
        </p>
        <p className="calc__count">
          {pick.count === 1 ? 'Разовое занятие' : `${pick.count} ${plural(pick.count, 'тренировка', 'тренировки', 'тренировок')}`}
        </p>
        <p className="calc__total">
          <AnimatedNumber value={pick.price} format={rub} />
        </p>
        <dl className="calc__meta">
          <div>
            <dt>За тренировку</dt>
            <dd>
              <AnimatedNumber value={per} format={rub} />
            </dd>
          </div>
          <div>
            <dt>Экономия</dt>
            <dd className={saving > 0 ? 'is-gold' : ''}>{saving > 0 ? <AnimatedNumber value={saving} format={rub} /> : '—'}</dd>
          </div>
          <div>
            <dt>Срок</dt>
            <dd>{pick.days ? `${pick.days} дней` : pick.count === 1 ? 'одно занятие' : 'уточняйте'}</dd>
          </div>
        </dl>
        <p className="calc__note">
          <Icon name="sparkle" size={14} /> {plan.note}
        </p>
        <a className="btn btn--gold" href={contacts.booking} target="_blank" rel="noopener noreferrer">
          <span className="btn__label">Записаться</span>
        </a>
      </div>
    </div>
  );
}

function Personal() {
  const [who, setWho] = useState(0);
  const list = pricing.personal[who];
  return (
    <div className="personal">
      <div className="switch" role="radiogroup" aria-label="Тренер">
        {pricing.personal.map((p, i) => (
          <button key={p.id} type="button" role="radio" aria-checked={i === who} onClick={() => setWho(i)}>
            {p.title}
          </button>
        ))}
        <span className="switch__thumb" style={{ transform: `translateX(${who * 100}%)` }} aria-hidden="true" />
      </div>
      <ul className="price-list" key={list.id}>
        {list.rows.map((r, i) => (
          <li key={r.label} style={{ animationDelay: `${i * 50}ms` }}>
            <span>{r.label}</span>
            <span className="price-list__dots" aria-hidden="true" />
            <strong>{r.price}</strong>
          </li>
        ))}
      </ul>
      <ul className="notes">
        {pricing.personalNotes.map((n) => (
          <li key={n}>
            <Icon name="check" size={16} />
            {n}
          </li>
        ))}
      </ul>
      <a className="btn btn--gold" href={contacts.bookingPersonal} target="_blank" rel="noopener noreferrer">
        <span className="btn__label">Записаться на индивидуальную</span>
      </a>
    </div>
  );
}

export function Prices() {
  const [tab, setTab] = useState<Tab>('vip');
  const tabs: { id: Tab; label: string; sub: string }[] = [
    { id: 'vip', label: 'VIP', sub: 'все направления' },
    { id: 'base', label: 'BASE', sub: 'базовые группы' },
    { id: 'personal', label: 'Индивидуально', sub: 'один на один' },
  ];

  return (
    <section className="section s-light prices" id="prices" aria-labelledby="prices-title">
      <div className="container">
        <Heading
          eyebrow="Цены"
          title={
            <>
              Абонементы <em className="gold-text">и калькулятор</em>
            </>
          }
          lead="Выберите абонемент и число тренировок — посчитаем цену одного занятия и вашу выгоду."
          id="prices-title"
        />

        <div className="prices__layout">
          <aside className="trial-card" data-reveal>
            <span className="trial-card__ribbon">Первый шаг</span>
            <p className="trial-card__kicker">Пробное занятие в группе</p>
            <p className="trial-card__price gold-text">0 ₽</p>
            <p className="trial-card__text">{pricing.trial.free}.</p>
            <p className="trial-card__alt">
              Без покупки абонемента — <strong>{rub(pricing.trial.paid)}</strong>
            </p>
            <a className="btn btn--dark" href={contacts.booking} target="_blank" rel="noopener noreferrer">
              <span className="btn__label">Записаться на пробное</span>
            </a>
          </aside>

          <div className="prices__main" data-reveal data-reveal-delay="100">
            <div className="tabs" role="tablist" aria-label="Вид абонемента">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`price-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="price-panel"
                  className="tabs__tab"
                  onClick={() => setTab(t.id)}
                >
                  <strong>{t.label}</strong>
                  <small>{t.sub}</small>
                </button>
              ))}
            </div>
            <div className="prices__panel" id="price-panel" role="tabpanel" aria-labelledby={`price-tab-${tab}`} key={tab}>
              {tab === 'personal' ? <Personal /> : <Calculator plan={tab === 'vip' ? pricing.vip : pricing.base} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
