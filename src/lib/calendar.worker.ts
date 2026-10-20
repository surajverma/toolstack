import { createPrivateCalendar, type CalendarOptions } from './calendar-privacy';
self.onmessage = (event: MessageEvent<{ text: string; options: CalendarOptions }>) => {
  try { self.postMessage({ result: createPrivateCalendar(event.data.text, event.data.options) }); }
  catch (err) { self.postMessage({ error: err instanceof Error ? err.message : 'Calendar processing failed.' }); }
};
