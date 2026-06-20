import type { ReactNode } from 'react';

export interface SectionLabelProps {
  children: ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps): JSX.Element {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 12,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}
