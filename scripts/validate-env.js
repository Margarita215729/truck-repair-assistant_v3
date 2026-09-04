#!/usr/bin/env node
/**
 * Validates Truck Repair Assistant environment configuration without printing
 * credential values. The Supabase contract is intentionally strict:
 *
 * Client:
 *   NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * Server:
 *   STORAGE_SUPABASE_SUPABASE_SECRET_KEY
 *
 * Usage:
 *   npm run validate:env
 *   npm run validate:env -- --no-connectivity
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(scriptDirectory, '..');
const ENV_FILE = process.env.VALIDATE_ENV_FILE
  ? resolve(process.env.VALIDATE_ENV_FILE)
  : resolve(ROOT, '.env.local');
const SKIP_CONNECTIVITY =
  process.argv.includes('--no-connectivity') || process.env.VALIDATE_ENV_SKIP_NETWORK === '1';

const REQUIRED_PUBLIC_SUPABASE = [
  {
    key: 'NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL',
    validator: validateUrl,
  },
  {
    key: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    validator: validateSupabasePublishableKey,
  },
];

const REQUIRED_SERVER_SUPABASE = [
  {
    key: 'STORAGE_SUPABASE_SUPABASE_SECRET_KEY',
    validator: validateSupabaseSecretKey,
  },
];

const ALLOWED_SUPABASE_VARIABLES = new Set([
  ...REQUIRED_PUBLIC_SUPABASE.map(({ key }) => key),
  ...REQUIRED_SERVER_SUPABASE.map(({ key }) => key),
]);

const CLIENT_PUBLIC_VARIABLES = [
  'NEXT_PUBLIC_BASE_URL',
];

const OPTIONAL_SERVER_VARIABLES = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GEMINI_API_KEY',
  'GEMINI_TEXT_MODEL',
  'GOOGLE_MAPS_API_KEY',
  'BRAVE_API_KEY',
  'OWNER_PRICE_MONTHLY',
  'OWNER_PRICE_ANNUAL',
  'FLEET_PRICE_MONTHLY',
  'FLEET_PRICE_ANNUAL',
  'EBAY_CLIENT_ID',
  'EBAY_CLIENT_SECRET',
  'FINDITPARTS_API_URL',
  'FINDITPARTS_API_KEY',
];

const CLIENT_SECRET_NAME_PATTERN =
  /^(?:VITE_|NEXT_PUBLIC_).*(?:SECRET|SERVICE_ROLE|JWT|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL|POSTGRES_URL)/i;

function mask(value) {
  if (!value) return '(empty)';
  return `(set, ${value.length} chars; value withheld)`;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return null;

  const variables = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawInput] = match;
    let value = rawInput.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    variables[key] = value;
  }
  return variables;
}

function resolveExactValue(key, fileVariables) {
  if (fileVariables && Object.hasOwn(fileVariables, key)) {
    return { value: fileVariables[key], source: '.env.local' };
  }
  if (Object.hasOwn(process.env, key)) {
    return { value: process.env[key] || '', source: 'process.env' };
  }
  return { value: '', source: 'missing' };
}

function validateUrl(value) {
  if (!value) return { ok: false, detail: 'missing' };
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, detail: `invalid protocol: ${parsed.protocol}` };
    }
    return { ok: true, detail: parsed.hostname };
  } catch (error) {
    return { ok: false, detail: error.message };
  }
}

function validatePublicBaseUrl(value) {
  const result = validateUrl(value);
  if (!result.ok) return result;

  const normalized = value.replace(/\/$/, '');
  if (normalized === 'https://tra.tools' || normalized === 'http://tra.tools') {
    return {
      ok: false,
      detail: 'use https://www.tra.tools — the apex redirect breaks Capacitor CORS',
    };
  }
  return result;
}

function validateSupabasePublishableKey(value) {
  if (!value) return { ok: false, detail: 'missing' };
  if (/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(value)) {
    return { ok: true, detail: 'publishable key' };
  }
  if (value.split('.').length === 3) {
    return { ok: false, detail: 'legacy JWT/anon key is prohibited; use sb_publishable_*' };
  }
  return { ok: false, detail: 'expected sb_publishable_* key' };
}

function validateSupabaseSecretKey(value) {
  if (!value) return { ok: false, detail: 'missing' };
  if (/^sb_secret_[A-Za-z0-9_-]{12,}$/.test(value)) {
    return { ok: true, detail: 'server secret key' };
  }
  if (value.split('.').length === 3) {
    return { ok: false, detail: 'legacy service-role JWT is prohibited; use sb_secret_*' };
  }
  return { ok: false, detail: 'expected sb_secret_* key' };
}

function validateStripePriceId(value) {
  if (!value) return { ok: false, detail: 'missing' };
  if (value.startsWith('price_')) return { ok: true, detail: 'price ID' };
  if (value.startsWith('prod_')) {
    return { ok: false, detail: 'product ID — use a price_ ID for webhook mapping' };
  }
  return { ok: false, detail: 'unexpected format' };
}

function forbiddenReason(name) {
  if (name.toUpperCase().includes('SUPABASE') && !ALLOWED_SUPABASE_VARIABLES.has(name)) {
    return (
      'unsupported Supabase variable; allowed names are ' +
      [...ALLOWED_SUPABASE_VARIABLES].join(', ')
    );
  }
  if (CLIENT_SECRET_NAME_PATTERN.test(name)) {
    return 'secret-like variable uses a client-visible VITE_ or NEXT_PUBLIC_ prefix';
  }
  if (/^(?:VITE_|NEXT_PUBLIC_)(?:GOOGLE|YOUTUBE)(?:_|$)/i.test(name)) {
    return 'Google API configuration must remain server-side and must not be compiled into clients';
  }
  return '';
}

function findForbiddenVariables(fileVariables) {
  const configured = new Map();

  for (const [name, value] of Object.entries(process.env)) {
    const reason = forbiddenReason(name);
    if (reason) configured.set(name, { value: value || '', source: 'process.env', reason });
  }
  for (const [name, value] of Object.entries(fileVariables || {})) {
    const reason = forbiddenReason(name);
    if (reason) configured.set(name, { value, source: '.env.local', reason });
  }

  return configured;
}

function printSection(title) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(title);
  console.log('='.repeat(72));
}

function printVariable(definition, fileVariables, { required = false } = {}) {
  const { key, validator } = definition;
  const { value, source } = resolveExactValue(key, fileVariables);
  const present = Boolean(value);
  const validation = present && validator ? validator(value) : null;
  const valid = present && (!validation || validation.ok);
  const status = required
    ? valid
      ? 'OK'
      : present
        ? 'INVALID'
        : 'MISSING'
    : present
      ? validation && !validation.ok
        ? 'INVALID'
        : 'SET'
      : 'optional, empty';

  console.log(`\n[${status}] ${key}`);
  console.log(`  source: ${source}`);
  if (present) console.log(`  value:  ${mask(value)}`);
  if (validation) {
    console.log(`  format: ${validation.ok ? 'OK' : 'FAIL'} — ${validation.detail}`);
  }

  return { key, present, valid, validation };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function testSupabaseEndpoint(url, apiKey, path, label) {
  if (!url || !apiKey) return { ok: false, detail: `${label}: missing URL or key` };
  try {
    const response = await fetchWithTimeout(`${url.replace(/\/$/, '')}${path}`, {
      headers: { apikey: apiKey },
    });
    return response.ok
      ? { ok: true, detail: `${label}: HTTP ${response.status}` }
      : { ok: false, detail: `${label}: HTTP ${response.status} ${response.statusText}` };
  } catch (error) {
    return { ok: false, detail: `${label}: ${error.message}` };
  }
}

async function testGemini(apiKey) {
  if (!apiKey) return { ok: true, skipped: true, detail: 'Gemini: not configured (optional)' };
  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    return response.ok
      ? { ok: true, detail: `Gemini models endpoint: HTTP ${response.status}` }
      : {
          ok: false,
          detail: `Gemini models endpoint: HTTP ${response.status} ${response.statusText}`,
        };
  } catch (error) {
    return { ok: false, detail: `Gemini models endpoint: ${error.message}` };
  }
}

async function main() {
  console.log('Environment validation — Truck Repair Assistant v3');
  console.log(`Root: ${ROOT}`);
  console.log(`Env file: ${ENV_FILE} — ${existsSync(ENV_FILE) ? 'FOUND' : 'NOT FOUND'}`);
  if (SKIP_CONNECTIVITY) console.log('Connectivity: SKIPPED by request');

  const fileVariables = parseEnvFile(ENV_FILE);
  if (!fileVariables) {
    console.log('\nWARN: environment file not found. Checking process.env only.');
  } else {
    console.log(`Loaded ${Object.keys(fileVariables).length} variables from the environment file`);
  }

  const results = {
    requiredMissing: [],
    invalidFormats: [],
    forbiddenFound: [],
    connectivity: [],
  };

  printSection('Required public Supabase variables (browser/mobile bundle)');
  for (const definition of REQUIRED_PUBLIC_SUPABASE) {
    const result = printVariable(definition, fileVariables, { required: true });
    if (!result.present) results.requiredMissing.push(result.key);
    else if (!result.valid) results.invalidFormats.push(result.key);
  }

  printSection('Required server-only Supabase variable');
  for (const definition of REQUIRED_SERVER_SUPABASE) {
    const result = printVariable(definition, fileVariables, { required: true });
    if (!result.present) results.requiredMissing.push(result.key);
    else if (!result.valid) results.invalidFormats.push(result.key);
  }

  printSection('Optional public client variables');
  for (const key of CLIENT_PUBLIC_VARIABLES) {
    const validator = key.includes('PRICE')
      ? validateStripePriceId
      : key === 'NEXT_PUBLIC_BASE_URL'
        ? validatePublicBaseUrl
        : null;
    const result = printVariable({ key, validator }, fileVariables);
    if (result.present && !result.valid) results.invalidFormats.push(key);
  }

  printSection('Optional server-only variables');
  for (const key of OPTIONAL_SERVER_VARIABLES) {
    const validator = key.includes('PRICE') ? validateStripePriceId : null;
    const result = printVariable({ key, validator }, fileVariables);
    if (result.present && !result.valid) results.invalidFormats.push(key);
  }

  printSection('Forbidden legacy or client-secret variables');
  const forbiddenVariables = findForbiddenVariables(fileVariables);
  if (forbiddenVariables.size === 0) {
    console.log('\n[OK] No forbidden environment variable names are configured.');
  } else {
    for (const [name, { value, source, reason }] of forbiddenVariables) {
      console.log(`\n[FAIL] ${name}`);
      console.log(`  source: ${source}`);
      console.log(`  reason: ${reason}`);
      console.log(`  value:  ${mask(value)}`);
      results.forbiddenFound.push(name);
    }
  }

  if (!SKIP_CONNECTIVITY) {
    printSection('Live connectivity tests');
    const url = resolveExactValue(
      'NEXT_PUBLIC_STORAGE_SUPABASE_SUPABASE_URL',
      fileVariables,
    ).value;
    const publishableKey = resolveExactValue('VITE_SUPABASE_PUBLISHABLE_KEY', fileVariables).value;
    const secretKey = resolveExactValue(
      'STORAGE_SUPABASE_SUPABASE_SECRET_KEY',
      fileVariables,
    ).value;
    const geminiKey = resolveExactValue('GEMINI_API_KEY', fileVariables).value;

    const tests = [
      await testSupabaseEndpoint(
        url,
        publishableKey,
        '/rest/v1/truck_parking?select=id&limit=1',
        'Supabase publishable REST',
      ),
      await testSupabaseEndpoint(url, publishableKey, '/auth/v1/settings', 'Supabase Auth'),
      await testSupabaseEndpoint(url, secretKey, '/rest/v1/', 'Supabase server REST'),
      await testGemini(geminiKey),
    ];

    for (const test of tests) {
      const status = test.skipped ? 'SKIP' : test.ok ? 'PASS' : 'FAIL';
      console.log(`\n[${status}] ${test.detail}`);
      results.connectivity.push(test);
    }
  }

  printSection('Summary');
  const connectivityFailures = results.connectivity.filter((test) => !test.ok);
  console.log(
    `Required missing: ${results.requiredMissing.length ? results.requiredMissing.join(', ') : 'none'}`,
  );
  console.log(
    `Invalid formats: ${results.invalidFormats.length ? results.invalidFormats.join(', ') : 'none'}`,
  );
  console.log(
    `Forbidden variables: ${results.forbiddenFound.length ? results.forbiddenFound.join(', ') : 'none'}`,
  );
  console.log(
    `Connectivity failures: ${SKIP_CONNECTIVITY ? 'skipped' : connectivityFailures.length}`,
  );

  if (
    results.requiredMissing.length ||
    results.invalidFormats.length ||
    results.forbiddenFound.length ||
    connectivityFailures.length
  ) {
    console.log('\nRESULT: FAILED — correct the configuration above.');
    process.exitCode = 1;
    return;
  }

  console.log('\nRESULT: PASSED — environment policy and required configuration are valid.');
}

main().catch((error) => {
  console.error(`validate-env fatal error: ${error.message}`);
  process.exitCode = 1;
});
