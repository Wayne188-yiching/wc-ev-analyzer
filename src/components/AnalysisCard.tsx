import type { Match, Bet } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { Tag } from './Tag';
import { EvBar } from './EvBar';
import { formatNT } from '../lib/format';

export interface AnalysisCardProps { match: Match; bets: Bet[]; onView: () => void; onResult: () => void; onDelete?: (matchId: string) => void; }

const resultMeta = {
  win: { label: '勝', color: 'var(--positive)' },
  lose: { label: '負', color: 'var(--negative)' },
  void: { label: '退', color: 'var(--text-tertiary)' },
} as const;

function BetMiniRow({ bet }: { bet: Bet }): JSX.Element {
  const result = bet.result ? resultMeta[bet.result] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 12, gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--text-primary)' }}>{bet.market} · {bet.selection}</div>
        <div style={{ width: 100 }}>
          <EvBar impliedProb={bet.impliedProb} estimatedProb={bet.aiEstimatedProb} verdict={bet.aiVerdict} compact ariaLabel={`${bet.aiVerdict} bet: AI estimate ${bet.aiEstimatedProb.min}-${bet.aiEstimatedProb.max}%, implied ${bet.impliedProb}%`} />
        </div>
      </div>
      <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
        <span style={{ color: 'var(--text-tertiary)' }}>@{bet.odds.toFixed(2)}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{formatNT(bet.stakeNT)}</span>
        {result && <span style={{ color: result.color, fontWeight: 500, minWidth: 80, textAlign: 'right' }}>{result.label} {formatNT(bet.pnl ?? 0, { signed: true })}</span>}
      </div>
    </div>
  );
}

export function AnalysisCard({ match, bets, onView, onResult, onDelete }: AnalysisCardProps): JSX.Element {
  const pnl = bets.reduce((sum, bet) => sum + (bet.pnl ?? 0), 0);
  const hasResult = match.fullScore !== null;
  const hasBets = bets.length > 0;
  const tone = hasResult ? (pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral') : hasBets ? 'fair' : 'neutral';
  const text = hasResult ? formatNT(pnl, { signed: true }) : hasBets ? '待開賽' : '未下注';
  const handleDelete = (): void => {
    if (!onDelete) return;
    const lines = [
      `確定刪除「${match.teamA} vs ${match.teamB}」？`,
      hasBets ? `連同 ${bets.length} 筆 bets 一併刪除。` : null,
      hasResult ? '這是已結算分析，刪除後歷史 P/L 統計會被影響。' : null,
      '此動作無法復原。',
    ].filter(Boolean).join('\n');
    if (window.confirm(lines)) onDelete(match.id);
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{match.teamA}<span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>—</span>{match.teamB}</span>
            {hasResult && <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4 }}>{match.fullScore?.[0]} : {match.fullScore?.[1]}</span>}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{match.stage} · {match.datetime} · 強度 {match.teamRatings.teamA}–{match.teamRatings.teamB}</div>
        </div>
        <Tag tone={tone}>{text}</Tag>
      </div>
      {hasBets && <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>{bets.map((bet) => <BetMiniRow key={bet.id} bet={bet} />)}</div>}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={onView}>查看分析→</Button>
          {!hasResult && hasBets && <Button variant="secondary" size="sm" onClick={onResult}>輸入比分</Button>}
        </div>
        {onDelete && (
          <button
            aria-label={`刪除分析 ${match.teamA} vs ${match.teamB}`}
            onClick={handleDelete}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}
            type="button"
          >刪除</button>
        )}
      </div>
    </Card>
  );
}
