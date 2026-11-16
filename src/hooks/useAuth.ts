import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (!next?.user) {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (!data.session?.user) setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  const checkedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    // Token refreshes (e.g. returning to the tab) must not flash the loading screen.
    if (checkedFor.current !== userId) setLoading(true);
    Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("is_creator", { _user_id: userId }),
    ]).then(([a, c]) => {
      if (!active) return;
      setIsAdmin(Boolean(a.data));
      setIsCreator(Boolean(c.data));
      checkedFor.current = userId;
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  return { session, user, isAdmin, isCreator, loading, signOut: () => supabase.auth.signOut() };
}
