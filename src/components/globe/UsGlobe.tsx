import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoCentroid, geoContains, geoGraticule10, geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import statesTopo from "us-atlas/states-10m.json";
import landTopo from "world-atlas/land-110m.json";
import { LocateFixed } from "lucide-react";
import { US_STATES } from "@/data/cities";

type StateFeature = Feature<Geometry, { name: string }> & { abbr: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topoStates = statesTopo as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topoLand = landTopo as any;
const NAME_TO_ABBR = new Map(US_STATES.map(([a, n]) => [n, a]));
const STATES: StateFeature[] = (feature(topoStates, topoStates.objects.states) as unknown as FeatureCollection<Geometry, { name: string }>)
  .features.map((f) => ({ ...f, abbr: NAME_TO_ABBR.get(f.properties.name) ?? "" }))
  .filter((f) => f.abbr) as StateFeature[];
const LAND = feature(topoLand, topoLand.objects.land) as unknown as FeatureCollection;
const GRATICULE = geoGraticule10();
const HOME: [number, number] = [98, -38];
const MIN_Z = 1, MAX_Z = 6;

interface Props {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (abbr: string) => void;
  onEmpty?: (name: string) => void;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Swipe-to-spin orthographic globe of the United States. */
export default function UsGlobe({ counts, selected, onSelect, onEmpty }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(320);
  const [rot, setRot] = useState<[number, number]>(HOME);
  const [zoom, setZoom] = useState(1.6);
  const rotRef = useRef(rot); rotRef.current = rot;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const vel = useRef<[number, number]>([0, 0]);
  const interacted = useRef(false);
  const raf = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; moved: number; pinch?: number; t: number } | null>(null);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize(Math.max(200, Math.min(e.contentRect.width, 560))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const projection = useMemo(
    () => geoOrthographic().scale((size / 2 - 4) * zoom).translate([size / 2, size / 2]).rotate([rot[0], rot[1], 0]).clipAngle(90),
    [size, zoom, rot],
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; };

  // Idle spin / inertia loop.
  const loop = () => {
    stop();
    const tick = () => {
      const [vx, vy] = vel.current;
      const idle = !interacted.current && !reduced();
      if (!idle && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) { raf.current = null; return; }
      const [l, p] = rotRef.current;
      const dx = idle ? 0.12 : vx;
      setRot([l + dx, Math.max(-80, Math.min(80, p + (idle ? 0 : vy)))]);
      vel.current = [vx * 0.94, vy * 0.94];
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => { loop(); return stop; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animateTo = (target: [number, number], z: number) => {
    stop();
    interacted.current = true;
    const from = rotRef.current, z0 = zoomRef.current;
    const interp = geoInterpolate([-from[0], -from[1]], [-target[0], -target[1]]);
    if (reduced()) { setRot(target); setZoom(z); return; }
    const t0 = performance.now(), dur = 900;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      const [lon, lat] = interp(e);
      setRot([-lon, -lat]); setZoom(z0 + (z - z0) * e);
      if (t < 1) raf.current = requestAnimationFrame(step); else raf.current = null;
    };
    raf.current = requestAnimationFrame(step);
  };

  // Zoom to the selected state when it changes from outside.
  useEffect(() => {
    if (!selected) return;
    const f = STATES.find((s) => s.abbr === selected);
    if (!f) return;
    const [lon, lat] = geoCentroid(f);
    animateTo([-lon, -lat], selected === "AK" ? 2.4 : 4);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    interacted.current = true; stop(); vel.current = [0, 0];
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { x: 0, y: 0, moved: 99, pinch: Math.hypot(a.x - b.x, a.y - b.y), t: performance.now() };
    } else drag.current = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !drag.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (pointers.current.size === 2 && d.pinch) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom((z) => Math.max(MIN_Z, Math.min(MAX_Z, z * (dist / d.pinch!))));
      d.pinch = dist; return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.moved += Math.abs(dx) + Math.abs(dy); d.x = e.clientX; d.y = e.clientY;
    const k = 90 / ((size / 2) * zoomRef.current);
    const now = performance.now(), dt = Math.max(8, now - d.t); d.t = now;
    vel.current = [dx * k * (16 / dt), -dy * k * (16 / dt)];
    const [l, p] = rotRef.current;
    setRot([l + dx * k, Math.max(-80, Math.min(80, p - dy * k))]);
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size > 0) return;
    drag.current = null;
    if (d && d.moved < 6 && !d.pinch) {
      const rect = wrap.current!.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * size, svgY = ((e.clientY - rect.top) / rect.height) * size;
      const ll = projection.invert?.([svgX, svgY]);
      if (!ll) return;
      const hit = STATES.find((s) => geoContains(s, ll));
      if (!hit) return;
      if (counts[hit.abbr]) onSelect(hit.abbr); else onEmpty?.(hit.properties.name);
      return;
    }
    if (!reduced()) loop();
  };

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      interacted.current = true;
      setZoom((z) => Math.max(MIN_Z, Math.min(MAX_Z, z * Math.exp(-dy * 0.0015))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const r = (size / 2 - 4) * zoom;
  return (
    <div ref={wrap} className="relative mx-auto aspect-square w-full max-w-[560px] select-none">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="Globe of the United States. Drag to spin, tap a highlighted state."
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <defs>
          <radialGradient id="globe-ocean" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.22)" />
            <stop offset="100%" stopColor="hsl(var(--background))" />
          </radialGradient>
          <radialGradient id="globe-glow" r="50%">
            <stop offset="85%" stopColor="hsl(var(--primary) / 0.25)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={Math.min(r * 1.08, size)} fill="url(#globe-glow)" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="url(#globe-ocean)" stroke="hsl(var(--primary) / 0.4)" strokeWidth={1} />
        <path d={path(GRATICULE) ?? ""} fill="none" stroke="hsl(var(--primary) / 0.12)" strokeWidth={0.5} />
        <path d={path(LAND) ?? ""} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={0.4} />
        {STATES.map((s) => {
          const active = !!counts[s.abbr];
          const isSel = selected === s.abbr;
          return (
            <path
              key={s.abbr}
              d={path(s) ?? ""}
              fill={isSel ? "hsl(var(--primary))" : active ? "hsl(var(--primary) / 0.7)" : "hsl(var(--surface-variant, var(--muted)))"}
              stroke={active ? "hsl(var(--primary-foreground) / 0.8)" : "hsl(var(--border))"}
              strokeWidth={isSel ? 1.4 : 0.5}
              className={active ? "globe-state-active" : ""}
            />
          );
        })}
        {STATES.filter((s) => counts[s.abbr]).map((s) => {
          const c = geoCentroid(s);
          const [cx, cy] = projection(c) ?? [NaN, NaN];
          const visible = path({ type: "Point", coordinates: c });
          if (!visible || Number.isNaN(cx)) return null;
          return (
            <g key={`b-${s.abbr}`} transform={`translate(${cx},${cy})`} pointerEvents="none">
              <circle r={9} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={1.5} />
              <text textAnchor="middle" dy="0.35em" fontSize={9} fontWeight={700} fill="hsl(var(--primary))">{counts[s.abbr]}</text>
            </g>
          );
        })}
      </svg>
      <button
        type="button"
        onClick={() => animateTo(HOME, 1.6)}
        className="absolute bottom-2 right-2 flex h-9 items-center gap-1.5 rounded-full bg-background/80 px-3 text-xs font-medium text-foreground backdrop-blur-md elevation-1"
      >
        <LocateFixed className="h-3.5 w-3.5" /> Recenter
      </button>
    </div>
  );
}
