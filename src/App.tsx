import { useCallback, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { TopNav } from './views/TopNav';
import { DashboardView } from './views/DashboardView';
import { StatsView } from './views/StatsView';
import { AnalysisDetailModal } from './views/AnalysisDetailModal';
import { ResultEntryModal } from './views/ResultEntryModal';

type Tab = 'dashboard' | 'history' | 'stats';
type AnalysisModalState =
  | { mode: 'new'; matchId: null }
  | { mode: 'view'; matchId: string }
  | null;

export default function App(): JSX.Element {
  const { state, dispatch } = useAppState();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [analysisModal, setAnalysisModal] = useState<AnalysisModalState>(null);
  const [resultModalId, setResultModalId] = useState<string | null>(null);

  const closeAnalysisModal = useCallback(() => setAnalysisModal(null), []);
  const closeResultModal = useCallback(() => setResultModalId(null), []);

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
            onOpenAnalysisNew={() => setAnalysisModal({ mode: 'new', matchId: null })}
            onOpenAnalysisView={(id) => setAnalysisModal({ mode: 'view', matchId: id })}
            onOpenResultEntry={(id) => setResultModalId(id)}
          />
        )}
        {tab === 'history' && <Placeholder name="HistoryView" step={15} />}
        {tab === 'stats' && <StatsView state={state} />}
      </main>
      {analysisModal && (
        <AnalysisDetailModal
          state={state}
          dispatch={dispatch}
          mode={analysisModal.mode}
          matchId={analysisModal.matchId}
          onClose={closeAnalysisModal}
        />
      )}
      {resultModalId && (
        <ResultEntryModal
          state={state}
          dispatch={dispatch}
          matchId={resultModalId}
          onClose={closeResultModal}
        />
      )}
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
