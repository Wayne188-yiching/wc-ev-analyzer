import { useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { TopNav } from './views/TopNav';
import { DashboardView } from './views/DashboardView';

type Tab = 'dashboard' | 'history' | 'stats';

export default function App(): JSX.Element {
  const { state, dispatch } = useAppState();
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <TopNav
        tab={tab}
        onTabChange={setTab}
        bankroll={state.bankroll}
        onBankrollChange={(b) => dispatch({ type: 'SET_BANKROLL', payload: b })}
        hasApiKey={Boolean(state.apiKey)}
        onOpenSettings={() => alert('Settings — Step 16 開放')}
      />
      <main style={{ maxWidth: 'var(--max-w-container)', margin: '0 auto', padding: 24 }}>
        {tab === 'dashboard' && (
          <DashboardView
            state={state}
            onOpenAnalysisNew={() => alert('AnalysisDetailModal (new) — Step 12')}
            onOpenAnalysisView={(id) => alert(`AnalysisDetailModal (view ${id}) — Step 12`)}
            onOpenResultEntry={(id) => alert(`ResultEntryModal (${id}) — Step 13`)}
          />
        )}
        {tab === 'history' && <Placeholder name="HistoryView" step={15} />}
        {tab === 'stats' && <Placeholder name="StatsView" step={14} />}
      </main>
    </div>
  );
}

function Placeholder({ name, step }: { name: string; step: number }): JSX.Element {
  return (
    <div style={{ padding: 32, color: 'var(--text-tertiary)', textAlign: 'center' }}>
      {name} placeholder · Step {step}
    </div>
  );
}
