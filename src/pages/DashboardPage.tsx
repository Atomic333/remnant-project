import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Download, Share2, Trophy, MapPin, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { useVisited } from "@/hooks/useVisited";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useShareLink } from "@/hooks/useShareLink";
import { getMarkerImage } from "@/lib/markerImages";
import { COMING_SOON_TEXT, DEFAULT_CITY_ID, getCity } from "@/data/cities";
import { cityProgress, overallProgress, formatVisitDate } from "@/lib/visitStats";
import { downloadProgressCard } from "@/lib/progressCard";

const DashboardPage = () => {
  const navigate = useNavigate();
  const markers = useAllMarkers();
  const { records, visited, loading } = useVisited();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { enabled, shareUrl, setEnabled, busy } = useShareLink();
  const [downloading, setDownloading] = useState(false);

  const overall = useMemo(() => overallProgress(markers, visited), [markers, visited]);
  const perCity = useMemo(() => cityProgress(markers, visited), [markers, visited]);

  const history = useMemo(
    () =>
      records
        .map((r) => ({ record: r, marker: markers.find((m) => m.id === r.marker_id) }))
        .filter((row): row is { record: typeof records[number]; marker: NonNullable<typeof row.marker> } =>
          Boolean(row.marker),
        ),
    [records, markers],
  );

  const lastVisit = history.find((h) => h.record.visited_at)?.record.visited_at ?? null;
  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Explorer";

  const handleToggleShare = async (next: boolean) => {
    try {
      const url = await setEnabled(next);
      toast({
        title: next ? "Share link is live" : "Sharing turned off",
        description: next ? url ?? undefined : "Your link no longer works.",
      });
    } catch (e) {
      toast({
        title: "Couldn't update sharing",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", description: shareUrl, variant: "destructive" });
    }
  };

  const nativeShare = async () => {
    const text = `I've visited ${overall.visited} of ${overall.total} historical markers on MarkerQuest.ai`;
    const url = shareUrl ?? "https://markerquest.ai";
    if (navigator.share) {
      try {
        await navigator.share({ title: "My MarkerQuest visits", text, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(`${text} — ${url}`).catch(() => undefined);
    toast({ title: "Summary copied" });
  };

  const downloadCard = async () => {
    setDownloading(true);
    try {
      await downloadProgressCard({
        name: displayName,
        visited: overall.visited,
        total: overall.total,
        pct: overall.pct,
        cities: perCity,
        shareUrl,
      });
    } catch (e) {
      toast({
        title: "Couldn't create the image",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="My Dashboard" />

      <div className="space-y-4 px-5 pt-2">
        {/* Overall stats */}
        <section className="rounded-2xl bg-card p-4 elevation-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display text-2xl font-medium text-foreground">
                {overall.visited}
                <span className="text-base text-on-surface-variant"> / {overall.total} markers</span>
              </p>
              <p className="text-xs text-on-surface-variant">
                {lastVisit ? `Last visit ${formatVisitDate(lastVisit)}` : "No visits logged yet"}
              </p>
            </div>
            <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {overall.pct}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-variant">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${overall.pct}%` }}
            />
          </div>
        </section>

        {/* Per-city progress */}
        <section className="rounded-2xl bg-card p-4 elevation-1">
          <h2 className="font-display text-sm font-medium text-foreground">Cities</h2>
          <div className="mt-3 space-y-4">
            {perCity.map((row) => (
              <div key={row.city.id}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {row.city.name}, {row.city.state}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {row.total > 0 ? `${row.visited} of ${row.total}` : COMING_SOON_TEXT}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-variant">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Share */}
        <section className="rounded-2xl bg-card p-4 elevation-1">
          <h2 className="font-display text-sm font-medium text-foreground">Share my visits</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-foreground">Public share link</p>
              <p className="text-xs text-on-surface-variant">
                {enabled && shareUrl ? shareUrl.replace("https://", "") : "Off — nobody can see your history"}
              </p>
            </div>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
            ) : (
              <Switch checked={enabled} onCheckedChange={handleToggleShare} aria-label="Public share link" />
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={copyLink}
              disabled={!enabled || !shareUrl}
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-medium text-secondary-foreground disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy link
            </button>
            <button
              onClick={nativeShare}
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-xs font-medium text-secondary-foreground"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          <button
            onClick={downloadCard}
            disabled={downloading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground elevation-1 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download progress card
          </button>
        </section>

        {/* Visit history */}
        <section>
          <h2 className="mb-2 font-display text-sm font-medium text-foreground">Visit history</h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl bg-card p-6 text-center elevation-1">
              <MapPin className="mx-auto h-6 w-6 text-on-surface-variant" />
              <p className="mt-2 text-sm text-on-surface-variant">
                No markers visited yet. Scan a marker's QR code or mark one visited to start your history.
              </p>
              <button
                onClick={() => navigate("/map")}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
              >
                Explore the map
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(({ record, marker }) => (
                <button
                  key={marker.id}
                  onClick={() => navigate(`/marker/${marker.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left elevation-1"
                >
                  <img
                    src={getMarkerImage(marker.id, marker.image)}
                    alt={marker.name}
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-medium text-card-foreground">
                      {marker.name}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {getCity(marker.city ?? DEFAULT_CITY_ID).name}
                      {record.visited_at ? ` • ${formatVisitDate(record.visited_at)}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default DashboardPage;
