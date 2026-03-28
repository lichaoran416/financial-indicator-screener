import { createSignal, onMount, Show, For, onCleanup } from 'solid-js';
import { triggerSync, getSyncStatus, SyncTriggerRequest, SyncStatusResponse, SyncStatusHistory } from '../api/sync';
import { LoadingSpinner, ErrorState, EmptyState } from '../components/common';

const SYNC_TYPES = [
  { value: 'financial', label: '财务数据' },
  { value: 'basic', label: '基础信息' },
  { value: 'industry', label: '行业分类' },
  { value: 'all', label: '全部' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  running: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
};

export default function SyncManagementPage() {
  const [syncStatus, setSyncStatus] = createSignal<SyncStatusResponse | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedSyncType, setSelectedSyncType] = createSignal<string>('financial');
  const [triggering, setTriggering] = createSignal(false);
  const [triggerResult, setTriggerResult] = createSignal<string | null>(null);

  let pollInterval: number | undefined;

  const loadStatus = async () => {
    try {
      const data = await getSyncStatus();
      setSyncStatus(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadStatus();
    pollInterval = window.setInterval(loadStatus, 5000);
  });

  onCleanup(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const request: SyncTriggerRequest = {
        sync_type: selectedSyncType() as SyncTriggerRequest['sync_type'],
      };
      const result = await triggerSync(request);
      setTriggerResult(`Task submitted: ${result.task_id}`);
      loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to trigger sync');
    } finally {
      setTriggering(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDuration = (startedAt: string, finishedAt: string | undefined) => {
    const start = new Date(startedAt).getTime();
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
    const diffMs = end - start;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const getProgress = (task: SyncStatusHistory) => {
    if (task.total_count === 0) return '0%';
    return `${Math.round((task.processed_count / task.total_count) * 100)}%`;
  };

  const runningTasks = () => syncStatus()?.tasks.filter(t => t.status === 'running') || [];
  const recentTasks = () => syncStatus()?.tasks.slice(0, 20) || [];

  return (
    <div>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1.5rem' }}>
        <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>数据同步管理</h1>
        <button
          onClick={loadStatus}
          style={{
            padding: '0.5rem 1rem',
            'background-color': '#666',
            color: 'white',
            border: 'none',
            'border-radius': '4px',
            cursor: 'pointer',
            'font-size': '0.875rem',
          }}
        >
          刷新
        </button>
      </div>

      <Show when={triggerResult()}>
        <div style={{
          padding: '1rem',
          'background-color': '#dcfce7',
          'border': '1px solid #22c55e',
          'border-radius': '8px',
          'margin-bottom': '1rem',
          color: '#166534',
        }}>
          {triggerResult()}
        </div>
      </Show>

      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': '8px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
        'margin-bottom': '1.5rem',
      }}>
        <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>同步任务触发区</h2>

        <div style={{ display: 'flex', gap: '1rem', 'margin-bottom': '1rem', 'flex-wrap': 'wrap' }}>
          <For each={SYNC_TYPES}>
            {(type) => (
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="syncType"
                  value={type.value}
                  checked={selectedSyncType() === type.value}
                  onChange={() => setSelectedSyncType(type.value)}
                />
                {type.label}
              </label>
            )}
          </For>
        </div>

        <button
          onClick={handleTrigger}
          disabled={triggering()}
          style={{
            padding: '0.75rem 1.5rem',
            'background-color': triggering() ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            'border-radius': '4px',
            cursor: triggering() ? 'not-allowed' : 'pointer',
            'font-size': '1rem',
          }}
        >
          {triggering() ? '提交中...' : '触发同步任务'}
        </button>
      </div>

      <Show when={runningTasks().length > 0}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          'border-radius': '8px',
          'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
          'margin-bottom': '1.5rem',
          'border-left': '4px solid #3b82f6',
        }}>
          <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>正在运行</h2>
          <For each={runningTasks()}>
            {(task) => (
              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                  <span style={{ 'font-weight': '500' }}>{task.sync_type}</span>
                  <span style={{ color: STATUS_COLORS[task.status] }}>{task.status}</span>
                </div>
                <div style={{ 'font-size': '0.875rem', color: '#666' }}>
                  进度: {task.processed_count}/{task.total_count} ({getProgress(task)}) · 
                  开始时间: {formatDate(task.started_at)} · 
                  耗时: {getDuration(task.started_at, task.finished_at)}
                </div>
                <Show when={task.industry_sw_three}>
                  <div style={{ 'font-size': '0.875rem', color: '#666' }}>
                    行业: {task.industry_sw_three}
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': '8px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
        'margin-bottom': '1.5rem',
      }}>
        <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>同步历史记录</h2>

        <Show when={loading()}>
          <div style={{ display: 'flex', 'justify-content': 'center', padding: '2rem' }}>
            <LoadingSpinner size="medium" />
          </div>
        </Show>

        <Show when={error()}>
          <ErrorState message={error()!} onRetry={loadStatus} />
        </Show>

        <Show when={!loading() && !error() && recentTasks().length === 0}>
          <EmptyState message="暂无同步记录" />
        </Show>

        <Show when={!loading() && !error() && recentTasks().length > 0}>
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.875rem' }}>
              <thead>
                <tr style={{ 'border-bottom': '1px solid #e5e5e5' }}>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>任务ID</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>类型</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>状态</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>进度</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>开始时间</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>耗时</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>失败数</th>
                </tr>
              </thead>
              <tbody>
                <For each={recentTasks()}>
                  {(task) => (
                    <tr style={{ 'border-bottom': '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.75rem 0.5rem', 'font-family': 'monospace', 'font-size': '0.75rem' }}>
                        {task.task_id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{task.sync_type}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          'border-radius': '4px',
                          'font-size': '0.75rem',
                          'background-color': STATUS_COLORS[task.status] + '20',
                          color: STATUS_COLORS[task.status],
                        }}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {task.processed_count}/{task.total_count} ({getProgress(task)})
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{formatDate(task.started_at)}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{getDuration(task.started_at, task.finished_at)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: task.failed_count > 0 ? '#ef4444' : 'inherit' }}>
                        {task.failed_count}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      <Show when={syncStatus()?.industries && syncStatus()!.industries.length > 0}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          'border-radius': '8px',
          'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>各行业最后更新时间</h2>
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.875rem' }}>
              <thead>
                <tr style={{ 'border-bottom': '1px solid #e5e5e5' }}>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>申万三级行业</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>同步类型</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>记录数</th>
                  <th style={{ 'text-align': 'left', padding: '0.75rem 0.5rem' }}>最后同步</th>
                </tr>
              </thead>
              <tbody>
                <For each={syncStatus()!.industries}>
                  {(industry) => (
                    <tr style={{ 'border-bottom': '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{industry.industry_sw_three}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{industry.sync_type}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{industry.record_count}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{formatDate(industry.last_sync_at || undefined)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>
    </div>
  );
}
