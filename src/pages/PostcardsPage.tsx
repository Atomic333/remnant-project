import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Mail } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Postcard from "@/components/Postcard";
import { useAuth } from "@/hooks/useAuth";
import { callDiscovery } from "@/lib/discovery";
import { usePublishedTrails } from "@/lib/trails";
import { getCity } from "@/data/cities";

interface CatalogCard {
  id: string;
  collected: boolean;
  collected_at?: string;
  marker_slug: string | null;
  city: string | null;
  set_code: string | null;
  title: string;
  location: string;
  front_url?: string | null;
  front_alt?: string;
  back_text?: string;
  credits?: string;
  sources?: { name: string; url?: string }[];
  commemorative?: boolean;
}
interface Catalog {
  postcards: CatalogCard[];
  sets: { code: string; name: string; city: string | null; trail_id: string | null }[];
}

/** Share image: artwork, title and place only. No dates or personal details. */
async function downloadShareImage(card: CatalogCard) {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 800;
  const ctx = c.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  ctx.fillStyle = `hsl(${css.getPropertyValue("--quest-navy")})`;
  ctx.fillRect(0, 0, 1200, 800);
  if (card.front_url) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = card.front_url;
      await img.decode();
      const s = Math.max(1200 / img.width, 800 / img.height);
      ctx.drawImage(img, (1200 - img.width * s) / 2, (800 - img.height * s) / 2, img.width * s, img.height * s);
    } catch {
      /* artwork missing: keep the plain background */
    }
  }
  const g = ctx.createLinearGradient(0, 480, 0, 800);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 480, 1200, 320);
  ctx.fillStyle = "#fff";
  ctx.font = "600 56px sans-serif";
  ctx.fillText(card.title.slice(0, 40), 48, 700);
  ctx.font = "32px sans-serif";
  ctx.fillText(`${card.location}  ·  MarkerQuest.ai`.slice(0, 70), 48, 752);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `${card.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-postcard.png`;
  a.click();
}

const PostcardsPage = () => {
  const { user } = useAuth();
  const { data: trails } = usePublishedTrails();
  const [city, setCity] = useState("all");
  const [trail, setTrail] = useState("all");
  const [status, setStatus] = useState<"all" | "collected" | "missing">("all");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["postcards", user?.id ?? null],
    queryFn: () => callDiscovery<Catalog>({ action: "catalog" }),
  });

  const cards = data?.postcards ?? [];
  const cities = useMemo(() => Array.from(new Set(cards.map((c) => c.city).filter(Boolean))) as string[], [cards]);
  const trailMarkerIds = useMemo(() => {
    const t = (trails ?? []).find((x) => x.id === trail);
    return t ? new Set(t.revision?.stops?.map((s) => s.marker_id) ?? []) : null;
  }, [trails, trail]);

  const visible = cards.filter(
    (c) =>
      (city === "all" || c.city === city) &&
      (status === "all" || (status === "collected" ? c.collected : !c.collected)) &&
      (!trailMarkerIds || (c.marker_slug && trailMarkerIds.has(c.marker_slug))),
  );
  const collectedCount = cards.filter((c) => c.collected).length;

  const selectClass = "rounded-lg bg-surface-variant px-2 py-2 text-xs text-foreground";

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="My Postcards" />
      <div className="space-y-4 px-5 pt-4">
        <p className="text-sm text-on-surface-variant">
          {collectedCount} of {cards.length} postcards collected
        </p>
        {!user && (
          <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            Sign in to keep your postcards on every device.
          </p>
        )}

        {(data?.sets ?? []).map((s) => {
          const inSet = cards.filter((c) => c.set_code === s.code);
          if (!inSet.length) return null;
          const got = inSet.filter((c) => c.collected).length;
          return (
            <div key={s.code} className="rounded-xl bg-card p-3 elevation-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-card-foreground">{s.name}</span>
                <span className="text-on-surface-variant">{got} of {inSet.length} collected</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-variant" role="progressbar" aria-valuemin={0} aria-valuemax={inSet.length} aria-valuenow={got}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${(got / inSet.length) * 100}%` }} />
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} className={selectClass}>
            <option value="all">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{getCity(c).name}</option>)}
          </select>
          <select aria-label="Filter by trail" value={trail} onChange={(e) => setTrail(e.target.value)} className={selectClass}>
            <option value="all">All trails</option>
            {(trails ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={selectClass}>
            <option value="all">All</option>
            <option value="collected">Collected</option>
            <option value="missing">Not yet collected</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Couldn't load postcards. <button onClick={() => refetch()} className="underline">Try again</button>
          </p>
        ) : !visible.length ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Mail className="h-8 w-8 text-on-surface-variant" />
            <p className="mt-2 text-sm text-on-surface-variant">
              {cards.length ? "No postcards match these filters." : "No postcards to collect yet. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visible.map((c) => (
              <div key={c.id} className="space-y-1">
                <Postcard card={{ ...c, locked: !c.collected }} />
                {c.collected && (
                  <button onClick={() => void downloadShareImage(c)} className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Download className="h-3.5 w-3.5" /> Share image
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostcardsPage;
