import { describe,expect,it } from 'vitest';
import { applyPatch } from 'diff';
import { compareFiles,diffTextInfo,matchesDiffPath,rawDiffPatch,visibleDiffText } from './file-diff';
import { DEFAULT_COMPARE,checkDiffInput,decodeDiffFile,encodeDiffFile,type CompareOptions } from './file-diff-types';
import { buildDiffReport } from './diff-report';

const options = (update: Partial<CompareOptions> = {}): CompareOptions => ({ ...DEFAULT_COMPARE,...update });
describe('private file comparisons',() => {
  it('compares original secrets before masking, preserving changed and unchanged values',() => {
    const result = compareFiles('API_KEY=private-old-token\nPASSWORD=same-private-password\n','API_KEY=private-new-token\nPASSWORD=same-private-password\n',options({ mode: 'env' }));
    expect(result.meaningful).toBe(1); expect(result.entries[0].path).toBe('/API_KEY'); expect(result.entries[0].before).not.toBe(result.entries[0].after);
    for (const secret of ['private-old-token','private-new-token','same-private-password']) expect(JSON.stringify(result)).not.toContain(secret);
    const raw = compareFiles('password=old-secret\n','password=new-secret\n',options()); expect(raw.meaningful).toBe(1); expect(raw.entries[0].before).not.toEqual(raw.entries[0].after);
    const literalKey = compareFiles('password=must-remain-private\n','password=another-private-value\n',options({ redactions: ['password'] })); expect(JSON.stringify(literalKey)).not.toContain('must-remain-private'); expect(JSON.stringify(literalKey)).not.toContain('another-private-value');
    const marker = compareFiles('person@example.invalid','[PRIVATE_1]',options()); expect(marker.left).not.toBe(marker.right);
  });
  it('sanitizes full multiline secrets before extracting changes or nearby context',() => {
    const before = 'start\n-----BEGIN PRIVATE KEY-----\nVERY_PRIVATE_BASE64_ONE\nVERY_PRIVATE_BASE64_TWO\n-----END PRIVATE KEY-----\nvalue=old\n';
    const after = before.replace('value=old','value=new'); const result = compareFiles(before,after,options({ context: 5 }));
    const report = buildDiffReport(result,result.entries.map(entry => entry.id),true);
    for (const value of [result.left,result.exactLeft,report.html,report.text]) { expect(value).not.toContain('VERY_PRIVATE'); expect(value).not.toContain('BEGIN PRIVATE KEY'); }
    expect(result.entries[0].lineA).toBe(6); expect(report.text).toContain('value=old');
    const normalized = compareFiles(before,after,options({ whitespace: 'all',ignoreCase: true }));
    expect(normalized.left.toLowerCase()).not.toContain('very_private_base64'); expect(normalized.right.toLowerCase()).not.toContain('very_private_base64');
  });
  it('audits excluded differences and preserves exact source metadata',() => {
    const result = compareFiles('time=2026-01-01T09:00:00Z name=Alice\r\n','time=2026-01-02T09:00:00Z name=alice\n',options({ timestamps: true,ignoreCase: true,ignoreEol: true }));
    expect(result.meaningful).toBe(0); expect(result.ignored).toBe(1); expect(result.entries[0].ignored).toBe(true); expect(result.exactLeft).toContain('Alice'); expect(result.left).toBe(result.right);
    expect(result.infoA.crlf).toBe(1); expect(result.infoB.lf).toBe(1); expect(result.rules).toHaveLength(3);
  });
  it('does not silently ignore whitespace or final newlines by default',() => {
    expect(compareFiles('same\n','same',options()).meaningful).toBe(1);
    expect(compareFiles('a b\n','ab\n',options()).meaningful).toBe(1);
    const ignored = compareFiles('a b\n','ab\n',options({ whitespace: 'all' })); expect(ignored.meaningful).toBe(0); expect(ignored.ignored).toBe(1);
    expect(compareFiles('a\u00a0b','ab',options({ whitespace: 'all' })).meaningful).toBe(1);
  });
  it('uses exact and composite record keys, surfaces real fields and counts reordered records separately',() => {
    const before = '[{"region":"us","id":1,"value":"a"},{"region":"eu","id":1,"value":"b"}]';
    const after = '[{"id":1,"region":"eu","value":"b"},{"id":1,"region":"us","value":"updated"}]';
    const result = compareFiles(before,after,options({ mode: 'json',keys: ['region','id'],expectedPaths: ['/*/value'] }));
    expect(result.meaningful).toBe(1); expect(result.reordered).toBe(1); expect(result.expected).toBe(1); expect(result.unexpected).toBe(0);
    expect(compareFiles(before,after.replace('updated','a'),options({ mode: 'json',keys: ['region','id'] })).meaningful).toBe(0);
    expect(() => compareFiles(before,after,options({ mode: 'json',keys: ['id'] }))).toThrow(/Duplicate record/);
    expect(() => compareFiles(before,after,options({ mode: 'json',keys: ['missing'] }))).toThrow(/nonempty/);
  });
  it('compares CSV cells as exact strings and handles quoting, column order and leading zeros',() => {
    const before = 'id,note,code\r\n1,"a,b",001\r\n2,hello,002\r\n';
    const after = 'code,note,id\n002,hello,2\n001,"a,b",1\n';
    const result = compareFiles(before,after,options({ mode: 'csv',keys: ['id'] })); expect(result.meaningful).toBe(0); expect(result.reordered).toBe(1);
    expect(compareFiles(before,after.replace('001','1'),options({ mode: 'csv',keys: ['id'] })).meaningful).toBe(1);
    expect(() => compareFiles('id,id\n1,2','id,id\n1,2',options({ mode: 'csv' }))).toThrow(/unique/);
    expect(() => compareFiles('id,a\n1','id,a\n1,2',options({ mode: 'csv' }))).toThrow(/field count/);
  });
  it('checks expectations only after explicit ignore rules and supports numeric tolerances',() => {
    const result = compareFiles('{"timeout":30,"auth":true,"stamp":"a","value":1.001}','{"timeout":60,"auth":false,"stamp":"b","value":1.002}',options({ mode: 'json',expectedPaths: ['/timeout'],ignorePaths: ['/stamp'],numericTolerance: 0.01 }));
    expect(result.meaningful).toBe(2); expect(result.ignored).toBe(2); expect(result.expected).toBe(1); expect(result.unexpected).toBe(1); expect(result.entries.find(entry => entry.path === '/auth')?.expected).toBe(false);
    expect(matchesDiffPath('/records/a/email','/records/*/email')).toBe(true); expect(matchesDiffPath('/records/a/b/email','/records/*/email')).toBe(false); expect(matchesDiffPath('/records/a/b/email','/records/**')).toBe(true);
    expect(result.entries.find(entry => entry.path === '/stamp')?.expected).toBeNull();
    expect(compareFiles('1','1.01',options({ mode: 'json',numericTolerance: 0.01 })).meaningful).toBe(0);
    expect(compareFiles('1000000000','1000000000.0000001',options({ mode: 'json',numericTolerance: 1e-8 })).meaningful).toBe(1);
  });
  it('rejects ambiguous structured input and keeps __proto__ as data',() => {
    expect(() => compareFiles('{"a":1,"a":2}','{}',options({ mode: 'json' }))).toThrow(/Duplicate JSON/);
    expect(() => compareFiles('{"id":9007199254740993}','{}',options({ mode: 'json' }))).toThrow(/precision/);
    expect(() => compareFiles('TOKEN=a\nTOKEN=b','TOKEN=b',options({ mode: 'env' }))).toThrow(/Duplicate/);
    expect(() => compareFiles('KEY="one"junk"two"','KEY=one',options({ mode: 'env' }))).toThrow(/quoted/);
    const result = compareFiles('{"__proto__":{"polluted":1}}','{"__proto__":{"polluted":2}}',options({ mode: 'json' })); expect(result.entries[0].path).toBe('/__proto__/polluted'); expect(Object.hasOwn({},'polluted')).toBe(false);
  });
  it('does not expose sensitive matching keys or manually marked values in reports',() => {
    const result = compareFiles('[{"token":"secret-record-id","name":"Private Customer","status":1}]','[{"token":"secret-record-id","name":"Private Customer","status":2}]',options({ mode: 'json',keys: ['token'],redactions: ['Private Customer'] }));
    const report = buildDiffReport(result,result.entries.map(entry => entry.id),true);
    expect(report.html).not.toContain('secret-record-id'); expect(report.text).not.toContain('Private Customer'); expect(JSON.stringify(result)).not.toContain('secret-record-id');
  });
  it('masks secret containers and CSV credential columns in every review representation',() => {
    const jsonA = '{"secret":{"first":"do-not-leak-one","second":["do-not-leak-two"]},"ok":1}';
    for (const mode of ['text','json'] as const) { const result = compareFiles(jsonA,jsonA.replace('"ok":1','"ok":2'),options({ mode })); expect(JSON.stringify(result)).not.toContain('do-not-leak'); }
    const csv = compareFiles('id,password\n1,unrecognized-credential-one\n','id,password\n1,unrecognized-credential-two\n',options({ mode: 'csv',keys: ['id'] }));
    expect(JSON.stringify(csv)).not.toContain('unrecognized-credential'); expect(csv.meaningful).toBe(1); expect(csv.entries[0].before).not.toBe(csv.entries[0].after);
  });
  it('exports only selected changes, escapes active HTML and never embeds hidden originals',() => {
    const result = compareFiles('first=one\nstable\nsecond=old\n','first=<img src=x onerror=alert(1)>\nstable\nsecond=NEW_PRIVATE\n',options({ redactions: ['NEW_PRIVATE'],context: 0 }));
    expect(result.entries).toHaveLength(2); const report = buildDiffReport(result,[result.entries[0].id],false);
    expect(report.html).toContain('&lt;img'); expect(report.html).not.toContain('<img'); expect(report.html).not.toContain('second='); expect(report.html).not.toContain('NEW_PRIVATE'); expect(report.html).toContain("default-src 'none'"); expect(report.html).not.toContain('<script');
    expect(() => buildDiffReport(result,[],false)).toThrow(/Select/);
  });
  it('creates exact applicable patches including CRLF and missing final newlines',() => {
    for (const [before,after] of [['one\r\ntwo\r\n','one\r\nchanged\r\n'],['same\n','same'],['','new\n']]) expect(applyPatch(before,rawDiffPatch(before,after))).toBe(after);
  });
  it('round-trips supported file encodings without silently replacing bad bytes',() => {
    const text = '\uFEFFHello 🌎\r\n';
    for (const encoding of ['utf-8','utf-16le','utf-16be'] as const) expect(decodeDiffFile(encodeDiffFile(text,encoding))).toBe(text);
    expect(() => decodeDiffFile(new Uint8Array([0xc3,0x28]))).toThrow(/losslessly/); expect(() => checkDiffInput('a\0b')).toThrow(/binary/); expect(() => checkDiffInput('x'.repeat(1048577))).toThrow(/1 MB/);
  });
  it('explains hidden Unicode and line-ending differences without normalizing them away',() => {
    const info = diffTextInfo('\uFEFFa\u200bb\u00a0\tа\r\n');
    expect(info.bom).toBe(true); expect(info.crlf).toBe(1); expect(info.unusual.some(item => item.name === 'Cyrillic a')).toBe(true); expect(visibleDiffText('\u202E<script>')).toBe('⟦U+202E⟧<script>');
  });
});
