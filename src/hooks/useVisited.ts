import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "markerquest_visited";
const MIGRATED_KEY = "markerquest_visited_migrated";

export interface VisitRecord {
  marker_id: string;
  visited_at: string;
}

function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

async function fetchVisits(userId: string): Promise<VisitRecord[]> {
  const { data, error } = await supabase
    .from("marker_visits")
    .select("marker_id, visited_at")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VisitRecord[];
}

/**
 * Visit tracking. Signed in: rows in `marker_visits` (synced across devices).
 * Signed out (public QR marker pages): localStorage, merged into the account on first sign-in.
 */
export function useVisited() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const [, bump] = useState(0);

  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    window.addEventListener("markerquest:visited-changed", onChange);
    return () => window.removeEventListener("markerquest:visited-changed", onChange);
  }, []);

  const query = useQuery({
    queryKey: ["visits", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchVisits(userId as string),
  });

  // One-time merge of device-local visits into the account.
  useEffect(() => {
    if (!userId) return;
    const flag = `${MIGRATED_KEY}_${userId}`;
    if (localStorage.getItem(flag)) return;
    const local = loadLocal();
    localStorage.setItem(flag, "1");
    if (local.length === 0) return;
    supabase
      .from("marker_visits")
      .upsert(
        local.map((marker_id) => ({ user_id: userId, marker_id })),
        { onConflict: "user_id,marker_id", ignoreDuplicates: true },
      )
      .then(() => queryClient.invalidateQueries({ queryKey: ["visits", userId] }));
  }, [userId, queryClient]);

  const records: VisitRecord[] = userId
    ? query.data ?? []
    : loadLocal().map((marker_id) => ({ marker_id, visited_at: "" }));

  const visited = new Set(records.map((r) => r.marker_id));

  const toggle = async (id: string) => {
    if (!userId) {
      const local = loadLocal();
      const next = local.includes(id) ? local.filter((v) => v !== id) : [...local, id];
      saveLocal(next);
      queryClient.invalidateQueries({ queryKey: ["visits", null] });
      // Force re-render for signed-out consumers.
      window.dispatchEvent(new Event("markerquest:visited-changed"));
      return;
    }
    if (visited.has(id)) {
      await supabase.from("marker_visits").delete().eq("user_id", userId).eq("marker_id", id);
    } else {
      await supabase
        .from("marker_visits")
        .upsert({ user_id: userId, marker_id: id }, { onConflict: "user_id,marker_id" });
    }
    await queryClient.invalidateQueries({ queryKey: ["visits", userId] });
  };

  const isVisited = (id: string) => visited.has(id);

  // Oldest-first, for drawing a visited trail on the map.
  const recordsChronological = [...records].sort((a, b) => {
    if (!a.visited_at) return 1;
    if (!b.visited_at) return -1;
    return new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime();
  });

  return { visited, records, recordsChronological, toggle, isVisited, loading: Boolean(userId) && query.isLoading };
}
