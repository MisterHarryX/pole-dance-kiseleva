import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';
import { contacts, photos, studio, type Photo } from '../../config/site.ts';
import { useInView } from '../../hooks/useInView.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { DecoCorners, Draw } from '../ui/Art.tsx';
import { Heading } from '../ui/Heading.tsx';
import { Icon } from '../ui/Icon.tsx';
import { useLightbox } from '../ui/Lightbox.tsx';
import { PhotoStage } from '../ui/PhotoStage.tsx';

const L = 1;

/** Small line drawings for the four facts. */
function FactArt({ name }: { name: string }) {
  const art: Record<string, ReactElement> = {
    pole: (
      <>
        <path pathLength={L} d="M24 4V44M17 44H31M18 4H30" />
        <path pathLength={L} d="M24 14C34 14 40 20 40 28" opacity=".6" />
        <circle pathLength={L} cx="40" cy="31" r="2" />
      </>
    ),
    mirror: (
      <>
        <rect pathLength={L} x="10" y="5" width="28" height="38" rx="4" />
        <path pathLength={L} d="M16 18L24 10M16 28L32 12" opacity=".6" />
        <path pathLength={L} d="M6 45H42" />
      </>
    ),
    heart: (
      <>
        <path pathLength={L} d="M24 40C24 40 8 30 8 18C8 12 12 8 17 8C20 8 23 10 24 13C25 10 28 8 31 8C36 8 40 12 40 18C40 30 24 40 24 40Z" />
        <path pathLength={L} d="M36 4L37 7L40 8L37 9L36 12L35 9L32 8L35 7Z" />
      </>
    ),
    spa: (
      <>
        <ellipse pathLength={L} cx="22" cy="38" rx="16" ry="5" />
        <ellipse pathLength={L} cx="24" cy="29" rx="11" ry="4" />
        <ellipse pathLength={L} cx="25" cy="21" rx="7" ry="3" />
        <path pathLength={L} d="M38 26C38 18 40 12 45 6M40 16C36 14 35 10 36 7C40 9 41 13 40 16Z" />
      </>
    ),
  };
  return (
    <Draw viewBox="0 0 48 48" width={1.8} className="fact-art">
      {art[name]}
    </Draw>
  );
}

/** The studio's neon sign drawn as glass tubes; it flickers on when `lit`. */
function NeonSign({ lit }: { lit: boolean }) {
  return (
    <svg className={`neon ${lit ? 'is-lit' : ''}`} viewBox="0 0 440 170" role="img" aria-label="Неоновая вывеска PoleDance Kiseleva">
      <defs>
        <filter id="neon-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b1" />
          <feGaussianBlur stdDeviation="9" result="b2" in="SourceGraphic" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="neon__tubes" filter={lit ? 'url(#neon-glow)' : undefined}>
        <text x="200" y="74" textAnchor="end" className="neon__text">
          Po
        </text>
        <text x="216" y="74" className="neon__text">
          eDance
        </text>
        <text x="200" y="138" textAnchor="end" className="neon__text">
          K
        </text>
        <text x="216" y="138" className="neon__text">
          seleva
        </text>
        <path className="neon__bar" d="M208 16V158" />
      </g>
      {/* крепления и провод */}
      <g className="neon__mount">
        <circle cx="60" cy="16" r="3" />
        <circle cx="380" cy="16" r="3" />
        <path d="M380 16C410 30 420 60 430 170" fill="none" />
      </g>
    </svg>
  );
}

