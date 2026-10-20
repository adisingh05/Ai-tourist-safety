/** Full-screen map: risk zones around you and your live position. */
import { useEffect, useState } from "react";
import { Layers, LocateFixed, TriangleAlert } from "lucide-react";
import { api } from "../lib/api";
import { useTracking } from "../lib/tracking";
import * as geo from "../lib/geo";
import { ZONE_COLORS } from "../lib/format";
import MiniMap from "../components/MiniMap";
import { Banner, Spinner } from "../components/ui";

const LEGEND = [
  ["low", "Low risk"],
  ["moderate", "Moderate"],
  ["high", "High risk"],
  ["restricted", "Restricted"],
];

export default function MapPage() {
  const { fix, status, tracking } = useTracking();
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [follow, setFollow] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualFix, setManualFix] = useState(null);

  useEffect(() => {
    api
      .zonesGeojson()
      .then(setGeojson)
      .catch(() => setErr("Could not load risk zones. Showing the base map."))
      .finally(() => setLoading(false));
  }, []);

  // Prefer the live GPS fix, then a manual one, then the server's last known.
  const position = fix || manualFix || status?.last_position || null;

  async function locate() {
    setLocating(true);
    setErr(null);
    try {
      const f = await geo.current();
      setManualFix(f);
      setFollow(true);
    } catch (code) {
      setErr(geo.GEO_MESSAGES[code] || "Could not get your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="relative h-full">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Spinner size={26} className="text-slate-400" />
        </div>
      ) : (
        <MiniMap
          className="h-full"
          geojson={geojson}
          position={position}
          follow={follow && tracking}
          fit={!position}
          zoom={position ? 15 : 12}
          resizeKey={loading}
        />
      )}

      {err && (
        <div className="absolute inset-x-3 top-3 z-[500]">
          <Banner tone="amber" icon={TriangleAlert}>
            {err}
          </Banner>
        </div>
      )}

      {/* Floating controls */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
        <button
          onClick={locate}
          aria-label="Centre on my location"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-slate-200 active:bg-slate-100"
        >
          {locating ? (
            <Spinner size={18} className="text-slate-600" />
          ) : (
            <LocateFixed size={19} className="text-slate-700" />
          )}
        </button>
        <button
          onClick={() => setLegendOpen((v) => !v)}
          aria-label="Toggle legend"
          className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-md ring-1 ring-slate-200 active:bg-slate-100
            ${legendOpen ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
        >
          <Layers size={19} />
        </button>
      </div>

      {legendOpen && (
        <div className="absolute bottom-3 right-3 z-[500] rounded-xl bg-white/95 p-3 shadow-md ring-1 ring-slate-200 backdrop-blur">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Zone risk
          </p>
          <ul className="space-y-1.5">
            {LEGEND.map(([key, label]) => (
              <li key={key} className="flex items-center gap-2 text-[12px] text-slate-700">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: ZONE_COLORS[key] }}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {position && (
        <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-md ring-1 ring-slate-200 backdrop-blur">
          {position.lat.toFixed(5)}, {position.lon.toFixed(5)}
          {status?.zone?.name && (
            <span className="ml-1.5 font-semibold text-slate-900">
              · {status.zone.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
