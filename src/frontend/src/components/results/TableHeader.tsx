import { Component, Show } from 'solid-js';
import { CompanyInfo, SortOrder } from '../../api/screen';
import styles from './TableHeader.module.css';

interface TableHeaderProps {
  column: keyof CompanyInfo;
  label: string;
  currentSort: keyof CompanyInfo | null;
  sortOrder: SortOrder;
  onSort: (column: keyof CompanyInfo) => void;
}

const TableHeader: Component<TableHeaderProps> = (props) => {
  const isActive = () => props.currentSort === props.column;

  return (
    <th onClick={() => props.onSort(props.column)}>
      <div class={styles.header}>
        <span>{props.label}</span>
        <Show when={isActive()}>
          <span class={styles.indicator}>
            {props.sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        </Show>
      </div>
    </th>
  );
};

export default TableHeader;
