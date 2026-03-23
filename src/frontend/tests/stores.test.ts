import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screeningStore } from '../src/stores/screeningStore';
import { companyStore } from '../src/stores/companyStore';
import { savedConditionsStore } from '../src/stores/savedConditionsStore';

describe('screeningStore', () => {
  beforeEach(() => {
    screeningStore.reset();
  });

  describe('conditions', () => {
    it('should start with empty conditions', () => {
      expect(screeningStore.conditions).toEqual([]);
    });

    it('should set conditions', () => {
      const conditions = [
        { metric: 'pe', operator: '<', value: 10, period: 'annual' as const }
      ];
      screeningStore.setConditions(conditions);
      expect(screeningStore.conditions).toEqual(conditions);
    });

    it('should add a condition', () => {
      screeningStore.addCondition({ metric: 'pe', operator: '<', value: 10, period: 'annual' });
      screeningStore.addCondition({ metric: 'pb', operator: '<', value: 5, period: 'quarterly' });
      expect(screeningStore.conditions).toHaveLength(2);
    });

    it('should remove a condition by index', () => {
      screeningStore.setConditions([
        { metric: 'pe', operator: '<', value: 10, period: 'annual' },
        { metric: 'pb', operator: '<', value: 5, period: 'quarterly' }
      ]);
      screeningStore.removeCondition(0);
      expect(screeningStore.conditions).toHaveLength(1);
      expect(screeningStore.conditions[0].metric).toBe('pb');
    });

    it('should update a condition by index', () => {
      screeningStore.setConditions([
        { metric: 'pe', operator: '<', value: 10, period: 'annual' }
      ]);
      screeningStore.updateCondition(0, { metric: 'pe', operator: '>', value: 20, period: 'annual' });
      expect(screeningStore.conditions[0].operator).toBe('>');
      expect(screeningStore.conditions[0].value).toBe(20);
    });

    it('should clear all conditions', () => {
      screeningStore.setConditions([
        { metric: 'pe', operator: '<', value: 10, period: 'annual' }
      ]);
      screeningStore.clearConditions();
      expect(screeningStore.conditions).toEqual([]);
    });
  });

  describe('results', () => {
    it('should set results and total', () => {
      const results = [
        { code: '000001', name: '平安银行', status: 'ACTIVE' as const, risk_flag: 'NORMAL' as const }
      ];
      screeningStore.setResults(results, 100);
      expect(screeningStore.results).toEqual(results);
      expect(screeningStore.total).toBe(100);
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      screeningStore.setLoading(true);
      expect(screeningStore.loading).toBe(true);
      screeningStore.setLoading(false);
      expect(screeningStore.loading).toBe(false);
    });
  });

  describe('error state', () => {
    it('should set error state', () => {
      screeningStore.setError('Some error occurred');
      expect(screeningStore.error).toBe('Some error occurred');
      screeningStore.setError(null);
      expect(screeningStore.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      screeningStore.setConditions([{ metric: 'pe', operator: '<', value: 10, period: 'annual' }]);
      screeningStore.setResults([{ code: '000001', name: 'Test', status: 'ACTIVE', risk_flag: 'NORMAL' }], 1);
      screeningStore.setLoading(true);
      screeningStore.setError('error');
      
      screeningStore.reset();
      
      expect(screeningStore.conditions).toEqual([]);
      expect(screeningStore.results).toEqual([]);
      expect(screeningStore.total).toBe(0);
      expect(screeningStore.loading).toBe(false);
      expect(screeningStore.error).toBeNull();
    });
  });
});

describe('companyStore', () => {
  beforeEach(() => {
    companyStore.clearCompany();
  });

  describe('company', () => {
    it('should start with null company', () => {
      expect(companyStore.company).toBeNull();
    });

    it('should set company', () => {
      const company = {
        code: '000001',
        name: '平安银行',
        industry: '银行',
        status: 'ACTIVE' as const,
        risk_flag: 'NORMAL' as const,
        metrics: { pe: 10.5, pb: 1.2 }
      };
      companyStore.setCompany(company);
      expect(companyStore.company).toEqual(company);
    });
  });

  describe('metrics', () => {
    it('should start with empty metrics', () => {
      expect(companyStore.metrics).toEqual([]);
    });

    it('should set metrics', () => {
      const metrics = [
        { id: 'pe', name: '市盈率', category: '估值' },
        { id: 'pb', name: '市净率', category: '估值' }
      ];
      companyStore.setMetrics(metrics);
      expect(companyStore.metrics).toEqual(metrics);
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      companyStore.setLoading(true);
      expect(companyStore.loading).toBe(true);
      companyStore.setLoading(false);
      expect(companyStore.loading).toBe(false);
    });
  });

  describe('error state', () => {
    it('should set error state', () => {
      companyStore.setError('Company not found');
      expect(companyStore.error).toBe('Company not found');
      companyStore.setError(null);
      expect(companyStore.error).toBeNull();
    });
  });

  describe('clearCompany', () => {
    it('should clear company and reset state', () => {
      companyStore.setCompany({ code: '000001', name: 'Test', status: 'ACTIVE', risk_flag: 'NORMAL', metrics: {} });
      companyStore.setMetrics([{ id: 'pe', name: 'PE', category: ' Valuation' }]);
      companyStore.setLoading(true);
      companyStore.setError('error');
      
      companyStore.clearCompany();
      
      expect(companyStore.company).toBeNull();
      expect(companyStore.metrics).toEqual([]);
      expect(companyStore.loading).toBe(false);
      expect(companyStore.error).toBeNull();
    });
  });
});

describe('savedConditionsStore', () => {
  beforeEach(() => {
    savedConditionsStore.clearAll();
  });

  describe('savedScreens', () => {
    it('should start with empty savedScreens', () => {
      expect(savedConditionsStore.savedScreens).toEqual([]);
    });

    it('should set savedScreens', () => {
      const savedScreens = [
        {
          id: '1',
          name: '低估值筛选',
          conditions: [{ metric: 'pe', operator: '<', value: 10, period: 'annual' as const }],
          created_at: '2024-01-01'
        }
      ];
      savedConditionsStore.setSavedScreens(savedScreens);
      expect(savedConditionsStore.savedScreens).toEqual(savedScreens);
    });

    it('should add a saved screen', () => {
      savedConditionsStore.addSavedScreen({
        id: '1',
        name: 'Screen 1',
        conditions: [],
        created_at: '2024-01-01'
      });
      savedConditionsStore.addSavedScreen({
        id: '2',
        name: 'Screen 2',
        conditions: [],
        created_at: '2024-01-02'
      });
      expect(savedConditionsStore.savedScreens).toHaveLength(2);
    });

    it('should remove a saved screen by id', () => {
      savedConditionsStore.setSavedScreens([
        { id: '1', name: 'Screen 1', conditions: [], created_at: '2024-01-01' },
        { id: '2', name: 'Screen 2', conditions: [], created_at: '2024-01-02' }
      ]);
      savedConditionsStore.removeSavedScreen('1');
      expect(savedConditionsStore.savedScreens).toHaveLength(1);
      expect(savedConditionsStore.savedScreens[0].id).toBe('2');
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      savedConditionsStore.setLoading(true);
      expect(savedConditionsStore.loading).toBe(true);
      savedConditionsStore.setLoading(false);
      expect(savedConditionsStore.loading).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all saved screens and reset state', () => {
      savedConditionsStore.setSavedScreens([
        { id: '1', name: 'Screen 1', conditions: [], created_at: '2024-01-01' }
      ]);
      savedConditionsStore.setLoading(true);
      
      savedConditionsStore.clearAll();
      
      expect(savedConditionsStore.savedScreens).toEqual([]);
      expect(savedConditionsStore.loading).toBe(false);
    });
  });
});
