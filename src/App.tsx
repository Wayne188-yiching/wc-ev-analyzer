import { useCallback, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { TopNav } from './views/TopNav';
import { DashboardView } from './views/DashboardView';
import { HistoryView } from './views/HistoryView';
import { StatsView } from './views/StatsView';
import { AnalysisDetailModal } from './views/AnalysisDetailModal';
import { ResultEntryModal } from './views/ResultEntryModal';
import { SettingsModal } from './views/SettingsModal';
import { ParlayBuilderModal } from './views/ParlayBuilderModal';

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
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [parlayBuilderOpen, setParlayBuilderOpen] = useState<boolean>(false);

  const closeAnalysisModal = useCallback(() => setAnalysisModal(null), []);
  const closeResultModal = useCallback(() => setResultModalId(null), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeParlayBuilder = useCallback(() => setParlayBuilderOpen(false), []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <TopNav
        tab={tab}
        onTabChange={setTab}
        bankroll={state.bankroll}
        onBankrollChange={(b) => dispatch({ type: 'SET_BANKROLL', payload: b })}
        hasApiKey={Boolean(state.apiKey)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main style={{ maxWidth: 'var(--max-w-container)', margin: '0 auto', padding: 24 }}>
        {tab === 'dashboard' && (
          <DashboardView
            state={state}
            onOpenAnalysisNew={() => setAnalysisModal({ mode: 'new', matchId: null })}
            onOpenAnalysisView={(id) => setAnalysisModal({ mode: 'view', matchId: id })}
            onOpenResultEntry={(id) => setResultModalId(id)}
            onOpenParlayBuilder={() => setParlayBuilderOpen(true)}
            onDeleteParlay={(id) => dispatch({ type: 'DELETE_PARLAY', payload: { parlayId: id } })}
          />
        )}
        {tab === 'history' && (
          <HistoryView
            state={state}
            onOpenAnalysisView={(id) => setAnalysisModal({ mode: 'view', matchId: id })}
            onOpenResultEntry={(id) => setResultModalId(id)}
          />
        )}
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
      {settingsOpen && (
        <SettingsModal
          state={state}
          dispatch={dispatch}
          onClose={closeSettings}
        />
      )}
      {parlayBuilderOpen && (
        <ParlayBuilderModal
          state={state}
          dispatch={dispatch}
          onClose={closeParlayBuilder}
        />
      )}
    </div>
  );
}

