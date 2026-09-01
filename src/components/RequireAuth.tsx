import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import PreferencesOnboarding from "@/components/PreferencesOnboarding";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Admin-only route. */
  admin?: boolean;
}

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const RequireAuth = ({ children, admin }: RequireAuthProps) => {
  const { user, isAdmin, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || user) return;
    const from = `${location.pathname}${location.search}`;
    navigate(`/auth?from=${encodeURIComponent(from)}`, { replace: true });
  }, [loading, user, navigate, location.pathname, location.search]);

  if (loading || !user) return <Spinner />;
  if (profileLoading) return <Spinner />;

  // Everyone picks their communication preferences once.
  if (profile && !profile.onboarded_at) return <PreferencesOnboarding />;

  if (admin && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h2 className="font-display text-lg font-medium text-foreground">Admins only</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Your account doesn't have admin access.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
