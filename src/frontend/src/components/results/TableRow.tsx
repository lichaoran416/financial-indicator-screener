import { Component, Show } from 'solid-js';
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

const riskWarnings: Record<CompanyInfo['risk_flag'], string> = {
  NORMAL: '',
  ST: 'Special Treatment - Company has reported financial irregularities or losses. Exercise caution.',
  STAR_ST: 'Star Special Treatment - Company is in severe financial distress. High risk.',
  DELISTING_RISK: 'At risk of delisting - Company may be removed from the exchange. Extremely high risk.',
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
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
          <span
            class={styles.badge}
            style={{ color: riskColors[props.company.risk_flag] }}
          >
            {props.company.risk_flag.replace('_', ' ')}
          </span>
          <Show when={riskWarnings[props.company.risk_flag]}>
            <span style={{ 'font-size': '0.75rem', color: riskColors[props.company.risk_flag] }}>
              {riskWarnings[props.company.risk_flag]}
            </span>
          </Show>
        </div>
      </td>
    </tr>
  );
};

export default TableRow;
