import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
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
  const fillRef = useRef<HTMLDivElement>(null);

  const targetWidth = estimatedProb
    ? Math.max(estimatedProb.max - estimatedProb.min, 0.5)
    : 0;

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      el.style.width = `${targetWidth}%`;
      return;
    }
    const tween = gsap.fromTo(
      el,
      { width: '0%' },
      { width: `${targetWidth}%`, duration: 0.4, ease: 'power2.out' },
    );
    return () => { tween.kill(); };
  }, [targetWidth]);

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
        ref={fillRef}
        style={{
          position: 'absolute', top: 0, bottom: 0, left: `${estimatedProb.min}%`,
          width: '0%',
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
