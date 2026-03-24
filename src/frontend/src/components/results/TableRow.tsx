import { Component } from 'solid-js';
import { CompanyInfo } from '../../api/screen';
import styles from './TableRow.module.css';

interface TableRowProps {
  company: CompanyInfo;
}

const statusColors: Record<CompanyInfo['status'], string> = {
  ACTIVE: '#22c55e',
  SUSPENDED: '#f59e0b',
  DELISTED: '#ef4444',
};

const riskColors: Record<CompanyInfo['risk_flag'], string> = {
  NORMAL: '#22c55e',
  ST: '#f59e0b',
  STAR_ST: '#ef4444',
  DELISTING_RISK: '#dc2626',
};

const TableRow: Component<TableRowProps> = (props) => {
  return (
    <tr class={styles.row}>
      <td>
        <a href={`/company/${props.company.code}`} class={styles.link}>
          {props.company.code}
        </a>
      </td>
      <td>{props.company.name}</td>
      <td>{props.company.industry || '-'}</td>
      <td>
        <span
          class={styles.badge}
          style={{ color: statusColors[props.company.status] }}
        >
          {props.company.status}
        </span>
      </td>
      <td>
        <span
          class={styles.badge}
          style={{ color: riskColors[props.company.risk_flag] }}
        >
          {props.company.risk_flag.replace('_', ' ')}
        </span>
      </td>
    </tr>
  );
};

export default TableRow;
