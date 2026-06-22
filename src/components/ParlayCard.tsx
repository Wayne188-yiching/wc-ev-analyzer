import type { AppState, Bet, Match, Parlay } from '../types';
import { Card } from './Card';
import { Tag } from './Tag';
import { formatNT } from '../lib/format';

export interface ParlayCardProps {
  parlay: Parlay;
  state: AppState;
  onDelete?: (parlayId: string) => void;
}

function verdictTone(v: 'VALUE' | 'FAIR' | 'AVOID'): 'positive' | 'fair' | 'negative' {
  if (v === 'VALUE') return 'positive';
  if (v === 'FAIR') return 'fair';
  return 'negative';
}

interface LegRow { bet: Bet; match: Match; }

export function ParlayCard({ parlay, state, onDelete }: ParlayCardProps): JSX.Element {
  const matchById = new Map(state.matches.map((m) => [m.id, m]));
  const legs: LegRow[] = parlay.legBetIds
    .map((id) => {
      const b = state.bets.find((x) => x.id === id);
      if (!b) return null;
      const m = matchById.get(b.matchId);
      return m ? { bet: b, match: m } : null;
    })
    .filter((x): x is LegRow => x !== null);
  const orphan = legs.length !== parlay.legBetIds.length;

  const hasResult = parlay.result !== null;
  const pnlColor = hasResult
    ? parlay.result === 'win'
      ? 'var(--positive)'
      : parlay.result === 'lose'
        ? 'var(--negative)'
        : 'var(--text-tertiary)'
    : 'var(--text-numeric)';
  const statusTag =
    parlay.result === 'win' ? <Tag tone="positive">勝 {formatNT(parlay.pnl ?? 0, { signed: true })}</Tag>
    : parlay.result === 'lose' ? <Tag tone="negative">負 {formatNT(parlay.pnl ?? 0, { signed: true })}</Tag>
    : parlay.result === 'void' ? <Tag tone="neutral">退 NT$0</Tag>
    : orphan ? <Tag tone="negative">orphan</Tag>
    : <Tag tone="fair">待結算</Tag>;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>串關 · {parlay.legBetIds.length} legs</span>
          <Tag tone={verdictTone(parlay.aiVerdict)}>{parlay.aiVerdict}</Tag>
        </div>
        {statusTag}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 12, fontSize: 12 }}>
        <div>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>聯合賠率</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-numeric)' }}>{parlay.combinedOdds.toFixed(2)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>聯合 edge</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: parlay.combinedEdge >= 3 ? 'var(--positive)' : parlay.combinedEdge >= -2 ? 'var(--fair)' : 'var(--negative)' }}>
            {parlay.combinedEdge >= 0 ? '+' : ''}{parlay.combinedEdge.toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>下注</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-numeric)' }}>{formatNT(parlay.stakeNT)}</div>
        </div>
        {hasResult && (
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>結算</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: pnlColor }}>{formatNT(parlay.pnl ?? 0, { signed: true })}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {legs.map(({ bet, match }, i) => {
          const legResult = bet.result;
          const legColor = legResult === 'win' ? 'var(--positive)' : legResult === 'lose' ? 'var(--negative)' : legResult === 'void' ? 'var(--text-tertiary)' : 'var(--text-tertiary)';
          return (
            <div key={bet.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <span className="mono" style={{ color: 'var(--text-tertiary)', minWidth: 20 }}>L{i + 1}</span>
                <span style={{ color: 'var(--text-primary)' }}>{match.teamA} vs {match.teamB}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                <span style={{ color: 'var(--text-secondary)' }}>{bet.market} · {bet.selection}</span>
              </div>
              <div className="mono" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>@{bet.odds.toFixed(2)}</span>
                <span style={{ color: legColor, fontWeight: 500, minWidth: 28, textAlign: 'right' }}>
                  {legResult === 'win' ? '勝' : legResult === 'lose' ? '負' : legResult === 'void' ? '退' : '—'}
                </span>
              </div>
            </div>
          );
        })}
        {orphan && (
          <div style={{ fontSize: 11, color: 'var(--negative)', padding: '6px 10px', background: 'var(--negative-soft)', borderRadius: 6 }}>
            ⚠ 串關有 leg 被刪除（{parlay.legBetIds.length - legs.length} 筆缺失），無法自動結算
          </div>
        )}
      </div>

      {onDelete && !hasResult && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            aria-label="刪除串關"
            onClick={() => { if (window.confirm('刪除這個串關？已下注的 leg bets 不會被刪。')) onDelete(parlay.id); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}
            type="button"
          >刪除</button>
        </div>
      )}
    </Card>
  );
}
