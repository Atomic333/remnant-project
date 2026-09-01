import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const mail = email.trim();
    if (!mail || !mail.includes("@") || mail.length > 255) {
      toast({ title: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    if (password.length < 8 || password.length > 72) {
      toast({ title: "Password must be 8-72 characters.", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: mail, password })
        : await supabase.auth.signUp({
            email: mail,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth` },
          });
    setBusy(false);

    if (error) {
      toast({
        title: mode === "signin" ? "Couldn't sign in" : "Couldn't create your account",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    if (mode === "signup") {
      toast({ title: "Welcome to MarkerQuest!" });
    }
  };

  const googleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth?from=${encodeURIComponent(from)}` },
    });
    if (error) toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
  };

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title={mode === "signin" ? "Sign In" : "Create Account"} />
      <div className="px-5 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-card p-4 elevation-1">
          <div>
            <label htmlFor="email" className="text-xs font-medium text-on-surface-variant">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              className="mt-1 w-full rounded-lg bg-surface-variant px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-medium text-on-surface-variant">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={72}
              className="mt-1 w-full rounded-lg bg-surface-variant px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground elevation-1 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>
          <button
            type="button"
            onClick={googleSignIn}
            className="w-full rounded-xl border border-border py-3 font-display text-sm font-medium text-foreground"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => {
              enableGuest();
              navigate(from === "/profile" || from === "/dashboard" ? "/" : from, { replace: true });
            }}
            className="w-full rounded-xl bg-surface-variant py-3 font-display text-sm font-medium text-foreground"
          >
            Continue as guest
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-on-surface-variant underline"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-on-surface-variant">
          As a guest you can explore every city, map and marker — your visited sites stay on this
          device and carry over if you create an account later. An account keeps visits synced across
          devices, unlocks your profile and shareable visit history, and lets you choose which
          messages you receive.
        </p>

      </div>
    </div>
  );
};

export default AuthPage;
