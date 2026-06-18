import type { AppState } from '../types';

export const STORAGE_KEY = 'wc_ev_app_v1' as const;

export const DEFAULT_STATE: AppState = {
  apiKey: '',
  bankroll: 10000,
  matches: [],
  bets: [],
  lastExport: null,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Q3: swallow. Export view is the recovery path, not a runtime guard.
  }
}
