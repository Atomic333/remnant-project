import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-6xl font-medium text-foreground">404</h1>
      <p className="mt-3 text-base text-on-surface-variant">
        Oops! This page doesn't exist.
      </p>
      <button
        onClick={() => navigate("/")}
        className="mt-6 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground elevation-1"
      >
        Go Home
      </button>
    </div>
  );
};

export default NotFound;
