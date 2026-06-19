import type { EvVerdict, ProbRange } from '../types';

export interface EvBarProps {
  impliedProb: number;
  estimatedProb: ProbRange;
  verdict: EvVerdict;
  compact?: boolean;
  ariaLabel?: string;
}

export function EvBar(props: EvBarProps): JSX.Element | null {
  const { impliedProb, estimatedProb, verdict, compact = false } = props;
  if (!estimatedProb || typeof impliedProb !== 'number') return null;

  const verdictColor =
    {
      VALUE: 'var(--positive)',
      FAIR: 'var(--fair)',
      AVOID: 'var(--negative)',
    }[verdict] || 'var(--text-tertiary)';
  const h = compact ? 5 : 8;

  return (
    <div
      role="img"
      aria-label={props.ariaLabel}
      style={{
        background: 'var(--bg-elevated)', height: h, borderRadius: h / 2,
        position: 'relative', width: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 0, bottom: 0, left: `${estimatedProb.min}%`,
          width: `${Math.max(estimatedProb.max - estimatedProb.min, 0.5)}%`,
          background: verdictColor, opacity: 0.95, borderRadius: h / 2,
        }}
      />
      <div
        style={{
          position: 'absolute', left: `${impliedProb}%`, top: -2, bottom: -2,
          width: 2, background: 'var(--text-primary)', marginLeft: -1,
        }}
      />
    </div>
  );
}
