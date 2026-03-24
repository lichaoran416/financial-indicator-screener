import { Component, For, createMemo } from 'solid-js';
import { CompanyInfo, SortOrder, Condition } from '../../api/screen';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import styles from './ResultsTable.module.css';

interface ResultsTableProps {
  companies: CompanyInfo[];
  onSort: (column: string) => void;
  sortColumn: string | null;
  sortOrder: SortOrder;
  conditions: Condition[];
}

const baseColumns = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'industry', label: 'Industry' },
  { key: 'status', label: 'Status' },
  { key: 'risk_flag', label: 'Risk Flag' },
  { key: 'available_years', label: 'Years' },
];

const ResultsTable: Component<ResultsTableProps> = (props) => {
  const metricColumns = createMemo(() => {
    const cols: { key: string; label: string; isMetric: boolean }[] = [];
    const seenMetrics = new Set<string>();
    
    for (const cond of props.conditions) {
      const metricKey = cond.metric || cond.formula;
      if (metricKey && !seenMetrics.has(metricKey)) {
        seenMetrics.add(metricKey);
        cols.push({ key: metricKey, label: metricKey.toUpperCase(), isMetric: true });
      }
    }
    
    return cols;
  });

  const allColumns = createMemo(() => {
    const metrics = metricColumns();
    if (metrics.length === 0) {
      return [...baseColumns];
    }
    return [
      ...baseColumns.slice(0, 2),
      { key: 'available_years', label: 'Years', isMetric: false },
      ...baseColumns.slice(3),
      ...metrics,
    ];
  });

  return (
    <div class={styles.container}>
      <table class={styles.table}>
        <thead>
          <tr>
            <For each={allColumns()}>
              {(col) => (
                <TableHeader
                  column={col.key}
                  label={col.label}
                  currentSort={props.sortColumn}
                  sortOrder={props.sortOrder}
                  onSort={props.onSort}
                />
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.companies}>
            {(company) => (
              <TableRow
                company={company}
                metricColumns={metricColumns().map(c => c.key)}
              />
            )}
          </For>
        </tbody>
      </table>
      {props.companies.length === 0 && (
        <div class={styles.empty}>No companies found</div>
      )}
    </div>
  );
};

export default ResultsTable;
