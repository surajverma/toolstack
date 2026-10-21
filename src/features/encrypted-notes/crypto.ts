/** Versioned encrypted envelope. No filenames, plaintext titles or preview content. */
const FORMAT = 'toolstack-encrypted-note';
const ITERATIONS = 600_000;
const MAX_PLAINTEXT = 256 * 1024;
export const MAX_NOTE_FILE = 400 * 1024;
const AAD = new TextEncoder().encode('toolstack-encrypted-note:v1');
export type NoteContent = {
  text: string;
  title: string;
  mode: 'text' | 'markdown';
};

function toBase64(bytes: Uint8Array) {
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    result += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(result);
}

function fromBase64(value: unknown, length?: number) {
  if (
    typeof value !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  )
    throw new Error('Invalid encrypted note.');
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  if (length !== undefined && bytes.length !== length)
    throw new Error('Invalid encrypted note.');
  return bytes;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>) {
  if (password.length < 12 || password.length > 1024)
    throw new Error('Use a passphrase between 12 and 1,024 characters.');
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function validateContent(value: unknown): NoteContent {
  const content = value as Partial<NoteContent> | null;
  if (
    !content ||
    typeof content.text !== 'string' ||
    typeof content.title !== 'string' ||
    content.title.length > 200 ||
    !['text', 'markdown'].includes(content.mode || '')
  )
    throw new Error('Invalid note contents.');
  if (new TextEncoder().encode(JSON.stringify(content)).length > MAX_PLAINTEXT)
    throw new Error('Keep notes below 256 KB.');
  return { text: content.text, title: content.title, mode: content.mode! };
}

export async function encryptNote(value: NoteContent, password: string) {
  const content = validateContent(value);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(content));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: AAD, tagLength: 128 },
    key,
    plaintext,
  );
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipher)),
  });
}

export async function decryptNote(
  envelope: string,
  password: string,
): Promise<NoteContent> {
  if (new TextEncoder().encode(envelope).length > MAX_NOTE_FILE)
    throw new Error('Encrypted note exceeds 400 KB.');
  let parsed;
  try {
    parsed = JSON.parse(envelope);
  } catch {
    throw new Error('Choose a ToolStack encrypted note file.');
  }
  if (
    !parsed ||
    parsed.format !== FORMAT ||
    parsed.version !== 1 ||
    parsed.kdf !== 'PBKDF2-SHA256' ||
    parsed.iterations !== ITERATIONS
  )
    throw new Error('Unsupported encrypted note format.');
  const salt = fromBase64(parsed.salt, 16);
  const iv = fromBase64(parsed.iv, 12);
  const ciphertext = fromBase64(parsed.ciphertext);
  if (ciphertext.length < 16 || ciphertext.length > MAX_PLAINTEXT + 16)
    throw new Error('Invalid encrypted note size.');
  const key = await derive(password, salt);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: AAD, tagLength: 128 },
      key,
      ciphertext,
    );
    return validateContent(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)),
    );
  } catch {
    throw new Error(
      'Could not unlock this note. Check the passphrase; the file may also have been changed.',
    );
  }
}
