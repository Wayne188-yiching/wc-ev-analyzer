import { useReducer, useEffect } from 'react';
import type { Dispatch } from 'react';
import type { AppState, Match, Bet, BetResult } from '../types';
import { loadState, saveState, DEFAULT_STATE } from '../lib/storage';

export type AppAction =
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'SET_BANKROLL'; payload: number }
  | { type: 'ADD_MATCH_WITH_BETS'; payload: { match: Match; bets: Bet[] } }
  | { type: 'ADD_BETS_TO_MATCH'; payload: { bets: Bet[] } }
  | {
      type: 'ENTER_RESULT';
      payload: {
        matchId: string;
        fullScore: [number, number] | null;
        halfScore: [number, number] | null;
        isVoid: boolean;
        resolvedAt: string;
        betUpdates: Array<{
          id: string;
          result: BetResult;
          pnl: number | null;
          resolvedAt: string | null;
        }>;
      };
    }
  | { type: 'DELETE_MATCH'; payload: { matchId: string } }
  | { type: 'IMPORT'; payload: { matches: Match[]; bets: Bet[]; bankroll?: number } }
  | { type: 'SET_LAST_EXPORT'; payload: string }
  | { type: 'RESET' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload };

    case 'SET_BANKROLL':
      return { ...state, bankroll: action.payload };

    case 'ADD_MATCH_WITH_BETS':
      return {
        ...state,
        matches: [...state.matches, action.payload.match],
        bets: [...state.bets, ...action.payload.bets],
      };

    case 'ADD_BETS_TO_MATCH':
      return { ...state, bets: [...state.bets, ...action.payload.bets] };

    case 'ENTER_RESULT': {
      const { matchId, fullScore, halfScore, isVoid, resolvedAt, betUpdates } = action.payload;
      const matches = state.matches.map((m) => {
        if (m.id !== matchId) return m;
        // Q4 invariant: isVoid forces score fields to null.
        return isVoid
          ? { ...m, fullScore: null, halfScore: null, isVoid: true, resultEnteredAt: resolvedAt }
          : { ...m, fullScore, halfScore, isVoid: false, resultEnteredAt: resolvedAt };
      });
      const updateById = new Map(betUpdates.map((u) => [u.id, u]));
      const bets = state.bets.map((b) => {
        if (b.matchId !== matchId) return b;
        // Q4 invariant: isVoid void-resolves every child bet regardless of caller's betUpdates.
        if (isVoid) return { ...b, result: 'void' as BetResult, pnl: 0, resolvedAt };
        const u = updateById.get(b.id);
        return u ? { ...b, result: u.result, pnl: u.pnl, resolvedAt: u.resolvedAt } : b;
      });
      return { ...state, matches, bets };
    }

    case 'DELETE_MATCH': {
      const { matchId } = action.payload;
      return {
        ...state,
        matches: state.matches.filter((m) => m.id !== matchId),
        bets: state.bets.filter((b) => b.matchId !== matchId),
      };
    }

    case 'IMPORT': {
      const { matches, bets, bankroll } = action.payload;
      return {
        ...state,
        matches,
        bets,
        bankroll: bankroll ?? state.bankroll,
      };
    }

    case 'SET_LAST_EXPORT':
      return { ...state, lastExport: action.payload };

    case 'RESET':
      return { ...DEFAULT_STATE, apiKey: state.apiKey };

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

export interface UseAppStateReturn {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

export function useAppState(): UseAppStateReturn {
  const [state, dispatch] = useReducer(appReducer, undefined as never, () => loadState());
  useEffect(() => {
    saveState(state);
  }, [state]);
  return { state, dispatch };
}
