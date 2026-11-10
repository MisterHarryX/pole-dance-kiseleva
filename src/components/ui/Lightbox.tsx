import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Photo } from '../../config/site.ts';
import { Icon } from './Icon.tsx';

type Open = (list: Photo[], index: number) => void;
const LightboxContext = createContext<Open>(() => {});

export const useLightbox = () => useContext(LightboxContext);

/** Full-screen photo viewer with arrows, swipe and keyboard. */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ list: Photo[]; index: number } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  const open = useCallback<Open>((list, index) => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setState({ list, index });
  }, []);
  const close = useCallback(() => setState(null), []);
  const step = useCallback(
    (d: number) => setState((s) => (s ? { ...s, index: (s.index + d + s.list.length) % s.list.length } : s)),
    [],
  );

  useEffect(() => {
    if (!state) {
      returnFocus.current?.focus?.();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    dialog.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [state, close, step]);

  const photo = state?.list[state.index];

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {state && photo && (
        <div
          ref={dialog}
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
          tabIndex={-1}
          onClick={(e) => e.target === e.currentTarget && close()}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <figure className="lightbox__figure" key={photo.src}>
            <img src={photo.src} alt={photo.alt} />
            <figcaption>
              {photo.alt}
              <span>
                {state.index + 1} / {state.list.length}
              </span>
            </figcaption>
          </figure>
          {state.list.length > 1 && (
            <>
              <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label="Предыдущее фото" onClick={() => step(-1)}>
                <Icon name="arrow" style={{ transform: 'scaleX(-1)' }} />
              </button>
              <button type="button" className="lightbox__nav lightbox__nav--next" aria-label="Следующее фото" onClick={() => step(1)}>
                <Icon name="arrow" />
              </button>
            </>
          )}
          <button type="button" className="lightbox__close" aria-label="Закрыть" onClick={close}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </LightboxContext.Provider>
  );
}
