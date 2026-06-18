#!/usr/bin/env node
/**
 * Validates .env.local and process.env for Truck Repair Assistant.
 * Masks secrets in output. Tests live connectivity where possible.
 *
 * Usage: npm run validate:env
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_FILE = resolve(ROOT, '.env.local');

const REQUIRED_SUPABASE = [
  'NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL',
  'STORAGE_SUPABASE_SUPABASE_ANON_KEY',
  'STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL_SUPABASE = [
  'STORAGE_SUPABASE_SUPABASE_PUBLISHABLE_KEY',
  'STORAGE_SUPABASE_SUPABASE_SECRET_KEY',
  'STORAGE_SUPABASE_SUPABASE_JWT_SECRET',
];

const CLIENT_VITE_VARS = [
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_OWNER_PRICE_MONTHLY',
  'VITE_OWNER_PRICE_ANNUAL',
  'VITE_FLEET_PRICE_MONTHLY',
  'VITE_FLEET_PRICE_ANNUAL',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_YOUTUBE_API_KEY',
  'VITE_GOOGLE_CSE_API_KEY',
  'VITE_GOOGLE_CSE_ID',
];

const SERVER_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GITHUB_TOKEN',
  'GEMINI_API_KEY',
  'GOOGLE_CSE_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'BRAVE_API_KEY',
  'OWNER_PRICE_MONTHLY',
  'OWNER_PRICE_ANNUAL',
  'FLEET_PRICE_MONTHLY',
  'FLEET_PRICE_ANNUAL',
  'NEXT_PUBLIC_BASE_URL',
  'EBAY_CLIENT_ID',
  'EBAY_CLIENT_SECRET',
  'FINDITPARTS_API_URL',
  'FINDITPARTS_API_KEY',
];

const LEGACY_VARS = [
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const LEGACY_MAP = {
  NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL: [
    'NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
  ],
  STORAGE_SUPABASE_SUPABASE_ANON_KEY: [
    'STORAGE_SUPABASE_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
  ],
  STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY: [
    'STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ],
  STORAGE_SUPABASE_SUPABASE_JWT_SECRET: [
    'STORAGE_SUPABASE_SUPABASE_JWT_SECRET',
    'SUPABASE_JWT_SECRET',
  ],
};

function mask(value) {
  if (!value) return '(empty)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return null;
  const vars = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

function resolveValue(key, fileVars) {
  const candidates = LEGACY_MAP[key] || [key];
  for (const candidate of candidates) {
    if (fileVars?.[candidate]) {
      const legacy = candidate !== key;
      return { value: fileVars[candidate], source: legacy ? `.env.local (legacy: ${candidate})` : '.env.local' };
    }
    if (process.env[candidate]) {
      const legacy = candidate !== key;
      return { value: process.env[candidate], source: legacy ? `process.env (legacy: ${candidate})` : 'process.env' };
    }
  }
  return { value: '', source: 'missing' };
}

function validatePublicBaseUrl(value) {
  if (!value) return { ok: false, detail: 'missing' };
  const normalized = value.replace(/\/$/, '');
  if (normalized === 'https://tra.tools' || normalized === 'http://tra.tools') {
    return {
      ok: false,
      detail: 'use https://www.tra.tools — tra.tools redirects and breaks Capacitor CORS',
    };
  }
  return validateUrl(value);
}

function validateUrl(value) {
  if (!value) return { ok: false, detail: 'missing' };
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return { ok: false, detail: `invalid protocol: ${u.protocol}` };
    }
    return { ok: true, detail: u.hostname };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

function validateJwt(value) {
  if (!value) return { ok: false, detail: 'missing' };
  const parts = value.split('.');
  if (parts.length !== 3) return { ok: false, detail: 'not a JWT (expected 3 parts)' };
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const role = payload.role || 'unknown';
    const ref = payload.ref || payload.iss || 'unknown';
    const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'no exp';
    return { ok: true, detail: `role=${role}, ref=${ref}, exp=${exp}` };
  } catch (e) {
    return { ok: false, detail: `JWT decode failed: ${e.message}` };
  }
}

function validateStripePriceId(value) {
  if (!value) return { ok: false, detail: 'missing' };
  if (value.startsWith('price_')) return { ok: true, detail: 'price ID' };
  if (value.startsWith('prod_')) {
    return { ok: false, detail: 'product ID — use price_ ID for webhook mapping' };
  }
  return { ok: false, detail: 'unexpected format' };
}

async function testSupabaseRest(url, apiKey, label) {
  if (!url || !apiKey) {
    return { ok: false, detail: `${label}: missing url or key` };
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 200 || res.status === 401) {
      return { ok: true, detail: `${label}: REST reachable (HTTP ${res.status})` };
    }
    return { ok: false, detail: `${label}: HTTP ${res.status} ${res.statusText}` };
  } catch (e) {
    return { ok: false, detail: `${label}: ${e.message}` };
  }
}

async function testSupabaseAuth(url, anonKey) {
  if (!url || !anonKey) return { ok: false, detail: 'auth: missing url or anon key' };
  try {
    const sb = createClient(url, anonKey);
    const { error } = await sb.auth.getSession();
    if (error) return { ok: false, detail: `auth.getSession error: ${error.message}` };
    return { ok: true, detail: 'auth.getSession OK' };
  } catch (e) {
    return { ok: false, detail: `auth client error: ${e.message}` };
  }
}

async function testGemini(apiKey) {
  if (!apiKey) return { ok: false, detail: 'gemini: missing GEMINI_API_KEY' };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'OK' }] }] }),
      },
    );
    if (res.ok) return { ok: true, detail: `gemini: HTTP ${res.status}` };
    const body = await res.json().catch(() => ({}));
    return { ok: false, detail: `gemini: HTTP ${res.status} — ${body.error?.message || res.statusText}` };
  } catch (e) {
    return { ok: false, detail: `gemini: ${e.message}` };
  }
}

function checkViteExposure(key) {
  const vitePrefixes = ['VITE_', 'NEXT_PUBLIC_', 'STORAGE_SUPABASE_'];
  if (vitePrefixes.some((p) => key.startsWith(p))) {
    return { ok: true, detail: 'exposed to Vite client via envPrefix' };
  }
  return { ok: true, detail: 'server-only (OK)' };
}

function printSection(title) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(title);
  console.log('='.repeat(72));
}

function printVar(key, fileVars, { required = false, validator = null } = {}) {
  const { value, source } = resolveValue(key, fileVars);
  const present = Boolean(value);
  const status = present ? (required ? 'OK' : 'SET') : (required ? 'MISSING' : 'optional, empty');
  console.log(`\n[${status}] ${key}`);
  console.log(`  source: ${source}`);
  if (present) console.log(`  value:  ${mask(value)}`);
  if (validator && present) {
    const result = validator(value);
    console.log(`  format: ${result.ok ? 'OK' : 'FAIL'} — ${result.detail}`);
  }
  const viteCheck = checkViteExposure(key);
  if (!viteCheck.ok) console.log(`  vite:   WARN — ${viteCheck.detail}`);
  if (source.includes('legacy')) console.log(`  note:   Using legacy env name — rename to ${key}`);
  return { key, present, required, source };
}

async function main() {
  console.log('Environment validation — Truck Repair Assistant v3');
  console.log(`Root: ${ROOT}`);
  console.log(`Env file: ${ENV_FILE} — ${existsSync(ENV_FILE) ? 'FOUND' : 'NOT FOUND'}`);

  const fileVars = parseEnvFile(ENV_FILE);
  if (!fileVars) {
    console.log('\nWARN: .env.local not found. Checking process.env only.');
  } else {
    console.log(`Loaded ${Object.keys(fileVars).length} variables from .env.local`);
  }

  const results = { requiredMissing: [], legacyFound: [], connectivity: [], formatFails: [] };

  printSection('Required Supabase variables');
  for (const key of REQUIRED_SUPABASE) {
    const validator = key.includes('URL') ? validateUrl : validateJwt;
    const r = printVar(key, fileVars, { required: true, validator });
    if (!r.present) results.requiredMissing.push(key);
  }

  printSection('Optional Supabase variables');
  for (const key of OPTIONAL_SUPABASE) {
    printVar(key, fileVars, { required: false });
  }

  printSection('Client (Vite) variables');
  for (const key of CLIENT_VITE_VARS) {
    const validator = key.includes('PRICE') ? validateStripePriceId : null;
    const r = printVar(key, fileVars, { validator });
    if (r.present && validator) {
      const v = validator(resolveValue(key, fileVars).value);
      if (!v.ok) results.formatFails.push(key);
    }
  }

  printSection('Server variables');
  for (const key of SERVER_VARS) {
    const validator = key.includes('PRICE')
      ? validateStripePriceId
      : key === 'NEXT_PUBLIC_BASE_URL'
        ? validatePublicBaseUrl
        : null;
    const r = printVar(key, fileVars, { validator });
    if (r.present && validator) {
      const v = validator(resolveValue(key, fileVars).value);
      if (!v.ok) results.formatFails.push(key);
    }
  }

  printSection('Legacy variables (should be removed)');
  for (const key of LEGACY_VARS) {
    const { value, source } = resolveValue(key, fileVars);
    if (value) {
      console.log(`\n[WARN] ${key} still set via ${source} — migrate to STORAGE_SUPABASE_* names`);
      console.log(`  value: ${mask(value)}`);
      results.legacyFound.push(key);
    } else {
      console.log(`\n[OK] ${key} — not set`);
    }
  }

  printSection('Live connectivity tests');
  const url = resolveValue('NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL', fileVars).value;
  const anonKey = resolveValue('STORAGE_SUPABASE_SUPABASE_ANON_KEY', fileVars).value;
  const serviceKey = resolveValue('STORAGE_SUPABASE_SUPABASE_SERVICE_ROLE_KEY', fileVars).value;
  const geminiKey = resolveValue('GEMINI_API_KEY', fileVars).value;

  const tests = [
    await testSupabaseRest(url, anonKey, 'anon key'),
    await testSupabaseRest(url, serviceKey, 'service role key'),
    await testSupabaseAuth(url, anonKey),
    await testGemini(geminiKey),
  ];

  for (const t of tests) {
    console.log(`\n[${t.ok ? 'PASS' : 'FAIL'}] ${t.detail}`);
    results.connectivity.push(t);
  }

  printSection('Summary');
  const connFails = results.connectivity.filter((t) => !t.ok);
  console.log(`Required missing: ${results.requiredMissing.length ? results.requiredMissing.join(', ') : 'none'}`);
  console.log(`Format warnings: ${results.formatFails.length ? results.formatFails.join(', ') : 'none'}`);
  console.log(`Legacy vars still set: ${results.legacyFound.length ? results.legacyFound.join(', ') : 'none'}`);
  console.log(`Connectivity failures: ${connFails.length}`);

  if (results.requiredMissing.length || connFails.length) {
    console.log('\nRESULT: FAILED — fix missing/invalid variables above.');
    process.exit(1);
  }
  if (results.formatFails.length || results.legacyFound.length) {
    console.log('\nRESULT: WARN — connectivity OK but review format/legacy warnings.');
    process.exit(0);
  }
  console.log('\nRESULT: PASSED — all required variables present and connectivity OK.');
}

main().catch((err) => {
  console.error('validate-env fatal error:', err);
  process.exit(1);
});
