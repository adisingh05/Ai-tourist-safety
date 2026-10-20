/**
 * Geolocation access.
 *
 * CAPACITOR SWAP POINT — on native, replace `watch` / `current` with
 * `@capacitor/geolocation` (and add a background-location plugin so tracking
 * survives a locked screen). The rest of the app only sees the Fix shape
 * below, so no other file changes.
 *
 * A Fix is: { lat, lon, accuracy_m, speed_mps, at (Date) }.
 */

export const GEO_UNAVAILABLE = "unavailable";
export const GEO_DENIED = "denied";
export const GEO_TIMEOUT = "timeout";
export const GEO_INSECURE = "insecure";

/**
 * Browsers expose geolocation only on secure origins. localhost counts as
 * secure; a LAN IP over plain http does not, which is the usual reason
 * location silently fails when testing on a phone.
 */
export function isSecureContextForGeo() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

export function isSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

function toFix(pos) {
  return {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy_m:
      typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null,
    // The browser reports speed only when it can derive one; null is normal.
    speed_mps:
      typeof pos.coords.speed === "number" && !Number.isNaN(pos.coords.speed)
        ? Math.max(0, pos.coords.speed)
        : null,
    at: new Date(pos.timestamp || Date.now()),
  };
}

function toError(err) {
  if (!isSecureContextForGeo()) return GEO_INSECURE;
  switch (err?.code) {
    case 1:
      return GEO_DENIED;
    case 3:
      return GEO_TIMEOUT;
    default:
      return GEO_UNAVAILABLE;
  }
}

/** One-shot position read. Resolves to a Fix, rejects with a GEO_* string. */
export function current({ timeout = 15000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!isSupported()) return reject(GEO_UNAVAILABLE);
    if (!isSecureContextForGeo()) return reject(GEO_INSECURE);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toFix(pos)),
      (err) => reject(toError(err)),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 0 }
    );
  });
}

/**
 * Continuous tracking. Calls onFix for every accepted fix and onError with a
 * GEO_* string. Returns a stop() function.
 *
 * `minAccuracyM` drops wildly imprecise fixes (a cell-tower fix can be a
 * kilometre off, which would read as a route deviation and raise a false
 * alert — exactly the failure mode the detection layer must not have).
 */
export function watch(onFix, onError, { highAccuracy = true, minAccuracyM = 200 } = {}) {
  if (!isSupported()) {
    onError?.(GEO_UNAVAILABLE);
    return () => {};
  }
  if (!isSecureContextForGeo()) {
    onError?.(GEO_INSECURE);
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const fix = toFix(pos);
      if (fix.accuracy_m != null && fix.accuracy_m > minAccuracyM) return;
      onFix(fix);
    },
    (err) => onError?.(toError(err)),
    { enableHighAccuracy: highAccuracy, timeout: 20000, maximumAge: 5000 }
  );

  return () => {
    try {
      navigator.geolocation.clearWatch(id);
    } catch {
      /* ignore */
    }
  };
}

/** Metres between two lat/lon points (haversine). */
export function distanceM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const GEO_MESSAGES = {
  [GEO_DENIED]:
    "Location permission is blocked. Enable it for this site in your browser settings, then try again.",
  [GEO_TIMEOUT]:
    "Could not get a GPS fix. Move somewhere with a clearer view of the sky and try again.",
  [GEO_UNAVAILABLE]: "Location is not available on this device.",
  [GEO_INSECURE]:
    "Location needs a secure (https) connection. Open this app over https — see the README for a tunnel.",
};

/**
 * Ask the screen to stay awake while tracking. Best-effort: unsupported on
 * iOS Safari and revoked whenever the tab is backgrounded.
 */
export async function keepAwake() {
  try {
    if ("wakeLock" in navigator) {
      return await navigator.wakeLock.request("screen");
    }
  } catch {
    /* ignore */
  }
  return null;
}
