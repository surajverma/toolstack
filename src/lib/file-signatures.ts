export interface SignatureInfo {
  name: string;
  mime: string;
  extensions: string[];
  container?: boolean;
}

type Matcher = SignatureInfo & { match: (bytes: Uint8Array) => boolean };
const at = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);
const ascii = (bytes: Uint8Array, text: string, offset = 0) => [...text].every((char, index) => bytes[offset + index] === char.charCodeAt(0));

const MATCHERS: Matcher[] = [
  { name: 'PDF document', mime: 'application/pdf', extensions: ['pdf'], match: b => ascii(b, '%PDF-') },
  { name: 'PNG image', mime: 'image/png', extensions: ['png'], match: b => at(b, [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]) },
  { name: 'JPEG image', mime: 'image/jpeg', extensions: ['jpg','jpeg'], match: b => at(b, [0xff,0xd8,0xff]) },
  { name: 'GIF image', mime: 'image/gif', extensions: ['gif'], match: b => ascii(b, 'GIF87a') || ascii(b, 'GIF89a') },
  { name: 'WebP image', mime: 'image/webp', extensions: ['webp'], match: b => ascii(b, 'RIFF') && ascii(b, 'WEBP', 8) },
  { name: 'WAV audio', mime: 'audio/wav', extensions: ['wav'], match: b => ascii(b, 'RIFF') && ascii(b, 'WAVE', 8) },
  { name: 'AVI video', mime: 'video/x-msvideo', extensions: ['avi'], match: b => ascii(b, 'RIFF') && ascii(b, 'AVI ', 8) },
  { name: 'ZIP-based archive', mime: 'application/zip', extensions: ['zip','docx','xlsx','pptx','odt','ods','odp','jar','apk'], container: true, match: b => at(b,[0x50,0x4b,0x03,0x04]) || at(b,[0x50,0x4b,0x05,0x06]) || at(b,[0x50,0x4b,0x07,0x08]) },
  { name: 'GZIP archive', mime: 'application/gzip', extensions: ['gz','tgz'], match: b => at(b,[0x1f,0x8b]) },
  { name: '7-Zip archive', mime: 'application/x-7z-compressed', extensions: ['7z'], match: b => at(b,[0x37,0x7a,0xbc,0xaf,0x27,0x1c]) },
  { name: 'RAR archive', mime: 'application/vnd.rar', extensions: ['rar'], match: b => at(b,[0x52,0x61,0x72,0x21,0x1a,0x07]) },
  { name: 'ELF executable', mime: 'application/x-elf', extensions: ['elf','so'], match: b => at(b,[0x7f,0x45,0x4c,0x46]) },
  { name: 'Windows executable / PE container', mime: 'application/vnd.microsoft.portable-executable', extensions: ['exe','dll','sys'], match: b => at(b,[0x4d,0x5a]) },
  { name: 'SQLite database', mime: 'application/vnd.sqlite3', extensions: ['sqlite','sqlite3','db'], match: b => ascii(b, 'SQLite format 3\u0000') },
  { name: 'Ogg media', mime: 'application/ogg', extensions: ['ogg','oga','ogv','opus'], match: b => ascii(b, 'OggS') },
  { name: 'MP4 / ISO Base Media', mime: 'video/mp4', extensions: ['mp4','m4a','m4v','mov','heic','avif'], container: true, match: b => ascii(b, 'ftyp', 4) },
  { name: 'MP3 audio with ID3 tag', mime: 'audio/mpeg', extensions: ['mp3'], match: b => ascii(b, 'ID3') },
  { name: 'BMP image', mime: 'image/bmp', extensions: ['bmp'], match: b => ascii(b, 'BM') },
  { name: 'TIFF image', mime: 'image/tiff', extensions: ['tif','tiff'], match: b => at(b,[0x49,0x49,0x2a,0x00]) || at(b,[0x4d,0x4d,0x00,0x2a]) },
  { name: 'ICO image', mime: 'image/x-icon', extensions: ['ico'], match: b => at(b,[0x00,0x00,0x01,0x00]) },
];

export function detectFileSignature(bytes: Uint8Array): SignatureInfo | null {
  const found = MATCHERS.find(item => item.match(bytes));
  if (!found) return null;
  const { match: _match, ...info } = found;
  return info;
}

export function fileExtension(name: string) {
  const part = name.toLowerCase().split('.').pop();
  return part && part !== name.toLowerCase() ? part : '';
}

export function extensionMatches(info: SignatureInfo | null, name: string) {
  if (!info) return null;
  const extension = fileExtension(name);
  if (!extension) return null;
  return info.extensions.includes(extension);
}
