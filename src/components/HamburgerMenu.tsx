import { Menu, Home, Map, Settings, QrCode, Trophy } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import logo from "@/assets/logo.png";
import { useVisited } from "@/hooks/useVisited";
import { markers } from "@/data/mockData";

const primaryLinks = [
  { icon: Home, label: "Home", subtitle: "Dashboard & overview", path: "/" },
  { icon: Map, label: "Map", subtitle: "Explore Tacoma markers", path: "/map" },
  { icon: QrCode, label: "Scan", subtitle: "Scan a marker QR code", path: "/map?scan=1" },
];

const secondaryLinks = [
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
        className="w-[300px] p-0 flex flex-col bg-background border-l-0"
      >
        {/* Branded header */}
        <div className="relative bg-primary px-5 pt-6 pb-8 text-primary-foreground">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="MarkerQuest" className="h-10 w-10 object-contain" />
            <span className="font-display text-xl font-medium">MarkerQuest</span>
          </div>
          <p className="mt-1 text-xs text-primary-foreground/70">
            Tacoma's historical markers
          </p>
        </div>

        {/* Progress card — overlaps header */}
        <div className="px-4 -mt-5">
          <button
            onClick={() => go("/progress")}
            className="w-full rounded-2xl bg-card p-4 text-left elevation-2 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-medium text-foreground">
                  My Progress
                </p>
                <p className="text-xs text-on-surface-variant">
                  {visitedCount} of {total} markers visited
                </p>
              </div>
              <span className="text-sm font-semibold text-primary">{pct}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-4 pt-5 flex flex-col gap-1.5">
          {primaryLinks.map(({ icon: Icon, label, subtitle, path }) => {
            const active = location.pathname + location.search === path
              || (path === "/" && location.pathname === "/")
              || (path === "/map" && location.pathname === "/map" && !location.search);
            return (
              <button
                key={path}
                onClick={() => go(path)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  active
                    ? "bg-secondary"
                    : "hover:bg-surface-variant"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  active ? "bg-primary text-primary-foreground" : "bg-surface-variant text-on-surface-variant"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-display text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Secondary nav — separated */}
        <div className="border-t border-border px-4 py-4">
          {secondaryLinks.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => go(path)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active ? "bg-secondary text-primary" : "text-foreground hover:bg-surface-variant"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium text-sm">{label}</span>
              </button>
            );
          })}
          <p className="mt-3 px-3 text-[11px] text-on-surface-variant">
            MarkerQuest · Tacoma, WA
          </p>
          <SheetClose asChild>
            <button className="mt-3 w-full rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]">
              Close
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
