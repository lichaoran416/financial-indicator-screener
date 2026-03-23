import { createStore } from 'solid-js/store';

export interface CompanyDetail {
  code: string;
  name: string;
  industry?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELISTED';
  risk_flag: 'NORMAL' | 'ST' | 'STAR_ST' | 'DELISTING_RISK';
  metrics: Record<string, number>;
}

export interface MetricInfo {
  id: string;
  name: string;
  category: string;
}

interface CompanyState {
  company: CompanyDetail | null;
  metrics: MetricInfo[];
  loading: boolean;
  error: string | null;
}

const [companyState, setCompanyState] = createStore<CompanyState>({
  company: null,
  metrics: [],
  loading: false,
  error: null,
});

export const companyStore = {
  get company() {
    return companyState.company;
  },
  get metrics() {
    return companyState.metrics;
  },
  get loading() {
    return companyState.loading;
  },
  get error() {
    return companyState.error;
  },

  setCompany(company: CompanyDetail) {
    setCompanyState('company', company);
  },

  setMetrics(metrics: MetricInfo[]) {
    setCompanyState('metrics', metrics);
  },

  setLoading(loading: boolean) {
    setCompanyState('loading', loading);
  },

  setError(error: string | null) {
    setCompanyState('error', error);
  },

  clearCompany() {
    setCompanyState({ company: null, metrics: [], loading: false, error: null });
  },
};
