import { useEffect } from 'react';

/**
 * Marks every [data-reveal] element with data-shown once it scrolls into view.
 * An attribute, not a class: React rewrites className on re-render and would wipe a class,
 * hiding the element again (an opened FAQ answer used to vanish this way).
 * `data-reveal-delay` (ms) staggers neighbours. Elements added later are picked up too.
 */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('js-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.revealDelay || 0);
          el.style.setProperty('--reveal-delay', `${delay}ms`);
          el.setAttribute('data-shown', '');
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const watch = (scope: ParentNode) =>
      scope.querySelectorAll<HTMLElement>('[data-reveal]:not([data-shown])').forEach((el) => io.observe(el));
    watch(document);
    const mo = new MutationObserver(() => watch(document));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
