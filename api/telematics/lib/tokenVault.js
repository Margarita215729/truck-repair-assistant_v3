/**
 * TokenVault — Encrypted OAuth token storage
 *
 * Tokens are AES-256-GCM encrypted with TOKENVAULT_MASTER_KEY before
 * being stored in the `encrypted_tokens` table. Refresh tokens are
 * **never** stored in plaintext.
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getMasterKey() {
  const hex = process.env.TOKENVAULT_MASTER_KEY;
  if (!hex || hex.length < 32) {
    throw new Error('TOKENVAULT_MASTER_KEY must be a 32+ hex-char secret');
  }
  // Derive a deterministic 256-bit key from the provided secret
  return crypto.createHash('sha256').update(hex).digest();
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key);
}

/** Encrypt a plaintext string → base64(iv + ciphertext + tag) */
function encrypt(plaintext) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

/** Decrypt base64(iv + ciphertext + tag) → plaintext string */
function decrypt(blob) {
  const key = getMasterKey();
  const raw = Buffer.from(blob, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(raw.length - TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
}

/**
 * Save (or overwrite) tokens for a given user+provider.
 * Returns the `token_ref` identifier used to look up later.
 */
export async function saveTokens(userId, provider, tokens) {
  const sb = getSupabase();
  const tokenRef = `${provider}:${userId}:${crypto.randomUUID()}`;
  const encryptedPayload = encrypt(JSON.stringify(tokens));

  const { error } = await sb.from('encrypted_tokens').insert({
    token_ref: tokenRef,
    user_id: userId,
    provider,
    encrypted_payload: encryptedPayload,
  });
  if (error) throw new Error(`saveTokens failed: ${error.message}`);
  return tokenRef;
}

/**
 * Load tokens by ref.
 * Returns the decrypted token object or null.
 */
export async function loadTokens(tokenRef) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('encrypted_tokens')
    .select('encrypted_payload')
    .eq('token_ref', tokenRef)
    .single();

  if (error || !data) return null;
  try {
    return JSON.parse(decrypt(data.encrypted_payload));
  } catch {
    return null;
  }
}

/**
 * Update tokens in-place (preserves the same token_ref).
 */
export async function updateTokens(tokenRef, tokens) {
  const sb = getSupabase();
  const encryptedPayload = encrypt(JSON.stringify(tokens));
  const { error } = await sb
    .from('encrypted_tokens')
    .update({ encrypted_payload: encryptedPayload })
    .eq('token_ref', tokenRef);
  if (error) throw new Error(`updateTokens failed: ${error.message}`);
}
