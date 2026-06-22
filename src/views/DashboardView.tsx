import { useMemo, useRef } from 'react';
import type { AppState, Match, Bet } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { KpiCard } from '../components/KpiCard';
import { SectionLabel } from '../components/SectionLabel';
import { AnalysisCard } from '../components/AnalysisCard';
import { ParlayCard } from '../components/ParlayCard';
import { formatNT, formatPct } from '../lib/format';
import { computePnL } from '../lib/resolve-bet';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '../lib/motion';

export interface DashboardViewProps {
  state: AppState;
  onOpenAnalysisNew: () => void;
  onOpenAnalysisView: (matchId: string) => void;
  onOpenResultEntry: (matchId: string) => void;
  onOpenParlayBuilder: () => void;
  onDeleteParlay: (parlayId: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function DateHero(): JSX.Element {
  const now = new Date();
  const dateText = `${MONTHS[now.getMonth()]} ${String(now.getDate()).padStart(2, '0')}, ${now.getFullYear()}`;
  return (
    <div style={{ marginBottom: 24 }}>
      <div data-anim="hero-weekday" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{WEEKDAYS[now.getDay()]}</div>
      <div data-anim="hero-date" style={{ fontSize: 36, color: 'var(--text-primary)' }}>{dateText}</div>
    </div>
  );
}

function PendingMatchRow({ match, bets, onClick }: { match: Match; bets: Bet[]; onClick: () => void }): JSX.Element {
  const stakeSum = bets.reduce((sum, bet) => sum + bet.stakeNT, 0);
  return (
    <div data-anim="list-item">
      <Card onClick={onClick} ariaLabel="輸入比分" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--fair)' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{match.teamA} — {match.teamB}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{bets.length} bets · {formatNT(stakeSum)} 待結算</div>
            </div>
          </div>
          <Button variant="secondary" size="sm">輸入比分→</Button>
        </div>
      </Card>
    </div>
  );
}

export function DashboardView({ state, onOpenAnalysisNew, onOpenAnalysisView, onOpenResultEntry, onOpenParlayBuilder, onDeleteParlay }: DashboardViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const today = todayISO();
    const matchById = new Map(state.matches.map((match) => [match.id, match]));
    const todayMatches = state.matches.filter((match) => match.dateGroup === today);
    const todayBets = state.bets.filter((bet) => matchById.get(bet.matchId)?.dateGroup === today);
    const pending = state.matches.filter((match) => match.fullScore === null && !match.isVoid && state.bets.some((bet) => bet.matchId === match.id));
    const todayExposure = todayBets.reduce((sum, bet) => sum + bet.stakeNT, 0);
    const todayExpectedReturn = todayBets.reduce((sum, bet) => {
      if (bet.result === 'win') return sum + (computePnL(bet.stakeNT, bet.odds, 'win') ?? 0);
      if (bet.result === 'lose') return sum - bet.stakeNT;
      if (bet.result === 'void') return sum;
      const mid = bet.aiEstimatedProb.min + bet.aiEstimatedProb.max;
      return sum + (mid / 200) * bet.odds * bet.stakeNT - bet.stakeNT;
    }, 0);
    return { todayMatches, pending, todayExposure, todayExpectedReturn };
  }, [state.matches, state.bets]);

  const exposurePct = state.bankroll > 0 ? (data.todayExposure / state.bankroll) * 100 : 0;
  const roi = state.bankroll > 0 ? (data.todayExpectedReturn / state.bankroll) * 100 : null;

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline();
    const heroEls = gsap.utils.toArray<HTMLElement>('[data-anim="hero-weekday"], [data-anim="hero-date"]');
    const splits = heroEls.map((el) => new SplitText(el, { type: 'chars' }));
    splits.forEach((split, i) => {
      tl.from(split.chars, { y: 18, opacity: 0, stagger: 0.04, duration: 0.55, ease: 'power3.out' }, i * 0.18);
    });
    tl.from('[data-anim="kpi-card"]', { y: 24, opacity: 0, stagger: 0.1, duration: 0.5, ease: 'back.out(1.4)' }, 0.4);
    tl.from('[data-anim="new-analysis-btn"]', { y: 14, opacity: 0, duration: 0.4, ease: 'power2.out' }, 0.75);
    tl.from('[data-anim="list-item"]', { y: 16, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out' }, 0.9);
    return () => { splits.forEach((s) => s.revert()); };
  }, { scope: containerRef });

  return (
    <div ref={containerRef}>
      <DateHero />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginBottom: 24 }}>
        <div data-anim="kpi-card">
          <KpiCard label="今日總曝險" counter={{ to: data.todayExposure, format: (n) => formatNT(n) }} sub={`${exposurePct.toFixed(1)}% of bankroll · 上限 8%`} tone={exposurePct > 8 ? 'negative' : exposurePct > 5 ? 'fair' : 'neutral'} />
        </div>
        <div data-anim="kpi-card">
          <KpiCard label="預期淨利" counter={{ to: data.todayExpectedReturn, format: (n) => formatNT(n, { signed: true }) }} sub={roi === null ? '—' : `${formatPct(roi, 2)} ROI`} tone={data.todayExpectedReturn > 0 ? 'positive' : data.todayExpectedReturn < 0 ? 'negative' : 'neutral'} />
        </div>
        <div data-anim="kpi-card">
          <KpiCard label="待錄結果" counter={{ to: data.pending.length, format: (n) => Math.round(n).toString() }} sub={data.pending.length > 0 ? '需要輸入比分結算' : '沒有待處理比賽'} tone={data.pending.length > 0 ? 'fair' : 'neutral'} />
        </div>
      </div>
      <div data-anim="new-analysis-btn" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        <button aria-label="新增分析" onClick={onOpenAnalysisNew} onMouseEnter={(event) => { event.currentTarget.style.opacity = '0.85'; }} onMouseLeave={(event) => { event.currentTarget.style.opacity = ''; }} style={{ width: '100%', padding: 18, background: 'var(--bg-surface)', border: '1px dashed var(--border-focus)', borderRadius: 'var(--radius-card)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity var(--duration-fade) var(--easing-base)' }} type="button">
          <span style={{ color: 'var(--brand)', fontSize: 16, marginRight: 8 }}>+</span>新增分析（上傳賠率截圖）
        </button>
        {state.bets.filter((b) => b.result === null).length >= 2 && (
          <button aria-label="組合串關" onClick={onOpenParlayBuilder} onMouseEnter={(event) => { event.currentTarget.style.opacity = '0.85'; }} onMouseLeave={(event) => { event.currentTarget.style.opacity = ''; }} style={{ width: '100%', padding: 12, background: 'transparent', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity var(--duration-fade) var(--easing-base)' }} type="button">
            <span style={{ color: 'var(--text-tertiary)', marginRight: 6 }}>+</span>組合串關（從現有 bets 挑 2–4 筆）
          </button>
        )}
      </div>
      {data.pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>待錄入結果 · {data.pending.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{data.pending.map((match) => <PendingMatchRow key={match.id} match={match} bets={state.bets.filter((bet) => bet.matchId === match.id)} onClick={() => { onOpenResultEntry(match.id); }} />)}</div>
        </div>
      )}
      {state.parlays.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>串關 · {state.parlays.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.parlays.map((p) => (
              <div key={p.id} data-anim="list-item"><ParlayCard parlay={p} state={state} onDelete={onDeleteParlay} /></div>
            ))}
          </div>
        </div>
      )}
      <SectionLabel>今日分析 · {data.todayMatches.length}</SectionLabel>
      {data.todayMatches.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-card)' }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>今天還沒分析過比賽</div>
          <div style={{ fontSize: 12 }}>點上方新增分析開始</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{data.todayMatches.map((match) => <div key={match.id} data-anim="list-item"><AnalysisCard match={match} bets={state.bets.filter((bet) => bet.matchId === match.id)} onView={() => { onOpenAnalysisView(match.id); }} onResult={() => { onOpenResultEntry(match.id); }} /></div>)}</div>
      )}
    </div>
  );
}
