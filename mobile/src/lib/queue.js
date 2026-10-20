/**
 * Offline queue for location pings.
 *
 * A tourist losing signal is the exact situation the system exists for, so a
 * ping that cannot be sent is kept and replayed later rather than dropped.
 * Each queued ping carries its own `recorded_at`, which the backend accepts,
 * so a replayed ping lands on the timeline where it actually happened.
 *
 * Note the ordering guarantee: the queue is flushed oldest-first and stops at
 * the first failure, so the server never sees a later fix before an earlier
 * one.
 */
import { getJSON, setJSON, KEYS } from "./storage";
import { NetworkError } from "./api";

// Bounded so a long offline stretch cannot fill up storage.
const MAX_QUEUED = 300;

export function load() {
  const items = getJSON(KEYS.queue, []);
  return Array.isArray(items) ? items : [];
}

export function size() {
  return load().length;
}

export function enqueue(ping) {
  const items = load();
  items.push(ping);
  // Drop the oldest first: recent positions matter most for a rescue.
  setJSON(KEYS.queue, items.slice(-MAX_QUEUED));
}

export function clear() {
  setJSON(KEYS.queue, []);
}

/**
 * Send queued pings oldest-first via `send`.
 *
 * Stops at the first network failure and keeps the remainder. A ping the
 * server rejects outright (4xx — e.g. a stale token) is discarded, since
 * retrying it forever would block everything behind it.
 *
 * Returns { sent, remaining }.
 */
export async function flush(send) {
  let items = load();
  let sent = 0;

  while (items.length) {
    const next = items[0];
    try {
      await send(next);
      sent += 1;
    } catch (e) {
      if (e instanceof NetworkError) break; // still offline — keep the rest
      // Permanently rejected: drop it and carry on.
    }
    items = items.slice(1);
    setJSON(KEYS.queue, items);
  }

  return { sent, remaining: items.length };
}
