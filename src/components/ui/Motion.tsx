import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Photo } from '../../config/site.ts';
import { useInView, useOnce } from '../../hooks/useInView.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

/** Index that moves every `ms` while `active`. */
export function useCycle(length: number, ms: number, active: boolean, offset = 0) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active || length < 2) return;
    let timer = 0;
    const start = window.setTimeout(() => {
      setIndex((i) => (i + 1) % length);
      timer = window.setInterval(() => setIndex((i) => (i + 1) % length), ms);
    }, ms + offset);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [active, length, ms, offset]);
  return [index, setIndex] as const;
}

/** Photos in one frame: the next fades in over the last while slowly pushing in. */
export function Crossfade({
  slides,
  ms = 5000,
  className = '',
  priority = false,
  dots = false,
}: {
  slides: Photo[];
  ms?: number;
  className?: string;
  priority?: boolean;
  dots?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const [index, setIndex] = useCycle(slides.length, ms, inView && !reduced);
  const [prev, setPrev] = useState(-1);
  const last = useRef(0);
  useEffect(() => {
    setPrev(last.current);
    last.current = index;
  }, [index]);

  return (
    <div ref={ref} className={`xfade ${className}`} style={{ '--xfade-ms': `${ms + 1400}ms` } as CSSProperties}>
      {slides.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={i === index ? s.alt : ''}
          aria-hidden={i !== index}
          data-state={i === index ? 'on' : i === prev ? 'prev' : 'off'}
          loading={priority && i < 2 ? 'eager' : 'lazy'}
          decoding="async"
          style={{ objectPosition: s.focus ?? '50% 50%' }}
        />
      ))}
      {dots && (
        <div className="xfade__dots" role="group" aria-label="Фото">
          {slides.map((s, i) => (
            <button key={s.src} type="button" aria-label={`Фото ${i + 1}`} aria-current={i === index || undefined} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A word that keeps changing with a soft blur. */
export function GlowWord({ words, ms = 2400 }: { words: string[]; ms?: number }) {
  const reduced = useReducedMotion();
  const [index] = useCycle(words.length, ms, !reduced, 600);
  return (
    <span className="glow-word">
      <span className="visually-hidden">{words.join(', ')}</span>
      <span key={index} className="glow-word__text gold-text" aria-hidden="true">
        {words[index]}
      </span>
    </span>
  );
}

/** Counts the number inside `value` up from zero once visible; keeps the decimal comma. */
export function CountUp({ value, ms = 1500 }: { value: string; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useOnce(ref);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const match = /^(\D*)(\d+(?:[.,]\d+)?)(.*)$/.exec(value);
    if (!match || reduced || !seen) return;
    const [, pre, num, post] = match;
    const decimals = /[.,]/.test(num) ? num.split(/[.,]/)[1].length : 0;
    const target = Number(num.replace(',', '.'));
    let start = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(`${pre}${(target * eased).toFixed(decimals).replace('.', ',')}${post}`);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const done = window.setTimeout(() => setShown(value), ms + 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(done);
    };
  }, [seen, reduced, value, ms]);

  return (
    <span ref={ref} className="count-up">
      <span className="visually-hidden">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

/** Smoothly animates between numbers (used by the price calculator). */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      const n = a + (value - a) * eased;
      setShown(n);
      from.current = n;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return <>{format(Math.round(shown))}</>;
}
