import { useMemo, useState } from 'react';
import type { CSSProperties, Dispatch } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Tag } from '../components/Tag';
import { SectionLabel } from '../components/SectionLabel';
import { formatNT, uid } from '../lib/format';
import { analyzeParlay } from '../lib/api';
import type { ParlayLegInput } from '../lib/api';
import { computeCombinedMath } from '../lib/parlay';
import type { AppState, Bet, Match, Parlay, ParlayAnalysisResult } from '../types';
import type { AppAction } from '../hooks/useAppState';

export interface ParlayBuilderModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  onClose: () => void;
}

const MIN_LEGS = 2;
const MAX_LEGS = 4;

interface CandidateBet { bet: Bet; match: Match; }

function verdictColor(v: 'VALUE' | 'FAIR' | 'AVOID'): string {
  if (v === 'VALUE') return 'var(--positive)';
  if (v === 'FAIR') return 'var(--fair)';
  return 'var(--negative)';
}

function verdictTone(v: 'VALUE' | 'FAIR' | 'AVOID'): 'positive' | 'fair' | 'negative' {
  if (v === 'VALUE') return 'positive';
  if (v === 'FAIR') return 'fair';
  return 'negative';
}

const headerStyle: CSSProperties = { position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-base)', padding: '20px 28px', borderBottom: '1px solid var(--border-default)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sectionStyle: CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 16 };

