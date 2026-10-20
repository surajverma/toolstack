import JSZip from 'jszip';

export type OfficeKind = 'docx' | 'xlsx' | 'pptx';
export type OfficeFinding = { category: string; part: string; detail: string; preview?: string };
export type OfficeReport = { kind: OfficeKind; findings: OfficeFinding[]; checkedXml: number; metadataParts: number };
const MAX_EXPANDED = 60 * 1024 * 1024;

/** Check the ZIP directory before expanding user-controlled compressed data. ZIP64 is deliberately unsupported. */
export function checkOfficeArchive(bytes: Uint8Array) {
  if (bytes.byteLength < 22) throw new Error('The file is not a supported ZIP-based Office document.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.byteLength - 22; offset >= Math.max(0, bytes.byteLength - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.byteLength) { end = offset; break; }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('Multi-volume or unsupported ZIP archive.');
  const count = view.getUint16(end + 10, true); const start = view.getUint32(end + 16, true); const directorySize = view.getUint32(end + 12, true);
  if (count === 65535 || count > 1500 || start === 0xffffffff || start + directorySize > end) throw new Error('Use a non-ZIP64 document with up to 1,500 archive entries.');
  let offset = start; let total = 0; const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('The ZIP directory is damaged.');
    const flags = view.getUint16(offset + 8, true); const expanded = view.getUint32(offset + 24, true); const nameLength = view.getUint16(offset + 28, true); const extra = view.getUint16(offset + 30, true); const comment = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLength + extra + comment > end) throw new Error('The ZIP directory is truncated.');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (flags & 1) throw new Error('Encrypted archive entries cannot be inspected.');
    if (name.startsWith('/') || name.includes('\\') || name.split('/').includes('..') || name.includes('\0') || names.has(name)) throw new Error('The archive contains ambiguous or unsafe entry paths.');
    names.add(name); total += expanded;
    if (expanded > 20 * 1024 * 1024 || total > MAX_EXPANDED || (/\.xml$|\.rels$/i.test(name) && expanded > 5 * 1024 * 1024)) throw new Error('The document exceeds the expansion limits: 60 MB total, 20 MB per entry, 5 MB per XML part.');
    offset += 46 + nameLength + extra + comment;
  }
  if (offset !== start + directorySize) throw new Error('The ZIP directory has an unsupported structure.');
}

