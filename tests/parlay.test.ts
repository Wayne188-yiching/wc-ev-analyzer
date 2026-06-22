import { computeCombinedMath, resolveParlay } from '../src/lib/parlay';
import type { Bet, BetResult, Parlay } from '../src/types';

const makeBet = (id: string, odds: number, result: BetResult = null): Bet => ({
  id, matchId: `m-${id}`, market: '不讓分', selection: '主',
  odds, impliedProb: 100 / odds,
  stakePct: 2, stakeNT: 200,
  aiEstimatedProb: { min: 55, max: 60 }, aiVerdict: 'VALUE', aiEdge: 5,
  result, pnl: result === 'win' ? 100 : result === 'lose' ? -200 : result === 'void' ? 0 : null,
  createdAt: '2026-06-22T00:00:00Z',
  resolvedAt: result === null ? null : '2026-06-22T22:00:00Z',
});

const makeParlay = (legBetIds: string[], combinedOdds: number, stakeNT = 100): Parlay => ({
  id: 'p1', legBetIds, combinedOdds,
  combinedImpliedProb: 100 / combinedOdds,
  combinedEstimatedProb: { min: 35, max: 40 },
  combinedEdge: 5,
  aiVerdict: 'FAIR',
  aiAnalysis: { legs: [], combined: { odds: combinedOdds, impliedProb: 100/combinedOdds, estimatedProb: {min:35,max:40}, edge:5, vigPct:0 }, correlations: [], verdict: 'FAIR', warnings: [], summary: '' },
  stakePct: 1, stakeNT,
  result: null, pnl: null,
  createdAt: '2026-06-22T00:00:00Z', resolvedAt: null,
});

describe('computeCombinedMath', () => {
  it('1. empty → identity (odds=1, impliedProb=100%)', () => {
    const m = computeCombinedMath([]);
    expect(m.odds).toBe(1);
    expect(m.impliedProb).toBe(100);
  });

  it('2. 2 legs odds product', () => {
    const m = computeCombinedMath([makeBet('a', 2.0), makeBet('b', 1.5)]);
    expect(m.odds).toBeCloseTo(3.0, 5);
    expect(m.impliedProb).toBeCloseTo(33.33, 1);
  });

  it('3. 3 legs probability multiplication (assuming independence)', () => {
    const m = computeCombinedMath([makeBet('a', 2.0), makeBet('b', 2.0), makeBet('c', 2.0)]);
    expect(m.odds).toBeCloseTo(8.0, 5);
    expect(m.estimatedProb.min).toBeCloseTo((0.55 ** 3) * 100, 1);
  });

  it('4. edge = min estimatedProb - impliedProb', () => {
    const m = computeCombinedMath([makeBet('a', 2.0), makeBet('b', 2.0)]);
    expect(m.edge).toBeCloseTo(m.estimatedProb.min - m.impliedProb, 5);
  });
});

describe('resolveParlay', () => {
  it('5. pending (any leg null) → result null', () => {
    const bets = [makeBet('a', 2.0, 'win'), makeBet('b', 2.0, null)];
    const r = resolveParlay(makeParlay(['a', 'b'], 4.0), bets);
    expect(r.result).toBeNull();
    expect(r.pnl).toBeNull();
  });

  it('6. all win → win, pnl = stake × (combinedOdds - 1)', () => {
    const bets = [makeBet('a', 2.0, 'win'), makeBet('b', 2.0, 'win')];
    const r = resolveParlay(makeParlay(['a', 'b'], 4.0, 100), bets);
    expect(r.result).toBe('win');
    expect(r.pnl).toBeCloseTo(300, 5); // 100 × (2×2 - 1)
  });

  it('7. any lose → lose, pnl = -stake', () => {
    const bets = [makeBet('a', 2.0, 'win'), makeBet('b', 2.0, 'lose')];
    const r = resolveParlay(makeParlay(['a', 'b'], 4.0, 100), bets);
    expect(r.result).toBe('lose');
    expect(r.pnl).toBe(-100);
  });

  it('8. all void → void, pnl = 0', () => {
    const bets = [makeBet('a', 2.0, 'void'), makeBet('b', 2.0, 'void')];
    const r = resolveParlay(makeParlay(['a', 'b'], 4.0, 100), bets);
    expect(r.result).toBe('void');
    expect(r.pnl).toBe(0);
  });

  it('9. win + void → win with effective odds (void leg becomes 1.0)', () => {
    const bets = [makeBet('a', 2.0, 'win'), makeBet('b', 2.0, 'void')];
    const r = resolveParlay(makeParlay(['a', 'b'], 4.0, 100), bets);
    expect(r.result).toBe('win');
    expect(r.pnl).toBeCloseTo(100, 5); // 100 × (2 × 1 - 1) = 100
  });

  it('10. lose + void → lose (any lose wins over void)', () => {
    const bets = [makeBet('a', 2.0, 'lose'), makeBet('b', 2.0, 'void')];
    const r = resolveParlay(makeParlay(['a', 'b'], 4.0, 100), bets);
    expect(r.result).toBe('lose');
    expect(r.pnl).toBe(-100);
  });

  it('11. missing leg bet (deleted) → result null (orphan)', () => {
    const bets = [makeBet('a', 2.0, 'win')];
    const r = resolveParlay(makeParlay(['a', 'b'], 4.0), bets);
    expect(r.result).toBeNull();
    expect(r.pnl).toBeNull();
  });

  it('12. 3-leg all win with mixed odds', () => {
    const bets = [makeBet('a', 1.5, 'win'), makeBet('b', 2.0, 'win'), makeBet('c', 2.5, 'win')];
    const r = resolveParlay(makeParlay(['a', 'b', 'c'], 7.5, 100), bets);
    expect(r.result).toBe('win');
    expect(r.pnl).toBeCloseTo(650, 5); // 100 × (1.5 × 2 × 2.5 - 1) = 650
  });

  it('13. 3-leg win win void → win with reduced odds', () => {
    const bets = [makeBet('a', 2.0, 'win'), makeBet('b', 2.0, 'win'), makeBet('c', 2.0, 'void')];
    const r = resolveParlay(makeParlay(['a', 'b', 'c'], 8.0, 100), bets);
    expect(r.result).toBe('win');
    expect(r.pnl).toBeCloseTo(300, 5); // 100 × (2 × 2 × 1 - 1) = 300
  });
});
