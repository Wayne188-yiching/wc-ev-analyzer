import type { ReactNode, CSSProperties } from 'react';
import { Card } from './Card';

export type KpiTone = 'positive' | 'fair' | 'negative' | 'neutral';
export interface KpiCardProps { label: string; value: ReactNode; sub?: ReactNode; tone?: KpiTone; onClick?: () => void; }

const toneColor: Record<KpiTone, string> = {
  positive: 'var(--positive)',
  fair: 'var(--fair)',
  negative: 'var(--negative)',
  neutral: 'var(--text-numeric)',
};

export function KpiCard({ label, value, sub, tone = 'neutral', onClick }: KpiCardProps): JSX.Element {
  const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 500 };
  const valueStyle: CSSProperties = { fontSize: 28, fontWeight: 600, lineHeight: 1.1, color: toneColor[tone] };
  const subStyle: CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 };
  return (
    <Card style={{ padding: 18 }} onClick={onClick} ariaLabel={label}>
      <div style={labelStyle}>{label}</div>
      <div className="mono" style={valueStyle}>{value}</div>
      {sub && <div className="mono" style={subStyle}>{sub}</div>}
    </Card>
  );
}
