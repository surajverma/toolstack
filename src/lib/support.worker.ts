import { sanitizeSupportFiles, type SupportInput, type SupportOptions } from './support-sanitizer';
self.onmessage = (event: MessageEvent<{ inputs: SupportInput[]; options: SupportOptions }>) => {
  try { self.postMessage({ result: sanitizeSupportFiles(event.data.inputs, event.data.options) }); }
  catch (err) { self.postMessage({ error: err instanceof Error ? err.message : 'Sanitization failed.' }); }
};
