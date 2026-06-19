import type { ReactNode, CSSProperties } from 'react';

export type TagTone = 'neutral' | 'positive' | 'fair' | 'negative' | 'brand';
export type TagSize = 'sm' | 'md';
export interface TagProps { children: ReactNode; tone?: TagTone; size?: TagSize; }

const tones: Record<TagTone, CSSProperties> = {
  neutral: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  positive: { background: 'var(--positive-soft)', color: 'var(--positive)' },
  fair: { background: 'var(--fair-soft)', color: 'var(--fair)' },
  negative: { background: 'var(--negative-soft)', color: 'var(--negative)' },
  brand: { background: 'var(--brand-soft)', color: 'var(--brand)' },
};
const sizes: Record<TagSize, CSSProperties> = {
  sm: { padding: '2px 8px', fontSize: '11px' },
  md: { padding: '4px 10px', fontSize: '12px' },
};

export function Tag({ children, tone = 'neutral', size = 'sm' }: TagProps): JSX.Element {
  return (
    <span
      style={{
        ...tones[tone],
        ...sizes[size],
        borderRadius: 'var(--radius-pill)',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
