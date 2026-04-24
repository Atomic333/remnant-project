import { Menu, Home, Map, Settings, QrCode, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useVisited } from "@/hooks/useVisited";
import { markers } from "@/data/mockData";

const links = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Map, label: "Map", path: "/map" },
  { icon: QrCode, label: "Scan", path: "/map?scan=1" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const HamburgerMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { visited } = useVisited();

  const visitedCount = visited.size;
  const total = markers.length;
  const pct = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[280px] p-0 flex flex-col bg-background border-l-0 [&>button]:hidden"
      >
        {/* Title */}
        <div className="px-6 pt-8 pb-6">
          <h2 className="font-display text-xl font-medium text-foreground">
            MarkerQuest
          </h2>
        </div>

        {/* Progress — minimal inline */}
        <div className="px-6 pb-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-on-surface-variant">
              {visitedCount} of {total} visited
            </span>
            <span className="text-xs font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-variant">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          {links.map(({ icon: Icon, label, path }) => {
            const active =
              location.pathname + location.search === path ||
              (path === "/" && location.pathname === "/") ||
              (path === "/map" && location.pathname === "/map" && !location.search);
            return (
              <button
                key={path}
                onClick={() => go(path)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                  active
                    ? "text-primary"
                    : "text-foreground hover:bg-surface-variant"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-display text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
