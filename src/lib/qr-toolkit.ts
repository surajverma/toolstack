export type QrInput = { kind: 'text'; text: string } | { kind: 'wifi'; ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean } | { kind: 'contact'; name: string; email: string; phone: string; organization: string };
export function qrPayload(input: QrInput): string {
  let payload: string;
  if (input.kind === 'text') payload = input.text;
  else if (input.kind === 'wifi') {
    if (!input.ssid.trim()) throw new Error('Enter a network name.');
    if (/[\r\n\0]/.test(input.ssid + input.password)) throw new Error('Wi-Fi fields cannot contain line breaks or null characters.');
    if (input.security !== 'nopass' && !input.password) throw new Error('Enter the network password or choose Open network.');
    const escape = (value: string) => value.replace(/([\\;,:"])/g,'\\$1');
    payload = `WIFI:T:${input.security};S:${escape(input.ssid)};${input.security === 'nopass' ? '' : `P:${escape(input.password)};`}H:${input.hidden};;`;
  } else {
    if (!input.name.trim()) throw new Error('Enter a contact name.');
    const escape = (value: string) => value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\0/g,'');
    payload = ['BEGIN:VCARD','VERSION:3.0',`FN:${escape(input.name)}`,`N:;${escape(input.name)};;;`,...(input.organization ? [`ORG:${escape(input.organization)}`] : []),...(input.email ? [`EMAIL:${escape(input.email)}`] : []),...(input.phone ? [`TEL:${escape(input.phone)}`] : []),'END:VCARD'].join('\r\n');
  }
  if (!payload.trim()) throw new Error('Enter some text first.');
  if (new TextEncoder().encode(payload).length > 1500) throw new Error('Keep QR contents under 1,500 UTF-8 bytes.');
  return payload;
}

export function inspectQrText(text: string): { kind: string; details: string[] } {
  if (/^WIFI:/i.test(text)) return { kind: 'Wi-Fi configuration',details: ['May contain a network password.'] };
  if (/^BEGIN:VCARD/i.test(text)) return { kind: 'Contact card',details: [] };
  try {
    const url = new URL(text);
    if (['http:','https:'].includes(url.protocol)) return { kind: 'Web URL',details: [`Host: ${url.hostname}`,`Protocol: ${url.protocol.slice(0,-1)}`, ...(url.username || url.password ? ['Contains embedded login information.'] : []),...(/xn--/i.test(url.hostname) ? ['Host contains a Punycode label.'] : [])] };
    return { kind: 'URI / app action',details: [`Scheme: ${url.protocol.slice(0,-1)}`] };
  } catch { return { kind: 'Plain text',details: [] }; }
}
