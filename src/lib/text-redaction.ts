export const RULES = {
  email: { label: 'Email addresses', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  phone: { label: 'Phone numbers (common NANP formats)', regex: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, replacement: '[REDACTED_PHONE]' },
  ipv4: { label: 'IPv4 addresses', regex: /(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)/g, replacement: '[REDACTED_IP]' },
  uuid: { label: 'UUIDs', regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, replacement: '[REDACTED_UUID]' },
  mac: { label: 'MAC addresses', regex: /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi, replacement: '[REDACTED_MAC]' },
} as const;
export type RuleKey = keyof typeof RULES;
export const DEFAULT_ACTIVE: Record<RuleKey, boolean> = { email: true, phone: true, ipv4: true, uuid: true, mac: true };

function luhn(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function applyStandard(input: string, active: Record<RuleKey, boolean>, cards: boolean) {
  let output = input;
  const order: RuleKey[] = ['email', 'uuid', 'mac', 'ipv4'];
  order.forEach(key => { if (active[key]) output = output.replace(RULES[key].regex, RULES[key].replacement); });
  if (cards) output = output.replace(/\b(?:\d[ -]*?){13,19}\b/g, match => luhn(match) ? '[REDACTED_PAYMENT_CARD]' : match);
  if (active.phone) output = output.replace(RULES.phone.regex, RULES.phone.replacement);
  return output;
}

