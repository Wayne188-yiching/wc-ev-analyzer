import { useEffect, useRef } from 'react';
import { gsap, useGSAP, prefersReducedMotion } from '../lib/motion';

export type Tab = 'dashboard' | 'history' | 'stats';

export interface TopNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  bankroll: number;
  onBankrollChange: (value: number) => void;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: '今日' },
  { id: 'history', label: '紀錄' },
  { id: 'stats', label: '統計' },
];

const styles = {
  outer: { position: 'sticky', top: 0, height: 56, zIndex: 50, background: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)' },
  wrap: { maxWidth: 'var(--max-w-container)', margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 32 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 600 },
  suffix: { color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 13 },
  tabsWrap: { position: 'relative', display: 'flex', gap: 4, paddingBottom: 4 },
  tabButton: { padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color var(--duration-fade) var(--easing-base)' },
  indicator: { position: 'absolute', bottom: 0, left: 0, height: 2, background: 'var(--brand)', borderRadius: 1, pointerEvents: 'none', willChange: 'transform,width' },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  bankroll: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13 },
  input: { width: 72, color: 'var(--text-numeric)', fontWeight: 500, background: 'transparent', border: 'none', outline: 'none', textAlign: 'right', fontFamily: 'inherit' },
  gear: { padding: 8, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
} as const;

export function TopNav(props: TopNavProps): JSX.Element {
  const { tab, onTabChange, bankroll, onBankrollChange, hasApiKey, onOpenSettings } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<Tab, HTMLButtonElement>>(new Map());
  const indicatorRef = useRef<HTMLDivElement>(null);

  const gearStyle = {
    ...styles.gear,
    background: hasApiKey ? 'var(--bg-surface)' : 'var(--fair-soft)',
    color: hasApiKey ? 'var(--text-secondary)' : 'var(--fair)',
    border: hasApiKey ? '1px solid var(--border-default)' : '1px solid var(--fair)',
  };

  // T1: brand entrance on mount
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from('[data-anim="brand"]', { scale: 0.8, opacity: 0, duration: 0.4, ease: 'back.out(2)' });
  }, { scope: containerRef });

  // T2: sliding tab indicator on tab change
  useEffect(() => {
    const indicator = indicatorRef.current;
    const wrap = tabsWrapRef.current;
    const btn = buttonRefs.current.get(tab);
    if (!indicator || !wrap || !btn) return;
    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const x = btnRect.left - wrapRect.left;
    const width = btnRect.width;
    if (prefersReducedMotion()) {
      gsap.set(indicator, { x, width, opacity: 1 });
      return;
    }
    gsap.to(indicator, { x, width, opacity: 1, duration: 0.3, ease: 'power2.inOut' });
  }, [tab]);

  return (
    <div ref={containerRef} aria-label="頂部導覽" role="navigation" style={styles.outer}>
      <div style={styles.wrap}>
        <div style={styles.left}>
          <div data-anim="brand" style={styles.brand}>
            <span style={{ color: 'var(--brand)' }}>◆</span>
            <span style={{ color: 'var(--text-primary)' }}>EV</span>
            <span style={styles.suffix}>· WC 2026</span>
          </div>
          <div ref={tabsWrapRef} style={styles.tabsWrap}>
            {tabs.map((item) => (
              <button
                aria-current={item.id === tab ? 'page' : undefined}
                key={item.id}
                onClick={() => { onTabChange(item.id); }}
                ref={(el) => { if (el) buttonRefs.current.set(item.id, el); }}
                style={{ ...styles.tabButton, color: item.id === tab ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                type="button"
              >
                {item.label}
              </button>
            ))}
            <div ref={indicatorRef} style={{ ...styles.indicator, opacity: 0 }} />
          </div>
        </div>
        <div style={styles.right}>
          <div style={styles.bankroll}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>本金</span>
            <span className="mono" style={{ color: 'var(--text-tertiary)' }}>NT$</span>
            <input
              aria-label="本金"
              className="mono"
              min="0"
              onChange={(event) => { onBankrollChange(Math.max(0, parseInt(event.target.value, 10) || 0)); }}
              step="1000"
              style={styles.input}
              type="number"
              value={bankroll}
            />
          </div>
          <button aria-label={hasApiKey ? '設定' : '請設定 API Key'} onClick={onOpenSettings} style={gearStyle} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
