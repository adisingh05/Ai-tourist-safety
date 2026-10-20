/**
 * Live tracking engine.
 *
 * Owns the one thing the whole platform depends on: a stream of real
 * positions reaching the backend. Responsibilities:
 *
 *   - watch GPS and accept only usable fixes
 *   - decide when a fix is worth sending (time elapsed OR distance moved)
 *   - queue pings while offline and replay them on reconnect
 *   - keep /me/status fresh so the UI reflects the backend's verdict
 *   - replay a planned route instead of GPS in Demo mode
 *
 * Deliberately NOT here: any judgement about whether the tourist is safe.
 * That is the backend's deterministic detection layer. This file only
 * reports position and renders what comes back.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, NetworkError } from "./api";
import { useAuth } from "./auth";
import * as geo from "./geo";
import * as queue from "./queue";
import { getJSON, setJSON, KEYS } from "./storage";

const TrackCtx = createContext(null);

export const DEFAULT_SETTINGS = {
  // How often a fix is sent while moving normally.
  intervalSec: 20,
  // Send immediately if the tourist has moved at least this far since the
  // last send, so a fast-moving vehicle is not under-sampled.
  minMoveM: 40,
  // Reject fixes less precise than this (see geo.watch).
  minAccuracyM: 200,
  highAccuracy: true,
  keepScreenOn: true,
};

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...getJSON(KEYS.settings, {}) };
}
export function saveSettings(s) {
  setJSON(KEYS.settings, s);
}

const STATUS_POLL_MS = 20000;
const DEMO_STEP_MS = 1100;

export function TrackingProvider({ children }) {
  // Every call below is authenticated, so nothing fires until there is a
  // signed-in tourist — otherwise the login screen sprays 401s.
  const { user } = useAuth();
  const signedIn = Boolean(user);

  const [settings, setSettings] = useState(loadSettings);
  const [tracking, setTracking] = useState(false);
  const [mode, setMode] = useState("gps"); // "gps" | "demo"
  const [fix, setFix] = useState(null); // last accepted position
  const [status, setStatus] = useState(null); // backend /me/status
  const [geoError, setGeoError] = useState(null);
  const [queued, setQueued] = useState(() => queue.size());
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [sending, setSending] = useState(false);

  // Refs mirror state for use inside callbacks that must not be re-created
  // on every render (the GPS watch and the demo loop live a long time).
  const stopWatchRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastSentFixRef = useRef(null);
  const lastSentTimeRef = useRef(0);
  const demoStopRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // ---- status -----------------------------------------------------------

  const refreshStatus = useCallback(async () => {
    if (!signedIn) return null;
    try {
      const s = await api.myStatus();
      setStatus(s);
      return s;
    } catch {
      return null; // offline: keep showing the last known status
    }
  }, [signedIn]);

  // ---- sending ----------------------------------------------------------

  const sendPing = useCallback(async (payload) => {
    return api.myPing(payload);
  }, []);

  /** Send one fix, queueing it instead if the network is down. */
  const pushFix = useCallback(
    async (f, { force = false } = {}) => {
      const payload = {
        location: { lat: f.lat, lon: f.lon },
        recorded_at: (f.at instanceof Date ? f.at : new Date()).toISOString(),
        accuracy_m: f.accuracy_m ?? undefined,
        speed_mps: f.speed_mps ?? undefined,
        source: mode === "demo" ? "demo" : "mobile_gps",
      };

      setSending(true);
      try {
        // Anything queued must go first so the backend sees the real order.
        if (queue.size() > 0) {
          const { remaining } = await queue.flush(sendPing);
          setQueued(remaining);
          if (remaining > 0) {
            queue.enqueue(payload);
            setQueued(queue.size());
            return null;
          }
        }

        const res = await sendPing(payload);
        lastSentFixRef.current = f;
        lastSentTimeRef.current = Date.now();
        setLastSentAt(new Date());
        setOnline(true);
        await refreshStatus();
        return res;
      } catch (e) {
        if (e instanceof NetworkError) {
          queue.enqueue(payload);
          setQueued(queue.size());
          setOnline(false);
          return null;
        }
        if (force) throw e;
        return null;
      } finally {
        setSending(false);
      }
    },
    [mode, sendPing, refreshStatus]
  );

  /** Decide whether this fix is worth sending yet. */
  const considerFix = useCallback(
    (f) => {
      setFix(f);
      const { intervalSec, minMoveM } = settingsRef.current;
      const elapsed = Date.now() - lastSentTimeRef.current;
      const last = lastSentFixRef.current;
      const moved = last ? geo.distanceM(last, f) : Infinity;

      if (elapsed >= intervalSec * 1000 || moved >= minMoveM) {
        pushFix(f);
      }
    },
    [pushFix]
  );

  // ---- start / stop -----------------------------------------------------

  const stop = useCallback(() => {
    demoStopRef.current = true;
    stopWatchRef.current?.();
    stopWatchRef.current = null;
    wakeLockRef.current?.release?.().catch(() => {});
    wakeLockRef.current = null;
    setTracking(false);
  }, []);

  const startGps = useCallback(async () => {
    setGeoError(null);

    // One upfront read surfaces the permission prompt and gives an immediate
    // position, rather than waiting for the first watch callback.
    try {
      const first = await geo.current({
        highAccuracy: settingsRef.current.highAccuracy,
      });
      setFix(first);
      await pushFix(first);
    } catch (code) {
      setGeoError(code);
      return false;
    }

    if (settingsRef.current.keepScreenOn) {
      wakeLockRef.current = await geo.keepAwake();
    }

    stopWatchRef.current = geo.watch(considerFix, (code) => setGeoError(code), {
      highAccuracy: settingsRef.current.highAccuracy,
      minAccuracyM: settingsRef.current.minAccuracyM,
    });

    setMode("gps");
    setTracking(true);
    return true;
  }, [considerFix, pushFix]);

  /**
   * Demo mode: replay a planned route as if walking it. Kept so the
   * deviation / inactivity detectors can be shown indoors, and clearly
   * labelled everywhere in the UI so it is never mistaken for live GPS.
   */
  const startDemo = useCallback(
    async (routeLatLon, { deviate = false } = {}) => {
      if (!routeLatLon?.length) return false;
      demoStopRef.current = false;
      setMode("demo");
      setTracking(true);
      setGeoError(null);

      const step = Math.max(1, Math.floor(routeLatLon.length / 14));
      const pts = routeLatLon.filter((_, i) => i % step === 0);

      for (let i = 0; i < pts.length; i++) {
        if (demoStopRef.current) break;
        let [lat, lon] = pts[i];
        // Second half of the trip wanders off-route, to trigger the
        // route-deviation detector.
        if (deviate && i > pts.length / 2) {
          lat += 0.0025 * (i - pts.length / 2);
        }
        const f = { lat, lon, accuracy_m: 12, speed_mps: 1.4, at: new Date() };
        setFix(f);
        await pushFix(f);
        await new Promise((r) => setTimeout(r, DEMO_STEP_MS));
      }

      setTracking(false);
      return true;
    },
    [pushFix]
  );

  /** Send the current position right now, regardless of cadence. */
  const sendNow = useCallback(async () => {
    let f = fix;
    if (mode === "gps" || !f) {
      try {
        f = await geo.current({ highAccuracy: settingsRef.current.highAccuracy });
        setFix(f);
      } catch (code) {
        setGeoError(code);
        throw new Error(geo.GEO_MESSAGES[code] || "Could not get your location.");
      }
    }
    return pushFix(f, { force: true });
  }, [fix, mode, pushFix]);

  /**
   * Panic. Bypasses the cadence and every threshold, and never silently
   * queues: if it cannot reach the backend the caller must be told, so they
   * can fall back to a phone call.
   */
  const panic = useCallback(async () => {
    // Try for a fresh fix, but never let GPS block the alert: a short
    // timeout, then fall back to the last fix we held, then to the last
    // position the backend recorded. An approximate SOS beats none.
    let f = null;
    let approximate = false;
    try {
      f = await geo.current({ timeout: 6000 });
      setFix(f);
    } catch {
      f = fix;
      if (!f && status?.last_position) {
        f = { lat: status.last_position.lat, lon: status.last_position.lon };
      }
      approximate = Boolean(f);
    }

    if (!f) {
      throw new Error(
        "No location available at all. Allow location access, or call 112 directly."
      );
    }

    const res = await api.myPanic({
      location: { lat: f.lat, lon: f.lon },
      recorded_at: new Date().toISOString(),
    });
    await refreshStatus();
    return { ...res, approximate };
  }, [fix, status, refreshStatus]);

  // ---- background effects ----------------------------------------------

  // Poll status while tracking so warnings appear without a ping round-trip.
  useEffect(() => {
    if (!tracking) return;
    const t = setInterval(refreshStatus, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [tracking, refreshStatus]);

  // Fetch status once signed in, and clear it on sign-out so the next
  // account never sees the previous one's state.
  useEffect(() => {
    if (signedIn) refreshStatus();
    else setStatus(null);
  }, [signedIn, refreshStatus]);

  // Drain anything left over from a previous session. A ping can be queued
  // while nominally online (a timeout, or the app closing mid-request), and
  // the `online` event never fires in that case — without this it would sit
  // in storage indefinitely.
  useEffect(() => {
    if (!signedIn || queue.size() === 0) return;
    let cancelled = false;
    (async () => {
      const { remaining } = await queue.flush(sendPing);
      if (cancelled) return;
      setQueued(remaining);
      if (remaining === 0) refreshStatus();
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, sendPing, refreshStatus]);

  // Flush the queue as soon as connectivity returns.
  useEffect(() => {
    async function goOnline() {
      setOnline(true);
      if (!signedIn || queue.size() === 0) return;
      const { remaining } = await queue.flush(sendPing);
      setQueued(remaining);
      if (remaining === 0) refreshStatus();
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [signedIn, sendPing, refreshStatus]);

  // A screen wake lock is dropped whenever the tab is hidden; re-acquire it.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        if (tracking && settingsRef.current.keepScreenOn && !wakeLockRef.current) {
          geo.keepAwake().then((l) => (wakeLockRef.current = l));
        }
        refreshStatus();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [tracking, refreshStatus]);

  // Release the watch and wake lock if the provider ever unmounts.
  useEffect(() => () => stop(), [stop]);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      tracking,
      mode,
      fix,
      status,
      geoError,
      geoMessage: geoError ? geo.GEO_MESSAGES[geoError] : null,
      queued,
      online,
      sending,
      lastSentAt,
      settings,
      updateSettings,
      startGps,
      startDemo,
      stop,
      sendNow,
      panic,
      refreshStatus,
    }),
    [
      tracking, mode, fix, status, geoError, queued, online, sending,
      lastSentAt, settings, updateSettings, startGps, startDemo, stop,
      sendNow, panic, refreshStatus,
    ]
  );

  return <TrackCtx.Provider value={value}>{children}</TrackCtx.Provider>;
}

export function useTracking() {
  const ctx = useContext(TrackCtx);
  if (!ctx) throw new Error("useTracking must be used within TrackingProvider");
  return ctx;
}
