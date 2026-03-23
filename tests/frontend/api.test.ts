import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screenCompanies, saveScreen, getSavedScreens } from '../../../src/frontend/src/api/screen';
import { getCompany } from '../../../src/frontend/src/api/company';
import { getMetrics } from '../../../src/frontend/src/api/metrics';

describe('screen API', () => {
  describe('screenCompanies', () => {
    it('should be a function', () => {
      expect(typeof screenCompanies).toBe('function');
    });

    it('should have correct function signature', () => {
      expect(screenCompanies.length).toBe(1);
    });
  });

  describe('saveScreen', () => {
    it('should be a function', () => {
      expect(typeof saveScreen).toBe('function');
    });

    it('should have correct function signature', () => {
      expect(saveScreen.length).toBe(1);
    });
  });

  describe('getSavedScreens', () => {
    it('should be a function', () => {
      expect(typeof getSavedScreens).toBe('function');
    });

    it('should have correct function signature', () => {
      expect(getSavedScreens.length).toBe(0);
    });
  });
});

describe('company API', () => {
  describe('getCompany', () => {
    it('should be a function', () => {
      expect(typeof getCompany).toBe('function');
    });

    it('should have correct function signature', () => {
      expect(getCompany.length).toBe(1);
    });
  });
});

describe('metrics API', () => {
  describe('getMetrics', () => {
    it('should be a function', () => {
      expect(typeof getMetrics).toBe('function');
    });

    it('should have correct function signature', () => {
      expect(getMetrics.length).toBe(0);
    });
  });
});
