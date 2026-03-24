/* eslint-disable no-undef */
import { Component } from 'solid-js';
import { CompanyInfo, Condition } from '../../api/screen';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  companies: CompanyInfo[];
  conditions: Condition[];
  onExport?: () => void;
}

const ExportButton: Component<ExportButtonProps> = (props) => {
  const handleExport = () => {
    const baseHeaders = ['Code', 'Name', 'Industry', 'Status', 'Risk Flag', 'Years'];
    
    const metricColumns: string[] = [];
    const seenMetrics = new Set<string>();
    for (const cond of props.conditions) {
      const metricKey = cond.metric || cond.formula;
      if (metricKey && !seenMetrics.has(metricKey)) {
        seenMetrics.add(metricKey);
        metricColumns.push(metricKey);
      }
    }
    
    const headers = [...baseHeaders, ...metricColumns.map(m => m.toUpperCase())];
    
    const rows = props.companies.map((c) => {
      const row = [
        c.code,
        c.name,
        c.industry || '',
        c.status,
        c.risk_flag,
        c.available_years?.toString() || '',
      ];
      
      for (const metricKey of metricColumns) {
        const value = c.metrics?.[metricKey];
        row.push(value !== undefined && value !== null ? value.toString() : 'N/A');
      }
      
      return row;
    });

    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join(
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