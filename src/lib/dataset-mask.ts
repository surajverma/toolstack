import Papa from 'papaparse';

export type Dataset = { name: string; format: 'csv' | 'json'; rows: Record<string, unknown>[]; columns: string[] };
export type ColumnRule = { mode: 'keep' | 'remove' | 'mask' | 'alias' | 'date' | 'band'; group: string };
export type DatasetResult = { name: string; text: string; rows: number; columns: number };

export function parseDataset(name: string, text: string): Dataset {
  let rows: Record<string, unknown>[];
  let columns: string[];
  const format = name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
  if (format === 'json') {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data) || data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('JSON must be an array of row objects.');
    rows = data as Record<string, unknown>[];
    columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  } else {
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: 'greedy', dynamicTyping: false });
    const parseError = parsed.errors.find(error => error.code !== 'UndetectableDelimiter');
    if (parseError) throw new Error(`CSV could not be read: ${parseError.message}`);
    const renamed = (parsed.meta as typeof parsed.meta & { renamedHeaders?: Record<string,string> }).renamedHeaders;
    if (renamed && Object.keys(renamed).length) throw new Error('CSV has duplicate column names. Rename them before masking.');
    rows = parsed.data; columns = parsed.meta.fields ?? [];
  }
  if (!rows.length || !columns.length) throw new Error('The dataset needs a header and at least one row.');
  if (rows.length > 50000 || columns.length > 200) throw new Error('Use up to 50,000 rows and 200 columns per file.');
  return { name, format, rows, columns };
}

export function maskDatasets(datasets: Dataset[], rules: Record<string, ColumnRule>, shiftDays: number): DatasetResult[] {
  if (!Number.isInteger(shiftDays) || Math.abs(shiftDays) > 36500) throw new Error('Date shift must be a whole number between -36500 and 36500 days.');
  const maps = new Map<string, Map<string, string>>();
  let totalRows = 0;
  const results = datasets.map((dataset, fileIndex) => {
    totalRows += dataset.rows.length;
    if (totalRows > 100000) throw new Error('Use up to 100,000 rows across the batch.');
    const columns = dataset.columns.filter(column => rules[column]?.mode !== 'remove');
    if (!columns.length) throw new Error(`File ${fileIndex + 1}: at least one column must remain.`);
    const rows = dataset.rows.map((row, rowIndex) => Object.fromEntries(columns.filter(column => Object.hasOwn(row, column)).map(column => {
      const value = row[column]; const rule = rules[column] ?? { mode: 'keep', group: column };
      if (rule.mode === 'keep' || value === null || value === '') return [column, value];
      if (rule.mode === 'mask') return [column, '[REDACTED]'];
      if (rule.mode === 'alias') {
        const group = rule.group.trim() || column;
        let mapping = maps.get(group); if (!mapping) { mapping = new Map(); maps.set(group, mapping); }
        const key = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (!mapping.has(key)) mapping.set(key, `VALUE_${String(mapping.size + 1).padStart(4, '0')}`);
        return [column, mapping.get(key)];
      }
      const fail = (message: string): never => { throw new Error(`File ${fileIndex + 1}, row ${rowIndex + 1}, column "${column}": ${message}`); };
      if (rule.mode === 'band') {
        if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value))) return fail('10-value bands require numeric values.');
        const low = Math.floor(Number(value) / 10) * 10;
        return [column, `${low}–${low + 9}`];
      }
      if (rule.mode === 'date') {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return fail('use ISO dates (YYYY-MM-DD) or timestamps with an explicit time zone.');
        const time = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
        const datePart = value.slice(0,10); const day = new Date(`${datePart}T00:00:00Z`);
        if (!Number.isFinite(time.getTime()) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0,10) !== datePart) return fail('invalid ISO date.');
        time.setUTCDate(time.getUTCDate() + shiftDays);
        return [column, value.length === 10 ? time.toISOString().slice(0, 10) : time.toISOString()];
      }
      return [column, value];
    })));
    return { name: `dataset-${fileIndex + 1}.${dataset.format}`, text: dataset.format === 'csv' ? Papa.unparse({ fields: columns, data: rows }, { escapeFormulae: true }) : JSON.stringify(rows, null, 2), rows: rows.length, columns: columns.length };
  });
  return results;
}
