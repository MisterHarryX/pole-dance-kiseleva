import { useEffect, useRef, type PointerEvent } from 'react';
import { photos } from '../../config/site.ts';
import { useInView } from '../../hooks/useInView.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { DecoCorners } from '../ui/Art.tsx';
import { Heading } from '../ui/Heading.tsx';
import { Icon } from '../ui/Icon.tsx';
import { useLightbox } from '../ui/Lightbox.tsx';

// The ring takes the vertical shots (all 851×1280, the card's own proportions); wide ones go to the strip below.
const shots = [photos.inverted, photos.lean, photos.white, photos.leanRed, photos.split];
const ringShots = [...shots, ...shots]; // twice round the pole, so the ring looks full

const wide = [photos.flag, photos.crouch, photos.crouchRed];
const STEP = 360 / ringShots.length;

/**
 * Photos orbit the central pole in 3D. Drag (mouse or finger) to spin with inertia;
 * it drifts on its own when idle. Cards facing away dim and blur.
 */
export function Gallery() {
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const inView = useInView(stage, '100px');
  const reduced = useReducedMotion();
  const openLightbox = useLightbox();
  const s = useRef({ rot: 0, vel: 0, drag: false, lastX: 0, moved: 0, idleAt: 0, target: null as number | null });

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const cards = ring.current ? Array.from(ring.current.children) as HTMLElement[] : [];
    const tick = (now: number) => {
      const st = s.current;
      if (!st.drag) {
        if (st.target != null) {
          const d = st.target - st.rot;
          st.rot += d * 0.12;
          if (Math.abs(d) < 0.05) {
            st.rot = st.target;
            st.target = null;
          }
        } else {
          st.rot += st.vel;
          st.vel *= 0.94;
          if (!reduced && Math.abs(st.vel) < 0.02 && now - st.idleAt > 1600) st.rot -= 0.06;
        }
      }
      if (ring.current) ring.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateY(${st.rot}deg)`;
      cards.forEach((c, i) => {
        const face = Math.cos(((i * STEP + st.rot) * Math.PI) / 180);
        c.style.setProperty('--face', ((face + 1) / 2).toFixed(3));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    st.drag = true;
    st.lastX = e.clientX;
    st.moved = 0;
    st.vel = 0;
    st.target = null;
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (!st.drag) return;
    const dx = e.clientX - st.lastX;
    st.lastX = e.clientX;
    st.moved += Math.abs(dx);
    if (st.moved > 6 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
    st.rot += dx * 0.35;
    st.vel = dx * 0.35;
  };
  const onUp = () => {
    s.current.drag = false;
    s.current.idleAt = performance.now();
  };

  const turn = (dir: number) => {
    const st = s.current;
    const snapped = Math.round(st.rot / STEP) * STEP;
    st.target = snapped + dir * STEP;
    st.vel = 0;
    st.idleAt = performance.now() + 2000;
  };

  return (
    <section className="section s-black gallery" id="gallery" aria-labelledby="gallery-title">
      <div className="container">
        <Heading
          eyebrow="Галерея"
          title={
            <>
              Сила, которая <em className="gold-text">выглядит</em> легко
            </>
          }
          lead="Кадры из фотосессии студии. Покрутите карусель вокруг пилона и нажмите на фото, чтобы открыть его целиком."
          align="center"
          id="gallery-title"
        />
      </div>

      <div
        ref={stage}
        className="orbit"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
      >
        <div className="orbit__floor" aria-hidden="true" />
        <div className="orbit__scene">
          <div ref={ring} className="orbit__ring">
            {ringShots.map((ph, i) => (
              <button
                key={`${ph.src}-${i}`}
                type="button"
                className="orbit__card"
                style={{ transform: `rotateY(${i * STEP}deg) translateZ(var(--radius))` }}
                onClick={() => {
                  if (s.current.moved > 8) return;
                  openLightbox(shots, i % shots.length);
                }}
                aria-label={`Открыть фото: ${ph.alt}`}
              >
                <img src={ph.src.replace('.webp', '-sm.webp')} alt="" draggable={false} loading="lazy" />
              </button>
            ))}
          </div>
          <span className="orbit__pole" aria-hidden="true" />
        </div>
      </div>

      <div className="orbit__controls">
        <button type="button" onClick={() => turn(1)} aria-label="Повернуть влево">
          <Icon name="arrow" style={{ transform: 'scaleX(-1)' }} />
        </button>
        <span>Потяните, чтобы покрутить</span>
        <button type="button" onClick={() => turn(-1)} aria-label="Повернуть вправо">
          <Icon name="arrow" />
        </button>
      </div>

      <div className="container">
        <div className="filmstrip">
          {wide.map((ph, i) => (
            <button
              key={ph.src}
              type="button"
              className="filmstrip__item"
              style={{ aspectRatio: `${ph.w} / ${ph.h}` }}
              onClick={() => openLightbox(wide, i)}
              aria-label={`Открыть фото: ${ph.alt}`}
              data-reveal
              data-reveal-delay={i * 110}
            >
              <img src={ph.src} alt="" loading="lazy" />
              <DecoCorners />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
