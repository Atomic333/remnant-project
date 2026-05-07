import { useEffect, useState } from "react";
import logo from "@/assets/markerquest-logo.png";

const SplashScreen = () => {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1500);
    const hideTimer = setTimeout(() => setHidden(true), 2100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <img
        src={logo}
        alt="MarkerQuest.ai"
        className="w-72 max-w-[70%] animate-fade-in"
      />
    </div>
  );
};

export default SplashScreen;
