import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { QuestAward } from "@/hooks/useQuest";

export interface H5PActivityRow {
  id: string;
  marker_slug: string;
  title: string;
  library: string | null;
  reward_amount: number;
  min_seconds: number;
  position: number;
  published: boolean;
}

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/h5p`;
export const h5pContentPath = (id: string) => `${FN_URL}/file/${id}`;

async function readError(error: unknown) {
  let message = error instanceof Error ? error.message : "Something went wrong";
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const p = await ctx.json();
      if (p?.error) message = String(p.error);
    } catch { /* ignore */ }
  }
  return message;
}

export async function callH5P<T>(body: Record<string, unknown> | FormData): Promise<T> {
  const { data, error } = await supabase.functions.invoke("h5p", { body });
  if (error) throw new Error(await readError(error));
  return data as T;
}

export const startAttempt = (activityId: string) =>
  callH5P<{ attempt_id: string | null; earnable: boolean; collected?: boolean; min_seconds?: number }>({ action: "start", activity_id: activityId });

export const completeAttempt = (activityId: string, attemptId: string, result: unknown) =>
  callH5P<QuestAward>({ action: "complete", activity_id: activityId, attempt_id: attemptId, result });

export function useH5PActivities(slug: string | undefined, includeDrafts = false) {
  const [items, setItems] = useState<H5PActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!slug) return;
    let q = supabase.from("h5p_activities")
      .select("id, marker_slug, title, library, reward_amount, min_seconds, position, published")
      .eq("marker_slug", slug).order("position");
    if (!includeDrafts) q = q.eq("published", true);
    const { data } = await q;
    setItems((data ?? []) as H5PActivityRow[]);
    setLoading(false);
  }, [slug, includeDrafts]);
  useEffect(() => { reload(); }, [reload]);
  return { items, loading, reload };
}
