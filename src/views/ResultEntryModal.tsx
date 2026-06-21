import { useMemo, useState } from 'react';
import type { CSSProperties, Dispatch } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { SectionLabel } from '../components/SectionLabel';
import { formatNT } from '../lib/format';
import { computePnL, resolveBet } from '../lib/resolve-bet';
import type { AppState, Bet, BetResult } from '../types';
import type { AppAction } from '../hooks/useAppState';

export interface ResultEntryModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  matchId: string;
  onClose: () => void;
}

type ScoreTuple = [string, string];
type PreviewResult = BetResult | 'unknown' | null;
interface PreviewBet { id: string; market: string; selection: string; odds: number; stakeNT: number; result: PreviewResult; pnl: number | null; }

const fullInputStyle: CSSProperties = { width: 60, height: 60, fontSize: 28, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-numeric)', fontWeight: 600, outline: 'none', fontFamily: 'inherit', textAlign: 'center' };
const halfInputStyle: CSSProperties = { width: 40, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-numeric)', outline: 'none', fontFamily: 'inherit', textAlign: 'center', padding: '6px 0', fontSize: 13 };

function scoreToStrings(score: [number, number] | null): ScoreTuple {
  return score ? [String(score[0]), String(score[1])] : ['', ''];
}

function parseScore(score: ScoreTuple): [number, number] | null {
  const a = parseInt(score[0], 10);
  const b = parseInt(score[1], 10);
  return Number.isNaN(a) || Number.isNaN(b) ? null : [a, b];
}

function previewBet(
  bet: Bet,
  fullScore: [number, number] | null,
  halfScore: [number, number] | null,
  markVoid: boolean,
  teamA: string,
  teamB: string,
): PreviewBet {
  const base = { id: bet.id, market: bet.market, selection: bet.selection, odds: bet.odds, stakeNT: bet.stakeNT };
  if (markVoid) return { ...base, result: 'void', pnl: 0 };
  if (!fullScore) return { ...base, result: null, pnl: null };
  const resolved = resolveBet(bet, fullScore, halfScore, teamA, teamB);
  if (resolved === 'unknown') return { ...base, result: 'unknown', pnl: null };
  return { ...base, result: resolved, pnl: computePnL(bet.stakeNT, bet.odds, resolved) };
}

function resultLabel(result: PreviewResult): string {
  if (result === 'win') return '勝';
  if (result === 'lose') return '負';
  if (result === 'void') return '退';
  if (result === 'unknown') return '?';
  return '';
}

function resultColor(result: PreviewResult): string {
  if (result === 'win') return 'var(--positive)';
  if (result === 'lose') return 'var(--negative)';
  if (result === 'void') return 'var(--text-tertiary)';
  if (result === 'unknown') return 'var(--fair)';
  return 'var(--text-tertiary)';
}

function ResultValue({ bet }: { bet: PreviewBet }): JSX.Element {
  if (bet.result === null) {
    return <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>輸入比分後判定</span>;
  }
  const color = resultColor(bet.result);
  const label = resultLabel(bet.result);
  if (bet.pnl === null) {
    return <span style={{ color, fontWeight: 500, fontSize: 12 }}>{label}</span>;
  }
  return (
    <span className="mono" style={{ color, fontWeight: 500, fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'baseline' }}>
      <span>{label}</span>
      <span style={{ minWidth: 70, textAlign: 'right' }}>{formatNT(bet.pnl, { signed: true })}</span>
    </span>
  );
}

