import { Component, For } from 'solid-js';
import { CompanyInfo, SortOrder } from '../../stores/screeningStore';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import styles from './ResultsTable.module.css';

interface ResultsTableProps {
  companies: CompanyInfo[];
  onSort: (column: keyof CompanyInfo) => void;
  sortColumn: keyof CompanyInfo | null;
  sortOrder: SortOrder;
}

const columns: { key: keyof CompanyInfo; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'industry', label: 'Industry' },
  { key: 'status', label: 'Status' },
  { key: 'risk_flag', label: 'Risk Flag' },
];

const ResultsTable: Component<ResultsTableProps> = (props) => {
  return (
    <div class={styles.container}>
      <table class={styles.table}>
        <thead>
          <tr>
            <For each={columns}>
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
            {(company) => <TableRow company={company} />}
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
