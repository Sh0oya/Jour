/**
 * End-to-End Encryption utilities for Journaly
 * Uses AES-256-GCM for symmetric encryption
 *
 * RGPD Compliance: Data is encrypted client-side before being sent to Supabase.
 * The encryption key never leaves the user's device.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

// Storage key for the encryption key
const STORAGE_KEY = 'journaly_encryption_key';

/**
 * Generate a new AES-256 encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable (for backup)
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to base64 for storage/backup
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import key from base64
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create the user's encryption key
 * Stores in localStorage - key is unique per user/device
 */
export async function getOrCreateEncryptionKey(userId: string): Promise<CryptoKey> {
  const storageKey = `${STORAGE_KEY}_${userId}`;
  const storedKey = localStorage.getItem(storageKey);

  if (storedKey) {
    try {
      return await importKey(storedKey);
    } catch (e) {
      console.error('Failed to import stored key, generating new one');
    }
  }

  // Generate new key
  const newKey = await generateEncryptionKey();
  const exportedKey = await exportKey(newKey);
  localStorage.setItem(storageKey, exportedKey);

  return newKey;
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns base64 encoded string: IV + ciphertext
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 encoded string (IV + ciphertext)
 */
export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return '[Decryption failed]';
  }
}

/**
 * Check if a string appears to be encrypted (base64 with minimum length)
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 20) return false;
  try {
    const decoded = atob(value);
    // Check if it has at least IV length
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Encrypt an object's specified fields
 */
export async function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  key: CryptoKey
): Promise<T> {
  const result = { ...obj };

  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0) {
      result[field] = await encrypt(value, key) as any;
    }
  }

  return result;
}

/**
 * Decrypt an object's specified fields
 */
export async function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  key: CryptoKey
): Promise<T> {
  const result = { ...obj };

  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      result[field] = await decrypt(value, key) as any;
    }
  }

  return result;
}

/**
 * Export encryption key for backup (user should save this securely)
 */
export async function backupEncryptionKey(userId: string): Promise<string> {
  const key = await getOrCreateEncryptionKey(userId);
  return await exportKey(key);
}

/**
 * Restore encryption key from backup
 */
export async function restoreEncryptionKey(userId: string, base64Key: string): Promise<boolean> {
  try {
    // Validate the key first
    await importKey(base64Key);

    // Store it
    const storageKey = `${STORAGE_KEY}_${userId}`;
    localStorage.setItem(storageKey, base64Key);

    return true;
  } catch (e) {
    console.error('Failed to restore encryption key:', e);
    return false;
  }
}
