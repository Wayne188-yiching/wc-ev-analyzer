/**
 * Core domain types for WC EV Analyzer.
 *
 * Invariants below are not enforced by the type system. storage.ts runs a
 * sanity check on boot; resolve-bet.ts and the result-entry view honour them
 * when producing new state.
 */

export type EvVerdict = 'VALUE' | 'FAIR' | 'AVOID';

/**
 * A bet's settlement state.
 * `null` means undecided — either the match has not been played, the match
 * was played but resolveBet returned 'unknown' (unsupported market / parse
 * failure), or the user has not yet entered the score.
 */
export type BetResult = 'win' | 'lose' | 'void' | null;

/** Inclusive probability range, both ends in 0–100 (percent). */
export interface ProbRange {
  min: number;
  max: number;
}

/**
 * AI analysis snapshot for one match. Mirrors the JSON returned by the
 * Anthropic API per SYSTEM_PROMPT. Persisted verbatim inside Match.aiResult
 * so we can re-render Analysis Detail without another API call.
 */
export interface AnalysisResult {
  match: {
    teamA: string;
    teamB: string;
    datetime: string;
    stage: string;
    venue: string;
  };
  teamRatings: {
    teamA: number;
    teamB: number;
    gap: number;
    favorite: string;
  };
  marketVig: Array<{ market: string; vig: string }>;
  analysis: Array<{
    market: string;
    selection: string;
    odds: number;
    impliedProb: number;
    estimatedProb: ProbRange;
    edge: number;
    verdict: EvVerdict;
    reasoning: string;
  }>;
  recommendations: Array<{
    bet: string;
    market: string;
    selection: string;
    odds: number;
    stakePct: number;
    expectedEdge: string;
    estimatedProb: ProbRange;
    edge: number;
    reasoning: string;
  }>;
  totalExposurePct: number;
  /** AI's self-reported count of analysed markets (= analysis.length). Cross-checked against the user's expected count to flag dropped markets. */
  marketCount: number;
  avoid: Array<{ bet: string; reason: string }>;
  preMatchChecks: string[];
  summary: string;
}

/**
 * A stored match record.
 *
 * Invariants:
 *  - isVoid === true  ⇒  fullScore === null AND halfScore === null
 *  - isVoid === true  ⇒  every Bet with matching matchId has result === 'void' and pnl === 0
 *  - fullScore === null AND isVoid === false  ⇒  not yet played / score not entered
 *  - resultEnteredAt !== null  ⇒  fullScore !== null OR isVoid === true
 *
 * dateGroup is the local-day key used for Dashboard grouping (YYYY-MM-DD).
 * It is derived from datetime at insert time and never recomputed.
 */
export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  datetime: string;
  stage: string;
  venue: string | null;
  teamRatings: {
    teamA: number;
    teamB: number;
    gap: number;
    favorite: string;
  };
  aiSummary: string;
  aiResult: AnalysisResult;
  dateGroup: string;
  createdAt: string;
  fullScore: [number, number] | null;
  halfScore: [number, number] | null;
  isVoid: boolean;
  resultEnteredAt: string | null;
}

/**
 * A placed bet.
 *
 * Invariants tied to settlement:
 *  - result === 'win'   ⇒  pnl > 0          AND resolvedAt !== null
 *  - result === 'lose'  ⇒  pnl === -stakeNT AND resolvedAt !== null
 *  - result === 'void'  ⇒  pnl === 0        AND resolvedAt !== null
 *  - result === null    ⇒  pnl === null     AND resolvedAt === null
 *
 * When resolveBet returns 'unknown' the bet stays at result === null and the
 * UI exposes a manual override (Q4 decision).
 *
 * stakePct is the discipline rule (1–5, per SYSTEM_PROMPT) but is stored as a
 * plain number so future increments (e.g. 0.5) don't require a type change.
 * stakeNT is the materialised NT$ amount captured at bet creation
 * (= bankroll × stakePct / 100); we keep it explicit so later bankroll edits
 * don't retroactively rewrite history.
 */
export interface Bet {
  id: string;
  matchId: string;
  market: string;
  selection: string;
  odds: number;
  impliedProb: number;
  stakePct: number;
  stakeNT: number;
  aiEstimatedProb: ProbRange;
  aiVerdict: EvVerdict;
  aiEdge: number;
  result: BetResult;
  pnl: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * Top-level state persisted to localStorage.
 *
 * apiKey lives here (never exported via "Export JSON" — see settings view).
 * lastExport is an ISO timestamp set by the export action; used to nag the
 * user when stale.
 */
/**
 * AI analysis snapshot for one parlay (a combination of multiple bets).
 * Returned by api.ts/analyzeParlay; persisted verbatim inside Parlay.aiAnalysis.
 */
export interface ParlayAnalysisResult {
  legs: Array<{
    market: string;
    selection: string;
    odds: number;
    impliedProb: number;
    estimatedProb: ProbRange;
    edge: number;
    verdict: EvVerdict;
  }>;
  combined: {
    odds: number;
    impliedProb: number;
    estimatedProb: ProbRange;
    edge: number;
    vigPct: number;
  };
  correlations: Array<{
    legs: [number, number];
    type: 'positive' | 'negative' | 'none';
    magnitude: 'strong' | 'moderate' | 'weak';
    reason: string;
  }>;
  verdict: EvVerdict;
  warnings: string[];
  summary: string;
}

/**
 * A stored parlay record. Composed from 2-N existing Bet ids (legBetIds).
 *
 * Resolution invariants:
 *  - All legs must be in state.bets; if any is missing, result === null
 *  - result === null while any leg's bet.result is null
 *  - result === 'lose' if any leg's bet.result === 'lose'
 *  - result === 'void' if ALL legs are 'void'
 *  - result === 'win'  if no legs lose AND at least one leg wins
 *    (void legs collapse to odds=1.0, reducing combined payout)
 *
 * combinedOdds is the cached product of leg odds at parlay creation. Stored to
 * survive bet edits; on resolution, effectiveOdds is recomputed from current
 * leg results (voids → 1.0).
 */
export interface Parlay {
  id: string;
  legBetIds: string[];
  combinedOdds: number;
  combinedImpliedProb: number;
  combinedEstimatedProb: ProbRange;
  combinedEdge: number;
  aiVerdict: EvVerdict;
  aiAnalysis: ParlayAnalysisResult;
  stakePct: number;
  stakeNT: number;
  result: BetResult;
  pnl: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AppState {
  apiKey: string;
  bankroll: number;
  matches: Match[];
  bets: Bet[];
  parlays: Parlay[];
  lastExport: string | null;
}
