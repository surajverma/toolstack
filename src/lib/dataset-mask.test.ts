import { describe, expect, it } from 'vitest';
import { maskDatasets, parseDataset } from './dataset-mask';

describe('dataset pseudonymization', () => {
  it('preserves repeated identifiers across different files and column names with the same group', () => {
    const source = [parseDataset('customers.json', '[{"id":42,"email":"private@example.com"}]'), parseDataset('orders.json', '[{"customer_id":42,"total":5},{"customer_id":42,"total":6}]')];
    const result = maskDatasets(source, { id: { mode: 'alias', group: 'customer' }, customer_id: { mode: 'alias', group: 'customer' }, email: { mode: 'remove', group: '' } }, 0);
    const customer = JSON.parse(result[0].text); const orders = JSON.parse(result[1].text);
    expect(customer[0].id).toBe(orders[0].customer_id); expect(orders[1].customer_id).toBe(customer[0].id);
    expect(customer[0].email).toBeUndefined(); expect(orders[0].total).toBe(5); expect(result[1].rows).toBe(2);
  });
  it('retains blank/null values and shifts dates consistently through a leap day', () => {
    const source = parseDataset('dates.json', '[{"date":"2024-02-28","id":null},{"date":"2024-03-01","id":""}]');
    const rows = JSON.parse(maskDatasets([source], { date: { mode: 'date', group: '' }, id: { mode: 'alias', group: 'id' } }, 1)[0].text);
    expect(rows[0]).toEqual({ date: '2024-02-29', id: null }); expect(rows[1]).toEqual({ date: '2024-03-02', id: '' });
  });
  it('rejects invalid dates and dates without explicit time zones', () => {
    const rules = { date: { mode: 'date' as const, group: '' } };
    for (const value of ['2025-02-30', 'not a date', '2026-01-01T10:00:00']) expect(() => maskDatasets([parseDataset('a.json', JSON.stringify([{ date: value }]))], rules, 1)).toThrow();
  });
  it('rejects duplicate CSV headers and invalid JSON row structures', () => {
    expect(() => parseDataset('a.csv', 'id,id\n1,2')).toThrow(/duplicate/);
    expect(() => parseDataset('a.json', '[1,2]')).toThrow(/row objects/);
  });
  it('escapes spreadsheet formulas on CSV export', () => {
    expect(maskDatasets([parseDataset('a.csv', 'value\n=1+2')], {}, 0)[0].text).toContain("'=1+2");
  });
});
