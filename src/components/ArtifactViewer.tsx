import { useEffect, useRef, useState } from "react";

/**
 * Thin wrapper around <model-viewer>. The library is a web component and is
 * loaded on demand so the marker page's first paint is unaffected.
 */
interface ArtifactViewerProps {
  src: string;
  iosSrc?: string;
  alt: string;
  /** Dimmed, unclaimed preview state. */
  locked?: boolean;
  className?: string;
  /** Expose whether this device can place the model in the real world. */
  onArSupport?: (supported: boolean) => void;
  /** Set by the parent to trigger native AR from an outside button. */
  arRef?: React.MutableRefObject<(() => void) | null>;
}

let loader: Promise<unknown> | null = null;
function loadModelViewer() {
  if (!loader) loader = import("@google/model-viewer");
  return loader;
}

interface ModelViewerElement extends HTMLElement {
  canActivateAR?: boolean;
  activateAR?: () => void;
}

const ArtifactViewer = ({
  src,
  iosSrc,
  alt,
  locked = false,
  className = "",
  onArSupport,
  arRef,
}: ArtifactViewerProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadModelViewer().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !hostRef.current) return;
    const host = hostRef.current;
    const el = document.createElement("model-viewer") as ModelViewerElement;
    el.setAttribute("src", src);
    if (iosSrc) el.setAttribute("ios-src", iosSrc);
    el.setAttribute("alt", alt);
    el.setAttribute("camera-controls", "");
    el.setAttribute("touch-action", "pan-y");
    el.setAttribute("auto-rotate", "");
    el.setAttribute("auto-rotate-delay", "600");
    el.setAttribute("rotation-per-second", "18deg");
    el.setAttribute("interaction-prompt", "none");
    el.setAttribute("shadow-intensity", "0.9");
    el.setAttribute("shadow-softness", "0.8");
    el.setAttribute("exposure", "1.05");
    el.setAttribute("environment-image", "neutral");
    el.setAttribute("camera-orbit", "35deg 72deg 2.4m");
    el.setAttribute("min-camera-orbit", "auto 0deg auto");
    el.setAttribute("ar", "");
    el.setAttribute("ar-modes", "webxr scene-viewer quick-look");
    el.setAttribute("ar-scale", "fixed");
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.backgroundColor = "transparent";
    el.style.setProperty("--progress-bar-color", "hsl(var(--primary))");
    host.appendChild(el);

    if (arRef) arRef.current = () => el.activateAR?.();
    const report = () => onArSupport?.(Boolean(el.canActivateAR));
    el.addEventListener("load", report);
    el.addEventListener("ar-status", report);
    const timer = window.setTimeout(report, 1200);

    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("load", report);
      el.removeEventListener("ar-status", report);
      if (arRef) arRef.current = null;
      host.removeChild(el);
    };
  }, [ready, src, iosSrc, alt, onArSupport, arRef]);

  return (
    <div
      ref={hostRef}
      className={`relative h-full w-full transition-all duration-500 ${
        locked ? "opacity-45 saturate-50" : ""
      } ${className}`}
    >
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      )}
    </div>
  );
};

export default ArtifactViewer;
