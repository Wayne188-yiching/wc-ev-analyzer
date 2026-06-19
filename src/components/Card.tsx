import type { ReactNode, CSSProperties } from 'react';

export interface CardProps { children: ReactNode; className?: string; style?: CSSProperties; elevated?: boolean; onClick?: () => void; ariaLabel?: string; }

export function Card(props: CardProps): JSX.Element {
  const { children, className, style, elevated = false, onClick, ariaLabel } = props;
  const interactive = Boolean(onClick);
  const base: CSSProperties = {
    background: elevated ? 'var(--bg-elevated)' : 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--pad-card)',
    cursor: interactive ? 'pointer' : undefined,
    transition: interactive ? 'opacity var(--duration-fade) var(--easing-base)' : undefined,
  };
  return (
    <div
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick();
      }}
      onMouseEnter={(event) => { if (interactive) event.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={(event) => { if (interactive) event.currentTarget.style.opacity = ''; }}
      role={interactive ? 'button' : undefined}
      style={{ ...base, ...style }}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
}
