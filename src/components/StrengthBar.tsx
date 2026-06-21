import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { gsap, prefersReducedMotion } from '../lib/motion';

export interface StrengthBarProps { teamA: string; teamB: string; ratingA: number; ratingB: number; }

export function StrengthBar({ teamA, teamB, ratingA, ratingB }: StrengthBarProps): JSX.Element {
  const max = Math.max(ratingA, ratingB, 100);
  const aPct = (ratingA / max) * 100;
  const bPct = (ratingB / max) * 100;
  const aFillRef = useRef<HTMLDivElement>(null);
  const bFillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aEl = aFillRef.current;
    const bEl = bFillRef.current;
    if (!aEl || !bEl) return;
    const targetA = `${aPct / 2}%`;
    const targetB = `${bPct / 2}%`;
    if (prefersReducedMotion()) {
      aEl.style.width = targetA;
      bEl.style.width = targetB;
      return;
    }
    aEl.style.width = '0%';
    bEl.style.width = '0%';
    const tween = gsap.to([aEl, bEl], {
      width: (i: number) => i === 0 ? targetA : targetB,
      duration: 0.7,
      ease: 'expo.out',
      delay: 0.2,
    });
    return () => { tween.kill(); };
  }, [aPct, bPct]);

  const fillBase: CSSProperties = { position: 'absolute', top: 0, bottom: 0 };
  return (
    <div
      aria-label={teamA + ' ' + ratingA + ' vs ' + teamB + ' ' + ratingB}
      role="img"
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, fontSize: 12 }}
    >
      <div className="mono" style={{ color: 'var(--text-numeric)', minWidth: 24, textAlign: 'right' }}>{ratingA}</div>
      <div style={{ flex: 1, position: 'relative', height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-focus)' }} />
        <div ref={aFillRef} style={{ ...fillBase, right: '50%', background: 'var(--brand)', borderRadius: '2px 0 0 2px' }} />
        <div ref={bFillRef} style={{ ...fillBase, left: '50%', background: 'var(--text-tertiary)', borderRadius: '0 2px 2px 0' }} />
      </div>
      <div className="mono" style={{ color: 'var(--text-numeric)', minWidth: 24 }}>{ratingB}</div>
    </div>
  );
}
