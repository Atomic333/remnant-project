import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { getMarkerImage } from "@/lib/markerImages";
import { COMING_SOON_TEXT, DEFAULT_CITY_ID, getCity } from "@/data/cities";
import { cityProgress, overallProgress, formatVisitDate } from "@/lib/visitStats";
import logo from "@/assets/logo.png";

interface SharedRow {
  display_name: string | null;
  avatar_url: string | null;
  marker_id: string | null;
  visited_at: string | null;
}

const SharedVisitsPage = () => {
  const { code } = useParams<{ code: string }>();
  const markers = useAllMarkers();

  const { data, isLoading } = useQuery({
    queryKey: ["shared-visits", code],
    enabled: Boolean(code),
    queryFn: async (): Promise<SharedRow[]> => {
      const { data, error } = await supabase.rpc("get_shared_visits", { _code: code as string });
      if (error) throw error;
      return (data ?? []) as SharedRow[];
    },
  });

  const rows = data ?? [];
  const owner = rows[0] ?? null;
  const visitedIds = useMemo(
    () => new Set(rows.map((r) => r.marker_id).filter((id): id is string => Boolean(id))),
    [rows],
  );

  const overall = useMemo(() => overallProgress(markers, visitedIds), [markers, visitedIds]);
  const perCity = useMemo(() => cityProgress(markers, visitedIds), [markers, visitedIds]);

  const history = rows
    .filter((r) => r.marker_id)
    .map((r) => ({ row: r, marker: markers.find((m) => m.id === r.marker_id) }))
    .filter((x) => x.marker);

  const name = owner?.display_name?.trim() || "A MarkerQuest explorer";
  const avatarSrc = owner?.avatar_url?.startsWith("http") ? owner.avatar_url : undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
        <Lock className="h-7 w-7 text-on-surface-variant" />
        <h1 className="mt-3 font-display text-xl font-medium text-foreground">
          This visit history isn't shared
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          The link may have been turned off or never existed.
        </p>
        <Link
          to="/auth"
          className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Start your own MarkerQuest
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="flex items-center gap-2 px-5 pt-5 pb-2">
        <img src={logo} alt="MarkerQuest logo" className="h-7 w-7 object-contain" />
        <span className="font-display text-lg font-medium text-primary">MarkerQuest.ai</span>
      </header>

      <div className="space-y-4 px-5 pt-2">
        <section className="rounded-2xl bg-card p-4 elevation-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={name} />}
              <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-medium text-foreground">{name}</h1>
              <p className="text-xs text-on-surface-variant">Marker visit history</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <p className="flex-1 font-display text-2xl font-medium text-foreground">
              {overall.visited}
              <span className="text-base text-on-surface-variant"> / {overall.total} markers</span>
            </p>
            <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {overall.pct}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-variant">
            <div className="h-full rounded-full bg-primary" style={{ width: `${overall.pct}%` }} />
          </div>
        </section>

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
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-display text-sm font-medium text-foreground">Markers visited</h2>
          {history.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-center text-sm text-on-surface-variant elevation-1">
              No markers visited yet.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map(({ row, marker }) => (
                <Link
                  key={marker!.id}
                  to={`/marker/${marker!.id}`}
                  className="flex w-full items-center gap-3 rounded-xl bg-card p-3 elevation-1"
                >
                  <img
                    src={getMarkerImage(marker!.id, marker!.image)}
                    alt={marker!.name}
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-medium text-card-foreground">
                      {marker!.name}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {getCity(marker!.city ?? DEFAULT_CITY_ID).name}
                      {row.visited_at ? ` • ${formatVisitDate(row.visited_at)}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link
          to="/auth"
          className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground elevation-1"
        >
          Start your own MarkerQuest
        </Link>
      </div>
    </div>
  );
};

export default SharedVisitsPage;
