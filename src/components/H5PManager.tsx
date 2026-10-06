import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Loader2, Puzzle, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callH5P, generateActivities, useH5PActivities, type H5PActivityRow } from "@/hooks/useH5P";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { usePublishedStoryMarkers } from "@/hooks/usePublishedStoryMarkers";
import H5PActivity from "@/components/H5PActivity";

/** Admin/creator panel: upload, order, publish and preview H5P activities for one marker. */
const H5PManager = ({ slug }: { slug: string }) => {
  const { items, reload } = useH5PActivities(slug, true);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const regular = useAllMarkers();
  const { markers: stories } = usePublishedStoryMarkers();
  const marker = regular.find((m) => m.id === slug) ?? stories.find((m) => m.id === slug);
  const [generating, setGenerating] = useState(false);

  const regenerate = async () => {
    if (!marker) return toast.error("Save or publish this marker first.");
    setGenerating(true);
    try {
      const r = await generateActivities(marker);
      if (r.created) toast.success(`Created ${r.created} activit${r.created === 1 ? "y" : "ies"}.`);
      else toast.message(r.reason ?? "No activities created.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate activities.");
    } finally {
      setGenerating(false);
    }
  };

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Choose an .h5p file first.");
    if (!file.name.toLowerCase().endsWith(".h5p")) return toast.error("That isn't an .h5p file.");
    if (file.size > 50 * 1024 * 1024) return toast.error("That file is over 50MB.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("marker_slug", slug);
      fd.append("title", title);
      await callH5P(fd);
      toast.success("Activity uploaded as a draft.");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const patch = async (a: H5PActivityRow, values: Partial<H5PActivityRow>) => {
    const { error } = await supabase.from("h5p_activities").update(values).eq("id", a.id);
    if (error) toast.error(error.message); else reload();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = items[i], b = items[i + dir];
    if (!a || !b) return;
    await supabase.from("h5p_activities").update({ position: b.position }).eq("id", a.id);
    await supabase.from("h5p_activities").update({ position: a.position === b.position ? a.position + dir : a.position }).eq("id", b.id);
    reload();
  };

  const remove = async (a: H5PActivityRow) => {
    if (!confirm(`Delete "${a.title}"? Coins already earned stay with visitors.`)) return;
    try {
      await callH5P({ action: "delete", activity_id: a.id });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <section className="space-y-3 rounded-xl bg-card p-4 elevation-1">
      <div className="flex items-center gap-2">
        <Puzzle className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold">H5P Activities</h2>
      </div>
      <p className="text-xs text-on-surface-variant">
        Upload .h5p packages (up to 50MB). New uploads start as drafts. Signed-in visitors earn the reward once per activity.
      </p>

      <button
        type="button"
        onClick={regenerate}
        disabled={generating}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
      >
        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {items.some((a) => a.generated) ? "Regenerate story activities" : "Generate story activities"}
      </button>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional — uses the package title)"
          maxLength={120}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input ref={fileRef} type="file" accept=".h5p" aria-label="H5P file" className="w-full text-xs" />
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Unpacking…" : "Upload activity"}
        </button>
      </div>

      {items.map((a, i) => (
        <div key={a.id} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <input
              defaultValue={a.title}
              onBlur={(e) => e.target.value.trim() && e.target.value !== a.title && patch(a, { title: e.target.value.trim().slice(0, 120) })}
              aria-label="Activity title"
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
            />
            <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown className="h-4 w-4" /></button>
          </div>
          <p className="text-[11px] text-on-surface-variant">{a.library}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              Coins
              <input type="number" min={0} max={500} defaultValue={a.reward_amount}
                onBlur={(e) => patch(a, { reward_amount: Math.max(0, Math.min(500, Number(e.target.value) || 0)) })}
                className="w-16 rounded border border-border bg-background px-1 py-0.5" />
            </label>
            <label className="flex items-center gap-1">
              Min. seconds
              <input type="number" min={0} max={3600} defaultValue={a.min_seconds}
                onBlur={(e) => patch(a, { min_seconds: Math.max(0, Math.min(3600, Number(e.target.value) || 0)) })}
                className="w-16 rounded border border-border bg-background px-1 py-0.5" />
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={a.published} onChange={(e) => patch(a, { published: e.target.checked })} />
              Published
            </label>
          </div>
          <div className="flex gap-3 text-xs">
            <button type="button" onClick={() => setPreview(preview === a.id ? null : a.id)} className="flex items-center gap-1 text-primary">
              <Eye className="h-3.5 w-3.5" /> {preview === a.id ? "Close preview" : "Preview"}
            </button>
            <button type="button" onClick={() => remove(a)} className="flex items-center gap-1 text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
          {preview === a.id && <H5PActivity activityId={a.id} preview sharedLibraries={a.generated} />}
        </div>
      ))}
    </section>
  );
};

export default H5PManager;
