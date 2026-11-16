import type { CSSProperties } from 'react';
import { asset } from '../../lib/paths.ts';
import '../../styles/wordmark.css';

/**
 * The studio logo exactly as drawn: hand-lettered «Po|eDance / K|seleva», where one slanted
 * stroke — the pole — is both the «l» and the «i». The drawing is used as two masks
 * (public/brand/): the letters take the text colour, the pole is painted gold.
 * `compact` crops the pole just past the letters (header, small places);
 * `full` keeps the whole long pole, as in the original logo.
 */
export function Wordmark({
  className = '',
  variant = 'compact',
  large = false,
}: {
  className?: string;
  variant?: 'compact' | 'full';
  /** Bigger size (footer). */
  large?: boolean;
}) {
  const suffix = variant === 'compact' ? '-compact' : '';
  const style = {
    '--wm-letters': `url("${asset(`/brand/logo-letters${suffix}.png`)}")`,
    '--wm-pole': `url("${asset(`/brand/logo-pole${suffix}.png`)}")`,
  } as CSSProperties;
  return (
    <span
      className={`wordmark wordmark--${variant} ${large ? 'wordmark--large' : ''} ${className}`}
      style={style}
      role="img"
      aria-label="Pole Dance Kiseleva"
    >
      <span className="wordmark__letters" aria-hidden="true" />
      <span className="wordmark__glow" aria-hidden="true">
        <span className="wordmark__pole" />
      </span>
    </span>
  );
}
