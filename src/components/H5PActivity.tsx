import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { completeAttempt, h5pContentPath, startAttempt } from "@/hooks/useH5P";
import type { QuestAward } from "@/hooks/useQuest";

interface XAPIStatement {
  verb?: { id?: string };
  result?: { completion?: boolean; score?: { raw?: number; max?: number; scaled?: number } };
  context?: { contextActivities?: { parent?: unknown[] } };
}

interface Props {
  activityId: string;
  /** Called with the server's verdict after a verified completion. */
  onAward?: (award: QuestAward) => void;
  onStatus?: (status: string) => void;
  /** Admin preview: play without starting an attempt. */
  preview?: boolean;
  /** Generated activities ship only content; libraries come from the app's shared set. */
  sharedLibraries?: boolean;
}

/** Plays one unpacked H5P package and reports its completion to the server. */
const H5PActivity = ({ activityId, onAward, onStatus, preview, sharedLibraries }: Props) => {
  const el = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attemptId: string | null = null;
    let reported = false;

    const onXAPI = async (event: { data?: { statement?: XAPIStatement } }) => {
      const s = event?.data?.statement;
      if (!s || reported || !attemptId) return;
      const topLevel = !s.context?.contextActivities?.parent?.length;
      const done = s.verb?.id?.endsWith("/completed") || (s.result?.completion === true && topLevel);
      if (!done) return;
      reported = true;
      onStatus?.("Checking your finish…");
      try {
        const res = await completeAttempt(activityId, attemptId, { verb: s.verb?.id, score: s.result?.score ?? null });
        onAward?.(res);
        onStatus?.(res.awarded ? `Finished! +${res.amount} Quest Coins` : res.reason ?? "Finished");
      } catch (e) {
        reported = false; // allow a later completed statement (e.g. after the minimum time)
        onStatus?.(e instanceof Error ? e.message : "Couldn't confirm your finish");
      }
    };

    (async () => {
      try {
        if (!preview) {
          const s = await startAttempt(activityId);
          attemptId = s.attempt_id;
          if (s.collected) onStatus?.("You've already collected Quest Coins for this activity.");
        }
        const { H5P } = await import("h5p-standalone");
        if (cancelled || !el.current) return;
        await new H5P(el.current, {
          h5pJsonPath: h5pContentPath(activityId),
          frameJs: "/h5p-player/frame.bundle.js",
          frameCss: "/h5p-player/styles/h5p.css",
          fullScreen: true,
          ...(sharedLibraries ? { librariesPath: `${window.location.origin}/h5p-libraries` } : {}),
        });
        if (cancelled) return;
        const frame = el.current.querySelector("iframe");
        const frameDocument = frame?.contentDocument;
        if (frame && !frame.title) frame.title = "Interactive history activity";
        if (frameDocument?.head && !frameDocument.querySelector('[data-markerquest-activity-theme]')) {
          const theme = frameDocument.createElement("link");
          theme.rel = "stylesheet";
          theme.href = "/h5p-player/styles/markerquest-activity.css";
          theme.dataset.markerquestActivityTheme = "true";
          frameDocument.head.appendChild(theme);
        }
        const w = window as unknown as { H5P?: { externalDispatcher?: { on: (n: string, f: typeof onXAPI) => void } } };
        w.H5P?.externalDispatcher?.on("xAPI", onXAPI);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "This activity couldn't load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      const w = window as unknown as { H5P?: { externalDispatcher?: { off?: (n: string, f: typeof onXAPI) => void } } };
      w.H5P?.externalDispatcher?.off?.("xAPI", onXAPI);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, preview, sharedLibraries]);

  return (
    <div className="activity-player relative min-h-[260px] overflow-hidden rounded-lg border border-activity-border bg-activity-paper sm:min-h-[320px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-activity-paper" role="status">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-activity-soft">
            <Loader2 className="h-6 w-6 animate-spin text-activity" />
          </span>
          <span className="font-activity-body text-sm font-medium text-activity-ink/70">Preparing your challenge…</span>
        </div>
      )}
      {error && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <p className="max-w-sm font-activity-body text-base leading-relaxed text-destructive">{error}</p>
        </div>
      )}
      <div ref={el} />
    </div>
  );
};

export default H5PActivity;
