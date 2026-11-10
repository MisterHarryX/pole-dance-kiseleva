import type { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'pole'
  | 'mirror'
  | 'heart'
  | 'spa'
  | 'phone'
  | 'pin'
  | 'metro'
  | 'clock'
  | 'arrow'
  | 'star'
  | 'close'
  | 'chevron'
  | 'check'
  | 'sparkle'
  | 'route'
  | 'calendar'
  | 'menu'
  | 'key'
  | 'telegram'
  | 'vk'
  | 'instagram'
  | 'youtube'
  | 'dzen';

const paths: Record<IconName, ReactElement> = {
  pole: (
    <>
      <path d="M12 2v20" />
      <path d="M8 22h8" />
      <path d="M9 2h6" />
      <path d="M12 8c3 0 5 2 5 4" opacity=".5" />
    </>
  ),
  mirror: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8l3-3M9 12l6-6" opacity=".6" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  spa: (
    <>
      <path d="M12 20c-4 0-7-3-7-7 3 0 5 1 7 3 2-2 4-3 7-3 0 4-3 7-7 7z" />
      <path d="M12 16c-1.5-2-1.5-6 0-10 1.5 4 1.5 8 0 10z" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  pin: (
    <>
      <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  metro: <path d="M4 18 8.5 6 12 13l3.5-7L20 18M3 18h5M16 18h5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 5 5 9-10" />,
  sparkle: <path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" />,
  route: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12L20 3M17 6l3 3M14.5 8.5l2 2" />
    </>
  ),
  telegram: <path d="M21 4 3 11l6 2 2 6 3-4 5 4zM9 13l9-6-7 8" />,
  vk: <path d="M3 7h3c.5 3 2 5 3.5 5.5V7h3v3.5C14 10 15.5 8.5 16 7h3c-.5 2.5-2.5 4.5-4 5.3 1.7.7 3.6 2.6 4.4 4.7H16c-.7-1.6-2-3-3.5-3.2V17h-1C7 17 4 13 3 7z" />,
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17" cy="7" r=".6" fill="currentColor" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  dzen: <path d="M12 3c0 5-4 9-9 9 5 0 9 4 9 9 0-5 4-9 9-9-5 0-9-4-9-9z" />,
};

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
