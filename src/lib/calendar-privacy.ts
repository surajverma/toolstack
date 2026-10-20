import ICAL from 'ical.js';

export type BusyBlock = { start: string; end: string; allDay: boolean };
export type CalendarResult = { ics: string; summary: string; blocks: BusyBlock[]; skipped: number };
export type CalendarOptions = { from: string; through: string; floating: 'utc' | 'local' };
const compact = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export function createPrivateCalendar(text: string, options: CalendarOptions): CalendarResult {
  const dateStart = new Date(`${options.from}T00:00:00Z`); const dateEnd = new Date(`${options.through}T00:00:00Z`);
  if (![dateStart, dateEnd].every(date => Number.isFinite(date.getTime())) || dateStart.toISOString().slice(0,10) !== options.from || dateEnd.toISOString().slice(0,10) !== options.through) throw new Error('Choose valid start and end dates.');
  dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
  if (dateEnd <= dateStart || dateEnd.getTime() - dateStart.getTime() > 366 * 86400000) throw new Error('Choose a date range of up to 366 days, with the end on or after the start.');
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== 'vcalendar') throw new Error('This is not an iCalendar VCALENDAR file.');
  const components = root.getAllSubcomponents('vevent');
  if (!components.length) throw new Error('No calendar events were found. Tasks and journals are not exported.');
  if (components.length > 5000) throw new Error('Use a calendar with up to 5,000 event records.');
  const events = components.map(component => {
    for (const property of component.getAllProperties()) {
      const zone = property.getParameter('tzid');
      if (zone && zone !== 'UTC' && !root.getTimeZoneByID(String(zone))) throw new Error(`An event uses a time zone without an embedded VTIMEZONE definition. Re-export the calendar with time zone definitions included.`);
      if (property.name === 'rdate' && property.type === 'period') throw new Error('RDATE periods are not supported. Export this calendar as individual events first.');
    }
    if (component.getFirstProperty('recurrence-id')?.getParameter('range')) throw new Error('This calendar uses range-based recurrence exceptions, which this exporter cannot safely expand.');
    if (!component.hasProperty('dtstart') && String(component.getFirstPropertyValue('status')).toUpperCase() !== 'CANCELLED') throw new Error('An event has no start time. Repair it before exporting.');
    return new ICAL.Event(component, { exceptions: [] });
  });
  const masters = events.filter(event => !event.isRecurrenceException());
  const masterIds = new Set(masters.map(event => event.uid));
  if (masterIds.size !== masters.length || masters.some(event => !event.uid)) throw new Error('Event IDs are missing or duplicated. Re-export a single current calendar.');
  const exceptions = events.filter(event => event.isRecurrenceException());
  if (exceptions.some(event => !masterIds.has(event.uid))) throw new Error('A recurrence exception has no parent event in this file. Export the full calendar first.');
  const toDate = (time: InstanceType<typeof ICAL.Time>) => {
    if (time.isDate || (time.zone === ICAL.Timezone.localTimezone && options.floating === 'utc')) return new Date(Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second));
    return time.toJSDate();
  };
  const occurrenceKey = (uid: string, time: InstanceType<typeof ICAL.Time>) => `${uid}:${time.isDate ? 'date' : 'time'}:${toDate(time).getTime()}`;
  const overrides = new Set(exceptions.map(event => occurrenceKey(event.uid, event.recurrenceId)));
  if (overrides.size !== exceptions.length) throw new Error('Duplicate recurrence exceptions were found. Re-export a single current calendar.');
  const blocks: BusyBlock[] = []; let skipped = root.getAllSubcomponents().filter(component => component.name !== 'vevent' && component.name !== 'vtimezone').length; let expanded = 0;
  const add = (event: InstanceType<typeof ICAL.Event>, start: InstanceType<typeof ICAL.Time>, end: InstanceType<typeof ICAL.Time>) => {
    const status = String(event.component.getFirstPropertyValue('status') ?? '').toUpperCase();
    const transparency = String(event.component.getFirstPropertyValue('transp') ?? '').toUpperCase();
    if (status === 'CANCELLED' || transparency === 'TRANSPARENT') { skipped++; return; }
    const first = toDate(start); const last = toDate(end);
    if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || last < first) throw new Error('An event has invalid or inverted dates.');
    if (last.getTime() === first.getTime()) { skipped++; return; }
    if (first >= dateEnd || last <= dateStart) return;
    const from = new Date(Math.max(first.getTime(), dateStart.getTime())); const through = new Date(Math.min(last.getTime(), dateEnd.getTime()));
    blocks.push({ start: start.isDate ? from.toISOString().slice(0,10) : from.toISOString(), end: start.isDate ? through.toISOString().slice(0,10) : through.toISOString(), allDay: start.isDate });
    if (blocks.length > 10000) throw new Error('This range contains more than 10,000 busy blocks. Choose a smaller range.');
  };
  for (const event of masters) {
    if (String(event.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') { skipped++; continue; }
    if (!event.isRecurring()) { add(event, event.startDate, event.endDate); continue; }
    const iterator = event.iterator(); let occurrence;
    while ((occurrence = iterator.next())) {
      if (++expanded > 25000) throw new Error('Recurrence expansion exceeded 25,000 occurrences. Use a more recent calendar export or a smaller source calendar.');
      if (toDate(occurrence) >= dateEnd) break;
      if (overrides.has(occurrenceKey(event.uid, occurrence))) continue;
      const end = occurrence.clone(); end.addDuration(event.duration); add(event, occurrence, end);
    }
  }
  for (const event of exceptions) {
    if (String(event.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') { skipped++; continue; }
    add(event, event.startDate, event.endDate);
  }
  blocks.sort((a,b) => a.start.localeCompare(b.start));
  const stamp = compact(new Date());
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ToolStack//Private Busy Snapshot//EN','CALSCALE:GREGORIAN'];
  for (const block of blocks) {
    lines.push('BEGIN:VEVENT', `UID:${crypto.randomUUID()}@toolstack.invalid`, `DTSTAMP:${stamp}`, 'SUMMARY:Busy', 'TRANSP:OPAQUE');
    if (block.allDay) lines.push(`DTSTART;VALUE=DATE:${block.start.replaceAll('-','')}`, `DTEND;VALUE=DATE:${block.end.replaceAll('-','')}`);
    else lines.push(`DTSTART:${compact(new Date(block.start))}`, `DTEND:${compact(new Date(block.end))}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return { ics: lines.join('\r\n') + '\r\n', blocks, skipped, summary: `Busy time snapshot: ${options.from} through ${options.through} (UTC date range)\n${blocks.length} blocks. All times below are UTC; all-day end dates are exclusive.\n` + blocks.map(block => block.allDay ? `${block.start} → ${block.end} (all day, exclusive end)` : `${block.start} → ${block.end}`).join('\n') };
}
