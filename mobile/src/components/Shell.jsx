/** Phone chrome: status strip, scrolling content, fixed bottom tab bar. */
import { NavLink, Outlet } from "react-router-dom";
import { Shield, Map as MapIcon, Route as RouteIcon, Settings as Cog, WifiOff, CloudUpload } from "lucide-react";
import { useTracking } from "../lib/tracking";
import { STATUS_CONFIG } from "../lib/format";
import InstallPrompt from "./InstallPrompt";

const TABS = [
  { to: "/", label: "Safety", icon: Shield, end: true },
  { to: "/trip", label: "Trip", icon: RouteIcon },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/settings", label: "Settings", icon: Cog },
];

export default function Shell() {
  const { status, tracking, online, queued, mode } = useTracking();
  const cfg = STATUS_CONFIG[status?.status || "no_data"];

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* Header */}
      <header className="pt-safe shrink-0 bg-slate-900 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-400" />
            <span className="text-[15px] font-bold tracking-tight">Safety Companion</span>
          </div>
          <div className="flex items-center gap-2">
            {mode === "demo" && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                DEMO
              </span>
            )}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
                ${tracking ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/60 text-slate-300"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${tracking ? "bg-emerald-400" : "bg-slate-400"}`}
              />
              {tracking ? "Live" : "Paused"}
            </span>
          </div>
        </div>

        {/* Thin status bar in the current state's colour. */}
        <div className={`h-1 w-full ${cfg.dot}`} />
      </header>

      {/* Connectivity notices */}
      {!online && (
        <div className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-[12px] font-medium text-amber-900">
          <WifiOff size={14} />
          Offline — your location is being saved and will send automatically.
        </div>
      )}
      {online && queued > 0 && (
        <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 text-[12px] font-medium text-blue-900">
          <CloudUpload size={14} />
          Sending {queued} saved location{queued === 1 ? "" : "s"}…
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar">
        <Outlet />
      </main>

      <InstallPrompt />

      {/* Bottom tabs */}
      <nav className="pb-safe shrink-0 border-t border-slate-200 bg-white">
        <ul className="grid grid-cols-4">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold
                   ${isActive ? "text-blue-600" : "text-slate-400"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
