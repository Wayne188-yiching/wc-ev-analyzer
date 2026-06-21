import { useEffect, useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Card } from './Card';
import { gsap, prefersReducedMotion } from '../lib/motion';

export type KpiTone = 'positive' | 'fair' | 'negative' | 'neutral';

export interface KpiCardProps {
  label: string;
  /** Static value. Use this OR `counter`, not both. */
  value?: ReactNode;
  /** Animated count-up. Format is called every frame with the current tween value. */
  counter?: { to: number; format: (n: number) => string };
  sub?: ReactNode;
  tone?: KpiTone;
  onClick?: () => void;
}

const toneColor: Record<KpiTone, string> = {
  positive: 'var(--positive)',
  fair: 'var(--fair)',
  negative: 'var(--negative)',
  neutral: 'var(--text-numeric)',
};

function CounterValue({ to, format, color }: { to: number; format: (n: number) => string; color: string }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = format(to);
      return;
    }
    const obj = { v: 0 };
    el.textContent = format(0);
    const tween = gsap.to(obj, {
      v: to,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = format(obj.v); },
    });
    return () => { tween.kill(); };
  }, [to, format]);
  return <div ref={ref} className="mono" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1, color }} />;
}

export function KpiCard({ label, value, counter, sub, tone = 'neutral', onClick }: KpiCardProps): JSX.Element {
  const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 500 };
  const valueStyle: CSSProperties = { fontSize: 28, fontWeight: 600, lineHeight: 1.1, color: toneColor[tone] };
  const subStyle: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 };
  return (
    <Card style={{ padding: 18 }} onClick={onClick} ariaLabel={label}>
      <div style={labelStyle}>{label}</div>
      {counter
        ? <CounterValue to={counter.to} format={counter.format} color={toneColor[tone]} />
        : <div className="mono" style={valueStyle}>{value}</div>}
      {sub && <div className="mono" style={subStyle}>{sub}</div>}
    </Card>
  );
}
