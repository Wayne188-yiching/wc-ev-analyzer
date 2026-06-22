import type { Bet, BetResult, Parlay, ProbRange } from '../types';

export interface CombinedMath {
  odds: number;
  impliedProb: number;
  estimatedProb: ProbRange;
  edge: number;
  vigPct: number;
}

/**
 * Pre-AI client-side math for a parlay candidate. Assumes leg independence;
 * AI analysis layer is where correlation adjustments live.
 */
export function computeCombinedMath(legs: Bet[]): CombinedMath {
  if (legs.length === 0) {
    return { odds: 1, impliedProb: 100, estimatedProb: { min: 100, max: 100 }, edge: 0, vigPct: 0 };
  }
  const odds = legs.reduce((acc, b) => acc * b.odds, 1);
  const impliedProb = (1 / odds) * 100;
  const minProb = legs.reduce((acc, b) => acc * (b.aiEstimatedProb.min / 100), 1) * 100;
  const maxProb = legs.reduce((acc, b) => acc * (b.aiEstimatedProb.max / 100), 1) * 100;
  const edge = minProb - impliedProb;
  const legVigSum = legs.reduce((acc, b) => {
    const legVig = (b.impliedProb - 100 * (b.aiEstimatedProb.min / 100)) * 0.5;
    return acc + Math.max(0, legVig);
  }, 0);
  return {
    odds,
    impliedProb,
    estimatedProb: { min: minProb, max: maxProb },
    edge,
    vigPct: legVigSum,
  };
}

/**
 * Resolve a parlay from its legs' current bet results.
 *  - any missing leg (bet deleted)        → result null   (orphan)
 *  - any leg.result === null              → result null   (pending)
 *  - any leg.result === 'lose'            → 'lose', pnl = -stake
 *  - all legs.result === 'void'           → 'void', pnl = 0
 *  - mix of win + void                    → 'win', pnl uses effectiveOdds (voids → 1.0)
 *  - all legs.result === 'win'            → 'win', pnl = stake × (combinedOdds - 1)
 */
export function resolveParlay(parlay: Parlay, allBets: Bet[]): { result: BetResult; pnl: number | null } {
  const legBets = parlay.legBetIds
    .map((id) => allBets.find((b) => b.id === id))
    .filter((b): b is Bet => b !== undefined);

  if (legBets.length !== parlay.legBetIds.length) return { result: null, pnl: null };
  if (legBets.some((b) => b.result === null)) return { result: null, pnl: null };
  if (legBets.some((b) => b.result === 'lose')) return { result: 'lose', pnl: -parlay.stakeNT };
  if (legBets.every((b) => b.result === 'void')) return { result: 'void', pnl: 0 };

  const effectiveOdds = legBets.reduce((acc, b) => acc * (b.result === 'void' ? 1 : b.odds), 1);
  const pnl = parlay.stakeNT * (effectiveOdds - 1);
  return { result: 'win', pnl };
}
