export type CompareMode = 'text' | 'json' | 'csv' | 'env';
export type CompareOptions = {
  mode: CompareMode; whitespace: 'exact' | 'trim' | 'all'; ignoreCase: boolean; ignoreEol: boolean;
  timestamps: boolean; uuids: boolean; ignoreLiterals: string[];
  ignorePaths: string[]; expectedPaths: string[]; keys: string[]; numericTolerance: number;
  redactions: string[]; context: number;
};
export const DEFAULT_COMPARE: CompareOptions = { mode: 'text',whitespace: 'exact',ignoreCase: false,ignoreEol: false,timestamps: false,uuids: false,ignoreLiterals: [],ignorePaths: [],expectedPaths: [],keys: [],numericTolerance: 0,redactions: [],context: 1 };
export type CompareEntry = {
  id: string; path: string; kind: 'added' | 'removed' | 'changed' | 'moved'; ignored: boolean; expected: boolean | null;
  before: string; after: string; contextBefore: string; contextAfter: string; lineA?: number; lineB?: number; reasons: string[];
};
export type TextInfo = { characters: number; lines: number; lf: number; crlf: number; cr: number; finalNewline: boolean; bom: boolean; unusual: { code: string; name: string; count: number; line: number; column: number }[] };
export type CompareResult = {
  entries: CompareEntry[]; meaningful: number; ignored: number; expected: number; unexpected: number; reordered: number;
  left: string; right: string; exactLeft: string; exactRight: string; infoA: TextInfo; infoB: TextInfo;
  warnings: string[]; rules: string[]; maskedValues: number; mode: CompareMode;
};
export const MAX_DIFF_BYTES = 1024 * 1024;
export function checkDiffInput(text: string) {
  if (text.length > MAX_DIFF_BYTES || new TextEncoder().encode(text).length > MAX_DIFF_BYTES) throw new Error('Use at most 1 MB of text per side.');
  const lines = (text.match(/\r\n|\r|\n/g)?.length ?? 0) + (text && !/[\r\n]$/.test(text) ? 1 : 0);
  if (lines > 20000) throw new Error('Use at most 20,000 lines per side.');
  if (text.includes('\0')) throw new Error('This looks like binary data. Compare text files, or decode a UTF-16 file with a BOM.');
}

export function decodeDiffFile(bytes: Uint8Array): string {
  if (bytes.length > MAX_DIFF_BYTES) throw new Error('Use text files up to 1 MB each.');
  const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  let text: string;
  try { text = new TextDecoder(utf16,{ fatal: true,ignoreBOM: true }).decode(bytes); } catch { throw new Error('Use UTF-8, or UTF-16 with a byte-order mark. This file could not be decoded losslessly.'); }
  checkDiffInput(text); return text;
}

export function encodeDiffFile(text: string,encoding: 'utf-8' | 'utf-16le' | 'utf-16be') {
  if (encoding === 'utf-8') return new TextEncoder().encode(text);
  const bytes = new Uint8Array(text.length * 2); const view = new DataView(bytes.buffer);
  for (let i = 0; i < text.length; i++) view.setUint16(i * 2,text.charCodeAt(i),encoding === 'utf-16le');
  return bytes;
}
