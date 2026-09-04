const FIELDS = [
  { name: 'minute', min: 0, max: 59 }, { name: 'hour', min: 0, max: 23 }, { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 }, { name: 'day of week', min: 0, max: 7 },
] as const;
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function labelValue(field: number, value: number) {
  if (field === 3) return MONTHS[value] ?? String(value);
  if (field === 4) return DAYS[value] ?? String(value);
  return String(value);
}

function validateNumber(value: number, field: number) {
  const rule = FIELDS[field];
  if (!Number.isInteger(value) || value < rule.min || value > rule.max) throw new Error(`${rule.name} must be between ${rule.min} and ${rule.max}.`);
}

function describePart(part: string, field: number): string {
  if (part === '*') return `every ${FIELDS[field].name}`;
  const step = part.match(/^\*\/(\d+)$/);
  if (step) { const value = Number(step[1]); if (value < 1) throw new Error('Step values must be positive.'); return `every ${value} ${FIELDS[field].name}${value === 1 ? '' : 's'}`; }
  const range = part.match(/^(\d+)-(\d+)$/);
  if (range) { const start = Number(range[1]); const end = Number(range[2]); validateNumber(start, field); validateNumber(end, field); return `${labelValue(field, start)} through ${labelValue(field, end)}`; }
  if (/^\d+$/.test(part)) { const value = Number(part); validateNumber(value, field); return labelValue(field, value); }
  throw new Error(`Unsupported ${FIELDS[field].name} token: ${part}`);
}

export function explainCron(expression: string) {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Enter a standard five-field cron expression: minute hour day-of-month month day-of-week.');
  return fields.map((field, index) => {
    const parts = field.split(',').map(part => describePart(part, index));
    return { field: FIELDS[index].name, raw: field, explanation: parts.join(', ') };
  });
}
