import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/hooks/useGuest";
import { useProfile } from "@/hooks/useProfile";
import PreferencesOnboarding from "@/components/PreferencesOnboarding";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Admin-only route. */
  admin?: boolean;
  /** Whether guests (no account) may view this route. Defaults to true. */
  allowGuest?: boolean;
}

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const RequireAuth = ({ children, admin, allowGuest = true }: RequireAuthProps) => {
  const { user, isAdmin, loading } = useAuth();
  const { isGuest } = useGuest();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const guestBrowsing = !user && isGuest;
  const guestAllowed = guestBrowsing && allowGuest && !admin;

  useEffect(() => {
    if (loading || user) return;
    if (guestBrowsing) return; // guests either browse or see the upgrade prompt
    const from = `${location.pathname}${location.search}`;
    navigate(`/auth?from=${encodeURIComponent(from)}`, { replace: true });
  }, [loading, user, guestBrowsing, navigate, location.pathname, location.search]);

  // Guest browsing: no profile, no onboarding, no account data.
  if (guestAllowed) return <>{children}</>;

  if (guestBrowsing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <UserPlus className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 font-display text-lg font-medium text-foreground">
          Create a free account
        </h2>
        <p className="mt-2 max-w-xs text-sm text-on-surface-variant">
          {admin
            ? "This area is for administrators. Sign in with an admin account to continue."
            : "This part of MarkerQuest saves to your account — your profile, synced visits and shareable history. Your guest progress carries over when you sign up."}
        </p>
        <button
          onClick={() =>
            navigate(
              `/auth?from=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
            )
          }
          className="mt-6 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground"
        >
          Sign in or sign up
        </button>
        <button
          onClick={() => navigate("/")}
          className="mt-3 text-xs text-on-surface-variant underline"
        >
          Keep browsing as a guest
        </button>
      </div>
    );
  }

  if (loading || !user) return <Spinner />;
  if (profileLoading) return <Spinner />;

  // Everyone with an account picks their communication preferences once.
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
