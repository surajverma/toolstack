import { describe, expect, it } from 'vitest';
import { decryptNote, encryptNote, MAX_NOTE_FILE } from './crypto';

const note = {
  title: 'Private heading',
  text: 'Private content 🔒\n<script>inert text</script>',
  mode: 'markdown' as const,
};
const passphrase = 'four different private words';

describe('encrypted note envelopes', () => {
  it('round-trips Unicode and keeps content out of the envelope', async () => {
    const encrypted = await encryptNote(note, passphrase);
    expect(encrypted).not.toContain('Private');
    expect(await decryptNote(encrypted, passphrase)).toEqual(note);
    expect(await encryptNote(note, passphrase)).not.toEqual(encrypted);
  });
  it('authenticates the ciphertext and rejects another passphrase', async () => {
    const encrypted = await encryptNote(note, passphrase);
    await expect(
      decryptNote(encrypted, 'another long passphrase'),
    ).rejects.toThrow('Could not unlock');
    const parsed = JSON.parse(encrypted);
    parsed.ciphertext =
      (parsed.ciphertext[0] === 'A' ? 'B' : 'A') + parsed.ciphertext.slice(1);
    await expect(
      decryptNote(JSON.stringify(parsed), passphrase),
    ).rejects.toThrow('Could not unlock');
  });
  it('bounds untrusted input and KDF parameters before attempting decryption', async () => {
    await expect(
      decryptNote('x'.repeat(MAX_NOTE_FILE + 1), passphrase),
    ).rejects.toThrow('400 KB');
    await expect(
      decryptNote(
        '{"format":"toolstack-encrypted-note","version":1,"iterations":999999999}',
        passphrase,
      ),
    ).rejects.toThrow('Unsupported');
    await expect(encryptNote(note, 'weak')).rejects.toThrow('12');
    await expect(
      encryptNote({ ...note, text: 'x'.repeat(270000) }, passphrase),
    ).rejects.toThrow('256 KB');
  });
});
