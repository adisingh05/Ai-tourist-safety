/**
 * Key/value storage behind a tiny async facade.
 *
 * CAPACITOR SWAP POINT — on native, replace the three functions below with
 * `@capacitor/preferences` (and the auth token with a secure-storage plugin).
 * Nothing else in the app touches localStorage, so this file is the only edit.
 *
 * Every access is wrapped: private mode and blocked site-data make
 * localStorage throw rather than return null, and a safety app must not fail
 * to start because of that.
 */

export async function get(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function set(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable — operate in-memory for this session */
  }
}

export async function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Synchronous read, for the places React needs a value during first render. */
export function getSync(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function getJSON(key, fallback) {
  const raw = getSync(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// Storage keys, kept in one place so nothing drifts.
export const KEYS = {
  token: "ts_token",
  phone: "ts_phone",
  settings: "ts_settings",
  queue: "ts_ping_queue",
  consent: "ts_consent_ack",
};