export function ParlayBuilderModal({ state, dispatch, onClose }: ParlayBuilderModalProps): JSX.Element {
  const [selectedBetIds, setSelectedBetIds] = useState<string[]>([]);
  const [stakePct, setStakePct] = useState<number>(1);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ParlayAnalysisResult | null>(null);

  const candidates: CandidateBet[] = useMemo(() => {
    const matchById = new Map(state.matches.map((m) => [m.id, m]));
    return state.bets
      .filter((b) => b.result === null)
      .map((b) => {
        const m = matchById.get(b.matchId);
        return m ? { bet: b, match: m } : null;
      })
      .filter((x): x is CandidateBet => x !== null);
  }, [state.bets, state.matches]);

  const selectedBets = useMemo(
    () => selectedBetIds.map((id) => candidates.find((c) => c.bet.id === id)).filter((x): x is CandidateBet => x !== undefined),
    [selectedBetIds, candidates],
  );

  const combined = useMemo(() => computeCombinedMath(selectedBets.map((c) => c.bet)), [selectedBets]);

  const stakeNT = (stakePct / 100) * state.bankroll;
  const canAnalyze = selectedBets.length >= MIN_LEGS && selectedBets.length <= MAX_LEGS && !analyzing;
  const canSave = aiResult !== null && selectedBets.length >= MIN_LEGS;

  const toggleBet = (id: string): void => {
    setSelectedBetIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_LEGS) return prev;
      return [...prev, id];
    });
    setAiResult(null);
    setAnalysisError(null);
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!canAnalyze) return;
    if (!state.apiKey) { setAnalysisError('請先在 Settings 設定 API Key'); return; }
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const legs: ParlayLegInput[] = selectedBets.map((c) => ({
        matchTeamA: c.match.teamA,
        matchTeamB: c.match.teamB,
        market: c.bet.market,
        selection: c.bet.selection,
        odds: c.bet.odds,
        impliedProb: c.bet.impliedProb,
        aiEstimatedProb: c.bet.aiEstimatedProb,
        aiVerdict: c.bet.aiVerdict,
        aiEdge: c.bet.aiEdge,
      }));
      const result = await analyzeParlay(state.apiKey, legs);
      setAiResult(result);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : '分析失敗');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = (): void => {
    if (!canSave || !aiResult) return;
    const now = new Date().toISOString();
    const parlay: Parlay = {
      id: uid(),
      legBetIds: selectedBetIds,
      combinedOdds: aiResult.combined.odds,
      combinedImpliedProb: aiResult.combined.impliedProb,
      combinedEstimatedProb: aiResult.combined.estimatedProb,
      combinedEdge: aiResult.combined.edge,
      aiVerdict: aiResult.verdict,
      aiAnalysis: aiResult,
      stakePct,
      stakeNT,
      result: null,
      pnl: null,
      createdAt: now,
      resolvedAt: null,
    };
    dispatch({ type: 'ADD_PARLAY', payload: parlay });
    onClose();
  };

  return (
    <Modal ariaLabel="組合串關" maxWidth={800} onClose={onClose}>
      <div style={headerStyle}>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          組合串關
          {selectedBets.length > 0 && <span style={{ color: 'var(--text-primary)', marginLeft: 12 }}>{selectedBets.length} legs · 聯合賠率 <span className="mono">{combined.odds.toFixed(2)}</span></span>}
        </div>
        <button aria-label="關閉" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 18 }} type="button">✕</button>
      </div>

      <div style={{ padding: 28 }}>
        {candidates.length < MIN_LEGS ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-card)' }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>待結算 bets 不足</div>
            <div style={{ fontSize: 12 }}>至少需要 2 筆未結算的 bet 才能組串關（目前 {candidates.length} 筆）</div>
          </div>
        ) : (
          <>
            <div style={sectionStyle}>
              <SectionLabel>選 2–4 筆 bets · 已選 {selectedBets.length}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {candidates.map(({ bet, match }) => {
                  const checked = selectedBetIds.includes(bet.id);
                  const disabled = !checked && selectedBetIds.length >= MAX_LEGS;
                  return (
                    <label key={bet.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: checked ? 'var(--brand-soft)' : 'var(--bg-elevated)', border: checked ? '1px solid var(--brand)' : '1px solid transparent', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
                      <input checked={checked} disabled={disabled} onChange={() => toggleBet(bet.id)} type="checkbox" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{match.teamA} vs {match.teamB} · {bet.market} · {bet.selection}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{bet.odds.toFixed(2)} · {formatNT(bet.stakeNT)} · edge {bet.aiEdge >= 0 ? '+' : ''}{bet.aiEdge.toFixed(1)}%</div>
                      </div>
                      <Tag tone={verdictTone(bet.aiVerdict)}>{bet.aiVerdict}</Tag>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedBets.length >= MIN_LEGS && (
              <div style={sectionStyle}>
                <SectionLabel>客端聯合計算（獨立性假設）</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>聯合賠率</div>
                    <div className="mono" style={{ fontSize: 18, color: 'var(--text-numeric)', fontWeight: 600 }}>{combined.odds.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>聯合隱含</div>
                    <div className="mono" style={{ fontSize: 18, color: 'var(--text-numeric)', fontWeight: 600 }}>{combined.impliedProb.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>聯合估計</div>
                    <div className="mono" style={{ fontSize: 18, color: 'var(--text-numeric)', fontWeight: 600 }}>{combined.estimatedProb.min.toFixed(1)}–{combined.estimatedProb.max.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>聯合 edge</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: combined.edge >= 3 ? 'var(--positive)' : combined.edge >= -2 ? 'var(--fair)' : 'var(--negative)' }}>{combined.edge >= 0 ? '+' : ''}{combined.edge.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                  ⚠ 客端計算假設各 leg 完全獨立。實際 leg 間可能相關（同隊不同盤、強強對決大盤等），請點下方「AI 分析」獲取相關性檢查。
                </div>
              </div>
            )}

            {selectedBets.length >= MIN_LEGS && !aiResult && (
              <div style={{ marginBottom: 16 }}>
                <Button disabled={!canAnalyze || !state.apiKey} onClick={() => { void handleAnalyze(); }} size="lg" style={{ width: '100%', justifyContent: 'center' }} variant="primary">
                  {analyzing ? '分析中...（10-20 秒）' : !state.apiKey ? '請先設定 API Key' : '🤖 AI 分析串關（含相關性檢查）'}
                </Button>
                {analysisError && <div role="alert" style={{ marginTop: 12, background: 'var(--negative-soft)', border: '1px solid var(--negative)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--negative)' }}>{analysisError}</div>}
              </div>
            )}

            {aiResult && (
              <>
                <div style={sectionStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <SectionLabel>AI 串關分析</SectionLabel>
                    <Tag tone={verdictTone(aiResult.verdict)}>{aiResult.verdict}</Tag>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{aiResult.summary}</div>
                  {aiResult.correlations.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Leg 相關性</div>
                      {aiResult.correlations.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: c.type === 'positive' ? 'var(--negative)' : c.type === 'negative' ? 'var(--positive)' : 'var(--text-tertiary)', minWidth: 60 }}>
                            Leg {c.legs[0] + 1}↔{c.legs[1] + 1}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{c.type === 'positive' ? '正相關' : c.type === 'negative' ? '負相關' : '無相關'} ({c.magnitude})</span>
                          <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{c.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiResult.warnings.length > 0 && (
                    <div style={{ background: 'var(--fair-soft)', border: '1px solid var(--fair)', borderRadius: 8, padding: 10, fontSize: 11, color: 'var(--fair)', lineHeight: 1.6 }}>
                      {aiResult.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                    </div>
                  )}
                  <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    AI 評估聯合 edge: <span className="mono" style={{ color: verdictColor(aiResult.verdict), fontWeight: 500 }}>{aiResult.combined.edge >= 0 ? '+' : ''}{aiResult.combined.edge.toFixed(1)}%</span> · 抽水率約 <span className="mono">{aiResult.combined.vigPct.toFixed(1)}%</span>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <SectionLabel>本金 % · 預期回報</SectionLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <input aria-label="本金百分比" max={5} min={0.5} onChange={(e) => setStakePct(Math.max(0.5, Math.min(5, Number(e.currentTarget.value))))} step={0.5} style={{ flex: 1 }} type="range" value={stakePct} />
                    <div className="mono" style={{ minWidth: 60, color: 'var(--text-numeric)', fontWeight: 600, fontSize: 16 }}>{stakePct.toFixed(1)}%</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-tertiary)' }}>
                    <span>下注 <span className="mono" style={{ color: 'var(--text-numeric)' }}>{formatNT(stakeNT)}</span></span>
                    <span>若中 <span className="mono" style={{ color: 'var(--positive)' }}>{formatNT(stakeNT * (aiResult.combined.odds - 1), { signed: true })}</span></span>
                    <span>若輸 <span className="mono" style={{ color: 'var(--negative)' }}>{formatNT(-stakeNT, { signed: true })}</span></span>
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <Button onClick={onClose} variant="ghost">取消</Button>
              <Button disabled={!canSave} onClick={handleSave} variant="primary">儲存串關</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
