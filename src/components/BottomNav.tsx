import { Map, QrCode, Home, Trophy, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { icon: Map, label: "Map", path: "/map" },
  { icon: QrCode, label: "Scan", path: "/scan" },
  { icon: Home, label: "Home", path: "/" },
  { icon: Trophy, label: "Progress", path: "/progress" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith("/marker/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card elevation-2 safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="group flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <div
                className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
                  active
                    ? "bg-secondary text-primary"
                    : "text-on-surface-variant group-hover:bg-surface-variant"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
