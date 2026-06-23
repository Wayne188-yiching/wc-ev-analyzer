import { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { Modal } from '../components/Modal';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { EvBar } from '../components/EvBar';
import { StrengthBar } from '../components/StrengthBar';
import { SectionLabel } from '../components/SectionLabel';
import { formatNT, uid } from '../lib/format';
import { analyzeMatch } from '../lib/api';
import type { AppState, Match, Bet, AnalysisResult } from '../types';
import type { AppAction } from '../hooks/useAppState';
import { gsap, useGSAP, SplitText, prefersReducedMotion } from '../lib/motion';

export type AnalysisDetailMode = 'new' | 'view';

export interface AnalysisDetailModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  mode: AnalysisDetailMode;
  matchId: string | null;
  onClose: () => void;
}

interface UploadedImage { type: string; data: string; name: string; preview: string; }
interface SelectionState { checked: boolean; stakePct: number; betId?: string; locked?: boolean; }

function fileToBase64(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => { reject(new Error('FileReader 讀取失敗')); };
    reader.onload = () => {
      if (typeof reader.result !== 'string') { reject(new Error('FileReader 讀取失敗')); return; }
      const parts = reader.result.split(',');
      resolve({ type: file.type, data: parts[1] ?? '', name: file.name, preview: reader.result });
    };
    reader.readAsDataURL(file);
  });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultStake(edge: number): number {
  return Math.min(Math.max(Math.round(edge / 2), 1), 3);
}

