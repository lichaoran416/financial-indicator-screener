import { createStore } from 'solid-js/store';
import type { CompanyInfo as APICompanyInfo, Period as APIPeriod } from '../api/screen';

export type Period = APIPeriod;
export type SortOrder = 'asc' | 'desc';

export interface Condition {
  metric?: string;
  formula?: string;
  operator: string;
  value: number;
  value2?: number;
  period?: Period;
  years?: number;
}

export interface CompanyInfo extends APICompanyInfo {}

interface ScreeningState {
  conditions: Condition[];
  results: CompanyInfo[];
  total: number;
  loading: boolean;
  error: string | null;
}

const [screeningState, setScreeningState] = createStore<ScreeningState>({
  conditions: [],
  results: [],
  total: 0,
  loading: false,
  error: null,
});

export const screeningStore = {
  get conditions() {
    return screeningState.conditions;
  },
  get results() {
    return screeningState.results;
  },
  get total() {
    return screeningState.total;
  },
  get loading() {
    return screeningState.loading;
  },
  get error() {
    return screeningState.error;
  },

  setConditions(conditions: Condition[]) {
    setScreeningState('conditions', conditions);
  },

  addCondition(condition: Condition) {
    setScreeningState('conditions', (prev) => [...prev, condition]);
  },

  removeCondition(index: number) {
    setScreeningState('conditions', (prev) => prev.filter((_, i) => i !== index));
  },

  updateCondition(index: number, condition: Condition) {
    setScreeningState('conditions', index, condition);
  },

  clearConditions() {
    setScreeningState('conditions', []);
  },

  setResults(results: CompanyInfo[], total: number) {
    setScreeningState({ results, total });
  },

  setLoading(loading: boolean) {
    setScreeningState('loading', loading);
  },

  setError(error: string | null) {
    setScreeningState('error', error);
  },

  reset() {
    setScreeningState({
      conditions: [],
      results: [],
      total: 0,
      loading: false,
      error: null,
    });
  },
};