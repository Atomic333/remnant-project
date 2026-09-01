import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email_opt_in: boolean;
  notifications_opt_in: boolean;
  ads_opt_in: boolean;
  onboarded_at: string | null;
  share_code: string | null;
  share_enabled: boolean;
}

export interface ProfilePrefs {
  email_opt_in: boolean;
  notifications_opt_in: boolean;
  ads_opt_in: boolean;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url, email_opt_in, notifications_opt_in, ads_opt_in, onboarded_at, share_code, share_enabled")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;

      // Profile row missing (e.g. legacy account) — create it.
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: userId, email: user?.email ?? null })
        .select("id, email, display_name, avatar_url, email_opt_in, notifications_opt_in, ads_opt_in, onboarded_at, share_code, share_enabled")
        .maybeSingle();
      if (insertError) throw insertError;
      return (created as Profile) ?? null;
    },
  });

  const update = async (patch: Partial<Omit<Profile, "id" | "email">>) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  };

  const savePreferences = async (prefs: ProfilePrefs) =>
    update({ ...prefs, onboarded_at: new Date().toISOString() });

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    update,
    savePreferences,
  };
}

/** Resolves a stored avatar path in the private `avatars` bucket to a signed URL. */
export async function resolveAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}
