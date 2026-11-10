import { useEffect, useRef } from 'react';

/**
 * Scroll indicator styled as a pole: a thin silver line on the left edge that fills with gold,
 * with a ring sliding down as the page scrolls. Desktop only (hidden by CSS on narrow screens).
 */
export function PoleProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      ref.current?.style.setProperty('--progress', t.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div ref={ref} className="pole-progress" aria-hidden="true">
      <span className="pole-progress__fill" />
      <span className="pole-progress__ring" />
    </div>
  );
}

/** Bottom bar on phones: call and book always one tap away. */
export function MobileBar({ phoneHref, booking }: { phoneHref: string; booking: string }) {
  return (
    <div className="mobile-bar">
      <a href={phoneHref} className="mobile-bar__call">
        Позвонить
      </a>
      <a href={booking} target="_blank" rel="noopener noreferrer" className="mobile-bar__book">
        Записаться
      </a>
    </div>
  );
}
