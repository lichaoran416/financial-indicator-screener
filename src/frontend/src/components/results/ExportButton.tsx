/* eslint-disable no-undef */
import { Component } from 'solid-js';
import { CompanyInfo } from '../../stores/screeningStore';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  companies: CompanyInfo[];
  onExport?: () => void;
}

const ExportButton: Component<ExportButtonProps> = (props) => {
  const handleExport = () => {
    const headers = ['Code', 'Name', 'Industry', 'Status', 'Risk Flag'];
    const rows = props.companies.map((c) => [
      c.code,
      c.name,
      c.industry || '',
      c.status,
      c.risk_flag,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `screening_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    props.onExport?.();
  };

  return (
    <button class={styles.button} onClick={handleExport}>
      Export CSV
    </button>
  );
};

export default ExportButton;
