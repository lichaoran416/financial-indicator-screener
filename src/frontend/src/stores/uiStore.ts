import { createSignal } from 'solid-js';

const [isLoading, setIsLoading] = createSignal(false);
const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

export const uiStore = {
  get isLoading() {
    return isLoading();
  },
  get errorMessage() {
    return errorMessage();
  },

  setLoading(loading: boolean) {
    setIsLoading(loading);
  },

  setError(message: string | null) {
    setErrorMessage(message);
  },

  clearError() {
    setErrorMessage(null);
  },
};
