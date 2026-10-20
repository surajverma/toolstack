import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import { checkOfficeArchive, cleanOfficeProperties, inspectOffice, officeExample } from './office-privacy';

beforeAll(() => { vi.stubGlobal('DOMParser', DOMParser); vi.stubGlobal('XMLSerializer', XMLSerializer); });
afterAll(() => vi.unstubAllGlobals());

describe('Office privacy inspection', () => {
  it('reports metadata and recoverable tracked deletions separately', async () => {
    const report = await inspectOffice(await officeExample(), 'docx');
    expect(report.findings.some(item => item.category === 'Document properties' && item.preview === 'Alex Example')).toBe(true);
    expect(report.findings.some(item => item.category === 'Tracked changes' && item.preview?.includes('Earlier private wording'))).toBe(true);
  });
  it('clears supported properties, reinspects output and preserves document content', async () => {
    const original = await officeExample(); const output = await cleanOfficeProperties(original, 'docx');
    expect(output.report.findings.some(item => item.category === 'Document properties')).toBe(false);
    expect(output.report.findings.some(item => item.category === 'Tracked changes')).toBe(true);
    const before = await JSZip.loadAsync(original); const after = await JSZip.loadAsync(await output.blob.arrayBuffer());
    expect(await after.file('word/document.xml')!.async('string')).toBe(await before.file('word/document.xml')!.async('string'));
    expect((await inspectOffice(original, 'docx')).findings.some(item => item.preview === 'Alex Example')).toBe(true);
  });
  it('reports hidden sheets and external references without following links', async () => {
    const zip = new JSZip(); zip.file('[Content_Types].xml', '<Types/>');
    zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Private" state="veryHidden"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship TargetMode="External" Target="https://example.invalid/private"/></Relationships>');
    const report = await inspectOffice(await zip.generateAsync({ type: 'uint8array' }), 'xlsx');
    expect(report.findings.map(item => item.category)).toEqual(expect.arrayContaining(['Hidden worksheets','External references']));
  });
  it('rejects encrypted entries and excessive declared expansion before reading their contents', async () => {
    for (const encrypted of [true,false]) {
      const data = await officeExample(); const view = new DataView(data.buffer, data.byteOffset, data.byteLength); const end = data.length - 22; const directory = view.getUint32(end + 16, true);
      if (encrypted) view.setUint16(directory + 8, view.getUint16(directory + 8, true) | 1, true);
      else view.setUint32(directory + 24, 100 * 1024 * 1024, true);
      expect(() => checkOfficeArchive(data)).toThrow(encrypted ? /Encrypted/ : /expansion/);
    }
  });
  it('rejects entity declarations and files with the wrong Office structure', async () => {
    const zip = await JSZip.loadAsync(await officeExample()); zip.file('docProps/core.xml', '<!DOCTYPE x [<!ENTITY secret "hidden">]><x>&secret;</x>');
    await expect(inspectOffice(await zip.generateAsync({ type: 'uint8array' }), 'docx')).rejects.toThrow(/entity/);
    await expect(inspectOffice(await officeExample(), 'xlsx')).rejects.toThrow(/expected XLSX/);
  });
});
