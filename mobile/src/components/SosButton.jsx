/**
 * Hold-to-fire SOS.
 *
 * A single tap is too easy to trigger in a pocket, and a confirmation dialog
 * is too slow when someone is in trouble. Holding for ~1.6s is the middle
 * ground: deliberate, but one continuous action with no second screen.
 *
 * Releasing early cancels. The ring shows exactly how much longer to hold.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Siren } from "lucide-react";

const HOLD_MS = 1600;

export default function SosButton({ onFire, busy = false, disabled = false }) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef(null);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (disabled || busy) return;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      setHolding(false);
      // A short buzz confirms it fired without the user having to look.
      try {
        navigator.vibrate?.([80, 60, 180]);
      } catch {
        /* unsupported */
      }
      onFire();
    }, HOLD_MS);
  }, [disabled, busy, onFire]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        disabled={disabled || busy}
        // Pointer events cover touch and mouse; the cancel handlers make sure
        // a finger sliding off the button aborts rather than fires.
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to send an emergency SOS"
        className={`relative flex h-36 w-36 touch-none items-center justify-center
          rounded-full text-white shadow-lg transition-transform
          ${disabled || busy ? "bg-rose-300" : "bg-rose-600 active:scale-[0.97] animate-danger"}`}
      >
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"
            className={`sos-ring ${holding ? "sos-ring-active" : ""}`}
            style={{ "--sos-hold-ms": `${HOLD_MS}ms` }}
          />
        </svg>
        <div className="flex flex-col items-center gap-1">
          <Siren size={36} />
          <span className="text-lg font-extrabold tracking-wide">SOS</span>
        </div>
      </button>
      <p className="text-xs font-medium text-slate-500">
        {busy
          ? "Sending your alert…"
          : holding
            ? "Keep holding…"
            : "Press and hold to alert authorities"}
      </p>
    </div>
  );
}
