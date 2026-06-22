import { useMemo } from 'react';
import type { AppState, Match } from '../types';
import { SectionLabel } from '../components/SectionLabel';
import { AnalysisCard } from '../components/AnalysisCard';
import { formatNT, dateLabel } from '../lib/format';

export interface HistoryViewProps {
  state: AppState;
  onOpenAnalysisView: (matchId: string) => void;
  onOpenResultEntry: (matchId: string) => void;
  onDeleteMatch: (matchId: string) => void;
}

export function HistoryView({ state, onOpenAnalysisView, onOpenResultEntry, onDeleteMatch }: HistoryViewProps): JSX.Element {
  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>();
    state.matches.forEach((m) => {
      const list = map.get(m.dateGroup) ?? [];
      list.push(m);
      map.set(m.dateGroup, list);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [state.matches]);

  if (state.matches.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <div style={{ fontSize: 24, color: 'var(--text-secondary)', marginBottom: 8 }}>還沒有紀錄</div>
        <div style={{ fontSize: 13 }}>切回今日按「新增分析」開始</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>紀錄</h1>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {state.matches.length} 場分析 · {state.bets.length} 筆 bets
        </div>
      </div>
      {grouped.map(([day, matches]) => {
        const dayBets = state.bets.filter((b) => matches.some((m) => m.id === b.matchId));
        const dayPnL = dayBets.reduce((s, b) => s + (b.pnl ?? 0), 0);
        const dayColor = dayPnL > 0 ? 'var(--positive)' : dayPnL < 0 ? 'var(--negative)' : 'var(--text-tertiary)';
        return (
          <div key={day} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionLabel>{dateLabel(day)}</SectionLabel>
              <span className="mono" style={{ fontSize: 12, color: dayColor }}>
                {formatNT(dayPnL, { signed: true })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matches.map((m) => (
                <AnalysisCard
                  key={m.id}
                  match={m}
                  bets={state.bets.filter((b) => b.matchId === m.id)}
                  onView={() => onOpenAnalysisView(m.id)}
                  onResult={() => onOpenResultEntry(m.id)}
                  onDelete={onDeleteMatch}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
