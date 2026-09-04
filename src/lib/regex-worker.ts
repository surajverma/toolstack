export interface RegexMatch {
  match: string;
  index: number;
  groups: Array<string | undefined>;
}

export interface RegexMatchResult {
  matches: RegexMatch[];
  executionTime: number;
}

const MAX_INPUT_LENGTH = 500_000;
const MAX_PATTERN_LENGTH = 4_000;
const DEFAULT_TIMEOUT_MS = 500;

const workerSource = `
self.onmessage = (event) => {
  const { mode, pattern, flags, text, replacement } = event.data;
  const started = performance.now();
  try {
    const regex = new RegExp(pattern, flags);
    if (mode === 'replace') {
      self.postMessage({ ok: true, output: text.replace(regex, replacement), executionTime: performance.now() - started });
      return;
    }
    const raw = regex.global ? Array.from(text.matchAll(regex)) : (() => { const match = regex.exec(text); return match ? [match] : []; })();
    const matches = raw.map((match) => ({
      match: match[0],
      index: match.index ?? -1,
      groups: Array.from(match).slice(1),
    }));
    self.postMessage({ ok: true, matches, executionTime: performance.now() - started });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
`;

function execute<T>(payload: Record<string, unknown>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const pattern = String(payload.pattern ?? '');
  const text = String(payload.text ?? '');
  if (pattern.length > MAX_PATTERN_LENGTH) return Promise.reject(new Error(`Pattern is limited to ${MAX_PATTERN_LENGTH.toLocaleString()} characters.`));
  if (text.length > MAX_INPUT_LENGTH) return Promise.reject(new Error(`Input is limited to ${MAX_INPUT_LENGTH.toLocaleString()} characters for regex execution.`));
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Web Workers are not supported by this browser.'));

  return new Promise<T>((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    const timer = window.setTimeout(() => {
      worker.terminate();
      reject(new Error(`Regex execution exceeded ${timeoutMs} ms and was stopped.`));
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
      window.clearTimeout(timer);
      worker.terminate();
      if (event.data.ok) resolve(event.data as T);
      else reject(new Error(String(event.data.error ?? 'Regex execution failed.')));
    };
    worker.onerror = () => {
      window.clearTimeout(timer);
      worker.terminate();
      reject(new Error('Regex worker failed.'));
    };
    worker.postMessage(payload);
  });
}

export function runRegexMatch(pattern: string, flags: string, text: string, timeoutMs?: number) {
  return execute<RegexMatchResult & { ok: true }>({ mode: 'match', pattern, flags, text }, timeoutMs);
}

export async function runRegexReplace(pattern: string, flags: string, text: string, replacement: string, timeoutMs?: number) {
  const result = await execute<{ ok: true; output: string; executionTime: number }>({ mode: 'replace', pattern, flags, text, replacement }, timeoutMs);
  return result.output;
}
