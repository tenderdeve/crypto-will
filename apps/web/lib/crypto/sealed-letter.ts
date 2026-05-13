/**
 * Client-side AES-256-GCM encryption for sealed letters.
 *
 * - Key derivation: PBKDF2 (100 000 iterations, SHA-256) from a user password
 * - Encryption: AES-256-GCM with random 12-byte IV and random 16-byte salt
 * - Content hash: SHA-256 of plaintext for integrity verification
 *
 * The server never sees plaintext or password — all crypto happens here.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes — recommended for AES-GCM
const SALT_LENGTH = 16; // bytes

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(
  password: string,
  salt: ArrayBuffer
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

async function hashPlaintext(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(plaintext));
  return toBase64(digest);
}

export interface EncryptedLetter {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  hash: string; // base64 SHA-256 of plaintext
}

/**
 * Encrypt a plaintext letter with a user-supplied password.
 * Returns base64-encoded ciphertext, IV, salt, and content hash.
 */
export async function encryptLetter(
  plaintext: string,
  password: string
): Promise<EncryptedLetter> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt.buffer);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  const hash = await hashPlaintext(plaintext);

  return {
    ciphertext: toBase64(encrypted),
    iv: toBase64(iv.buffer),
    salt: toBase64(salt.buffer),
    hash,
  };
}

/**
 * Decrypt a sealed letter using the original password.
 * Verifies the content hash after decryption as a defense-in-depth measure.
 * Throws if the password is wrong, ciphertext is corrupted, or hash mismatches.
 */
export async function decryptLetter(
  ciphertext: string,
  iv: string,
  salt: string,
  password: string,
  expectedHash?: string
): Promise<string> {
  const key = await deriveKey(password, fromBase64(salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext)
  );

  const plaintext = new TextDecoder().decode(decrypted);

  // Verify content hash if provided (defense-in-depth on top of GCM auth)
  if (expectedHash) {
    const actualHash = await hashPlaintext(plaintext);
    if (actualHash !== expectedHash) {
      throw new Error("Content hash mismatch — data may have been tampered with.");
    }
  }

  return plaintext;
}
