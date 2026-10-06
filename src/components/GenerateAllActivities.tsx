import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateActivities } from "@/hooks/useH5P";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { usePublishedStoryMarkers } from "@/hooks/usePublishedStoryMarkers";

const BATCH = 5;

/** Admin: build grounded story challenges + timelines for every marker and published story. */
const GenerateAllActivities = () => {
  const regular = useAllMarkers();
  const { markers: stories } = usePublishedStoryMarkers();
  const all = [...regular, ...stories];
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [tally, setTally] = useState({ created: 0, skipped: 0, failed: 0 });
  const [failures, setFailures] = useState<string[]>([]);

  const run = async () => {
    if (!confirm(`Generate activities for ${all.length} markers? Earlier generated activities are replaced; uploads stay.`)) return;
    setRunning(true); setDone(0); setTally({ created: 0, skipped: 0, failed: 0 }); setFailures([]);
    const t = { created: 0, skipped: 0, failed: 0 };
    for (let i = 0; i < all.length; i += BATCH) {
      const results = await Promise.allSettled(all.slice(i, i + BATCH).map((m) => generateActivities(m)));
      let stop = false;
      results.forEach((r, j) => {
        const m = all[i + j];
        if (r.status === "fulfilled") { if (r.value.created) t.created += r.value.created; else t.skipped++; }
        else {
          t.failed++;
          const msg = r.reason instanceof Error ? r.reason.message : "failed";
          setFailures((f) => [...f, `${m.name}: ${msg}`]);
          if (/credit|limit/i.test(msg)) stop = true;
        }
      });
      setTally({ ...t }); setDone(Math.min(i + BATCH, all.length));
      if (stop) { toast.error("Stopped: AI credits ran out."); break; }
    }
    setRunning(false);
    toast.success(`Created ${t.created} activities.`);
  };

  return (
    <section className="space-y-2 rounded-xl bg-card p-4 elevation-1">
      <h2 className="font-display text-sm font-semibold">Story activities for every marker</h2>
      <p className="text-xs text-on-surface-variant">
        Builds a story challenge (multiple choice, true/false, missing words) and, where the story has 3+ dates, a timeline — using only each marker's own text. They go live right away.
      </p>
      <button
        type="button" onClick={run} disabled={running || !all.length}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {running ? `Working… ${done}/${all.length}` : `Generate activities for all ${all.length} markers`}
      </button>
      {(done > 0) && (
        <p className="text-xs text-on-surface-variant" role="status">
          {tally.created} created · {tally.skipped} skipped (too little text) · {tally.failed} failed
        </p>
      )}
      {failures.length > 0 && (
        <ul className="max-h-32 overflow-auto text-xs text-destructive">{failures.map((f) => <li key={f}>{f}</li>)}</ul>
      )}
    </section>
  );
};

export default GenerateAllActivities;
