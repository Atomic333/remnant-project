import { Map, QrCode, Trophy, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { icon: Map, label: "Map", path: "/map" },
  { icon: QrCode, label: "Scan", path: "/scan" },
  { icon: Trophy, label: "Progress", path: "/progress" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on marker detail pages
  if (location.pathname.startsWith("/marker/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
