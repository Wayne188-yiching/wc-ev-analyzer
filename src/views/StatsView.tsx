import { useMemo } from 'react';
import { Card } from '../components/Card';
import { KpiCard } from '../components/KpiCard';
import { SectionLabel } from '../components/SectionLabel';
import { formatNT, formatPct } from '../lib/format';
import type { AppState, Bet } from '../types';

export interface StatsViewProps { state: AppState; }

interface PnlPoint {
  date: string;
  pnl: number;
  betId: Bet['id'];
}

interface CalibPoint {
  bucket: number;
  avgEstimated: number;
  actualRate: number;
  n: number;
}

export function StatsView(props: StatsViewProps): JSX.Element {
  const { state } = props;
  const settledBets = state.bets.filter((b) => b.result === 'win' || b.result === 'lose');
  const allSettled = state.bets.filter((b) => b.result !== null && b.result !== undefined);
  const totalPnL = state.bets.reduce((s, b) => s + (b.pnl ?? 0), 0);
  const totalStaked = settledBets.reduce((s, b) => s + b.stakeNT, 0);
  const roi = totalStaked > 0 ? (totalPnL / totalStaked) * 100 : 0;
  const wins = settledBets.filter((b) => b.result === 'win').length;
  const winRate = settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0;
  const pending = state.bets.filter((b) => b.result === null).length;
  const sampleN = settledBets.length;

  const pnlSeries = useMemo<PnlPoint[]>(() => {
    const sorted = [...allSettled].sort((a, b) => (a.resolvedAt ?? a.createdAt).localeCompare(b.resolvedAt ?? b.createdAt));
    let cum = 0;
    return sorted.map((b) => {
      cum += b.pnl ?? 0;
      return { date: (b.resolvedAt ?? b.createdAt).slice(0, 10), pnl: cum, betId: b.id };
    });
  }, [allSettled]);

  const calibration = useMemo<CalibPoint[]>(() => {
    const buckets = new Map<number, { estimated: number; hits: number; count: number }>();
    settledBets.forEach((b) => {
      const mid = (b.aiEstimatedProb.min + b.aiEstimatedProb.max) / 2;
      const bucket = Math.floor(mid / 10) * 10;
      const cur = buckets.get(bucket) ?? { estimated: 0, hits: 0, count: 0 };
      cur.estimated += mid;
      cur.count += 1;
      if (b.result === 'win') cur.hits += 1;
      buckets.set(bucket, cur);
    });
    return Array.from(buckets.entries())
      .map(([bucket, v]) => ({ bucket, avgEstimated: v.estimated / v.count, actualRate: (v.hits / v.count) * 100, n: v.count }))
      .sort((a, b) => a.bucket - b.bucket);
  }, [settledBets]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, color: 'var(--text-primary)', margin: 0 }}>統計</h1>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          已結算樣本 {sampleN} 筆 · 待結算 {pending} 筆
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="總損益" value={formatNT(totalPnL, { signed: true })} tone={totalPnL > 0 ? 'positive' : totalPnL < 0 ? 'negative' : 'neutral'} />
        <KpiCard label="ROI" value={formatPct(roi, 2)} tone={roi > 0 ? 'positive' : roi < 0 ? 'negative' : 'neutral'} />
        <KpiCard label="命中率" value={formatPct(winRate, 1)} sub={`${wins} 勝 / ${sampleN} 筆`} tone={winRate >= 55 ? 'positive' : winRate >= 45 ? 'fair' : 'negative'} />
        <KpiCard label="總注數" value={state.bets.length.toString()} sub={`已結算 ${sampleN} · 待結算 ${pending}`} />
      </div>

      {sampleN < 30 ? (
        <Card style={{ background: 'var(--fair-soft)', border: '1px solid var(--fair)', color: 'var(--fair)', marginBottom: 24 }}>
          樣本數仍偏少，校準與命中率容易受單場結果影響；累積更多已結算下注後再判斷模型穩定度。
        </Card>
      ) : null}

      <Card style={{ marginBottom: 24 }}>
        <SectionLabel>P/L 累計曲線</SectionLabel>
        {pnlSeries.length < 2 ? <EmptyState text="累積 2 筆以上結算後顯示曲線" /> : <PnlChart data={pnlSeries} />}
      </Card>

      <Card>
        <SectionLabel>校準圖 AI估計勝率 對 實際命中率</SectionLabel>
        {calibration.length < 3 ? <EmptyState text="需要至少 3 個機率區間的資料才能畫校準圖" /> : <CalibrationChart data={calibration} />}
        <p style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1.7, margin: '12px 0 0' }}>
          圓點越接近斜線，代表AI估計勝率與實際命中率越一致；圓點大小代表該區間樣本數。
        </p>
      </Card>
    </div>
  );
}

