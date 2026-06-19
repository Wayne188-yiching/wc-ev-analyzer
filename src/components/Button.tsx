import type { ReactNode, ButtonHTMLAttributes, CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; }

const variants: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--text-primary)', color: 'var(--bg-base)', border: '1px solid var(--text-primary)' },
  secondary: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-focus)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
};
const sizes: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px' },
  md: { padding: '10px 16px', fontSize: '13px' },
  lg: { padding: '14px 20px', fontSize: '14px' },
};

export function Button(props: ButtonProps): JSX.Element {
  const { children, variant = 'primary', size = 'md', icon, style, disabled, onMouseEnter, onMouseLeave, ...rest } = props;
  const base: CSSProperties = {
    ...variants[variant],
    ...sizes[size],
    borderRadius: 'var(--radius-btn)',
    fontWeight: 500,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : undefined,
    transition: 'opacity var(--duration-fade) var(--easing-base)',
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      onMouseEnter={(event) => { if (!disabled) event.currentTarget.style.opacity = '0.85'; onMouseEnter?.(event); }}
      onMouseLeave={(event) => { if (!disabled) event.currentTarget.style.opacity = ''; onMouseLeave?.(event); }}
      style={{ ...base, ...style }}
      type={rest.type ?? 'button'}
    >
      {icon}
      {children}
    </button>
  );
}
