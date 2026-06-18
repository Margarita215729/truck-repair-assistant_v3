/**
 * Resolves API URLs for web and Capacitor builds.
 * Relative /api/* paths work on Vercel-hosted web, but native apps load
 * bundled assets from capacitor://localhost — serverless routes must target
 * the deployed backend via NEXT_PUBLIC_BASE_URL.
 */
import { env } from '@/config/env';

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || '').trim().replace(/\/$/, '');
}

function normalizePath(path) {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(env.NEXT_PUBLIC_BASE_URL);
}

export function apiUrl(path) {
  const normalizedPath = normalizePath(path);
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function hasRemoteApiBase() {
  return Boolean(getApiBaseUrl());
}
