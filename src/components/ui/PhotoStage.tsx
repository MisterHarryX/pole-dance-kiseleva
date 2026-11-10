import type { ReactNode } from 'react';
import type { Photo } from '../../config/site.ts';

/**
 * Shows one photo of a list whole (never cropped), centred on a blurred, darkened copy
 * of itself; switching photos cross-fades. Optional `extra` slides can be drawings.
 */
export function PhotoStage({
  photos,
  active,
  className = '',
  extra,
  children,
}: {
  photos: Photo[];
  active: number;
  className?: string;
  /** Slide shown instead of a photo when `active` is past the photo list. */
  extra?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`stage ${className}`}>
      {photos.map((ph, i) => (
        <div key={ph.src + i} className="stage__slide" data-on={i === active} aria-hidden={i !== active}>
          <img className="stage__fill" src={ph.src.replace('.webp', '-sm.webp')} alt="" loading="lazy" />
          <img
            className="stage__photo"
            src={ph.src}
            alt={i === active ? ph.alt : ''}
            width={ph.w}
            height={ph.h}
            loading="lazy"
            style={{ aspectRatio: `${ph.w} / ${ph.h}` }}
          />
        </div>
      ))}
      {extra && (
        <div className="stage__slide stage__slide--extra" data-on={active >= photos.length} aria-hidden={active < photos.length}>
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}
