import type { Bet, BetResult } from '../types';
import { sameTeam } from './teams';

export type ResolveBetResult = 'win' | 'lose' | 'void' | 'unknown';

/**
 * Convert a settled bet into P/L (NT$).
 *  - 'win'  → stake × (odds - 1)
 *  - 'lose' → -stake
 *  - 'void' → 0
 *  - null   → null (undecided)
 */
export function computePnL(stake: number, odds: number, result: BetResult): number | null {
  if (result === 'win') return stake * (odds - 1);
  if (result === 'lose') return -stake;
  if (result === 'void') return 0;
  return null;
}

/**
 * Resolve a bet against actual 90-minute scores.
 *  - 'unknown' = market not supported OR inputs invalid (caller keeps
 *    bet.result === null and surfaces a manual-override UI per Q4).
 *  - World Cup 2026 scope (Q1): alias-aware team matching (see teams.ts).
 *  - Combo markets ("不讓分/兩隊都進球" with "和局/否") are split into atomic
 *    legs and AND-ed: any leg lose → lose; all void → void; otherwise win.
 *  - NEVER throws. Any unexpected input → 'unknown'.
 */
export function resolveBet(
  bet: Bet,
  fullScore: [number, number] | null,
  halfScore: [number, number] | null,
  teamA: string,
  teamB: string,
): ResolveBetResult {
  if (!fullScore || fullScore.length !== 2) return 'unknown';
  const a = Number(fullScore[0]);
  const b = Number(fullScore[1]);
  if (Number.isNaN(a) || Number.isNaN(b)) return 'unknown';
  const total = a + b;

  const isHome = (s: string) => s.includes('主') || sameTeam(s, teamA);
  const isAway = (s: string) => s.includes('客') || sameTeam(s, teamB);
  const isDraw = (s: string) => s.includes('和') || s.toLowerCase().includes('draw');

  /** Resolve one atomic (non-combo) market + selection. */
  const atomic = (market: string, sel: string): ResolveBetResult => {
    // 1X2 / 不讓分
    if (market === '不讓分' || /^1\s*X\s*2/i.test(market)) {
      if (isDraw(sel)) return a === b ? 'win' : 'lose';
      if (isHome(sel)) return a > b ? 'win' : 'lose';
      if (isAway(sel)) return b > a ? 'win' : 'lose';
    }

    // 讓分 X:Y (half-width or full-width colon)
    const handicapM = market.match(/讓分?\s*(\d+)\s*[:：]\s*(\d+)/);
    if (handicapM) {
      const adjA = a - parseInt(handicapM[1], 10);
      const adjB = b - parseInt(handicapM[2], 10);
      if (isDraw(sel)) return adjA === adjB ? 'win' : 'lose';
      if (isHome(sel)) return adjA > adjB ? 'win' : adjA === adjB ? 'void' : 'lose';
      if (isAway(sel)) return adjB > adjA ? 'win' : adjA === adjB ? 'void' : 'lose';
    }

    // 半場大小 (checked before 大小 / BTTS to lock priority)
    if (/半場.*大小/.test(market) && halfScore) {
      const lineM = market.match(/(\d+\.?\d*)/);
      if (lineM) {
        const line = parseFloat(lineM[1]);
        const ht = (Number(halfScore[0]) || 0) + (Number(halfScore[1]) || 0);
        if (sel.includes('大')) return ht > line ? 'win' : 'lose';
        if (sel.includes('小')) return ht < line ? 'win' : 'lose';
      }
    }

    // 大小 (full total or per-team)
    if (/大小/.test(market) && !/半場/.test(market)) {
      const lineM = market.match(/(\d+\.?\d*)/);
      if (lineM) {
        const line = parseFloat(lineM[1]);
        const teamPrefix = market.replace(/大小.*$/, '').trim();
        let goals = total;
        if (teamPrefix && teamPrefix !== '[總分]' && teamPrefix !== '總分') {
          if (sameTeam(teamPrefix, teamA)) goals = a;
          else if (sameTeam(teamPrefix, teamB)) goals = b;
        }
        if (sel.includes('大')) return goals > line ? 'win' : 'lose';
        if (sel.includes('小')) return goals < line ? 'win' : 'lose';
      }
    }

    // 正確進球數 (exact goal count — team-prefixed or total)
    if (/正確進球數|正确进球数/.test(market)) {
      const numM = sel.match(/(\d+)/);
      if (numM) {
        const target = parseInt(numM[1], 10);
        const prefix = market.replace(/正確進球數.*$/, '').replace(/正确进球数.*$/, '').trim();
        let goals = total;
        if (prefix && prefix !== '[總分]' && prefix !== '總分') {
          if (sameTeam(prefix, teamA)) goals = a;
          else if (sameTeam(prefix, teamB)) goals = b;
        }
        // "X 或以上" / "X+" means "at least X".
        if (/或以上|以上|\+/.test(sel)) return goals >= target ? 'win' : 'lose';
        return goals === target ? 'win' : 'lose';
      }
    }

    // 兩隊都進球
    if (/兩隊.*進球|兩隊都進|BTTS/i.test(market)) {
      const both = a > 0 && b > 0;
      if (sel === '是' || sel.toLowerCase() === 'yes') return both ? 'win' : 'lose';
      if (sel === '否' || sel.toLowerCase() === 'no') return !both ? 'win' : 'lose';
    }

    // 半全場
    if (/半全場|HT.*FT/i.test(market) && halfScore) {
      const ha = Number(halfScore[0]);
      const hb = Number(halfScore[1]);
      const ht = ha > hb ? 'A' : ha < hb ? 'B' : 'D';
      const ft = a > b ? 'A' : a < b ? 'B' : 'D';
      const parts = sel.split('/');
      if (parts.length === 2) {
        const code = (s: string): 'A' | 'B' | 'D' | null =>
          isDraw(s) ? 'D' : isHome(s) ? 'A' : isAway(s) ? 'B' : null;
        const want = [code(parts[0]), code(parts[1])];
        if (want[0] && want[1]) return ht === want[0] && ft === want[1] ? 'win' : 'lose';
      }
    }

    // 正確比數 (exact score) — full match or first half. Score lives in selection (e.g. "2:1").
    if (/正確比數|正确比数/.test(market)) {
      // "其他比分" (any score outside the listed options) can't be resolved without the full option list.
      if (/其他|其它/.test(sel)) return 'unknown';
      const scoreM = sel.match(/(\d+)\s*[:：]\s*(\d+)/);
      if (scoreM) {
        const ta = parseInt(scoreM[1], 10);
        const tb = parseInt(scoreM[2], 10);
        const isHalf = /半場|半场|上半/.test(market);
        if (isHalf) {
          if (!halfScore) return 'unknown';
          const ha = Number(halfScore[0]);
          const hb = Number(halfScore[1]);
          if (Number.isNaN(ha) || Number.isNaN(hb)) return 'unknown';
          return ha === ta && hb === tb ? 'win' : 'lose';
        }
        return a === ta && b === tb ? 'win' : 'lose';
      }
    }

    return 'unknown';
  };

  const market = (bet.market || '').trim();
  const sel = (bet.selection || '').trim();

  // Combo market: "marketA/marketB" with matching "selA/selB". AND the legs.
  // 半全場 also uses "/" in its selection but keeps a single market (no "/"),
  // so requiring market.includes('/') cleanly excludes it.
  if (market.includes('/') && sel.includes('/') && !/半全場|HT.*FT/i.test(market)) {
    const mParts = market.split('/').map((s) => s.trim());
    const sParts = sel.split('/').map((s) => s.trim());
    if (mParts.length >= 2 && mParts.length === sParts.length) {
      const legs = mParts.map((m, i) => atomic(m, sParts[i]));
      if (legs.some((r) => r === 'unknown')) return 'unknown';
      if (legs.some((r) => r === 'lose')) return 'lose';
      if (legs.every((r) => r === 'void')) return 'void';
      return 'win';
    }
  }

  return atomic(market, sel);
}