/** Day / neon photos with a drag handle and a drawn light switch that lights the sign. */
function Lights() {
  const [pos, setPosState] = useState(18);
  const posRef = useRef(18);
  const setPos = useCallback((v: number | ((p: number) => number)) => {
    const next = typeof v === 'function' ? v(posRef.current) : v;
    posRef.current = next;
    setPosState(next);
  }, []);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const tween = useRef(0);
  const reduced = useReducedMotion();
  const neon = pos > 50;

  const animateTo = useCallback(
    (target: number) => {
      cancelAnimationFrame(tween.current);
      if (reduced) {
        setPos(target);
        return;
      }
      const start = performance.now();
      const from = posRef.current;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        setPos(from + (target - from) * e);
        if (t < 1) tween.current = requestAnimationFrame(tick);
      };
      tween.current = requestAnimationFrame(tick);
    },
    [reduced, setPos],
  );
  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  const setFromX = (clientX: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    cancelAnimationFrame(tween.current);
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5));
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5));
  };

  return (
    <div className={`lights ${neon ? 'is-neon' : ''}`} data-reveal>
      <DecoCorners />
      <div className="lights__sign">
        <NeonSign lit={neon} />
      </div>
      <div
        ref={frame}
        className="compare__frame lights__frame"
        style={{ ['--pos' as string]: `${pos}%` }}
        onPointerDown={onDown}
        onPointerMove={(e) => dragging.current && setFromX(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <img src={photos.hallDay.src} alt="Зал днём" draggable={false} loading="lazy" />
        <img className="compare__top" src={photos.hallNeon.src} alt="Зал с неоновой подсветкой" draggable={false} loading="lazy" />
        <span className="compare__label compare__label--l">Неон</span>
        <span className="compare__label compare__label--r">День</span>
        <div
          className="compare__handle"
          role="slider"
          tabIndex={0}
          aria-label="Подсветка зала"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={onKey}
        >
          <span />
        </div>
      </div>
      <div className="lights__foot">
        <button
          type="button"
          className={`switch-plate ${neon ? 'is-on' : ''}`}
          aria-pressed={neon}
          onClick={() => animateTo(neon ? 0 : 100)}
        >
          <span className="switch-plate__body" aria-hidden="true">
            <span className="switch-plate__lever" />
          </span>
          <span className="switch-plate__label">
            <strong>{neon ? 'Вечер: неон включён' : 'День: включить неон'}</strong>
            <small>Щёлкните выключатель или потяните ползунок</small>
          </span>
        </button>
      </div>
    </div>
  );
}

type Stop = { id: string; title: string; text: string; photo?: Photo; spot: [number, number] };

const stops: Stop[] = [
  {
    id: 'entrance',
    title: 'Вход и неоновая вывеска',
    text: 'Студия на 4 этаже, №403. Над дверью горит неоновая вывеска PoleDance Kiseleva, вдоль стены — мягкий диван, чтобы выдохнуть до и после тренировки.',
    photo: photos.entrance,
    spot: [66.5, 50],
  },
  {
    id: 'hall',
    title: 'Зал с пилонами',
    text: 'Просторный светлый зал с высоким потолком. На занятии у каждой ученицы свой пилон — без очереди и ожидания.',
    photo: photos.hallDay,
    spot: [37, 44],
  },
  {
    id: 'mirrors',
    title: 'Зеркальная стена',
    text: 'Зеркала во всю стену с фиолетовой подсветкой: видно каждое движение, а вечером зал превращается в сцену.',
    photo: photos.hallNeonV,
    spot: [7.5, 62],
  },
  {
    id: 'windows',
    title: 'Окна и стеллажи',
    text: 'Большие окна наполняют зал дневным светом, под ними — стеллажи с ковриками для растяжки.',
    photo: photos.hall1,
    spot: [35, 8],
  },
  {
    id: 'care',
    title: 'Кабинет массажа и ухода',
    text: 'Массаж, LPG, RF-лифтинг и уход за лицом — восстановиться можно, не выходя из студии.',
    spot: [82, 78],
  },
];

/** Hand-drawn plan of the studio; zones light up with the current stop. */
function Plan({ active, onPick }: { active: number; onPick: (i: number) => void }) {
  const id = stops[active].id;
  const poles: [number, number][] = [
    [110, 128],
    [208, 112],
    [306, 130],
    [158, 214],
    [258, 206],
    [118, 300],
    [300, 296],
  ];
  return (
    <div className="plan">
      <Draw viewBox="0 0 600 400" width={1.5} className="plan__svg">
        {/* стены */}
        <path pathLength={L} d="M38 20H562Q580 20 580 38V362Q580 380 562 380H38Q20 380 20 362V38Q20 20 38 20Z" />
        <path pathLength={L} d="M400 20V168M400 232V380" />
        <path pathLength={L} d="M400 250H580" opacity=".7" />
        {/* окна */}
        <g className={`zone ${id === 'windows' ? 'is-on' : ''}`}>
          <path pathLength={L} d="M56 20H372M56 28H372" strokeWidth={1.2} />
          <path pathLength={L} d="M100 20V28M152 20V28M204 20V28M256 20V28M308 20V28" strokeWidth={1.2} />
          <path pathLength={L} d="M70 40H130M150 40H210M230 40H290M310 40H360" strokeWidth={3} opacity=".45" />
        </g>
        {/* зеркала с подсветкой */}
        <g className={`zone zone--mirror ${id === 'mirrors' ? 'is-on' : ''}`}>
          <path pathLength={L} d="M30 70V340" strokeWidth={4} stroke="#b9a2e6" />
          <path pathLength={L} d="M38 70V340" strokeWidth={1} opacity=".6" />
        </g>
        {/* пилоны */}
        <g className={`zone ${id === 'hall' ? 'is-on' : ''}`}>
          {poles.map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle pathLength={L} cx={x} cy={y} r="13" opacity=".35" />
              <circle pathLength={L} cx={x} cy={y} r="5" stroke="#d9d6cf" strokeWidth={2.4} />
            </g>
          ))}
        </g>
        {/* вход и неон */}
        <g className={`zone zone--neon ${id === 'entrance' ? 'is-on' : ''}`}>
          <path pathLength={L} d="M400 168C410 180 410 220 400 232" opacity=".6" />
          <path pathLength={L} d="M392 150V250" stroke="#f08bc8" strokeWidth={3} />
          <rect pathLength={L} x="432" y="40" width="118" height="40" rx="12" />
          <path pathLength={L} d="M442 52H540" opacity=".5" />
          <path pathLength={L} d="M580 300V346" strokeWidth={4} opacity=".9" />
          <path pathLength={L} d="M548 323H520M528 315L520 323L528 331" />
        </g>
        {/* кабинет ухода */}
        <g className={`zone ${id === 'care' ? 'is-on' : ''}`}>
          <rect pathLength={L} x="440" y="286" width="72" height="30" rx="10" />
          <ellipse pathLength={L} cx="530" cy="300" rx="12" ry="5" />
          <ellipse pathLength={L} cx="532" cy="292" rx="8" ry="3.5" />
        </g>
      </Draw>
      <span className="plan__label" style={{ left: '30%', top: '62%' }}>
        зал
      </span>
      <span className="plan__label" style={{ left: '82%', top: '36%' }}>
        холл
      </span>
      <span className="plan__label" style={{ left: '79%', top: '92%' }}>
        массаж и уход
      </span>
      {stops.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className={`hotspot ${i === active ? 'is-active' : ''}`}
          style={{ left: `${s.spot[0]}%`, top: `${s.spot[1]}%` }}
          onClick={() => onPick(i)}
          aria-label={`${i + 1}. ${s.title}`}
          aria-current={i === active || undefined}
        >
          <span>{i + 1}</span>
        </button>
      ))}
      <p className="plan__note">Схема условная, не в масштабе</p>
    </div>
  );
}

