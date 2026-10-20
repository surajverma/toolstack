import { describe,expect,it } from 'vitest';
import { generateSynthetic,SAMPLE_TABLES,type SyntheticTable } from './synthetic-data';
describe('synthetic datasets',() => {
  it('is repeatable and maintains references regardless of table order',() => {
    const tables = [...SAMPLE_TABLES].reverse(); const result = generateSynthetic(tables,'demo');
    expect(result).toEqual(generateSynthetic(tables,'demo'));
    expect(result).not.toEqual(generateSynthetic(tables,'other'));
    const customers = result.find(table => table.name === 'customers')!; const ids = new Set(customers.rows.map(row => row.id));
    expect(ids.size).toBe(customers.rows.length);
    expect(result.find(table => table.name === 'orders')!.rows.every(row => ids.has(row.customer_id))).toBe(true);
    expect(customers.rows.every(row => String(row.email).endsWith('@example.invalid'))).toBe(true);
  });
  it('generates bounded integer, decimal, boolean, date, UUID and choice values',() => {
    const tables: SyntheticTable[] = [{ name: 'fixtures',rows: 100,columns: [{ name: 'n',type: 'integer',min: '-2',max: '3' },{ name: 'price',type: 'decimal',min: '1.25',max: '1.27' },{ name: 'enabled',type: 'boolean' },{ name: 'day',type: 'date',min: '2024-02-29',max: '2024-02-29' },{ name: 'token',type: 'uuid' },{ name: 'label',type: 'choice',choices: 'a,b' }] }];
    for (const row of generateSynthetic(tables,'test')[0].rows) {
      expect(Number.isInteger(row.n)).toBe(true); expect(row.n).toBeGreaterThanOrEqual(-2); expect(row.n).toBeLessThanOrEqual(3);
      expect([1.25,1.26,1.27]).toContain(row.price); expect(typeof row.enabled).toBe('boolean'); expect(row.day).toBe('2024-02-29'); expect(row.token).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/); expect(['a','b']).toContain(row.label);
    }
  });
  it('rejects broken references, cycles, duplicate columns and limits',() => {
    const broken = structuredClone(SAMPLE_TABLES); broken[1].columns[1].reference = 'missing'; expect(() => generateSynthetic(broken,'s')).toThrow(/target/);
    const cycle = structuredClone(SAMPLE_TABLES); cycle[0].columns.push({ name: 'order',type: 'reference',reference: 'orders' }); expect(() => generateSynthetic(cycle,'s')).toThrow(/cycles/);
    const duplicate = structuredClone(SAMPLE_TABLES); duplicate[0].columns.push({ name: 'id',type: 'id' }); expect(() => generateSynthetic(duplicate,'s')).toThrow(/unique/);
    const huge = structuredClone(SAMPLE_TABLES); huge[0].rows = 10001; expect(() => generateSynthetic(huge,'s')).toThrow(/rows/);
    const invalid = structuredClone(SAMPLE_TABLES); invalid[0].columns[3].min = '2025-02-29'; expect(() => generateSynthetic(invalid,'s')).toThrow(/Dates/);
  });
});
