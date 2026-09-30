import { Map } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

// Routes that already offer the Map (bottom tab) or where a map button makes no sense.
const HIDE = [/^\/$/, /^\/map/, /^\/auth/, /^\/settings$/, /^\/wallet$/, /^\/dashboard$/, /^\/store$/, /^\/profile$/, /^\/u\//];

/** Small floating shortcut to the main map on pages without the bottom bar. */
export default function FloatingMapButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (HIDE.some((r) => r.test(pathname))) return null;
  return (
    <button
      type="button"
      onClick={() => navigate("/map")}
      aria-label="Open the map"
      className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground elevation-2 transition-transform active:scale-95 safe-bottom"
    >
      <Map className="h-5 w-5" />
    </button>
  );
}