function parseXml(text: string): XMLDocument {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('DTD and entity declarations are not supported.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length || doc.getElementsByTagNameNS('*','parsererror').length) throw new Error('An XML part could not be parsed.');
  return doc;
}
const elements = (doc: Document | Element, name: string) => Array.from(doc.getElementsByTagNameNS('*', name));
const attribute = (node: Element, name: string) => node.getAttribute(name) ?? Array.from(node.attributes).find(item => item.localName === name)?.value ?? '';
const snippet = (nodes: Element[]) => nodes.map(node => node.textContent ?? '').join(' ').replace(/\s+/g,' ').trim().slice(0, 400);
const PROPERTIES = ['docProps/core.xml','docProps/app.xml','docProps/custom.xml'];

async function openOffice(bytes: Uint8Array, kind: OfficeKind) {
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('Use a document up to 20 MB.');
  checkOfficeArchive(bytes);
  const zip = await JSZip.loadAsync(bytes);
  const main = { docx: 'word/document.xml', xlsx: 'xl/workbook.xml', pptx: 'ppt/presentation.xml' }[kind];
  if (!zip.file('[Content_Types].xml') || !zip.file(main)) throw new Error(`This archive does not contain the expected ${kind.toUpperCase()} document structure.`);
  return zip;
}

export async function inspectOffice(bytes: Uint8Array, kind: OfficeKind): Promise<OfficeReport> {
  const zip = await openOffice(bytes, kind); const findings: OfficeFinding[] = []; let checkedXml = 0; let metadataParts = 0;
  const add = (category: string, part: string, detail: string, preview?: string) => { if (findings.length < 400) findings.push({ category, part, detail, ...(preview ? { preview } : {}) }); };
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (/vbaProject\.bin$/i.test(path)) add('Embedded code', path, 'A macro project is embedded. Its code is not analyzed or removed.');
    if (/(?:embeddings|activeX)\//i.test(path)) add('Embedded object', path, 'An embedded object is present. Its contents are not inspected.');
    if (/docProps\/thumbnail\./i.test(path)) add('Thumbnail', path, 'A document preview image is embedded. It is not removed by the metadata cleaner.');
    if (!/\.xml$|\.rels$/i.test(path)) continue;
    const doc = parseXml(await entry.async('string')); checkedXml++;
    if (PROPERTIES.includes(path)) {
      metadataParts++;
      const names = path.endsWith('/core.xml') ? ['title','subject','creator','lastModifiedBy','description','keywords','created','modified','lastPrinted','identifier','category','revision'] : path.endsWith('/app.xml') ? ['Company','Manager','Template','HyperlinkBase','TotalTime'] : [];
      for (const name of names) { const nodes = elements(doc,name); const value = snippet(nodes); if (value) add('Document properties', path, name, value); }
      if (path.endsWith('/custom.xml')) { const nodes = elements(doc,'property'); if (nodes.length) add('Custom properties', path, `${nodes.length} custom fields`, snippet(nodes)); }
    }
    if (/comments[^/]*\.xml$|\/comments\//i.test(path)) {
      const nodes = elements(doc,'comment');
      if (nodes.length || /\/ppt\/|^ppt\//.test(path)) add('Comments', path, `${nodes.length || 'Embedded'} comment records. Author names and comment contents remain after metadata cleaning.`, snippet(nodes));
    }
    const deleted = elements(doc,'del'); const inserted = elements(doc,'ins');
    if (deleted.length || inserted.length) add('Tracked changes', path, `${deleted.length} deletion and ${inserted.length} insertion markers. Original deleted text may still be recoverable.`, snippet(deleted));
    const hiddenText = elements(doc,'vanish'); if (hiddenText.length) add('Hidden text', path, `${hiddenText.length} hidden-text formatting markers. This is not a complete visibility analysis.`);
    const hiddenSheets = elements(doc,'sheet').filter(node => ['hidden','veryHidden'].includes(attribute(node,'state')));
    if (hiddenSheets.length) add('Hidden worksheets', path, `${hiddenSheets.length} hidden / very hidden sheets`, hiddenSheets.map(node => attribute(node,'name')).join(', '));
    const hiddenRows = [...elements(doc,'row'), ...elements(doc,'col')].filter(node => ['true','1'].includes(attribute(node,'hidden')));
    if (hiddenRows.length) add('Hidden rows / columns', path, `${hiddenRows.length} hidden row / column definitions. Their contents remain in the file.`);
    if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path)) { const value = snippet(elements(doc,'t')); if (value) add('Speaker notes', path, 'Speaker-note content is embedded.', value); }
    const crops = elements(doc,'srcRect').filter(node => Array.from(node.attributes).some(attr => Number(attr.value) !== 0));
    if (crops.length) add('Cropped image markers', path, `${crops.length} crop definitions. Original image pixels may still be embedded.`);
    const links = elements(doc,'Relationship').filter(node => attribute(node,'TargetMode') === 'External');
    if (links.length) add('External references', path, `${links.length} external links / relationships. They are listed without being opened.`, links.slice(0,5).map(node => attribute(node,'Target')).join('\n'));
    if (elements(doc,'absPath').length) add('Local path', path, 'An Office file path is embedded. It is not removed by the metadata cleaner.', elements(doc,'absPath').map(node => attribute(node,'url')).join('\n'));
  }
  return { kind, findings, checkedXml, metadataParts };
}

export async function cleanOfficeProperties(bytes: Uint8Array, kind: OfficeKind): Promise<{ blob: Blob; report: OfficeReport }> {
  const zip = await openOffice(bytes, kind);
  for (const path of PROPERTIES) {
    const entry = zip.file(path); if (!entry) continue;
    const doc = parseXml(await entry.async('string'));
    if (path.endsWith('/app.xml')) {
      for (const name of ['Company','Manager','Template','HyperlinkBase','TotalTime']) for (const node of elements(doc,name)) node.parentNode?.removeChild(node);
    } else { while (doc.documentElement.firstChild) doc.documentElement.removeChild(doc.documentElement.firstChild); }
    zip.file(path, new XMLSerializer().serializeToString(doc));
  }
  const output = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const report = await inspectOffice(output, kind);
  if (report.findings.some(finding => finding.category === 'Document properties' || finding.category === 'Custom properties')) throw new Error('The supported document properties could not be cleared. No download was produced.');
  return { blob: new Blob([new Uint8Array(output).buffer], { type: 'application/octet-stream' }), report };
}

export async function officeExample(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  zip.file('docProps/core.xml', '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Example internal document</dc:title><dc:creator>Alex Example</dc:creator><cp:lastModifiedBy>Sam Example</cp:lastModifiedBy></cp:coreProperties>');
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Public wording.</w:t></w:r><w:del w:id="1" w:author="Alex Example"><w:r><w:delText>Earlier private wording.</w:delText></w:r></w:del></w:p></w:body></w:document>');
  return zip.generateAsync({ type: 'uint8array' });
}
