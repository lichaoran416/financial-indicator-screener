/* eslint-disable no-undef */
import { Component, createSignal } from 'solid-js';
import { CompanyInfo, Condition, ScreenRequest, screenCompanies } from '../../api/screen';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  companies: CompanyInfo[];
  conditions: Condition[];
  screenRequest: Omit<ScreenRequest, 'page' | 'limit'>;
  onExport?: () => void;
}

const ExportButton: Component<ExportButtonProps> = (props) => {
  const [exporting, setExporting] = createSignal(false);

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const allCompanies: CompanyInfo[] = [];
      const limit = 100;
      const maxPages = 100;
      
      for (let page = 1; page <= maxPages; page++) {
        const response = await screenCompanies({
          ...props.screenRequest,
          conditions: props.conditions,
          page,
          limit,
        });
        
        allCompanies.push(...response.companies);
        
        if (allCompanies.length >= response.total || response.companies.length === 0) {
          break;
        }
      }
      
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
      
      const rows = allCompanies.map((c) => {
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
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button class={styles.button} onClick={handleExport} disabled={exporting()}>
      {exporting() ? 'Exporting...' : 'Export CSV'}
    </button>
  );
};

export default ExportButton;