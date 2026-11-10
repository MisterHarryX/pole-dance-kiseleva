import { useRef, type ReactNode } from 'react';
import type { DirectionId } from '../../config/site.ts';
import { useOnce } from '../../hooks/useInView.ts';

/**
 * Hand-drawn gold line art. Every stroke has pathLength=1, so CSS can «draw» it
 * from 0 to 1 the first time the drawing scrolls into view (class .is-drawn).
 */

/** Shared gold gradients, rendered once; drawings reference them by id. */
export function GoldDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="g-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="200" spreadMethod="reflect">
          <stop offset="0" stopColor="#f2dfa9" />
          <stop offset=".45" stopColor="#c8a25a" />
          <stop offset=".7" stopColor="#e9d29b" />
          <stop offset="1" stopColor="#8e6c2f" />
        </linearGradient>
        <linearGradient id="g-gold-v" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="200" spreadMethod="reflect">
          <stop offset="0" stopColor="#f2dfa9" />
          <stop offset=".5" stopColor="#c8a25a" />
          <stop offset="1" stopColor="#8e6c2f" />
        </linearGradient>
        <linearGradient id="g-silver" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6f6c67" />
          <stop offset=".35" stopColor="#f4f3f0" />
          <stop offset=".6" stopColor="#a9a6a0" />
          <stop offset="1" stopColor="#55534f" />
        </linearGradient>
        <radialGradient id="g-glow">
          <stop offset="0" stopColor="#e9d29b" stopOpacity=".55" />
          <stop offset="1" stopColor="#e9d29b" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Wrapper: an <svg> whose strokes draw themselves once visible. */
export function Draw({
  children,
  viewBox = '0 0 200 200',
  className = '',
  width = 2,
  title,
}: {
  children: ReactNode;
  viewBox?: string;
  className?: string;
  width?: number;
  title?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const seen = useOnce(ref, '0px 0px -6% 0px');
  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      className={`draw ${seen ? 'is-drawn' : ''} ${className}`}
      fill="none"
      stroke="url(#g-gold)"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {children}
    </svg>
  );
}

const L = 1; // pathLength shorthand

function star(cx: number, cy: number, R: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}

const sparkle = (x: number, y: number, s = 8) =>
  `M${x} ${y - s}C${x + s * 0.15} ${y - s * 0.15} ${x + s * 0.15} ${y - s * 0.15} ${x + s} ${y}C${x + s * 0.15} ${y + s * 0.15} ${x + s * 0.15} ${y + s * 0.15} ${x} ${y + s}C${x - s * 0.15} ${y + s * 0.15} ${x - s * 0.15} ${y + s * 0.15} ${x - s} ${y}C${x - s * 0.15} ${y - s * 0.15} ${x - s * 0.15} ${y - s * 0.15} ${x} ${y - s}Z`;

