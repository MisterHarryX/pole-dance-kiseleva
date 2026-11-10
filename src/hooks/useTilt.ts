import type { PointerEvent } from 'react';

const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Pointer tilt and light position for cards: writes CSS variables; the look lives in CSS. */
export function tiltMove(event: PointerEvent<HTMLElement>, maxDeg = 7) {
  if (event.pointerType !== 'mouse' || !finePointer()) return;
  const el = event.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (event.clientX - r.left) / r.width;
  const py = (event.clientY - r.top) / r.height;
  el.style.setProperty('--tilt-x', `${((0.5 - py) * maxDeg * 2).toFixed(2)}deg`);
  el.style.setProperty('--tilt-y', `${((px - 0.5) * maxDeg * 2).toFixed(2)}deg`);
  el.style.setProperty('--light-x', `${(px * 100).toFixed(1)}%`);
  el.style.setProperty('--light-y', `${(py * 100).toFixed(1)}%`);
}

export function tiltLeave(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--tilt-x', '0deg');
  event.currentTarget.style.setProperty('--tilt-y', '0deg');
}

/** Pointer position inside an element as --spot-x / --spot-y, for spotlight hovers. */
export function spotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const el = event.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--spot-x', `${event.clientX - r.left}px`);
  el.style.setProperty('--spot-y', `${event.clientY - r.top}px`);
}