export function ResultEntryModal({ state, dispatch, matchId, onClose }: ResultEntryModalProps): JSX.Element | null {
  const match = state.matches.find((item) => item.id === matchId);
  const [fullScore, setFullScore] = useState<ScoreTuple>(() => scoreToStrings(match?.fullScore ?? null));
  const [halfScore, setHalfScore] = useState<ScoreTuple>(() => scoreToStrings(match?.halfScore ?? null));
  const [markVoid, setMarkVoid] = useState<boolean>(() => match?.isVoid ?? false);
  const bets = useMemo(() => state.bets.filter((bet) => bet.matchId === matchId), [state.bets, matchId]);
  if (!match) return null;

  const fullParsed = parseScore(fullScore);
  const halfParsed = halfScore[0] !== '' && halfScore[1] !== '' ? parseScore(halfScore) : null;
  const previews = bets.map((bet) => previewBet(bet, fullParsed, halfParsed, markVoid, match.teamA, match.teamB));
  const totalPnL = previews.reduce((sum, bet) => sum + (bet.pnl ?? 0), 0);
  const allResolved = previews.every((bet) => bet.result === 'win' || bet.result === 'lose' || bet.result === 'void');
  const scoresFilled = fullScore[0] !== '' && fullScore[1] !== '';
  const canSave = markVoid || (scoresFilled && allResolved);
  const showTotal = !markVoid && scoresFilled;
  const showWarning = !markVoid && scoresFilled && !allResolved;
  const totalColor = totalPnL > 0 ? 'var(--positive)' : totalPnL < 0 ? 'var(--negative)' : 'var(--text-numeric)';

  const handleSave = (): void => {
    if (!canSave) return;
    const resolvedAt = new Date().toISOString();
    if (markVoid) {
      dispatch({ type: 'ENTER_RESULT', payload: { matchId, fullScore: null, halfScore: null, isVoid: true, resolvedAt, betUpdates: [] } });
    } else {
      const betUpdates = previews
        .filter((bet) => bet.result === 'win' || bet.result === 'lose' || bet.result === 'void')
        .map((bet) => ({ id: bet.id, result: bet.result as BetResult, pnl: bet.pnl, resolvedAt }));
      dispatch({ type: 'ENTER_RESULT', payload: { matchId, fullScore: fullParsed, halfScore: halfParsed, isVoid: false, resolvedAt, betUpdates } });
    }
    onClose();
  };

  return (
    <Modal ariaLabel="輸入比分" maxWidth={640} onClose={onClose}>
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>輸入比分</div>
            <div style={{ fontSize: 20, marginTop: 4, color: 'var(--text-primary)' }}>{match.teamA} vs {match.teamB}</div>
          </div>
          <button aria-label="關閉" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 18, lineHeight: 1 }} type="button">✕</button>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-card)', marginBottom: 16, opacity: markVoid ? 0.4 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>{match.teamA}</div>
              <input aria-label={`全場 ${match.teamA} 得分`} className="mono" disabled={markVoid} max={20} min={0} onChange={(event) => { const v = event.currentTarget.value; setFullScore((prev) => [v, prev[1]]); }} style={fullInputStyle} type="number" value={fullScore[0]} />
            </div>
            <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: 24, marginTop: 20 }}>:</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>{match.teamB}</div>
              <input aria-label={`全場 ${match.teamB} 得分`} className="mono" disabled={markVoid} max={20} min={0} onChange={(event) => { const v = event.currentTarget.value; setFullScore((prev) => [prev[0], v]); }} style={fullInputStyle} type="number" value={fullScore[1]} />
            </div>
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textAlign: 'center' }}>全場比分 · 90 分鐘賽果</div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--border-default)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>半場（選填）</span>
            <input aria-label={`半場 ${match.teamA} 得分`} className="mono" disabled={markVoid} max={20} min={0} onChange={(event) => { const v = event.currentTarget.value; setHalfScore((prev) => [v, prev[1]]); }} style={halfInputStyle} type="number" value={halfScore[0]} />
            <span className="mono" style={{ color: 'var(--text-tertiary)' }}>:</span>
            <input aria-label={`半場 ${match.teamB} 得分`} className="mono" disabled={markVoid} max={20} min={0} onChange={(event) => { const v = event.currentTarget.value; setHalfScore((prev) => [prev[0], v]); }} style={halfInputStyle} type="number" value={halfScore[1]} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 16, cursor: 'pointer' }}>
          <input checked={markVoid} onChange={(event) => setMarkVoid(event.currentTarget.checked)} type="checkbox" />
          標記為退賽 / 取消（所有 bets 退款）
        </label>

        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 20 }}>
          <SectionLabel>判定預覽 · {bets.length} 筆</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {previews.map((bet) => (
              <div key={bet.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', marginBottom: 2 }}>{bet.market} · {bet.selection}</div>
                  <div className="mono" style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>@{bet.odds.toFixed(2)} · {formatNT(bet.stakeNT)}</div>
                </div>
                <ResultValue bet={bet} />
              </div>
            ))}
          </div>
          {showTotal && (
            <div style={{ borderTop: '1px solid var(--border-default)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>本場淨利</span>
              <span className="mono" style={{ color: totalColor, fontSize: 18, fontWeight: 600 }}>{formatNT(totalPnL, { signed: true })}</span>
            </div>
          )}
        </div>

        {showWarning && (
          <div role="alert" style={{ background: 'var(--fair-soft)', border: '1px solid var(--fair)', color: 'var(--fair)', borderRadius: 8, padding: 12, fontSize: 11, marginBottom: 16 }}>
            ⚠ 部分玩法無法自動判定（顯示 ?）。常見原因：半全場玩法需要半場比分、玩法名稱解析失敗。
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} variant="ghost">取消</Button>
          <Button disabled={!canSave} onClick={handleSave} variant="primary">儲存結果</Button>
        </div>
      </div>
    </Modal>
  );
}
