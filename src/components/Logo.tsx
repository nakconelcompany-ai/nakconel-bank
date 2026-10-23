'use client';

type Props = { size?: number; className?: string };

export default function Logo({ size = 88, className = '' }: Props) {
  return (
    <img
      src="/logo.png"
      alt="Nakconel"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 24px rgba(212, 175, 55, 0.45))',
      }}
      onError={(e) => {
        const el = e.currentTarget;
        if (el.src.includes('logo.png')) el.src = '/logo.svg';
      }}
    />
  );
}
