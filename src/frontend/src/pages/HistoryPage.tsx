import { createSignal, onMount, Show, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { getSavedScreens, deleteSavedScreen, SavedScreen } from '../api/screen';
import { LoadingSpinner, ErrorState, EmptyState } from '../components/common';

const SCREEN_CONDITIONS_KEY = 'loaded_screen_conditions';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [screens, setScreens] = createSignal<SavedScreen[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const loadScreens = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSavedScreens();
      setScreens(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load saved screens');
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadScreens();
  });

  const handleLoad = (screen: SavedScreen) => {
    window.localStorage.setItem(SCREEN_CONDITIONS_KEY, JSON.stringify(screen.conditions));
    navigate('/');
  };

  const handleDelete = async (screen: SavedScreen) => {
    try {
      await deleteSavedScreen(screen.id);
      setScreens((prev) => prev.filter((s) => s.id !== screen.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete screen');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600', 'margin-bottom': '1.5rem' }}>Saved Screens</h1>

      <Show when={loading()}>
        <div style={{ display: 'flex', 'justify-content': 'center', padding: '3rem' }}>
          <LoadingSpinner size="large" />
        </div>
      </Show>

      <Show when={error()}>
        <ErrorState message={error()!} onRetry={loadScreens} />
      </Show>

      <Show when={!loading() && !error() && screens().length === 0}>
        <EmptyState message="No saved screens yet" />
      </Show>

      <Show when={!loading() && !error() && screens().length > 0}>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
          <For each={screens()}>
            {(screen) => (
              <div
                style={{
                  background: 'white',
                  padding: '1rem',
                  'border-radius': '8px',
                  'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, 'font-size': '1rem', 'font-weight': '600' }}>{screen.name}</h3>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#666', 'font-size': '0.875rem' }}>
                    {formatDate(screen.created_at)} · {screen.conditions.length} condition{screen.conditions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleLoad(screen)}
                    style={{
                      padding: '0.5rem 1rem',
                      'background-color': '#1976d2',
                      color: 'white',
                      border: 'none',
                      'border-radius': '4px',
                      cursor: 'pointer',
                      'font-size': '0.875rem',
                    }}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(screen)}
                    style={{
                      padding: '0.5rem 1rem',
                      'background-color': '#d32f2f',
                      color: 'white',
                      border: 'none',
                      'border-radius': '4px',
                      cursor: 'pointer',
                      'font-size': '0.875rem',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}