export function AnalysisDetailModal(props: AnalysisDetailModalProps): JSX.Element {
  const { state, dispatch, mode, matchId, onClose } = props;
  const existingMatch = matchId ? state.matches.find((m) => m.id === matchId) ?? null : null;
  const existingBets = matchId ? state.bets.filter((b) => b.matchId === matchId) : [];
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [contextText, setContextText] = useState('');
  const [expectedMarkets, setExpectedMarkets] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(existingMatch?.aiResult ?? null);
  const [selections, setSelections] = useState<Record<number, SelectionState>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const saveBarRef = useRef<HTMLDivElement>(null);
  const saveBarWasVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    if (!existingMatch?.aiResult || existingBets.length === 0) return;
    const next: Record<number, SelectionState> = {};
    existingMatch.aiResult.analysis.forEach((row, i) => {
      const matched = existingBets.find((bet) => bet.market === row.market && bet.selection === row.selection);
      if (matched) next[i] = { checked: true, stakePct: matched.stakePct, betId: matched.id, locked: true };
    });
    setSelections(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files) return;
    const uploaded = await Promise.all(Array.from(files).map(fileToBase64));
    setImages((prev) => [...prev, ...uploaded]);
  };

  const handleAnalyze = async (): Promise<void> => {
    if (images.length === 0) return;
    if (!state.apiKey) { setError('請先在 Settings 設定 API Key'); return; }
    setAnalyzing(true);
    setError(null);
    try {
      const expected = parseInt(expectedMarkets, 10);
      const result = await analyzeMatch(
        state.apiKey,
        images.map(({ type, data }) => ({ type, data })),
        contextText,
        Number.isNaN(expected) ? undefined : expected,
      );
      const next: Record<number, SelectionState> = {};
      result.analysis.forEach((row, i) => {
        if (row.verdict !== 'VALUE') return;
        const rec = result.recommendations.find((r) => r.market === row.market && r.selection === row.selection);
        next[i] = { checked: true, stakePct: rec?.stakePct ?? defaultStake(row.edge) };
      });
      setAnalysisResult(result);
      setSelections(next);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : '分析失敗');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggle = (i: number, row: AnalysisResult['analysis'][number]): void => {
    setSelections((prev) => {
      const current = prev[i];
      if (current?.locked) return prev;
      if (current?.checked) {
        const next = { ...prev };
        delete next[i];
        return next;
      }
      return { ...prev, [i]: { checked: true, stakePct: defaultStake(row.edge) } };
    });
  };

  const handleStakeChange = (i: number, val: number): void => {
    setSelections((prev) => {
      const current = prev[i];
      if (!current?.checked || current.locked) return prev;
      return { ...prev, [i]: { ...current, stakePct: Math.min(Math.max(val, 0), 5) } };
    });
  };

  const selectedRows = Object.entries(selections)
    .filter((entry) => entry[1].checked)
    .map(([k, v]) => {
      const idx = parseInt(k, 10);
      return { row: analysisResult!.analysis[idx], stakePct: v.stakePct, idx, locked: v.locked ?? false, betId: v.betId };
    });
  const totalExposurePct = selectedRows.reduce((sum, item) => sum + item.stakePct, 0);
  const totalExposureNT = (totalExposurePct / 100) * state.bankroll;
  const overLimit = totalExposurePct > 8;
  const hasUnlockedSelections = selectedRows.some((r) => !r.locked);

  const handleSave = (): void => {
    if (!analysisResult || overLimit || selectedRows.length === 0) return;
    const createdAt = new Date().toISOString();
    const targetMatchId = mode === 'new' ? uid() : matchId;
    if (!targetMatchId) return;
    const rowsToSave = mode === 'view' ? selectedRows.filter((r) => !r.locked) : selectedRows;
    if (rowsToSave.length === 0) return;
    const buildBet = (item: typeof selectedRows[number]): Bet => ({
      id: uid(), matchId: targetMatchId,
      market: item.row.market, selection: item.row.selection,
      odds: item.row.odds, impliedProb: item.row.impliedProb,
      stakePct: item.stakePct, stakeNT: (item.stakePct / 100) * state.bankroll,
      aiEstimatedProb: item.row.estimatedProb, aiVerdict: item.row.verdict, aiEdge: item.row.edge,
      result: null, pnl: null, createdAt, resolvedAt: null,
    });
    const bets = rowsToSave.map(buildBet);
    if (mode === 'new') {
      const match: Match = {
        id: targetMatchId,
        teamA: analysisResult.match.teamA, teamB: analysisResult.match.teamB,
        datetime: analysisResult.match.datetime, stage: analysisResult.match.stage,
        venue: analysisResult.match.venue || null,
        teamRatings: analysisResult.teamRatings,
        aiSummary: analysisResult.summary, aiResult: analysisResult,
        dateGroup: todayISO(), fullScore: null, halfScore: null, isVoid: false, resultEnteredAt: null, createdAt,
      };
      dispatch({ type: 'ADD_MATCH_WITH_BETS', payload: { match, bets } });
    } else {
      dispatch({ type: 'ADD_BETS_TO_MATCH', payload: { bets } });
    }
    onClose();
  };

  const modalLabel = mode === 'new' ? '新增分析' : '查看分析';
  const result = analysisResult;

  // A3 + A5 + side-card stagger choreography, runs after modal entrance (~0.4s).
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    if (!result) return;
    const root = bodyRef.current;
    if (!root) return;
    const tl = gsap.timeline({ delay: 0.4 });
    const teamAEl = root.querySelector('[data-anim="team-a"]');
    const teamBEl = root.querySelector('[data-anim="team-b"]');
    const splits: SplitText[] = [];
    if (teamAEl) {
      const s = new SplitText(teamAEl as HTMLElement, { type: 'chars' });
      splits.push(s);
      tl.from(s.chars, { x: -12, opacity: 0, stagger: 0.04, duration: 0.4, ease: 'power3.out' }, 0);
    }
    if (teamBEl) {
      const s = new SplitText(teamBEl as HTMLElement, { type: 'chars' });
      splits.push(s);
      tl.from(s.chars, { x: 12, opacity: 0, stagger: 0.04, duration: 0.4, ease: 'power3.out' }, 0);
    }
    tl.from('[data-anim="ev-row"]', { x: -8, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'power2.out' }, 0.3);
    tl.from('[data-anim="side-card"]', { y: 16, opacity: 0, stagger: 0.1, duration: 0.4, ease: 'power2.out' }, 0.6);
    return () => { splits.forEach((s) => s.revert()); };
  }, { scope: bodyRef, dependencies: [result] });

  // A7 save bar slide-up only when transitioning 0 → >0.
  useEffect(() => {
    const isVisible = selectedRows.length > 0;
    if (isVisible && !saveBarWasVisibleRef.current && saveBarRef.current) {
      if (!prefersReducedMotion()) {
        gsap.from(saveBarRef.current, { y: 60, opacity: 0, duration: 0.4, ease: 'back.out(1.4)' });
      }
    }
    saveBarWasVisibleRef.current = isVisible;
  }, [selectedRows.length]);
  const saveLabel = mode === 'new' ? '儲存到今日' : (hasUnlockedSelections ? '加入新 bets' : '已儲存');
  const saveDisabled = overLimit || selectedRows.length === 0 || (mode === 'view' && !hasUnlockedSelections);
  const analyzeLabel = analyzing ? '分析中...（15-30 秒）' : !state.apiKey ? '請先設定 API Key' : '啟動 EV 分析';

  return (
    <Modal ariaLabel={modalLabel} maxWidth={1120} onClose={onClose}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-base)', padding: '20px 28px', borderBottom: '1px solid var(--border-default)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {modalLabel}{result ? <span style={{ color: 'var(--text-primary)', marginLeft: 12 }}>{result.match.teamA} <span style={{ color: 'var(--text-tertiary)' }}>vs</span> {result.match.teamB}</span> : null}
        </div>
        <button aria-label="關閉" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit' }} type="button">✕</button>
      </div>
      <div ref={bodyRef} style={{ padding: 28 }}>
        {!result && mode === 'new' && (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); }}
              onDrop={(event) => { event.preventDefault(); void handleFiles(event.dataTransfer.files); }}
              onKeyDown={(event) => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); fileInputRef.current?.click(); }}
              role="button"
              style={{ border: '1.5px dashed var(--border-focus)', borderRadius: 'var(--radius-card)', padding: 40, textAlign: 'center', background: 'var(--bg-surface)', cursor: 'pointer', marginBottom: 16 }}
              tabIndex={0}
            >
              <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>點擊或拖曳賠率截圖</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>支援多張同一場的不同玩法</div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(event) => { void handleFiles(event.currentTarget.files); event.currentTarget.value = ''; }} />
            </div>
            {images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
                {images.map((image, i) => (
                  <div key={`${image.name}-${i}`} style={{ position: 'relative' }}>
                    <img alt={image.name} src={image.preview} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-default)' }} />
                    <button aria-label="移除圖片" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'var(--bg-base)', color: 'var(--negative)', border: '1px solid var(--border-default)', borderRadius: 4, width: 20, height: 20, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }} type="button">×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }} htmlFor="analysis-context">額外情報（選填）</label>
              <textarea id="analysis-context" value={contextText} onChange={(event) => setContextText(event.currentTarget.value)} placeholder="傷停 / 天氣 / 輪換等..." style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 10, fontSize: 12, resize: 'vertical', minHeight: 60, fontFamily: 'inherit', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }} htmlFor="expected-markets">截圖玩法數（選填，防漏列）</label>
              <input id="expected-markets" className="mono" type="number" min={0} value={expectedMarkets} onChange={(event) => setExpectedMarkets(event.currentTarget.value)} placeholder="例如 12" style={{ width: 120, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>填入截圖裡的玩法總數，AI 漏列時會跳警告</div>
            </div>
            {error && <div role="alert" style={{ background: 'var(--negative-soft)', border: '1px solid var(--negative)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--negative)', marginBottom: 16 }}>{error}</div>}
            <Button disabled={analyzing || images.length === 0 || !state.apiKey} onClick={() => { void handleAnalyze(); }} size="lg" style={{ width: '100%', justifyContent: 'center' }} variant="primary">{analyzeLabel}</Button>
          </>
        )}
        {result && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div data-anim="team-a" style={{ fontSize: 24, color: 'var(--text-primary)' }}>{result.match.teamA}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>strength {result.teamRatings.teamA}</div>
                </div>
                <div style={{ padding: '0 24px', textAlign: 'center' }}>
                  <div style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>{result.match.stage}</div>
                  <div className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{result.match.datetime}</div>
                  {result.match.venue && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{result.match.venue}</div>}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div data-anim="team-b" style={{ fontSize: 24, color: 'var(--text-primary)' }}>{result.match.teamB}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>strength {result.teamRatings.teamB}</div>
                </div>
              </div>
              <StrengthBar teamA={result.match.teamA} teamB={result.match.teamB} ratingA={result.teamRatings.teamA} ratingB={result.teamRatings.teamB} />
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.summary}</div>
            </Card>
            {(() => {
              const expected = parseInt(expectedMarkets, 10);
              const shortfall = !Number.isNaN(expected) && expected > result.analysis.length;
              return shortfall ? (
                <div role="alert" style={{ background: 'var(--fair-soft)', border: '1px solid var(--fair)', color: 'var(--fair)', borderRadius: 8, padding: 12, fontSize: 12, marginBottom: 16 }}>
                  ⚠ 你預期 {expected} 個玩法，但 AI 只分析了 {result.analysis.length} 個。可能漏列 — 建議重新分析，或換更清楚的截圖。
                </div>
              ) : null;
            })()}
            <Card style={{ padding: 0, marginBottom: 16 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionLabel>EV 分析表 · {result.analysis.length} 玩法</SectionLabel>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 4, background: 'var(--positive)', marginRight: 5 }} />VALUE</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 4, background: 'var(--fair)', marginRight: 5 }} />FAIR</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 4, background: 'var(--negative)', marginRight: 5 }} />AVOID</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr style={{ color: 'var(--text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px' }}>玩法 · 選項</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px' }}>賠率</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', minWidth: 180 }}>EV bar</th>
                      <th style={{ textAlign: 'right', padding: '10px 8px' }}>Edge</th>
                      <th style={{ textAlign: 'center', padding: '10px 16px', minWidth: 130 }}>下注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.analysis.map((row, i) => {
                      const selected = selections[i];
                      const checked = selected?.checked ?? false;
                      const locked = selected?.locked ?? false;
                      const edgeColor = row.edge >= 3 ? 'var(--positive)' : row.edge >= -2 ? 'var(--fair)' : 'var(--negative)';
                      const verdictColor = row.verdict === 'VALUE' ? 'var(--positive)' : row.verdict === 'FAIR' ? 'var(--fair)' : 'var(--negative)';
                      return (
                        <tr data-anim="ev-row" key={`${row.market}-${row.selection}-${i}`} style={{ borderTop: '1px solid var(--border-default)' }}>
                          <td style={{ textAlign: 'left', padding: '12px 16px' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{row.market}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{row.selection}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', maxWidth: 220, marginTop: 4, lineHeight: 1.5 }}>{row.reasoning}</div>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', color: 'var(--text-numeric)', padding: '12px 8px' }}>{row.odds.toFixed(2)}</td>
                          <td style={{ minWidth: 180, padding: '12px 8px' }}>
                            <EvBar impliedProb={row.impliedProb} estimatedProb={row.estimatedProb} verdict={row.verdict} ariaLabel={`${row.verdict} bet · AI ${row.estimatedProb.min}-${row.estimatedProb.max}% · 隱含 ${row.impliedProb.toFixed(0)}%`} />
                            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 4 }}>
                              <span>隱含 {row.impliedProb.toFixed(0)}%</span>
                              <span style={{ color: verdictColor }}>估 {row.estimatedProb.min}–{row.estimatedProb.max}%</span>
                            </div>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', color: edgeColor, padding: '12px 8px', fontWeight: 500 }}>{row.edge >= 0 ? '+' : ''}{row.edge.toFixed(1)}</td>
                          <td style={{ textAlign: 'right', padding: '12px 16px', minWidth: 130 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                              {checked && (
                                <div className="mono" style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '2px 4px 2px 8px', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center' }}>
                                  <input aria-label="本金百分比" disabled={locked} type="number" min={0} max={5} step={0.5} value={selected?.stakePct ?? 0} onChange={(event) => handleStakeChange(i, Number(event.currentTarget.value))} style={{ width: 36, background: 'transparent', border: 'none', color: 'var(--text-numeric)', fontSize: 12, fontFamily: 'inherit', textAlign: 'right', outline: 'none' }} />
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11, marginRight: 4 }}>%</span>
                                </div>
                              )}
                              <button aria-label={locked ? '已儲存' : checked ? '取消勾選' : '勾選下注'} title={locked ? '已儲存，無法修改' : ''} onClick={(event) => { if (locked) return; const el = event.currentTarget; handleToggle(i, row); if (!prefersReducedMotion()) { gsap.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' }); } }} style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${checked ? 'var(--positive)' : 'var(--border-focus)'}`, background: checked ? 'var(--positive)' : 'transparent', color: 'var(--bg-base)', cursor: locked ? 'not-allowed' : 'pointer', fontSize: 14, lineHeight: 1, padding: 0, opacity: locked ? 0.5 : 1, fontFamily: 'inherit' }} type="button">{checked ? '✓' : ''}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginBottom: 16 }}>
              {result.avoid.length > 0 && (
                <div data-anim="side-card" style={{ background: 'var(--negative-soft)', border: '1px solid var(--negative)', borderRadius: 'var(--radius-card)', padding: 16 }}>
                  <div style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--negative)', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 10 }}>陷阱賠率 · 不要碰</div>
                  {result.avoid.map((item, i) => (
                    <div key={`${item.bet}-${i}`} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{item.bet}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.reason}</div>
                    </div>
                  ))}
                </div>
              )}
              {result.preMatchChecks.length > 0 && (
                <div data-anim="side-card" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-card)', padding: 16 }}>
                  <div style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--brand)', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 10 }}>賽前 1HR 確認</div>
                  {result.preMatchChecks.map((item, i) => (
                    <div key={`${item}-${i}`} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>□ {item}</div>
                  ))}
                </div>
              )}
            </div>
            {selectedRows.length > 0 && (
              <div ref={saveBarRef} style={{ position: 'sticky', bottom: 0, background: 'var(--bg-base)', padding: '14px 0', borderTop: '1px solid var(--border-default)', marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>已選 </span>
                  <span className="mono" style={{ fontWeight: 500 }}>{selectedRows.length}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}> 筆 · 曝險 </span>
                  <span className="mono" style={{ fontWeight: 500, color: overLimit ? 'var(--negative)' : totalExposurePct > 5 ? 'var(--fair)' : 'var(--text-numeric)' }}>{totalExposurePct.toFixed(1)}%</span>
                  <span className="mono" style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>({formatNT(totalExposureNT)})</span>
                  {overLimit && <span style={{ color: 'var(--negative)', fontSize: 11, marginLeft: 12 }}>⚠ 超過 8% 紀律上限</span>}
                </div>
                <Button disabled={saveDisabled} onClick={handleSave} size="md" variant="primary">{saveLabel}</Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
