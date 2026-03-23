import { describe, it, expect } from 'vitest';
import { formatNumber, formatPercent, formatCurrency } from '../../src/frontend/src/lib/formatters';

describe('formatNumber', () => {
  it('should format number with default 2 decimals', () => {
    expect(formatNumber(123.456)).toBe('123.46');
    expect(formatNumber(100)).toBe('100.00');
    expect(formatNumber(0)).toBe('0.00');
  });

  it('should format number with specified decimals', () => {
    expect(formatNumber(123.456, 0)).toBe('123');
    expect(formatNumber(123.456, 3)).toBe('123.456');
    expect(formatNumber(123.456, 1)).toBe('123.5');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-123.456)).toBe('-123.46');
    expect(formatNumber(-100)).toBe('-100.00');
  });

  it('should return dash for null', () => {
    expect(formatNumber(null)).toBe('-');
  });

  it('should return dash for undefined', () => {
    expect(formatNumber(undefined)).toBe('-');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });
});

describe('formatPercent', () => {
  it('should format decimal as percentage with 2 decimals', () => {
    expect(formatPercent(0.1234)).toBe('12.34%');
    expect(formatPercent(0.5)).toBe('50.00%');
    expect(formatPercent(1)).toBe('100.00%');
  });

  it('should handle negative percentages', () => {
    expect(formatPercent(-0.1234)).toBe('-12.34%');
    expect(formatPercent(-0.5)).toBe('-50.00%');
  });

  it('should return dash for null', () => {
    expect(formatPercent(null)).toBe('-');
  });

  it('should return dash for undefined', () => {
    expect(formatPercent(undefined)).toBe('-');
  });

  it('should handle zero', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('should handle small decimals', () => {
    expect(formatPercent(0.001)).toBe('0.10%');
  });
});

describe('formatCurrency', () => {
  it('should format numbers less than 10,000 as-is with 2 decimals', () => {
    expect(formatCurrency(9999.99)).toBe('9999.99');
    expect(formatCurrency(100)).toBe('100.00');
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('should format numbers in 万 (10,000s)', () => {
    expect(formatCurrency(10000)).toBe('1.00万');
    expect(formatCurrency(15000)).toBe('1.50万');
    expect(formatCurrency(99999)).toBe('10.00万');
  });

  it('should format numbers in 亿 (100,000,000s)', () => {
    expect(formatCurrency(100000000)).toBe('1.00亿');
    expect(formatCurrency(150000000)).toBe('1.50亿');
    expect(formatCurrency(999999999)).toBe('10.00亿');
  });

  it('should format numbers in 万亿 (1,000,000,000,000s)', () => {
    expect(formatCurrency(1000000000000)).toBe('1.00万亿');
    expect(formatCurrency(1500000000000)).toBe('1.50万亿');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-100.00');
    expect(formatCurrency(-10000)).toBe('-1.00万');
    expect(formatCurrency(-100000000)).toBe('-1.00亿');
  });

  it('should return dash for null', () => {
    expect(formatCurrency(null)).toBe('-');
  });

  it('should return dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('-');
  });

  it('should handle boundary values', () => {
    expect(formatCurrency(9999.99)).toBe('9999.99');
    expect(formatCurrency(10000)).toBe('1.00万');
    expect(formatCurrency(99999999.99)).toBe('10000.00万');
    expect(formatCurrency(100000000)).toBe('1.00亿');
    expect(formatCurrency(999999999999.99)).toBe('10000.00亿');
    expect(formatCurrency(1000000000000)).toBe('1.00万亿');
  });
});