function EmptyState({ text }: { text: string }): JSX.Element {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
      {text}
    </div>
  );
}

function PnlChart({ data }: { data: PnlPoint[] }): JSX.Element {
  const w = 700;
  const h = 200;
  const padL = 50;
  const padR = 20;
  const padT = 16;
  const padB = 28;
  const pnls = data.map((d) => d.pnl);
  const minY = Math.min(0, ...pnls);
  const maxY = Math.max(0, ...pnls);
  const yRange = maxY - minY || 1;
  const x = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - minY) / yRange) * (h - padT - padB);
  const lastPositive = data[data.length - 1].pnl >= 0;
  const areaColor = lastPositive ? 'var(--positive-soft)' : 'var(--negative-soft)';
  const lineColor = lastPositive ? 'var(--positive)' : 'var(--negative)';
  const points = data.map((d, i) => `${x(i)},${y(d.pnl)}`).join(' ');
  const baseY = y(0);
  const areaPoints = `${padL},${baseY} ${points} ${x(data.length - 1)},${baseY}`;
  const yLabels = Array.from(new Set([minY, 0, maxY]));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg aria-label="損益累計曲線" role="img" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', minWidth: w, width: '100%' }}>
        <line x1={padL} x2={w - padR} y1={baseY} y2={baseY} stroke="var(--border-default)" />
        {yLabels.map((label) => (
          <g key={label}>
            <line x1={padL} x2={w - padR} y1={y(label)} y2={y(label)} stroke="var(--border-default)" strokeDasharray="4 6" />
            <text fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="end" x={padL - 8} y={y(label) + 3}>{formatNT(label)}</text>
          </g>
        ))}
        <polygon fill={areaColor} points={areaPoints} />
        <polyline fill="none" points={points} stroke={lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <text fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="start" x={padL} y={h - 8}>{data[0].date}</text>
        <text fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="end" x={w - padR} y={h - 8}>{data[data.length - 1].date}</text>
      </svg>
    </div>
  );
}

function CalibrationChart({ data }: { data: CalibPoint[] }): JSX.Element {
  const w = 700;
  const h = 320;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const ticks = [0, 25, 50, 75, 100];
  const x = (v: number) => padL + (v / 100) * (w - padL - padR);
  const y = (v: number) => padT + (1 - v / 100) * (h - padT - padB);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg aria-label="校準圖" role="img" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', minWidth: w, width: '100%' }}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1={padT} y2={h - padB} stroke="var(--border-default)" strokeDasharray="4 6" />
            <line x1={padL} x2={w - padR} y1={y(tick)} y2={y(tick)} stroke="var(--border-default)" strokeDasharray="4 6" />
            <text fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="middle" x={x(tick)} y={h - 18}>{tick}%</text>
            <text fill="var(--text-tertiary)" fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="end" x={padL - 8} y={y(tick) + 3}>{tick}%</text>
          </g>
        ))}
        <line x1={padL} x2={w - padR} y1={h - padB} y2={padT} stroke="var(--brand)" strokeWidth="2" />
        {data.map((d) => {
          const dist = Math.abs(d.avgEstimated - d.actualRate);
          const color = dist < 5 ? 'var(--positive)' : dist < 15 ? 'var(--fair)' : 'var(--negative)';
          const radius = Math.min(4 + d.n, 12);
          return (
            <g key={d.bucket}>
              <circle cx={x(d.avgEstimated)} cy={y(d.actualRate)} fill={color} r={radius} />
              <text fill="var(--text-primary)" fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="middle" x={x(d.avgEstimated)} y={y(d.actualRate) - radius - 5}>{d.n}</text>
            </g>
          );
        })}
        <text fill="var(--text-secondary)" fontSize="12" textAnchor="middle" x={(w + padL - padR) / 2} y={h - 2}>AI估計勝率</text>
        <text fill="var(--text-secondary)" fontSize="12" textAnchor="middle" transform={`translate(14 ${(h - padB + padT) / 2}) rotate(-90)`}>實際命中率</text>
      </svg>
    </div>
  );
}
