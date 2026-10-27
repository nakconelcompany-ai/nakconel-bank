import type { ReactNode } from 'react';

/** Sharp fintech SVG icons — no unicode, no external deps */

type IconProps = { size?: number; className?: string; color?: string };

const wrap = (size: number, color: string, children: ReactNode, className?: string) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'block', flexShrink: 0 }}
    aria-hidden
  >
    {children}
  </svg>
);

export function IconHome({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <path d="M3 10.5L12 3l9 7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5V20a1 1 0 001 1h4v-6h3v6h4a1 1 0 001-1V9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ), className);
}

export function IconSend({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <path d="M3.5 11.5L20 4l-7.5 16.5-2-7.5-7-1.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
  ), className);
}

export function IconReceive({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <path d="M12 4v12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 11l5 5 5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ), className);
}

export function IconTopUp({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ), className);
}

export function IconCard({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke={color} strokeWidth="1.8" />
      <path d="M2.5 10h19" stroke={color} strokeWidth="1.8" />
      <path d="M6 15h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ), className);
}

export function IconHistory({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ), className);
}

export function IconUser({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8" />
      <path d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ), className);
}

export function IconBiz({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <rect x="3" y="8" width="18" height="12" rx="1.5" stroke={color} strokeWidth="1.8" />
      <path d="M8 8V6.5A1.5 1.5 0 019.5 5h5A1.5 1.5 0 0116 6.5V8" stroke={color} strokeWidth="1.8" />
      <path d="M3 13h18" stroke={color} strokeWidth="1.8" />
    </>
  ), className);
}

export function IconEye({ size = 18, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.6" />
    </>
  ), className);
}

export function IconEyeOff({ size = 18, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <path d="M3 3l18 18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 10.5a2.5 2.5 0 003 3M6.5 6.8C4 8.5 2 12 2 12s3.5 7 10 7c1.5 0 2.9-.3 4.1-.8M17.5 15.2C20 13.4 22 12 22 12s-3.5-7-10-7c-.7 0-1.4.1-2 .2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ), className);
}

export function IconCheck({ size = 28, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <path d="M5 13l5 5L19 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  ), className);
}

export function IconShield({ size = 16, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  ), className);
}

export function IconWorld({ size = 22, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M3 12h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 3c2.5 2.8 4 6.2 4 9s-1.5 6.2-4 9c-2.5-2.8-4-6.2-4-9s1.5-6.2 4-9z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ), className);
}

export function IconCopy({ size = 18, color = 'currentColor', className }: IconProps) {
  return wrap(size, color, (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M4 16V6a2 2 0 012-2h10" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ), className);
}
