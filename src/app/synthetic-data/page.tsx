'use client';
import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import LocalToolLayout from '@/components/LocalToolLayout';
import { COLUMN_TYPES, SAMPLE_TABLES, type SyntheticColumn, type SyntheticTable, type SyntheticResult } from '@/lib/synthetic-data';
import { downloadLocal } from '@/lib/local-files';

export default function SyntheticDataPage() {
  const [tables,setTables] = useState<SyntheticTable[]>(() => structuredClone(SAMPLE_TABLES)); const [seed,setSeed] = useState('toolstack-demo');
  const [result,setResult] = useState<SyntheticResult | null>(null); const [selected,setSelected] = useState(0); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  const worker = useRef<Worker | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => { worker.current?.terminate(); if (timer.current) clearTimeout(timer.current); },[]);
  const invalidate = () => { setResult(null); setError(''); };
  const updateTable = (index: number,update: Partial<SyntheticTable>) => { invalidate(); setTables(items => items.map((item,i) => { const next = i === index ? { ...item,...update } : item; return update.name === undefined ? next : { ...next,columns: next.columns.map(column => column.type === 'reference' && column.reference === items[index].name ? { ...column,reference: update.name } : column) }; })); };
  const updateColumn = (table: number,column: number,update: Partial<SyntheticColumn>) => updateTable(table,{ columns: tables[table].columns.map((item,i) => i === column ? { ...item,...update } : item) });
  const generate = () => {
    invalidate(); setBusy(true);
    try {
      const next = new Worker(new URL('../../lib/synthetic.worker.ts',import.meta.url)); worker.current = next;
      timer.current = setTimeout(() => { stop(); setBusy(false); setError('Generation took too long. Use fewer rows or columns.'); },10000);
      next.onmessage = (event: MessageEvent<{ result?: SyntheticResult; error?: string }>) => { stop(); setBusy(false); if (event.data.error) setError(event.data.error); else if (event.data.result) { setResult(event.data.result); setSelected(0); } };
      next.onerror = () => { stop(); setBusy(false); setError('Could not generate this dataset. Reload and try again.'); };
      next.postMessage({ tables,seed });
    } catch { stop(); setBusy(false); setError('This browser could not start the generator.'); }
  };
  const csv = (table: SyntheticResult[number]) => Papa.unparse(table.rows,{ escapeFormulae: true });
  const downloadZip = async () => {
    if (!result) return; setBusy(true); setError('');
    try { const zip = new JSZip(); for (const table of result) { zip.file(`${table.name}.csv`,csv(table)); zip.file(`${table.name}.json`,JSON.stringify(table.rows,null,2)); } zip.file('schema.json',JSON.stringify({ seed,tables },null,2)); downloadLocal(await zip.generateAsync({ type: 'blob' }),'synthetic-dataset.zip','application/zip'); }
    catch { setError('Could not package the files. Download individual tables instead.'); } finally { setBusy(false); }
  };
  const preview = result?.[selected];
  return <LocalToolLayout title='Synthetic Dataset Generator' description='Create repeatable fake CSV / JSON datasets with linked tables.'>
    <fieldset disabled={busy} className='mx-auto min-w-0 w-full min-w-0 space-y-5'>
      <section className='panel flex flex-wrap items-end gap-3'><label className='min-w-0 flex-1 text-sm font-semibold'>Seed<input className='field mt-2' maxLength={200} value={seed} onChange={event => { invalidate(); setSeed(event.target.value); }}/></label><button className='action action-secondary' onClick={() => { invalidate(); setTables(structuredClone(SAMPLE_TABLES)); setSeed('toolstack-demo'); }}>Reset example</button></section>
      <details className='panel'><summary className='cursor-pointer text-sm font-semibold'>Edit tables · {tables.map(table => `${table.name || 'Unnamed'} (${table.rows.toLocaleString()})`).join(', ')}</summary><div className='mt-4 space-y-5'>
      {tables.map((table,ti) => <section className='space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700' key={ti}>
        <div className='flex flex-wrap items-end gap-3'><label className='min-w-0 flex-1 text-sm font-semibold'>Table {ti + 1}<input aria-label={`Table ${ti + 1} name`} className='field mt-2' value={table.name} maxLength={40} onChange={event => updateTable(ti,{ name: event.target.value })}/></label><label className='w-28 text-sm font-semibold'>Rows<input aria-label={`${table.name} rows`} className='field mt-2' type='number' min={1} max={10000} value={table.rows} onChange={event => updateTable(ti,{ rows: Number(event.target.value) })}/></label><button className='action action-secondary' disabled={tables.length === 1} onClick={() => { invalidate(); setTables(items => items.filter((_,i) => i !== ti)); }}>Remove table</button></div>
        <div className='space-y-3'>{table.columns.map((column,ci) => <div className='rounded-lg border border-slate-200 p-3 dark:border-slate-700' key={ci}>
          <div className='grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]'><label className='min-w-0 text-xs font-semibold'>Column<input aria-label={`${table.name} column ${ci + 1} name`} className='field mt-1' maxLength={40} value={column.name} onChange={event => updateColumn(ti,ci,{ name: event.target.value })}/></label><label className='text-xs font-semibold'>Type<select aria-label={`${table.name} ${column.name} type`} className='field mt-1' value={column.type} onChange={event => updateColumn(ti,ci,{ type: event.target.value as SyntheticColumn['type'], min: undefined, max: undefined, choices: undefined, reference: undefined })}>{COLUMN_TYPES.map(type => <option key={type} value={type}>{({ id: 'ID (unique)', name: 'Test name', email: 'Test email', integer: 'Integer', decimal: 'Decimal (2 places)', boolean: 'Boolean', date: 'Date', choice: 'Choice', reference: 'Reference to ID', uuid: 'UUID (test only)' })[type]}</option>)}</select></label><button className='action action-secondary' disabled={table.columns.length === 1} aria-label={`Remove ${table.name} ${column.name}`} onClick={() => updateTable(ti,{ columns: table.columns.filter((_,i) => i !== ci) })}>Remove</button></div>
          {['integer','decimal','date'].includes(column.type) && <div className='mt-3 grid grid-cols-2 gap-3'>{(['min','max'] as const).map(bound => <label key={bound} className='text-xs font-semibold'>{bound === 'min' ? 'From' : 'Through'}<input aria-label={`${table.name} ${column.name} ${bound}`} className='field mt-1' type={column.type === 'date' ? 'date' : 'number'} step={column.type === 'decimal' ? '0.01' : '1'} value={column[bound] ?? (column.type === 'date' ? bound === 'min' ? '2025-01-01' : '2025-12-31' : bound === 'min' ? '0' : '100')} onChange={event => updateColumn(ti,ci,{ [bound]: event.target.value })}/></label>)}</div>}
          {column.type === 'choice' && <label className='mt-3 block text-xs font-semibold'>Choices (comma separated)<input aria-label={`${table.name} ${column.name} choices`} className='field mt-1' value={column.choices ?? ''} onChange={event => updateColumn(ti,ci,{ choices: event.target.value })}/></label>}
          {column.type === 'reference' && <label className='mt-3 block text-xs font-semibold'>Parent table<select aria-label={`${table.name} ${column.name} parent`} className='field mt-1' value={column.reference ?? ''} onChange={event => updateColumn(ti,ci,{ reference: event.target.value })}><option value=''>Choose a table with an ID</option>{tables.filter((item,i) => i !== ti && item.columns.some(col => col.type === 'id')).map((item,i) => <option key={i} value={item.name}>{item.name}</option>)}</select></label>}
        </div>)}</div>
        <button className='action action-secondary' disabled={table.columns.length >= 30} onClick={() => updateTable(ti,{ columns: [...table.columns,{ name: `column_${table.columns.length + 1}`,type: 'integer' }] })}>Add column</button>
      </section>)}
      <button className='action action-secondary' disabled={tables.length >= 8} onClick={() => { invalidate(); setTables(items => [...items,{ name: `table_${items.length + 1}`,rows: 100,columns: [{ name: 'id',type: 'id' }] }]); }}>Add table</button>
      <p className='text-xs text-slate-500 dark:text-slate-400'>IDs start at 1 in each table. Up to 8 tables, 20,000 rows total and 300,000 cells. Generated UUIDs are for fixtures, not security.</p>
      </div></details>
      <div className='flex flex-wrap items-center gap-3'><button className='action' onClick={generate}>{busy ? 'Working…' : 'Generate dataset'}</button><p className='text-sm text-slate-500 dark:text-slate-400'>Same seed and schema, same output. Test emails use example.invalid.</p></div>
      {error && <p role='alert' className='note'>{error}</p>}
      {result && preview && <section className='panel space-y-4'><div className='flex flex-wrap items-end gap-3'><label className='min-w-0 flex-1 text-sm font-semibold'>Preview table<select className='field mt-2' value={selected} onChange={event => setSelected(Number(event.target.value))}>{result.map((item,i) => <option key={i} value={i}>{item.name} ({item.rows.length} rows)</option>)}</select></label><button className='action' onClick={downloadZip}>Download all (.zip)</button></div><p role='status' className='text-sm'>Generated {result.reduce((sum,item) => sum + item.rows.length,0).toLocaleString()} rows across {result.length} tables. All references point to generated IDs.</p><div className='max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700'><table className='w-full text-left text-xs'><thead><tr>{Object.keys(preview.rows[0]).map(name => <th className='whitespace-nowrap border-b p-2' key={name}>{name}</th>)}</tr></thead><tbody>{preview.rows.slice(0,20).map((row,i) => <tr key={i}>{Object.entries(row).map(([key,value]) => <td key={key} className='whitespace-nowrap border-b border-slate-200 p-2 dark:border-slate-700'>{String(value)}</td>)}</tr>)}</tbody></table></div><p className='text-xs text-slate-500 dark:text-slate-400'>Showing up to 20 rows. CSV exports escape formula-like text.</p><div className='flex flex-wrap gap-3'><button className='action action-secondary' onClick={() => downloadLocal(csv(preview),`${preview.name}.csv`,'text/csv;charset=utf-8')}>Download table CSV</button><button className='action action-secondary' onClick={() => downloadLocal(JSON.stringify(preview.rows,null,2),`${preview.name}.json`,'application/json')}>Download table JSON</button></div></section>}
    </fieldset>
  </LocalToolLayout>;
}
