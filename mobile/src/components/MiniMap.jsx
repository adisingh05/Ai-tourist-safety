/** Leaflet map: risk zones, planned route, per-point safety, live position. */
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import { ZONE_COLORS, riskLevel, titleCase } from "../lib/format";

const BENGALURU = [12.95, 77.62];

function FitToZones({ geojson, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !geojson?.features?.length) return;
    try {
      const b = L.geoJSON(geojson).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
    } catch {
      /* ignore */
    }
  }, [geojson, enabled, map]);
  return null;
}

function Follow({ center, follow }) {
  const map = useMap();
  useEffect(() => {
    if (follow && center) map.panTo(center, { animate: true });
  }, [center, follow, map]);
  return null;
}

// Leaflet needs an explicit invalidateSize when its container starts hidden
// or changes height (tab switches, sheet open/close).
function Resizer({ dep }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [dep, map]);
  return null;
}

function zoneStyle(feature) {
  const color = ZONE_COLORS[feature.properties.risk_category] || "#64748b";
  return {
    color,
    weight: 1.5,
    fillColor: color,
    fillOpacity: feature.properties.restricted ? 0.3 : 0.14,
  };
}

function onEachZone(feature, layer) {
  const p = feature.properties;
  layer.bindTooltip(
    `${p.name} · ${titleCase(p.risk_category)}${p.restricted ? " · restricted" : ""}`,
    { sticky: true }
  );
}

export default function MiniMap({
  geojson,
  route = null,
  routeColor = "#2563eb",
  safetyPoints = [],
  position = null,
  follow = false,
  fit = false,
  zoom = 13,
  resizeKey,
  className = "",
}) {
  const center = position ? [position.lat, position.lon] : BENGALURU;

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitToZones geojson={geojson} enabled={fit && !position} />
        <Follow center={position ? [position.lat, position.lon] : null} follow={follow} />
        <Resizer dep={resizeKey} />

        {geojson && (
          <GeoJSON
            key={geojson.features?.length || 0}
            data={geojson}
            style={zoneStyle}
            onEachFeature={onEachZone}
          />
        )}

        {route?.length >= 2 && (
          <Polyline
            positions={route}
            pathOptions={{ color: routeColor, weight: 5, opacity: 0.8 }}
          />
        )}

        {safetyPoints
          .filter((p) => p.score != null)
          .map((p, i) => (
            <CircleMarker
              key={`sp-${i}`}
              center={[p.lat, p.lon]}
              radius={4}
              pathOptions={{
                color: riskLevel(p.score).color,
                fillColor: riskLevel(p.score).color,
                fillOpacity: 0.9,
                weight: 1,
              }}
            >
              <Tooltip>
                Safety: {riskLevel(p.score).label} ({p.score.toFixed(2)})
              </Tooltip>
            </CircleMarker>
          ))}

        {position && (
          <>
            {/* Accuracy halo, so a vague fix looks vague. */}
            {position.accuracy_m != null && position.accuracy_m > 25 && (
              <CircleMarker
                center={[position.lat, position.lon]}
                radius={Math.min(40, position.accuracy_m / 8)}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 1,
                  fillColor: "#3b82f6",
                  fillOpacity: 0.12,
                }}
              />
            )}
            <CircleMarker
              center={[position.lat, position.lon]}
              radius={8}
              pathOptions={{
                color: "#fff",
                weight: 3,
                fillColor: "#2563eb",
                fillOpacity: 1,
              }}
            >
              <Tooltip>You are here</Tooltip>
            </CircleMarker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
