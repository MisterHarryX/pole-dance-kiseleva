import { useEffect, useRef, useState } from 'react';
import { announcement } from '../../config/site.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { Icon } from '../ui/Icon.tsx';

/** News card in the corner, edited in the panel. Dismissed for the rest of the visit. */
export function Announcement() {
  const [open, setOpen] = useState(false);
  const key = `pdk-news:${announcement.text.slice(0, 40)}`;
  useEffect(() => {
    if (!announcement.enabled || !announcement.text.trim()) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(key) === '1';
    } catch {
      /* private mode */
    }
    if (dismissed) return;
    const t = window.setTimeout(() => setOpen(true), 2200);
    return () => window.clearTimeout(t);
  }, [key]);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
  };
  return (
    <aside className="news" role="status" aria-label={announcement.title}>
      <span className="news__spark" aria-hidden="true">
        <Icon name="sparkle" size={18} />
      </span>
      <div>
        <p className="news__title">{announcement.title}</p>
        <p className="news__text">{announcement.text}</p>
        {announcement.link && (
          <a className="news__link" href={announcement.link} target={announcement.link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
            {announcement.linkLabel || 'Подробнее'} <Icon name="arrow" size={14} />
          </a>
        )}
      </div>
      <button type="button" className="news__close" aria-label="Закрыть" onClick={close}>
        <Icon name="close" size={16} />
      </button>
    </aside>
  );
}

/** A small burst of gold sparkles wherever the visitor clicks. */
export function ClickSparkles() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as Element)?.closest?.('input, textarea, select, .orbit, .compare__frame, .lightbox')) return;
      const burst = document.createElement('span');
      burst.className = 'burst';
      burst.style.left = `${e.clientX}px`;
      burst.style.top = `${e.clientY}px`;
      for (let i = 0; i < 8; i++) {
        const s = document.createElement('i');
        const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
        const d = 22 + Math.random() * 22;
        s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
        s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
        s.style.setProperty('--s', `${0.6 + Math.random() * 0.7}`);
        burst.appendChild(s);
      }
      document.body.appendChild(burst);
      window.setTimeout(() => burst.remove(), 800);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [reduced]);
  return null;
}

/** Gold ring that trails the mouse and grows over links (mouse only). */
export function CursorRing() {
  const ring = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = ring.current;
    if (!el) return;
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let frame = 0;
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      el.classList.add('is-on');
      const hot = (e.target as Element)?.closest?.('a, button, [role="slider"], .orbit');
      el.classList.toggle('is-hot', Boolean(hot));
    };
    const leave = () => el.classList.remove('is-on');
    frame = requestAnimationFrame(loop);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [reduced]);
  return <div ref={ring} className="cursor-ring" aria-hidden="true" />;
}

/** One-second intro on the first visit of a session: the pole draws, the name appears. */
export function Intro() {
  const [show] = useState(() => {
    try {
      if (sessionStorage.getItem('pdk-intro')) return false;
      sessionStorage.setItem('pdk-intro', '1');
    } catch {
      return false;
    }
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setGone(true), 1900);
    return () => window.clearTimeout(t);
  }, [show]);
  if (!show || gone) return null;
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro__mark">
        <span className="intro__l">
          Po
          <br />K
        </span>
        <span className="intro__pole" />
        <span className="intro__r">
          eDance
          <br />
          seleva
        </span>
      </div>
    </div>
  );
}