/** One drawing per direction. */
export function DirectionArt({ id, className = '' }: { id: DirectionId; className?: string }) {
  switch (id) {
    case 'sport':
      // «Флажок»: руки на пилоне, тело и ноги вытянуты в сторону.
      return (
        <Draw className={className} title="Рисунок: флажок на пилоне">
          <path pathLength={L} d="M40 8V192" stroke="#d9d6cf" strokeWidth={4} />
          <path pathLength={L} d="M28 192H52" />
          <circle pathLength={L} cx="74" cy="50" r="10" />
          <path pathLength={L} d="M40 42C50 44 58 52 64 62" />
          <path pathLength={L} d="M40 108C52 100 60 88 66 74" />
          <path pathLength={L} d="M64 64C88 72 110 78 128 84" />
          <path pathLength={L} d="M128 84C148 74 168 60 186 46l8-4" />
          <path pathLength={L} d="M128 84C150 94 170 108 186 120l8 4" />
          <path pathLength={L} d={sparkle(160, 160, 9)} strokeWidth={1.4} />
        </Draw>
      );
    case 'exotic':
      // Сапог на платформе и шпильке — символ exotic.
      return (
        <Draw className={className} title="Рисунок: туфля на платформе">
          <path pathLength={L} d="M88 20H142" />
          <path pathLength={L} d="M92 22C94 60 96 96 92 126" />
          <path pathLength={L} d="M138 22C140 56 142 80 146 98" />
          <path pathLength={L} d="M92 126C80 136 60 142 44 146" />
          <path pathLength={L} d="M44 146C34 147 30 152 30 160V182C30 188 34 190 40 190H70C76 190 78 186 78 180V156" />
          <path pathLength={L} d="M78 156C104 150 128 132 146 98" />
          <path pathLength={L} d="M146 98L153 190M160 106V190M150 190H164" />
          <path pathLength={L} d="M97 38l12 8M109 38l-12 8M98 60l12 8M110 60l-12 8M98 82l12 8M110 82l-12 8" strokeWidth={1.4} />
          <path pathLength={L} d={sparkle(168, 44, 9)} strokeWidth={1.4} />
        </Draw>
      );
    case 'fitness':
      // Пилон и орбиты вращения.
      return (
        <Draw className={className} title="Рисунок: вращение вокруг пилона">
          <path pathLength={L} d="M100 6V194" stroke="#d9d6cf" strokeWidth={4} />
          <path pathLength={L} d="M86 194H114M90 6H110" />
          <ellipse pathLength={L} cx="100" cy="70" rx="62" ry="15" transform="rotate(-12 100 70)" />
          <ellipse pathLength={L} cx="100" cy="128" rx="78" ry="19" transform="rotate(9 100 128)" />
          <circle pathLength={L} cx="160" cy="60" r="5" />
          <circle pathLength={L} cx="25" cy="118" r="4" />
          <path pathLength={L} d={sparkle(160, 168, 10)} strokeWidth={1.4} />
          <path pathLength={L} d={sparkle(34, 36, 7)} strokeWidth={1.4} />
        </Draw>
      );
    case 'stretch':
      // Шпагат с поднятыми руками.
      return (
        <Draw className={className} title="Рисунок: шпагат">
          <path pathLength={L} d="M10 178H190" strokeWidth={1.2} opacity=".5" />
          <path pathLength={L} d="M26 168H174" />
          <path pathLength={L} d="M26 168l-10-7M174 168l10-7" />
          <path pathLength={L} d="M100 166C97 142 97 122 100 102" />
          <circle pathLength={L} cx="100" cy="86" r="11" />
          <path pathLength={L} d="M100 110C84 98 74 78 78 54" />
          <path pathLength={L} d="M100 110C116 98 126 78 122 54" />
          <path pathLength={L} d={sparkle(160, 90, 8)} strokeWidth={1.4} />
        </Draw>
      );
    case 'kids':
      // Гимнастическая лента и звёзды.
      return (
        <Draw className={className} title="Рисунок: гимнастическая лента">
          <path pathLength={L} d="M38 184L70 132" strokeWidth={3} />
          <path pathLength={L} d="M70 132C100 100 58 82 88 60C118 38 152 68 132 94C112 120 152 142 172 110C186 88 160 60 176 36" />
          <path pathLength={L} d={star(150, 162, 16, 7)} />
          <path pathLength={L} d={star(42, 50, 10, 4.5)} strokeWidth={1.4} />
          <path pathLength={L} d={sparkle(110, 150, 7)} strokeWidth={1.4} />
        </Draw>
      );
    case 'personal':
    default:
      // Сердце вокруг пилона: занятие один на один.
      return (
        <Draw className={className} title="Рисунок: сердце вокруг пилона">
          <path pathLength={L} d="M100 14V188" stroke="#d9d6cf" strokeWidth={4} />
          <path pathLength={L} d="M88 188H112" />
          <path pathLength={L} d="M100 70C80 40 38 50 42 86C46 118 86 134 100 156C114 134 154 118 158 86C162 50 120 40 100 70" />
          <path pathLength={L} d="M100 84C88 66 62 72 64 92" strokeWidth={1.3} opacity=".7" />
          <path pathLength={L} d={sparkle(166, 40, 9)} strokeWidth={1.4} />
          <path pathLength={L} d={sparkle(30, 150, 7)} strokeWidth={1.4} />
        </Draw>
      );
  }
}

