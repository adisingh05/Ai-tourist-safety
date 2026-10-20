// Shared presentation helpers: severity / risk-category colors (no purple).

// Tailwind class sets for alert severities.
export const SEVERITY_STYLES = {
  info: "bg-slate-100 text-slate-700 ring-slate-200",
  low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  high: "bg-orange-100 text-orange-700 ring-orange-200",
  critical: "bg-red-100 text-red-700 ring-red-200",
};

// Zone risk categories.
export const RISK_STYLES = {
  low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  moderate: "bg-amber-100 text-amber-800 ring-amber-200",
  high: "bg-orange-100 text-orange-700 ring-orange-200",
  restricted: "bg-red-100 text-red-700 ring-red-200",
};

// Map a 0..1 risk score to a label + hex color (for the map / meters).
export function riskLevel(score) {
  if (score == null) return { label: "n/a", color: "#94a3b8" };
  if (score >= 0.5) return { label: "high", color: "#ea580c" };
  if (score >= 0.3) return { label: "elevated", color: "#d97706" };
  if (score >= 0.15) return { label: "moderate", color: "#ca8a04" };
  return { label: "low", color: "#059669" };
}

// Hex colors for zone polygons on the map.
export const ZONE_COLORS = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f97316",
  restricted: "#ef4444",
};

// Tourist live-status → badge classes + map marker hex.
export const TOURIST_STATUS_STYLES = {
  safe: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
  alert: "bg-orange-100 text-orange-700 ring-orange-200",
  panic: "bg-red-100 text-red-700 ring-red-200",
  no_data: "bg-slate-100 text-slate-500 ring-slate-200",
};
export const TOURIST_STATUS_COLORS = {
  safe: "#10b981",
  inactive: "#94a3b8",
  alert: "#f97316",
  panic: "#ef4444",
  no_data: "#cbd5e1",
};

export function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function titleCase(s) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Mobile additions -----------------------------------------------------

// Tourist-facing status config (safe | warning | critical | no_data).
// Wording is deliberately calm: this screen is read by someone who may
// already be stressed.
export const STATUS_CONFIG = {
  safe: {
    title: "You're in a safe area",
    tone: "emerald",
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    chip: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  warning: {
    title: "Stay alert",
    tone: "amber",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
    chip: "bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
  },
  critical: {
    title: "Help is being arranged",
    tone: "rose",
    ring: "ring-rose-200",
    bg: "bg-rose-50",
    text: "text-rose-900",
    chip: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  no_data: {
    title: "Not sharing location",
    tone: "slate",
    ring: "ring-slate-200",
    bg: "bg-slate-50",
    text: "text-slate-700",
    chip: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
};

/** "4 min ago" — relative time for the last-seen line. */
export function timeAgo(iso) {
  if (!iso) return "never";
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${Math.floor(secs)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hr ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

/** Metres rendered the way a person reads them. */
export function fmtDistance(m) {
  if (m == null) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Seconds -> "1h 20m" / "25 min". */
export function fmtDuration(s) {
  if (s == null) return "—";
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
