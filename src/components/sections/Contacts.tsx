import { useRef, useState, type FormEvent } from 'react';
import { TOPICS } from '../../../shared/content.ts';
import { contacts, pricing } from '../../config/site.ts';
import { serverUrl } from '../../lib/paths.ts';
import { useOnce } from '../../hooks/useInView.ts';
import { DecoCorners, Draw, Flourish } from '../ui/Art.tsx';
import { Icon } from '../ui/Icon.tsx';

/** «Ждём вас в зале»: letters drop in one by one, then a gold flourish draws underneath. */
function LetterTitle() {
  const ref = useRef<HTMLHeadingElement>(null);
  const seen = useOnce(ref);
  const parts = [
    { text: 'Ждём вас ', gold: false },
    { text: 'в зале', gold: true },
  ];
  let i = 0;
  return (
    <div className="letter-title-wrap">
      <h2 ref={ref} className={`letter-title ${seen ? 'is-in' : ''}`} id="contacts-title" aria-label="Ждём вас в зале">
        {parts.map((p) => (
          <span key={p.text} className={p.gold ? 'letter-title__gold' : ''} aria-hidden="true">
            {[...p.text].map((ch) => (
              <span key={i} className={`ch ${p.gold ? 'gold-text' : ''}`} style={{ ['--i' as string]: i++ }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        ))}
      </h2>
      <Flourish className="letter-title__flourish" />
    </div>
  );
}

const rub = (n: number) => `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;

/** Options are built on render, so prices edited in the panel show up here too. */
const bookingOptions = () => [
  {
    id: 'trial',
    label: 'Пробное',
    title: 'Пробное занятие в группе',
    text: `Бесплатно при покупке абонемента в тот же день, без покупки — ${rub(pricing.trial.paid)}.`,
    href: contacts.booking,
  },
  {
    id: 'group',
    label: 'Группа',
    title: 'Групповые тренировки',
    text: 'Выберите направление и удобное время в расписании групп.',
    href: contacts.bookingGroups,
  },
  {
    id: 'personal',
    label: 'Индивидуально',
    title: 'Индивидуальная тренировка',
    text: `С тренером студии — пробная ${pricing.personal[0]?.rows[0]?.price ?? ''}, с Евгенией Киселёвой — ${pricing.personal[1]?.rows[0]?.price ?? ''}.`,
    href: contacts.bookingPersonal,
  },
  {
    id: 'care',
    label: 'Массаж и уход',
    title: 'Массаж и косметология',
    text: 'Восстановление после тренировки в кабинете студии.',
    href: contacts.bookingPersonal,
  },
];

/** Formats digits as +7 (900) 000-00-00 while typing. */
function maskPhone(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  if (!d.startsWith('7')) d = `7${d}`;
  d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let out = '+7';
  if (p[0]) out += ` (${p[0]}`;
  if (p[0].length === 3) out += ')';
  if (p[1]) out += ` ${p[1]}`;
  if (p[2]) out += `-${p[2]}`;
  if (p[3]) out += `-${p[3]}`;
  return out;
}

type FormState = 'idle' | 'sending' | 'done' | 'error' | 'storage';

/** «Перезвоните мне»: the request lands in the panel at /admin. */
function CallbackForm() {
  const [state, setState] = useState<FormState>('idle');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState<string>('trial');
  const [problem, setProblem] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return setProblem('Как к вам обращаться?');
    if (phone.replace(/\D/g, '').length < 11) return setProblem('Проверьте номер телефона');
    if (!form.get('consent')) return setProblem('Нужно согласие на обработку данных');
    setProblem('');
    setState('sending');
    try {
      // text/plain keeps it a simple request, so the GitHub Pages copy can post to Vercel without a preflight.
      const response = await fetch(serverUrl('/api/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          name,
          phone,
          topic,
          comment: String(form.get('comment') ?? ''),
          consent: true,
          website: String(form.get('website') ?? ''),
        }),
      });
      if (response.ok) setState('done');
      else setState(response.status === 503 ? 'storage' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="cb-done" role="status">
        <Draw viewBox="0 0 80 80" width={2.4} className="cb-done__art">
          <circle pathLength={1} cx="40" cy="40" r="34" />
          <path pathLength={1} d="M24 41L35 52L57 29" />
        </Draw>
        <p className="cb-done__title">Заявка отправлена!</p>
        <p className="cb-done__text">Мы перезвоним, как только освободимся с тренировки. Хорошего дня!</p>
        <button type="button" className="quiz__back" onClick={() => setState('idle')}>
          Отправить ещё одну
        </button>
      </div>
    );
  }

  return (
    <form className="cb-form" onSubmit={submit} noValidate>
      <div className="cb-form__row">
        <label className="field">
          <span>Имя</span>
          <input name="name" autoComplete="given-name" maxLength={80} placeholder="Как к вам обращаться" />
        </label>
        <label className="field">
          <span>Телефон</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (900) 000-00-00"
            value={phone}
            onChange={(e) => setPhone(e.target.value ? maskPhone(e.target.value) : '')}
          />
        </label>
      </div>
      <div className="cb-form__topics" role="radiogroup" aria-label="Тема">
        {TOPICS.filter((t) => t.id !== 'other').map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={topic === t.id} onClick={() => setTopic(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Комментарий (необязательно)</span>
        <textarea name="comment" rows={2} maxLength={600} placeholder="Удобное время для звонка, опыт, вопросы" />
      </label>
      <input className="cb-form__hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="check">
        <input type="checkbox" name="consent" />
        <span>Согласна на обработку персональных данных, чтобы студия могла связаться со мной</span>
      </label>
      {problem && <p className="cb-form__problem">{problem}</p>}
      {state === 'error' && <p className="cb-form__problem">Не получилось отправить. Позвоните нам: {contacts.phone}</p>}
      {state === 'storage' && <p className="cb-form__problem">Заявки пока не принимаются онлайн — позвоните нам: {contacts.phone}</p>}
      <button className="btn btn--gold" type="submit" disabled={state === 'sending'}>
        <span className="btn__label">{state === 'sending' ? 'Отправляем…' : 'Перезвоните мне'}</span>
      </button>
    </form>
  );
}

/** Booking card: online booking in YCLIENTS, or a callback request to the studio. */
function BookingCard() {
  const options = bookingOptions();
  const [mode, setMode] = useState<'online' | 'call'>('online');
  const [pick, setPick] = useState(options[0].id);
  const opt = options.find((o) => o.id === pick)!;
  return (
    <div className="book-card" data-reveal>
      <DecoCorners />
      <div className="book-card__modes" role="tablist" aria-label="Способ записи">
        <button type="button" role="tab" aria-selected={mode === 'online'} onClick={() => setMode('online')}>
          <Icon name="calendar" size={16} /> Онлайн-запись
        </button>
        <button type="button" role="tab" aria-selected={mode === 'call'} onClick={() => setMode('call')}>
          <Icon name="phone" size={16} /> Перезвоните мне
        </button>
        <span className="book-card__mode-thumb" style={{ transform: `translateX(${mode === 'call' ? 100 : 0}%)` }} aria-hidden="true" />
      </div>
      {mode === 'online' ? (
        <div key="online" className="book-card__pane">
          <div className="book-card__chips" role="radiogroup" aria-label="На что записаться">
            {options.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={o.id === pick} onClick={() => setPick(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="book-card__body" key={opt.id} aria-live="polite">
            <p className="book-card__title">{opt.title}</p>
            <p className="book-card__text">{opt.text}</p>
          </div>
          <div className="book-card__actions">
            <a className="btn btn--gold" href={opt.href} target="_blank" rel="noopener noreferrer">
              <span className="btn__label">Выбрать время</span>
            </a>
            <a className="book-card__phone" href={contacts.phoneHref}>
              <Icon name="phone" size={16} /> {contacts.phone}
            </a>
          </div>
        </div>
      ) : (
        <div key="call" className="book-card__pane">
          <CallbackForm />
        </div>
      )}
    </div>
  );
}

type Leg = 'metro' | 'bus' | 'walk' | null;

/** Hand-drawn route scheme: metro → bus → stop → building with the studio's glowing window. */
function RouteMap({ onReal }: { onReal: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useOnce(ref);
  const [leg, setLeg] = useState<Leg>(null);

  const steps: { id: Exclude<Leg, null>; title: string; text: string }[] = [
    { id: 'metro', title: 'м. Новогиреево', text: 'Калининская линия' },
    { id: 'bus', title: 'Автобус', text: 'до остановки «Саянская улица, 5»' },
    { id: 'walk', title: '2 минуты пешком', text: 'дом 7, 4 этаж, студия №403' },
  ];

  const routeBus = 'M96 428C150 420 190 392 236 380C292 364 330 352 372 318';
  const routeWalk = 'M372 318C392 300 410 286 432 262';

  return (
    <div ref={ref} className={`route ${seen ? 'is-in' : ''} ${leg ? `hl-${leg}` : ''}`}>
      <svg className="route__svg" viewBox="0 0 560 500" role="img" aria-label="Схема проезда от метро Новогиреево до студии на Саянской улице, 7">
        <defs>
          <pattern id="trees" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="3.2" fill="rgba(200,162,90,.22)" />
            <circle cx="17" cy="15" r="2.4" fill="rgba(200,162,90,.16)" />
          </pattern>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* кварталы */}
        <g fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.07)">
          <rect x="20" y="24" width="150" height="110" rx="10" />
          <rect x="196" y="24" width="140" height="70" rx="10" />
          <rect x="196" y="112" width="96" height="120" rx="10" />
          <rect x="20" y="160" width="150" height="150" rx="10" />
          <rect x="196" y="252" width="110" height="80" rx="10" />
          <rect x="480" y="24" width="64" height="150" rx="10" />
          <rect x="480" y="300" width="64" height="176" rx="10" />
          <rect x="196" y="440" width="190" height="44" rx="10" />
        </g>
        <rect x="312" y="112" width="96" height="120" rx="14" fill="url(#trees)" stroke="rgba(200,162,90,.18)" />
        <text x="360" y="176" className="route__park">сквер</text>

        {/* улицы */}
        <g fill="none" stroke="rgba(241,239,234,.11)" strokeLinecap="round">
          <path d="M-10 146H570" strokeWidth="14" />
          <path d="M-10 410C120 404 250 380 340 340S470 250 570 230" strokeWidth="18" />
          <path id="sayanskaya" d="M462 -10C454 120 466 260 452 510" strokeWidth="16" />
          <path d="M184 -10V510" strokeWidth="10" />
          <path d="M-10 324H190" strokeWidth="8" />
        </g>
        <text className="route__street">
          <textPath href="#sayanskaya" startOffset="8%">
            Саянская ул.
          </textPath>
        </text>

        {/* маршрут */}
        <path className="route__line route__line--bus" d={routeBus} pathLength={1} />
        <path className="route__line route__line--walk" d={routeWalk} pathLength={1} />
        <circle className="route__bus" r="6">
          <animateMotion dur="5s" repeatCount="indefinite" path={`${routeBus}${routeWalk.replace('M372 318', '')}`} />
        </circle>

        {/* метро */}
        <g className="route__metro" transform="translate(96 428)">
          <circle r="22" className="route__halo" />
          <circle r="15" fill="#e2b93b" />
          <path d="M-8 6L-4 -6L0 2L4 -6L8 6" fill="none" stroke="#2b2b2f" strokeWidth="2.4" strokeLinejoin="round" />
          <text x="0" y="44" className="route__label" textAnchor="middle">
            м. Новогиреево
          </text>
        </g>

        {/* остановка */}
        <g className="route__stop" transform="translate(372 318)">
          <circle r="18" className="route__halo" />
          <rect x="-12" y="-12" width="24" height="24" rx="6" fill="#3e3e45" stroke="url(#g-gold)" strokeWidth="1.5" />
          <path d="M-6 -6H6V4H-6ZM-6 -1H6M-4 7V4M4 7V4" fill="none" stroke="#e9d29b" strokeWidth="1.4" />
          <text x="-20" y="-20" className="route__label" textAnchor="end">
            ост. «Саянская ул., 5»
          </text>
        </g>

        {/* здание студии */}
        <g className="route__building" transform="translate(410 126)">
          <path d="M0 136V30L52 8L104 30V136Z" fill="#3a3a40" stroke="url(#g-gold)" strokeWidth="1.4" />
          <path d="M52 8V136" stroke="rgba(233,210,155,.35)" />
          <path d="M104 30L120 40V136H104" fill="#323237" stroke="rgba(233,210,155,.35)" />
          {[0, 1, 2, 3].map((floor) =>
            [0, 1, 2, 3].map((col) => {
              const lit = floor === 0;
              return (
                <rect
                  key={`${floor}-${col}`}
                  x={8 + col * 23}
                  y={40 + floor * 23}
                  width="14"
                  height="14"
                  rx="2"
                  className={lit ? 'route__window route__window--lit' : 'route__window'}
                  style={{ animationDelay: `${col * 0.3}s` }}
                />
              );
            }),
          )}
          {/* пилон и силуэт в окне 4 этажа */}
          <path d="M64 40V54" stroke="#2b2b2f" strokeWidth="1.2" />
          <circle cx="68" cy="43" r="1.6" fill="#2b2b2f" />
          <path d="M64 46L69 48L71 53" stroke="#2b2b2f" strokeWidth="1" fill="none" />
          <rect x="-8" y="136" width="136" height="4" rx="2" fill="url(#g-gold)" />
        </g>

        {/* метка */}
        <g className="route__pin" transform="translate(462 92)">
          <circle r="26" fill="url(#g-glow)" filter="url(#glow)" />
          <circle className="route__pulse" r="12" />
          <path d="M0 -26C-11 -26 -18 -18 -18 -9C-18 4 0 18 0 18S18 4 18 -9C18 -18 11 -26 0 -26Z" fill="url(#g-gold)" />
          <circle cy="-9" r="6" fill="#2b2b2f" />
        </g>
        <g className="route__tag" transform="translate(262 50)">
          <rect width="150" height="44" rx="22" fill="rgba(43,43,47,.92)" stroke="url(#g-gold)" />
          <text x="75" y="19" textAnchor="middle" className="route__tag-title">
            Саянская, 7
          </text>
          <text x="75" y="34" textAnchor="middle" className="route__tag-sub">
            4 этаж · студия №403
          </text>
        </g>

        {/* роза ветров */}
        <g transform="translate(46 62)" className="route__compass">
          <path d="M0 -22L5 -5L22 0L5 5L0 22L-5 5L-22 0L-5 -5Z" fill="none" stroke="url(#g-gold)" strokeWidth="1.2" />
          <text y="-28" textAnchor="middle">С</text>
        </g>
      </svg>

      <ol className="route__steps">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onPointerEnter={() => setLeg(s.id)}
              onPointerLeave={() => setLeg(null)}
              onFocus={() => setLeg(s.id)}
              onBlur={() => setLeg(null)}
              onClick={() => setLeg((l) => (l === s.id ? null : s.id))}
            >
              <span className="route__num">{i + 1}</span>
              <span>
                <strong>{s.title}</strong>
                <small>{s.text}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="route__actions">
        <a className="btn btn--gold btn--sm" href={contacts.route} target="_blank" rel="noopener noreferrer">
          <span className="btn__label">Маршрут в Навигаторе</span>
        </a>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReal}>
          <span className="btn__label">Яндекс Карта</span>
        </button>
      </div>
      <p className="route__note">Схема для ориентира, не в масштабе</p>
    </div>
  );
}

export function Contacts() {
  const [real, setReal] = useState(false);
  return (
    <section className="section s-dark contacts" id="contacts" aria-labelledby="contacts-title">
      <div className="container contacts__grid">
        <div className="contacts__card">
          <p className="eyebrow" data-reveal>
            <span className="eyebrow__tick" aria-hidden="true" />
            Контакты
          </p>
          <LetterTitle />
          <ul className="contacts__list">
            <li data-reveal>
              <Icon name="pin" />
              <span>
                <strong>
                  {contacts.city}, {contacts.address}
                </strong>
                {contacts.addressNote}
              </span>
            </li>
            <li data-reveal data-reveal-delay="80">
              <Icon name="phone" />
              <span>
                <a href={contacts.phoneHref}>
                  <strong>{contacts.phone}</strong>
                </a>
                звонки и сообщения
              </span>
            </li>
            <li data-reveal data-reveal-delay="160">
              <Icon name="clock" />
              <span>
                <strong>Открыто до 22:00</strong>
                тренировки по расписанию
              </span>
            </li>
          </ul>
          <BookingCard />
          <p className="contacts__social-title">Подписывайтесь, чтобы ничего не пропустить</p>
          <div className="socials socials--big">
            {contacts.socials.map((s) => (
              <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                <Icon name={s.id} />
                <span>{s.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="map" data-reveal data-reveal-delay="120">
          {real ? (
            <>
              <iframe src={contacts.mapWidget} title="Pole Dance Kiseleva на Яндекс Картах" loading="lazy" allowFullScreen />
              <button type="button" className="map__back btn btn--gold btn--sm" onClick={() => setReal(false)}>
                <span className="btn__label">← К схеме</span>
              </button>
            </>
          ) : (
            <RouteMap onReal={() => setReal(true)} />
          )}
        </div>
      </div>
    </section>
  );
}
