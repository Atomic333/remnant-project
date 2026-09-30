import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker as GMarker, Polyline, Circle, OverlayViewF, OverlayView } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { decodePolyline, type Leg, type RevisionStop, useReducedMotion } from "@/lib/trails";

const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";

export type StopState = "upcoming" | "current" | "done" | "pending";
type LatLng = { lat: number; lng: number };

function cssHsl(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.split(/\s+/).join(",")})` : fallback;
}

function stopIcon(n: number, state: StopState, colors: Record<string, string>): google.maps.Icon {
  const fill = state === "done" ? colors.done : state === "current" ? colors.primary : state === "pending" ? colors.muted : colors.card;
  const text = state === "upcoming" ? colors.primary : colors.onPrimary;
  const label = state === "done" ? "✓" : String(n);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="16" fill="${fill}" stroke="${colors.primary}" stroke-width="3" ${state === "pending" ? 'stroke-dasharray="4 3"' : ""}/>
    <text x="20" y="25.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${text}">${label}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(state === "current" ? 44 : 36, state === "current" ? 44 : 36),
    anchor: new google.maps.Point(state === "current" ? 22 : 18, state === "current" ? 22 : 18),
  };
}

export interface TrailMapHandle {
  fitAll: () => void;
  recenter: () => void;
  focus: (p: LatLng) => void;
}

interface Props {
  stops: RevisionStop[];
  legs: Leg[];
  states: StopState[];
  currentIndex: number | null;
  user?: { lat: number; lng: number; accuracy: number } | null;
  approach?: LatLng[] | null;
  follow?: boolean;
  onSelect?: (index: number) => void;
  onMapClick?: (p: LatLng) => void;
  onUserPan?: () => void;
  handleRef?: React.MutableRefObject<TrailMapHandle | null>;
  className?: string;
}

/** Animated trail map: numbered stops, a walking route that draws itself, moving direction dashes. */
export default function TrailMap({ stops, legs, states, currentIndex, user, approach, follow, onSelect, onMapClick, onUserPan, handleRef, className }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const mapRef = useRef<google.maps.Map | null>(null);
  const reduced = useReducedMotion();
  const [drawn, setDrawn] = useState(0); // 0..1 of the route drawn
  const [dashOffset, setDashOffset] = useState(0);

  const colors = useMemo(() => ({
    primary: cssHsl("--primary", "#0d9488"),
    onPrimary: cssHsl("--primary-foreground", "#fff"),
    card: cssHsl("--card", "#fff"),
    muted: cssHsl("--muted", "#ddd"),
    done: cssHsl("--quest-gold", cssHsl("--accent", "#d4a017")),
    approach: cssHsl("--muted-foreground", "#666"),
  }), [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const path = useMemo(() => {
    const pts: LatLng[] = [];
    legs.forEach((l) => { if (l.ok && l.polyline) pts.push(...decodePolyline(l.polyline)); });
    return pts;
  }, [legs]);

  // Draw-in animation whenever the route changes.
  useEffect(() => {
    if (reduced || !path.length) { setDrawn(1); return; }
    setDrawn(0);
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setDrawn(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [path, reduced]);

  // Slow moving dashes show the direction of travel (≈12 fps to stay light on phones).
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setDashOffset((o) => (o + 1) % 24), 80);
    return () => window.clearInterval(id);
  }, [reduced]);

  const fitAll = () => {
    const map = mapRef.current;
    if (!map || !stops.length) return;
    const b = new google.maps.LatLngBounds();
    (path.length ? path : stops).forEach((p) => b.extend(p));
    if (user) b.extend(user);
    map.fitBounds(b, 48);
  };
  const focus = (p: LatLng) => {
    const map = mapRef.current;
    if (!map) return;
    if (reduced) map.setCenter(p); else map.panTo(p);
    if ((map.getZoom() ?? 0) < 16) map.setZoom(17);
  };
  const recenter = () => { if (user) focus(user); };

  useEffect(() => {
    if (handleRef) handleRef.current = { fitAll, recenter, focus };
  });

  useEffect(() => { if (isLoaded) fitAll(); }, [isLoaded, stops.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (follow && user && mapRef.current) mapRef.current.panTo(user); }, [follow, user?.lat, user?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-on-surface-variant">The map couldn't load. Check your connection; the stop list below still works.</div>;
  if (!isLoaded) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const visible = path.slice(0, Math.max(2, Math.ceil(path.length * drawn)));
  const current = currentIndex != null ? stops[currentIndex] : null;

  return (
    <GoogleMap
      mapContainerClassName={className ?? "h-full w-full"}
      onLoad={(m) => { mapRef.current = m; fitAll(); }}
      onDragStart={onUserPan}
      onClick={(e) => e.latLng && onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
      options={{ disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: "greedy" }}
    >
      {visible.length > 1 && (
        <>
          <Polyline path={visible} options={{ strokeColor: colors.primary, strokeOpacity: 0.35, strokeWeight: 8, zIndex: 1 }} />
          <Polyline
            path={visible}
            options={{
              strokeOpacity: 0,
              zIndex: 2,
              icons: [
                { icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: colors.primary, scale: 3 }, offset: `${dashOffset}px`, repeat: "24px" },
                ...(drawn >= 1 ? [{ icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, strokeColor: colors.primary, strokeWeight: 2, scale: 2.5 }, offset: "0", repeat: "140px" }] : []),
              ],
            }}
          />
        </>
      )}
      {approach && approach.length > 1 && (
        <Polyline
          path={approach}
          options={{
            strokeOpacity: 0,
            zIndex: 1,
            icons: [{ icon: { path: google.maps.SymbolPath.CIRCLE, fillOpacity: 1, fillColor: colors.approach, strokeOpacity: 0, scale: 3 }, offset: "0", repeat: "12px" }],
          }}
        />
      )}
      {current && (
        <OverlayViewF position={current} mapPaneName={OverlayView.OVERLAY_LAYER} getPixelPositionOffset={() => ({ x: -32, y: -32 })}>
          <div className="pointer-events-none relative h-16 w-16">
            <span className={`absolute inset-0 rounded-full bg-primary/30 ${reduced ? "" : "animate-ping"}`} />
            <span className="absolute inset-3 rounded-full bg-primary/20" />
          </div>
        </OverlayViewF>
      )}
      {stops.map((s, i) => (
        <GMarker
          key={s.marker_id}
          position={s}
          icon={stopIcon(i + 1, states[i] ?? "upcoming", colors)}
          zIndex={states[i] === "current" ? 20 : 10}
          title={`Stop ${i + 1}: ${s.name}`}
          onClick={() => onSelect?.(i)}
        />
      ))}
      {user && (
        <>
          <Circle center={user} radius={user.accuracy} options={{ fillColor: colors.primary, fillOpacity: 0.12, strokeColor: colors.primary, strokeOpacity: 0.3, strokeWeight: 1, clickable: false }} />
          <GMarker position={user} zIndex={30} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: colors.primary, fillOpacity: 1, strokeColor: colors.card, strokeWeight: 3 }} title="You are here" />
        </>
      )}
    </GoogleMap>
  );
}
