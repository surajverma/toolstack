export const COLUMN_TYPES = ['id', 'name', 'email', 'integer', 'decimal', 'boolean', 'date', 'choice', 'reference', 'uuid'] as const;
export type ColumnType = typeof COLUMN_TYPES[number];
export type SyntheticColumn = { name: string; type: ColumnType; min?: string; max?: string; choices?: string; reference?: string };
export type SyntheticTable = { name: string; rows: number; columns: SyntheticColumn[] };
export type SyntheticResult = { name: string; rows: Record<string, string | number | boolean>[] }[];
export const SAMPLE_TABLES: SyntheticTable[] = [
  { name: 'customers', rows: 50, columns: [{ name: 'id', type: 'id' }, { name: 'name', type: 'name' }, { name: 'email', type: 'email' }, { name: 'joined', type: 'date', min: '2025-01-01', max: '2025-12-31' }] },
  { name: 'orders', rows: 200, columns: [{ name: 'id', type: 'id' }, { name: 'customer_id', type: 'reference', reference: 'customers' }, { name: 'total', type: 'decimal', min: '10', max: '500' }, { name: 'status', type: 'choice', choices: 'pending,paid,shipped' }] },
];

function dateValue(value: string) {
  const time = Date.parse(value + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== value) throw new Error('Dates must be valid YYYY-MM-DD values.');
  return Math.floor(time / 86400000);
}

/** Reproducible fixture generation; the seed is deliberately not a security key. */
export function generateSynthetic(tables: SyntheticTable[], seed: string): SyntheticResult {
  if (!seed.trim() || seed.length > 200) throw new Error('Use a seed of 1–200 characters.');
  if (!tables.length || tables.length > 8) throw new Error('Use 1–8 tables.');
  const names = new Set<string>(); let totalRows = 0; let cells = 0;
  const identifier = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
  for (const table of tables) {
    if (!identifier.test(table.name) || names.has(table.name)) throw new Error('Table names must be unique: use a letter followed by letters, digits or underscores (up to 40 characters).');
    names.add(table.name);
    if (!Number.isInteger(table.rows) || table.rows < 1 || table.rows > 10000) throw new Error(`${table.name}: choose 1–10,000 rows.`);
    totalRows += table.rows; cells += table.rows * table.columns.length;
    if (!table.columns.length || table.columns.length > 30) throw new Error(`${table.name}: use 1–30 columns.`);
    const columns = new Set<string>();
    for (const column of table.columns) {
      if (!identifier.test(column.name) || columns.has(column.name)) throw new Error(`${table.name}: column names must be unique letters, digits or underscores, starting with a letter (up to 40 characters).`);
      columns.add(column.name);
      if (!COLUMN_TYPES.includes(column.type)) throw new Error('Unknown column type.');
    }
    if (table.columns.filter(column => column.type === 'id').length > 1) throw new Error(`${table.name}: use at most one ID column.`);
  }
  if (totalRows > 20000 || cells > 300000) throw new Error('Use at most 20,000 total rows and 300,000 cells.');
  const ordered: SyntheticTable[] = []; const visiting = new Set<string>(); const done = new Set<string>();
  const visit = (table: SyntheticTable) => {
    if (visiting.has(table.name)) throw new Error('Reference cycles are unsupported. Use a parent table without a back-reference.');
    if (done.has(table.name)) return;
    visiting.add(table.name);
    for (const col of table.columns.filter(column => column.type === 'reference')) {
      const target = tables.find(item => item.name === col.reference);
      if (!target || !target.columns.some(column => column.type === 'id')) throw new Error(`${table.name}.${col.name}: choose a target table with an ID column.`);
      visit(target);
    }
    visiting.delete(table.name); done.add(table.name); ordered.push(table);
  };
  tables.forEach(visit);
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i),16777619) >>> 0;
  const random = () => { state = (state + 0x6d2b79f5) >>> 0; let n = state; n = Math.imul(n ^ n >>> 15,n | 1); n ^= n + Math.imul(n ^ n >>> 7,n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
  const result = new Map<string, SyntheticResult[number]>();
  for (const table of ordered) {
    const generators = table.columns.map(column => {
      if (column.type === 'integer' || column.type === 'decimal') {
        const min = Number(column.min || '0'); const max = Number(column.max || '100');
        if (![min,max].every(Number.isFinite) || min > max || Math.abs(min) > 1e9 || Math.abs(max) > 1e9 || (column.type === 'integer' && (!Number.isInteger(min) || !Number.isInteger(max)))) throw new Error(`${table.name}.${column.name}: choose a valid range between -1 billion and 1 billion.`);
        if (column.type === 'decimal' && Math.ceil(min * 100) > Math.floor(max * 100)) throw new Error(`${table.name}.${column.name}: range must contain a value with at most two decimal places.`);
        return () => column.type === 'integer' ? between(min,max) : between(Math.ceil(min * 100),Math.floor(max * 100)) / 100;
      }
      if (column.type === 'date') {
        const min = dateValue(column.min || '2025-01-01'); const max = dateValue(column.max || '2025-12-31');
        if (min > max) throw new Error(`${table.name}.${column.name}: the start date must precede the end date.`);
        return () => new Date(between(min,max) * 86400000).toISOString().slice(0,10);
      }
      if (column.type === 'choice') {
        const choices = (column.choices ?? '').split(',').map(value => value.trim()).filter(Boolean);
        if (!choices.length || choices.length > 100 || choices.some(value => value.length > 200)) throw new Error(`${table.name}.${column.name}: enter 1–100 comma-separated choices, up to 200 characters each.`);
        return () => choices[between(0,choices.length - 1)];
      }
      if (column.type === 'reference') {
        const target = result.get(column.reference!)!; const id = tables.find(item => item.name === target.name)!.columns.find(col => col.type === 'id')!.name;
        return () => target.rows[between(0,target.rows.length - 1)][id];
      }
      return (index: number): string | number | boolean => {
        if (column.type === 'id') return index + 1;
        if (column.type === 'name') return `Test User ${String(index + 1).padStart(4,'0')}`;
        if (column.type === 'email') return `${table.name}.user${index + 1}@example.invalid`;
        if (column.type === 'boolean') return random() >= 0.5;
        const hex = Array.from({ length: 32 },() => between(0,15).toString(16)); hex[12] = '4'; hex[16] = between(8,11).toString(16);
        return `${hex.slice(0,8).join('')}-${hex.slice(8,12).join('')}-${hex.slice(12,16).join('')}-${hex.slice(16,20).join('')}-${hex.slice(20).join('')}`;
      };
    });
    result.set(table.name,{ name: table.name, rows: Array.from({ length: table.rows },(_, index) => Object.fromEntries(table.columns.map((column,i) => [column.name,generators[i](index)]))) });
  }
  return tables.map(table => result.get(table.name)!);
}
