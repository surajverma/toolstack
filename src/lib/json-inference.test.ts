import { describe,expect,it } from 'vitest';
import ts from 'typescript';
import { inferJson } from './json-inference';
describe('JSON sample inference',() => {
  it('merges array members, optional fields and mixed types without emitting values',() => {
    const result = inferJson('[{"id":1,"private":"secret-value","items":[true]},{"id":2,"items":[null,7]}]','Example');
    expect(result.typescript).toContain('"private"?: string'); expect(result.typescript).toContain('Array<boolean | null | number>'); expect(result.typescript).not.toContain('secret-value');
    const schema = JSON.parse(result.schema); expect(schema.items.required).toEqual(['id','items']); expect(schema.items.properties.id.type).toBe('integer');
  });
  it.each(['{}','[]','null','[1,"a",null]','{"bad-key":{"nested":[{}, {"v":true}]}}'])('produces syntactically valid TypeScript for %s',input => {
    const result = inferJson(input,'Fixture');
    const output = ts.transpileModule(result.typescript,{ compilerOptions: { strict: true },reportDiagnostics: true });
    expect(output.diagnostics).toEqual([]);
    expect(JSON.parse(result.schema).$schema).toContain('2020-12');
  });
  it('rejects invalid or conflicting names and excessive depth',() => {
    for (const name of ['bad-name','class','Array','Record']) expect(() => inferJson('{}',name)).toThrow(/name|Name/);
    expect(() => inferJson('['.repeat(40) + '0' + ']'.repeat(40))).toThrow(/nesting/);
    expect(() => inferJson('{')).toThrow();
  });
});
