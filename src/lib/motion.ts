import { useEffect, useState } from "react";

/**
 * Shared motion setting + presets. "auto" follows the phone's reduced-motion
 * setting; the visible toggle stores "on"/"off". Presets are CSS classes that
 * animate transform/opacity only and are disabled under [data-motion="off"].
 */
export type MotionPref = "auto" | "on" | "off";
const KEY = "mq-motion";

const systemReduced = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export function useMotion() {
  const [pref, setPref] = useState<MotionPref>(() => (localStorage.getItem(KEY) as MotionPref) || "auto");
  const [reduced, setReduced] = useState(systemReduced);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    mq?.addEventListener?.("change", fn);
    return () => mq?.removeEventListener?.("change", fn);
  }, []);
  const enabled = pref === "on" || (pref === "auto" && !reduced);
  const set = (p: MotionPref) => { localStorage.setItem(KEY, p); setPref(p); };
  return { enabled, pref, setPref: set, toggle: () => set(enabled ? "off" : "on") };
}

/** Preset class names (see `.atlas` keyframes in index.css). */
export const motion = {
  enter: "atlas-enter",          // page/section entrance, 450ms
  rise: "atlas-rise",            // card/paragraph reveal, 350ms
  zoom: "atlas-zoom",            // hero image entry, 1200ms ease-out
  drift: "atlas-drift",          // ambient background depth, slow
  pulse: "atlas-pulse",          // map selection pulse
  lift: "atlas-lift",            // hover elevation, 200ms
  fade: "atlas-fade",            // quiet fade (sensitive sites), 500ms
} as const;

/** Stagger helper: inline animation-delay for list item i. */
export const stagger = (i: number, step = 60, max = 600) => ({ animationDelay: `${Math.min(i * step, max)}ms` });
