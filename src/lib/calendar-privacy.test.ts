import { describe, expect, it } from 'vitest';
import { createPrivateCalendar } from './calendar-privacy';

const wrap = (...events: string[]) => ['BEGIN:VCALENDAR','VERSION:2.0',...events,'END:VCALENDAR'].join('\r\n');
const event = (extra = '') => ['BEGIN:VEVENT','UID:private@example.com','DTSTART:20260105T090000Z','DTEND:20260105T100000Z','SUMMARY:Secret meeting','ATTENDEE:mailto:private@example.com','DESCRIPTION:https://private.invalid/meeting','LOCATION:Private office',extra,'END:VEVENT'].filter(Boolean).join('\r\n');
const options = { from: '2026-01-01', through: '2026-01-31', floating: 'utc' as const };
describe('private calendar snapshots', () => {
  it('expands recurrence, excludes EXDATE and strips original identifiers and content', () => {
    const result = createPrivateCalendar(wrap(event('RRULE:FREQ=WEEKLY;COUNT=4\r\nEXDATE:20260112T090000Z')), options);
    expect(result.blocks).toHaveLength(3); expect(result.ics).not.toMatch(/Secret|private@example|private.invalid|Private office|ATTENDEE|DESCRIPTION|LOCATION|RRULE/);
    expect(result.ics.match(/SUMMARY:Busy/g)).toHaveLength(3);
  });
  it('handles moved and cancelled recurrence exceptions', () => {
    const moved = 'BEGIN:VEVENT\r\nUID:private@example.com\r\nRECURRENCE-ID:20260112T090000Z\r\nDTSTART:20260113T110000Z\r\nDTEND:20260113T120000Z\r\nEND:VEVENT';
    const cancelled = 'BEGIN:VEVENT\r\nUID:private@example.com\r\nRECURRENCE-ID:20260119T090000Z\r\nSTATUS:CANCELLED\r\nEND:VEVENT';
    const result = createPrivateCalendar(wrap(event('RRULE:FREQ=WEEKLY;COUNT=3'), moved, cancelled), options);
    expect(result.blocks.map(block => block.start)).toEqual(['2026-01-05T09:00:00.000Z','2026-01-13T11:00:00.000Z']);
  });
  it('retains all-day exclusive end dates and excludes transparent events', () => {
    const allDay = 'BEGIN:VEVENT\r\nUID:day\r\nDTSTART;VALUE=DATE:20260107\r\nDTEND;VALUE=DATE:20260109\r\nEND:VEVENT';
    const result = createPrivateCalendar(wrap(allDay, event('TRANSP:TRANSPARENT')), options);
    expect(result.blocks).toEqual([{ start: '2026-01-07', end: '2026-01-09', allDay: true }]);
    expect(result.ics).toContain('DTEND;VALUE=DATE:20260109');
  });
  it('uses embedded timezone definitions instead of guessing UTC', () => {
    const zone = 'BEGIN:VTIMEZONE\r\nTZID:Asia/Kolkata\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0530\r\nTZOFFSETTO:+0530\r\nEND:STANDARD\r\nEND:VTIMEZONE';
    const timed = event().replace('DTSTART:20260105T090000Z', 'DTSTART;TZID=Asia/Kolkata:20260105T090000').replace('DTEND:20260105T100000Z','DTEND;TZID=Asia/Kolkata:20260105T100000');
    expect(createPrivateCalendar(wrap(zone, timed), options).blocks[0].start).toBe('2026-01-05T03:30:00.000Z');
    expect(() => createPrivateCalendar(wrap(timed), options)).toThrow(/VTIMEZONE/);
  });
  it('stops on unsupported range exceptions and oversized date windows', () => {
    expect(() => createPrivateCalendar(wrap(event('RECURRENCE-ID;RANGE=THISANDFUTURE:20260105T090000Z')), options)).toThrow(/range-based/);
    expect(() => createPrivateCalendar(wrap(event()), { ...options, through: '2028-01-01' })).toThrow(/366/);
  });
  it('matches UTC recurrence exceptions against events in an embedded local timezone', () => {
    const zone = 'BEGIN:VTIMEZONE\r\nTZID:Asia/Kolkata\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0530\r\nTZOFFSETTO:+0530\r\nEND:STANDARD\r\nEND:VTIMEZONE';
    const master = event('RRULE:FREQ=WEEKLY;COUNT=2').replace('DTSTART:20260105T090000Z','DTSTART;TZID=Asia/Kolkata:20260105T090000').replace('DTEND:20260105T100000Z','DTEND;TZID=Asia/Kolkata:20260105T100000');
    const exception = 'BEGIN:VEVENT\r\nUID:private@example.com\r\nRECURRENCE-ID:20260112T033000Z\r\nDTSTART:20260113T033000Z\r\nDTEND:20260113T043000Z\r\nEND:VEVENT';
    expect(createPrivateCalendar(wrap(zone, master, exception), options).blocks.map(block => block.start)).toEqual(['2026-01-05T03:30:00.000Z','2026-01-13T03:30:00.000Z']);
  });
});
