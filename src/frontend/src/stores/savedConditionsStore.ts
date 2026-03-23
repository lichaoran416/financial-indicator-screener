import { createStore } from 'solid-js/store';
import type { Condition } from './screeningStore';

export interface SavedScreen {
  id: string;
  name: string;
  conditions: Condition[];
  created_at: string;
}

interface SavedConditionsState {
  savedScreens: SavedScreen[];
  loading: boolean;
}

const [savedConditionsState, setSavedConditionsState] = createStore<SavedConditionsState>({
  savedScreens: [],
  loading: false,
});

export const savedConditionsStore = {
  get savedScreens() {
    return savedConditionsState.savedScreens;
  },
  get loading() {
    return savedConditionsState.loading;
  },

  setSavedScreens(savedScreens: SavedScreen[]) {
    setSavedConditionsState('savedScreens', savedScreens);
  },

  addSavedScreen(screen: SavedScreen) {
    setSavedConditionsState('savedScreens', (prev) => [...prev, screen]);
  },

  removeSavedScreen(id: string) {
    setSavedConditionsState('savedScreens', (prev) => prev.filter((s) => s.id !== id));
  },

  setLoading(loading: boolean) {
    setSavedConditionsState('loading', loading);
  },

  clearAll() {
    setSavedConditionsState({ savedScreens: [], loading: false });
  },
};
