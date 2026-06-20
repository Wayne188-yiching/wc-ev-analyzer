import { useRef, useState } from 'react';
import type { CSSProperties, Dispatch } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import type { AppState, Match, Bet } from '../types';
import type { AppAction } from '../hooks/useAppState';

export interface SettingsModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  onClose: () => void;
}

interface ImportPayload { matches: Match[]; bets: Bet[]; bankroll?: number; }

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isImportPayload(value: unknown): value is ImportPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.matches) && Array.isArray(v.bets);
}

const inputStyle: CSSProperties = {
  width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
  borderRadius: 8, padding: '10px 70px 10px 12px', fontSize: 12, color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const dangerButtonStyle: CSSProperties = {
  background: 'transparent', color: 'var(--negative)', border: '1px solid var(--negative)',
  borderRadius: 'var(--radius-btn)', padding: '10px 16px', fontSize: 13, fontWeight: 500,
  fontFamily: 'inherit', cursor: 'pointer',
};

export function SettingsModal({ state, dispatch, onClose }: SettingsModalProps): JSX.Element {
  const [tempKey, setTempKey] = useState<string>(state.apiKey || '');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [saved, setSaved] = useState<'' | 'key' | 'export' | 'import' | 'reset'>('');
  const importRef = useRef<HTMLInputElement>(null);

  const flash = (kind: typeof saved): void => {
    setSaved(kind);
    setTimeout(() => setSaved(''), 1200);
  };

  const handleSaveKey = (): void => {
    dispatch({ type: 'SET_API_KEY', payload: tempKey.trim() });
    flash('key');
  };

  const handleExport = (): void => {
    const payload = { matches: state.matches, bets: state.bets, bankroll: state.bankroll, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wc-ev-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch({ type: 'SET_LAST_EXPORT', payload: new Date().toISOString() });
    flash('export');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
        const parsed: unknown = JSON.parse(text);
        if (!isImportPayload(parsed)) throw new Error('JSON 格式錯誤：缺少 matches 或 bets');
        const summary = `匯入會覆蓋目前資料：\n${state.matches.length} → ${parsed.matches.length} 場\n${state.bets.length} → ${parsed.bets.length} 筆\n\n確定？`;
        if (!window.confirm(summary)) return;
        dispatch({ type: 'IMPORT', payload: { matches: parsed.matches, bets: parsed.bets, bankroll: parsed.bankroll } });
        flash('import');
      } catch (err) {
        window.alert('匯入失敗：' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleReset = (): void => {
    if (!window.confirm(`確定清除全部 ${state.matches.length} 場、${state.bets.length} 筆紀錄？此動作無法復原。建議先匯出備份。`)) return;
    if (!window.confirm('真的確定？最後一次確認。')) return;
    dispatch({ type: 'RESET' });
    flash('reset');
  };

  const daysSinceExport = state.lastExport
    ? Math.floor((Date.now() - new Date(state.lastExport).getTime()) / 86_400_000)
    : null;
  const exportHint = daysSinceExport === null
    ? '從未匯出備份。'
    : daysSinceExport === 0
      ? '今天已匯出。'
      : `${daysSinceExport} 天沒匯出備份。`;
  const exportWarn = daysSinceExport !== null && daysSinceExport > 7;

  return (
    <Modal ariaLabel="設定" maxWidth={640} onClose={onClose}>
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>設定</h2>
          <button aria-label="關閉" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 18, lineHeight: 1 }} type="button">✕</button>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-primary)' }}>Anthropic API Key</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.6 }}>
            前往 <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>console.anthropic.com</a> · Settings → API Keys → Create Key。Key 存在你瀏覽器 localStorage，不會外洩。每場分析約消耗 NT$1–3。
          </div>
          <div style={{ position: 'relative' }}>
            <input
              aria-label="Anthropic API Key"
              className="mono"
              type={showKey ? 'text' : 'password'}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={inputStyle}
            />
            <button
              aria-label={showKey ? '隱藏 API Key' : '顯示 API Key'}
              onClick={() => setShowKey((s) => !s)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 11, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit' }}
              type="button"
            >{showKey ? '隱藏' : '顯示'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={handleSaveKey} disabled={!tempKey.trim() || tempKey === state.apiKey} variant="primary">
              {saved === 'key' ? '✓ 已儲存' : '儲存 API Key'}
            </Button>
            {state.apiKey && (
              <button onClick={() => { dispatch({ type: 'SET_API_KEY', payload: '' }); setTempKey(''); }} style={dangerButtonStyle} type="button">清除</button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-primary)' }}>資料管理</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.6 }}>
            目前 {state.matches.length} 場分析、{state.bets.length} 筆 bets。{exportHint}
            {exportWarn && <span style={{ color: 'var(--fair)' }}> ⚠ 建議匯出</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={handleExport} variant="secondary">{saved === 'export' ? '✓ 已下載' : '匯出 JSON 備份'}</Button>
            <Button onClick={() => importRef.current?.click()} variant="secondary">{saved === 'import' ? '✓ 已匯入' : '從 JSON 匯入'}</Button>
            <input ref={importRef} accept="application/json" onChange={handleImport} style={{ display: 'none' }} type="file" />
            <button onClick={handleReset} style={dangerButtonStyle} type="button">{saved === 'reset' ? '✓ 已清除' : '清除全部資料'}</button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
          本工具僅供分析參考。運彩屬負期望值遊戲，請設定上限、量力而為。<br />
          若出現賭博成癮跡象，請撥打 0800-636-363。
        </div>
      </div>
    </Modal>
  );
}
