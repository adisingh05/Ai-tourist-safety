/** Touch-first primitives. Minimum 44px tap targets throughout. */
import { Loader2 } from "lucide-react";

export function Card({ className = "", children, ...rest }) {
  return (
    <div
      className={`rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Spinner({ size = 18, className = "" }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

const VARIANTS = {
  primary: "bg-blue-600 text-white active:bg-blue-700 disabled:bg-blue-300",
  dark: "bg-slate-900 text-white active:bg-slate-800 disabled:bg-slate-400",
  subtle:
    "bg-white text-slate-800 ring-1 ring-slate-300 active:bg-slate-100 disabled:text-slate-400",
  danger: "bg-rose-600 text-white active:bg-rose-700 disabled:bg-rose-300",
  ghost: "text-slate-600 active:bg-slate-100",
};

export function Button({
  variant = "primary",
  busy = false,
  icon: Icon,
  full = false,
  className = "",
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      disabled={disabled || busy}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4
        text-[15px] font-semibold transition-colors select-none
        ${VARIANTS[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {busy ? <Spinner /> : Icon ? <Icon size={18} /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className = "", ...rest }) {
  return (
    <input
      // 16px font stops iOS Safari zooming in when the field is focused.
      className={`w-full min-h-[48px] rounded-xl bg-white px-3.5 text-[16px]
        text-slate-900 ring-1 ring-slate-300 outline-none
        placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
}

export function Chip({ className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
        text-[11px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function Banner({ tone = "slate", icon: Icon, children, action }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    rose: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
    blue: "bg-blue-50 text-blue-900 ring-1 ring-blue-200",
    emerald: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
  };
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed ${tones[tone]}`}
      role={tone === "rose" ? "alert" : undefined}
    >
      {Icon && <Icon size={16} className="mt-0.5 shrink-0" />}
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

/** Risk meter, 0..1. */
export function Meter({ value, color = "#2563eb" }) {
  const pct = value == null ? 0 : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white pb-safe">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="min-h-[40px] px-2 text-sm font-medium text-slate-500"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {Icon && <Icon size={28} className="text-slate-300" />}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children && <p className="text-xs text-slate-500">{children}</p>}
    </div>
  );
}
