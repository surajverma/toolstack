import { describe,expect,it } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { inspectQrText,qrPayload } from './qr-toolkit';
function roundTrip(text: string) {
  const qr = QRCode.create(text,{ errorCorrectionLevel: 'M' }); const scale = 5; const width = (qr.modules.size + 8) * scale; const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const col = Math.floor(x / scale) - 4; const row = Math.floor(y / scale) - 4;
    if (col >= 0 && row >= 0 && col < qr.modules.size && row < qr.modules.size && qr.modules.get(row,col)) { const i = (y * width + x) * 4; pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; }
  }
  return jsQR(pixels,width,width)?.data;
}
describe('local QR toolkit',() => {
  it('round-trips Unicode, URL, escaped Wi-Fi and contact payloads through the actual encoder and decoder',() => {
    const values = [qrPayload({ kind: 'text',text: 'Hello 🌎 नमस्ते' }),qrPayload({ kind: 'text',text: 'https://example.invalid/path?secret=visible' }),qrPayload({ kind: 'wifi',ssid: 'test;,:"\\network',password: 'private;value',security: 'WPA',hidden: true }),qrPayload({ kind: 'contact',name: 'Test, Person',email: 'person@example.invalid',phone: '+12025550123',organization: 'Example\nORG:Injected' })];
    values.forEach(value => expect(roundTrip(value)).toBe(value));
    expect(values[2]).toContain('S:test\\;\\,\\:\\"\\\\network;'); expect(values[3]).not.toContain('\nORG:Injected');
  });
  it('identifies links and app schemes without visiting targets',() => {
    expect(inspectQrText('https://user:secret@xn--bcher-kva.example/').details.join(' ')).toContain('embedded login');
    expect(inspectQrText('javascript:alert(1)').kind).toBe('URI / app action'); expect(inspectQrText('WIFI:T:WPA;S:a;P:b;;').kind).toBe('Wi-Fi configuration'); expect(inspectQrText('ordinary text').kind).toBe('Plain text');
  });
  it('rejects empty, excessive and malformed configuration values',() => {
    expect(() => qrPayload({ kind: 'text',text: '🌎'.repeat(400) })).toThrow(/1,500/);
    expect(() => qrPayload({ kind: 'text',text: '' })).toThrow(); expect(() => qrPayload({ kind: 'wifi',ssid: 'bad\nnetwork',password: '',security: 'nopass',hidden: false })).toThrow(/line breaks/);
    expect(qrPayload({ kind: 'wifi',ssid: 'Open',password: 'ignored-secret',security: 'nopass',hidden: false })).not.toContain('ignored-secret');
  });
});
