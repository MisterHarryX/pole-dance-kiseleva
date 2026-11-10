import { useEffect, useRef, type PointerEvent } from 'react';
import { contacts, hero, photos, pricing, ratio } from '../../config/site.ts';
import { DecoArch, DecoCorners, Sunburst } from '../ui/Art.tsx';
import { useInView } from '../../hooks/useInView.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { Icon } from '../ui/Icon.tsx';
import { CountUp, Crossfade, GlowWord } from '../ui/Motion.tsx';

/** Slowly rising gold dust on a canvas; pauses offscreen and under reduced motion. */
function GoldDust() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const inView = useInView(canvas);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = canvas.current;
    if (!el || !inView || reduced) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const count = Math.round(Math.min(90, (w * h) / 16000));
    const motes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 1.6,
      v: 0.12 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.25,
      phase: Math.random() * Math.PI * 2,
    }));
    let frame = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.y -= m.v;
        m.x += m.drift + Math.sin(t / 1800 + m.phase) * 0.15;
        if (m.y < -4) {
          m.y = h + 4;
          m.x = Math.random() * w;
        }
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t / 700 + m.phase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(231, 207, 149, ${a.toFixed(3)})`;
        ctx.shadowColor = 'rgba(231, 207, 149, .8)';
        ctx.shadowBlur = m.r * 4;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [inView, reduced]);

  return <canvas ref={canvas} className="hero__dust" aria-hidden="true" />;
}

export function Hero() {
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
    e.currentTarget.style.setProperty('--px', `${((e.clientX - r.left) / r.width - 0.5).toFixed(3)}`);
    e.currentTarget.style.setProperty('--py', `${((e.clientY - r.top) / r.height - 0.5).toFixed(3)}`);
  };

  return (
    <section className="hero" id="top" onPointerMove={onMove} aria-labelledby="hero-title">
      <GoldDust />
      <div className="hero__glow" aria-hidden="true" />
      <div className="hero__pole" aria-hidden="true" />

      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow hero__eyebrow">
            <span className="eyebrow__tick" aria-hidden="true" />
            {hero.eyebrow}
          </p>
          <h1 className="hero__title" id="hero-title">
            <span className="hero__line">
              <span>Pole Dance</span>
            </span>
            <span className="hero__line hero__line--gold">
              <span className="gold-text">Kiseleva</span>
            </span>
          </h1>
          <p className="hero__tagline">
            Танец, в котором вы становитесь <GlowWord words={hero.words} />
          </p>
          <p className="hero__lead">{hero.lead}</p>
          <div className="hero__cta">
            <a className="btn btn--gold" href={contacts.booking} target="_blank" rel="noopener noreferrer">
              <span className="btn__label">
                Пробное занятие<sup>*</sup>
              </span>
            </a>
            <a className="btn btn--ghost" href="#prices">
              <span className="btn__label">Цены и абонементы</span>
            </a>
          </div>
          <p className="hero__fine">
            * бесплатно при покупке абонемента в день пробного, без покупки — {pricing.trial.paid.toLocaleString('ru-RU')} ₽
          </p>

          <dl className="hero__stats">
            {hero.stats.map((s) => (
              <div key={s.label}>
                <dt className="visually-hidden">{s.label}</dt>
                <dd>
                  <strong>
                    <CountUp value={s.value} />
                  </strong>
                  <span>{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero__visual">
          <Sunburst className="hero__sunburst" />
          <DecoArch className="hero__deco" />
          <div className="hero__frame" style={{ aspectRatio: ratio(photos.inverted) }}>
            <Crossfade slides={[photos.inverted, photos.white, photos.split, photos.lean]} priority ms={4600} />
            <DecoCorners />
          </div>
          <a className="hero__badge" href={contacts.yandexReviews} target="_blank" rel="noopener noreferrer">
            <span className="hero__badge-stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Icon key={i} name="star" size={13} />
              ))}
            </span>
            <span>
              <strong>{hero.badge}</strong>
              <small>по версии Яндекс Карт</small>
            </span>
          </a>
          <div className="hero__chip">
            <Icon name="metro" size={16} />
            <span>м. {contacts.metro}</span>
          </div>
        </div>
      </div>

      <a className="hero__scroll" href="#studio" aria-label="Листать вниз">
        <span />
      </a>
    </section>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row.map((t, i) => (
          <span key={i} className="marquee__item">
            {t}
            <Icon name="sparkle" size={14} />
          </span>
        ))}
      </div>
    </div>
  );
}
