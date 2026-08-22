#!/usr/bin/env node

/**
 * Fails when a generated web/mobile bundle contains server credentials.
 * Reports only detector names, environment variable names, and file paths;
 * credential values and matching source text are never printed.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// CI and clean worktrees can point the exact-value check at a trusted env file
// without copying credentials into the repository.
const envFile = process.env.BUNDLE_AUDIT_ENV_FILE || path.join(repoRoot, '.env.local');
const targetDirectories = [
  path.join(repoRoot, 'dist'),
  path.join(repoRoot, 'ios', 'App', 'App', 'public'),
  path.join(repoRoot, 'android', 'app', 'src', 'main', 'assets', 'public'),
];

const allowedPublicCredentialNames = [
  /^(?:VITE_|NEXT_PUBLIC_)?(?:STRIPE_)?PUBLISHABLE_KEY$/,
  /^VITE_SUPABASE_PUBLISHABLE_KEY$/,
];

const sensitiveNamePatterns = [
  /(?:^|_)(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ROLE|ANON_KEY)(?:_|$)/,
  /(?:^|_)(?:JWT_SECRET|DATABASE_URL|POSTGRES_URL|PRISMA_URL)(?:_|$)/,
  /(?:^|_)API_KEY$/,
];

const dangerousPatterns = [
  { name: 'Supabase secret key', regex: /\bsb_secret_[A-Za-z0-9_-]{16,}\b/ },
  { name: 'embedded JWT', regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { name: 'GitHub access token', regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: 'Google API key', regex: /\bAIza[A-Za-z0-9_-]{35}\b/ },
  { name: 'Stripe secret or restricted key', regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/ },
  { name: 'OpenAI secret key', regex: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'AWS access key', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: 'private key material', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Postgres connection string', regex: /\bpostgres(?:ql)?:\/\/[^\s"'`<>]{8,}/i },
  { name: 'URL with embedded credentials', regex: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^@\s/]+@/i },
  {
    name: 'forbidden credential variable name',
    regex: /\b(?:(?:STORAGE_)?SUPABASE_(?:SUPABASE_)?(?:ANON_KEY|SERVICE_ROLE_KEY|SECRET_KEY|JWT_SECRET)|POSTGRES_(?:PASSWORD|URL)|DATABASE_URL|STRIPE_(?:SECRET_KEY|WEBHOOK_SECRET)|GITHUB_TOKEN|GEMINI_API_KEY)\b/,
  },
];

function parseDotEnv(source) {
  const entries = new Map();

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, name, rawInput] = match;
    let raw = rawInput.trim();
    let value;

    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      const quote = raw[0];
      value = raw.slice(1, -1);
      if (quote === '"') {
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    } else {
      raw = raw.replace(/\s+#.*$/, '').trim();
      value = raw;
    }

    entries.set(name, value);
  }

  return entries;
}

function isSensitiveName(name) {
  if (allowedPublicCredentialNames.some(pattern => pattern.test(name))) return false;
  return sensitiveNamePatterns.some(pattern => pattern.test(name));
}

async function collectFiles(directory) {
  const files = [];

  async function visit(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await visit(directory);
  return files;
}

function exactRepresentations(value) {
  const representations = new Set([value]);
  const jsonEscaped = JSON.stringify(value).slice(1, -1);
  if (jsonEscaped) representations.add(jsonEscaped);
  const uriEncoded = encodeURIComponent(value);
  if (uriEncoded) representations.add(uriEncoded);
  return [...representations].map(item => Buffer.from(item));
}

function isProbablyText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return !sample.includes(0);
}

async function main() {
  let localEnv = new Map();
  try {
    localEnv = parseDotEnv(await readFile(envFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.warn('Bundle scan warning: .env.local is absent; exact local-value checks were skipped.');
  }

  const sensitiveValues = [...localEnv.entries()]
    .filter(([name, value]) => isSensitiveName(name) && value.length >= 8)
    .map(([name, value]) => ({ name, representations: exactRepresentations(value) }));

  const filesByTarget = await Promise.all(targetDirectories.map(collectFiles));
  const files = [...new Set(filesByTarget.flat())];
  if (files.length === 0) {
    console.error('Bundle security scan failed: no generated client files were found.');
    process.exitCode = 2;
    return;
  }

  const findings = new Map();
  const recordFinding = (file, detector) => {
    const relativeFile = path.relative(repoRoot, file);
    findings.set(`${relativeFile}\0${detector}`, { file: relativeFile, detector });
  };

  for (const file of files) {
    const buffer = await readFile(file);

    for (const { name, representations } of sensitiveValues) {
      if (representations.some(value => buffer.indexOf(value) !== -1)) {
        recordFinding(file, `exact sensitive value from ${name}`);
      }
    }

    if (!isProbablyText(buffer)) continue;
    const text = buffer.toString('utf8');
    for (const { name, regex } of dangerousPatterns) {
      if (regex.test(text)) recordFinding(file, name);
    }
  }

  if (findings.size > 0) {
    console.error(`Bundle security scan failed with ${findings.size} finding(s):`);
    for (const { file, detector } of findings.values()) {
      console.error(`- ${detector}: ${file}`);
    }
    console.error('Credential values and matching source text were intentionally withheld.');
    process.exitCode = 1;
    return;
  }

  console.log(
    `Bundle security scan passed: ${files.length} file(s), ` +
    `${sensitiveValues.length} sensitive local value(s) checked without disclosure.`,
  );
}

main().catch(error => {
  console.error(`Bundle security scan failed: ${error.message}`);
  process.exitCode = 2;
});