/** Small icons for the «first visit» steps (viewBox 48). */
export function StepArt({ index }: { index: number }) {
  const icons = [
    // календарь с отметкой
    <>
      <rect pathLength={L} x="7" y="11" width="34" height="30" rx="5" />
      <path pathLength={L} d="M7 20H41M16 6V14M32 6V14" />
      <path pathLength={L} d="M17 30l5 5 9-10" />
    </>,
    // топ для тренировки
    <>
      <path pathLength={L} d="M15 7C17 15 31 15 33 7L39 10C36 17 36 24 38 41H10C12 24 12 17 9 10Z" />
      <path pathLength={L} d="M18 26H30" opacity=".6" />
    </>,
    // часы
    <>
      <circle pathLength={L} cx="24" cy="25" r="16" />
      <path pathLength={L} d="M24 15V25L31 29M19 5H29" />
    </>,
    // пилон с искрой
    <>
      <path pathLength={L} d="M20 4V44M14 44H26" />
      <path pathLength={L} d="M20 16C30 16 38 22 38 30" />
      <path pathLength={L} d={sparkle(36, 10, 5)} />
    </>,
    // корона
    <>
      <path pathLength={L} d="M8 36L11 14L19 24L24 9L29 24L37 14L40 36Z" />
      <path pathLength={L} d="M8 41H40" />
    </>,
  ];
  return (
    <Draw viewBox="0 0 48 48" width={2} className="step-art">
      {icons[index % icons.length]}
    </Draw>
  );
}

/** Art-deco divider: lines, chevrons and a double diamond in the middle. */
export function DecoDivider({ className = '' }: { className?: string }) {
  return (
    <Draw viewBox="0 0 240 24" width={1.2} className={`deco-divider ${className}`}>
      <path pathLength={L} d="M96 12H6M144 12H234" />
      <path pathLength={L} d="M120 2L130 12L120 22L110 12Z" />
      <path pathLength={L} d="M120 7L125 12L120 17L115 12Z" />
      <path pathLength={L} d="M102 6L106 12L102 18M138 6L134 12L138 18" />
      <circle pathLength={L} cx="86" cy="12" r="2" />
      <circle pathLength={L} cx="154" cy="12" r="2" />
    </Draw>
  );
}

/** Art-deco corner bracket; place four of them with .deco-corners. */
export function DecoCorners() {
  const corner = (
    <>
      <path pathLength={L} d="M2 46V2H46" />
      <path pathLength={L} d="M9 34V9H34" opacity=".6" />
      <path pathLength={L} d="M2 2L14 14" />
      <circle pathLength={L} cx="17" cy="17" r="2.2" />
    </>
  );
  return (
    <span className="deco-corners" aria-hidden="true">
      {['tl', 'tr', 'br', 'bl'].map((c) => (
        <Draw key={c} viewBox="0 0 48 48" width={1.3} className={`deco-corner deco-corner--${c}`}>
          {corner}
        </Draw>
      ))}
    </span>
  );
}

/** Stepped art-deco arch outline drawn behind a photo frame. */
export function DecoArch({ className = '' }: { className?: string }) {
  return (
    <Draw viewBox="0 0 300 420" width={1.3} className={`deco-arch ${className}`}>
      <path pathLength={L} d="M10 418V150A140 140 0 0 1 290 150V418" />
      <path pathLength={L} d="M26 418V154A124 124 0 0 1 274 154V418" opacity=".55" />
      <path pathLength={L} d="M150 10V40M150 52l6 6-6 6-6-6Z" />
      <path pathLength={L} d="M60 60L76 78M240 60L224 78M30 112L52 122M270 112L248 122" opacity=".7" />
    </Draw>
  );
}

/** Slowly turning sunburst of thin rays. */
export function Sunburst({ className = '' }: { className?: string }) {
  const rays = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const r1 = 70;
    const r2 = i % 2 ? 150 : 196;
    return `M${(200 + r1 * Math.cos(a)).toFixed(1)} ${(200 + r1 * Math.sin(a)).toFixed(1)}L${(200 + r2 * Math.cos(a)).toFixed(1)} ${(200 + r2 * Math.sin(a)).toFixed(1)}`;
  }).join('');
  return (
    <svg viewBox="0 0 400 400" className={`sunburst ${className}`} aria-hidden="true">
      <path d={rays} stroke="url(#g-gold)" strokeWidth="1" fill="none" />
      <circle cx="200" cy="200" r="60" fill="none" stroke="url(#g-gold)" strokeWidth=".8" />
    </svg>
  );
}

/** Gold flourish under a heading. */
export function Flourish({ className = '' }: { className?: string }) {
  return (
    <Draw viewBox="0 0 320 40" width={1.6} className={`flourish ${className}`}>
      <path pathLength={L} d="M6 26C60 26 90 10 140 14C176 17 170 34 150 30C132 26 150 6 190 8C236 10 270 26 314 20" />
      <path pathLength={L} d={sparkle(300, 10, 6)} strokeWidth={1.2} />
    </Draw>
  );
}