function CareSlide() {
  return (
    <div className="care-slide">
      <Draw viewBox="0 0 220 140" width={1.6} className="care-slide__art">
        <ellipse pathLength={L} cx="80" cy="112" rx="56" ry="16" />
        <ellipse pathLength={L} cx="88" cy="84" rx="40" ry="13" />
        <ellipse pathLength={L} cx="94" cy="60" rx="27" ry="9" />
        <path pathLength={L} d="M150 128C150 96 160 60 188 30" />
        <path pathLength={L} d="M158 96C144 88 140 74 144 62C158 70 162 84 158 96ZM170 70C160 58 160 44 170 34C180 44 180 58 170 70ZM176 88C190 80 200 80 208 86C200 98 186 98 176 88Z" />
        <path pathLength={L} d="M30 30C34 30 36 26 36 22C36 26 38 30 42 30C38 30 36 34 36 38C36 34 34 30 30 30Z" />
      </Draw>
      <p>Массаж · LPG · RF-лифтинг · уход за лицом</p>
    </div>
  );
}

/** Guided tour: the plan on the left, the whole photo and story of each stop on the right. */
function Tour() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const openLightbox = useLightbox();
  const stop = stops[active];
  const tourPhotos = stops.filter((s) => s.photo).map((s) => s.photo!);

  useEffect(() => {
    if (!playing || !inView || reduced) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % stops.length), 6500);
    return () => window.clearTimeout(t);
  }, [active, playing, inView, reduced]);

  const pick = (i: number) => {
    setActive((i + stops.length) % stops.length);
    setPlaying(false);
  };

  return (
    <div ref={ref} className="tour" data-reveal>
      <div className="tour__head">
        <div>
          <p className="tour__kicker">
            <Icon name="sparkle" size={14} /> Экскурсия по студии
          </p>
          <h3 className="tour__title">Пройдитесь по залу, не выходя из дома</h3>
        </div>
        <div className="tour__controls">
          <button type="button" onClick={() => pick(active - 1)} aria-label="Предыдущая точка">
            <Icon name="arrow" style={{ transform: 'scaleX(-1)' }} />
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Пауза' : 'Смотреть по порядку'} className="tour__play">
            {playing ? <span className="tour__pause" aria-hidden="true" /> : <span className="tour__tri" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => pick(active + 1)} aria-label="Следующая точка">
            <Icon name="arrow" />
          </button>
        </div>
      </div>

      <div className="tour__grid">
        <Plan active={active} onPick={pick} />
        <div className="tour__view">
          <button
            type="button"
            className="tour__stage-btn"
            onClick={() => stop.photo && openLightbox(tourPhotos, tourPhotos.indexOf(stop.photo))}
            aria-label={stop.photo ? `Открыть фото: ${stop.title}` : stop.title}
            disabled={!stop.photo}
          >
            <PhotoStage className="tour__stage" photos={tourPhotos} active={stop.photo ? tourPhotos.indexOf(stop.photo) : tourPhotos.length} extra={<CareSlide />} />
          </button>
          <div className="tour__info" key={stop.id} aria-live="polite">
            <span className="tour__num">
              {String(active + 1).padStart(2, '0')}
              <small> / {String(stops.length).padStart(2, '0')}</small>
            </span>
            <div>
              <p className="tour__stop-title">{stop.title}</p>
              <p className="tour__stop-text">{stop.text}</p>
            </div>
          </div>
          <div className="tour__progress" aria-hidden="true">
            {stops.map((s, i) => (
              <span key={s.id} className={i < active ? 'is-done' : i === active ? (playing && !reduced ? 'is-now is-playing' : 'is-now') : ''} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Studio() {
  return (
    <section className="section s-light studio" id="studio" aria-labelledby="studio-title">
      <div className="container">
        <div className="studio__grid">
          <div className="studio__copy">
            <Heading
              eyebrow="Студия"
              title={
                <>
                  Зал, в который хочется <em className="gold-text">возвращаться</em>
                </>
              }
              id="studio-title"
            />
            {studio.text.map((t, i) => (
              <p key={i} className="studio__text" data-reveal data-reveal-delay={200 + i * 80}>
                {t}
              </p>
            ))}
            <ul className="facts">
              {studio.facts.map((f, i) => (
                <li key={f.title} className="fact" data-reveal data-reveal-delay={i * 90}>
                  <span className="fact__icon">
                    <FactArt name={f.icon} />
                  </span>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <a className="studio__route" href={contacts.route} target="_blank" rel="noopener noreferrer" data-reveal>
              <Icon name="pin" size={18} />
              <span>
                <strong>
                  {contacts.address}, {contacts.addressNote}
                </strong>
                <small>м. {contacts.metro} · построить маршрут</small>
              </span>
              <Icon name="arrow" size={16} />
            </a>
          </div>
          <Lights />
        </div>
        <Tour />
      </div>
    </section>
  );
}
