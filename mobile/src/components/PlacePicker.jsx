/** Destination picker: curated places, free-text geocoding, or current GPS. */
import { useEffect, useRef, useState } from "react";
import { Search, MapPin, LocateFixed, X } from "lucide-react";
import { api } from "../lib/api";
import * as geo from "../lib/geo";
import { Input, Spinner, Button } from "./ui";

export default function PlacePicker({
  label,
  value,
  onChange,
  places = [],
  allowCurrent = false,
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState(null);
  const debounceRef = useRef(null);

  // Debounced search; the backend proxies Nominatim, which we must not spam.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setErr(null);
      try {
        const d = await api.placeSearch(q.trim());
        setResults(d.places || d.results || []);
      } catch {
        setErr("Search unavailable. Pick from the list below.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  async function useCurrent() {
    setLocating(true);
    setErr(null);
    try {
      const f = await geo.current();
      onChange({ name: "My current location", lat: f.lat, lon: f.lon });
      setQ("");
      setResults(null);
    } catch (code) {
      setErr(geo.GEO_MESSAGES[code] || "Could not get your location.");
    } finally {
      setLocating(false);
    }
  }

  function pick(p) {
    onChange({ name: p.name, lat: p.lat, lon: p.lon });
    setQ("");
    setResults(null);
  }

  const list = results ?? places;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-700">{label}</span>
        {allowCurrent && (
          <button
            type="button"
            onClick={useCurrent}
            disabled={locating}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 active:text-blue-800"
          >
            {locating ? <Spinner size={12} /> : <LocateFixed size={13} />}
            Use my location
          </button>
        )}
      </div>

      {value ? (
        <div className="flex min-h-[48px] items-center justify-between gap-2 rounded-xl bg-blue-50 px-3.5 py-2.5 ring-1 ring-blue-200">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin size={15} className="shrink-0 text-blue-600" />
            <span className="truncate text-[14px] font-medium text-slate-900">
              {value.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Clear ${label}`}
            className="shrink-0 rounded-lg p-2 text-slate-500 active:bg-blue-100"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a place in Bengaluru…"
              className="pl-9"
              autoComplete="off"
            />
            {searching && (
              <Spinner
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            )}
          </div>

          {err && <p className="mt-1 text-xs text-amber-700">{err}</p>}

          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl ring-1 ring-slate-200 no-scrollbar">
            {list.length === 0 ? (
              <p className="px-3.5 py-3 text-[13px] text-slate-500">
                {results ? "No matches." : "No places available."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {list.map((p, i) => (
                  <li key={`${p.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => pick(p)}
                      className="flex w-full min-h-[48px] items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-slate-50"
                    >
                      <MapPin size={14} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-slate-900">
                          {p.name}
                        </span>
                        {p.category && (
                          <span className="block text-[11px] capitalize text-slate-500">
                            {p.category}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
