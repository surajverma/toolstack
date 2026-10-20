import { describe, expect, it } from 'vitest';
import { applyStandard, DEFAULT_ACTIVE } from './text-redaction';

describe('text redaction rule precedence', () => {
  it('redacts a UUID before phone detection can break its shape', () => {
    expect(applyStandard('User 550e8400-e29b-41d4-a716-446655440000', DEFAULT_ACTIVE, true)).toBe('User [REDACTED_UUID]');
    expect(applyStandard('User 12345678-1234-1234-8234-123456789012', DEFAULT_ACTIVE, true)).toBe('User [REDACTED_UUID]');
  });
  it('redacts complete contiguous payment card numbers before shorter phone matches', () => {
    expect(applyStandard('Card 4111111111111111; call +1 (555) 123-4567', DEFAULT_ACTIVE, true)).toBe('Card [REDACTED_PAYMENT_CARD]; call [REDACTED_PHONE]');
  });
});
