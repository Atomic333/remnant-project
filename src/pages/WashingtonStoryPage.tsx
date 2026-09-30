import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronDown, ExternalLink, Info, MapPin, Pause, Play, X, Check, Clock } from "lucide-react";
import { useCollection, locationLabel, focusTone, type CImage } from "@/hooks/useCollection";
import { useMotion, motion, stagger } from "@/lib/motion";
import AtlasImage, { sized, TitleCard } from "@/components/atlas/AtlasImage";
import MarkerActivities from "@/components/MarkerActivities";

const WashingtonStoryPage = () => {
  const { markerId = "" } = useParams();
  const navigate = useNavigate();
  const { markers, images, sources, loading } = useCollection(true);
  const m = useMotion();
  const [progress, setProgress] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);

  const story = markers.find((x) => x.marker_id === markerId);
  const gallery = useMemo(() => images.filter((i) => i.marker_id === markerId), [images, markerId]);
  const refs = useMemo(() => sources.filter((s) => s.marker_id === markerId), [sources, markerId]);
  const related = useMemo(() => {
    if (!story) return [];
    return markers.filter((x) => x.marker_id !== story.marker_id)
      .map((x) => ({ x, score: (x.region === story.region ? 2 : 0) + (x.category === story.category ? 2 : 0) + (x.history_focus === story.history_focus ? 1 : 0) }))
      .filter((r) => r.score > 1).sort((a, b) => b.score - a.score).slice(0, 4).map((r) => r.x);
  }, [markers, story]);

  useEffect(() => {
    const on = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(1, window.scrollY / h) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [story]);
  useEffect(() => { window.scrollTo(0, 0); }, [markerId]);
  useEffect(() => {
    if (lightbox === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % gallery.length));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [lightbox, gallery.length]);

  if (loading) return <div className="atlas min-h-dvh" />;
  if (!story) {
    return (
      <div className="atlas flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center font-atlas-sans">
        <p className="font-atlas text-2xl">Story not available</p>
        <Link to="/explore/washington" className="text-atlas-gold underline">Back to the collection</Link>
      </div>
    );
  }

  const quiet = story.sensitive; // sensitive sites: quiet fades only, no zoom, no gold flourishes
  const enter = quiet ? motion.fade : motion.rise;
  const hero = gallery[0];
  const settings = (story.draft_settings ?? {}) as { questCoins?: number | null; revealAnimation?: string | null };
  const years = [...new Set([...(story.period ?? "").matchAll(/\b(1[6-9]\d\d|20\d\d)\b[^;]*/g)].map((x) => x[0].trim()))].slice(0, 8);
  const paragraphs = (story.story ?? "").split(/\n{2,}|\r\n\r\n/).filter(Boolean);

  return (
    <div className="atlas atlas-grain min-h-dvh pb-24 font-atlas-sans" data-motion={m.enabled ? "on" : "off"}>
      <div className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent" aria-hidden>
        <div className="h-full origin-left bg-atlas-gold" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-atlas-night/85 px-3 py-2 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Back" className="rounded-full p-2 hover:bg-atlas-char"><ArrowLeft className="h-5 w-5" /></button>
        <span className="truncate font-mono text-[11px] text-atlas-mist">{story.marker_id}</span>
        {story.status !== "published" && <span className="rounded-full border border-atlas-gold/50 px-2 py-0.5 text-[10px] text-atlas-gold">Draft preview</span>}
        <button onClick={m.toggle} aria-pressed={!m.enabled} className="ml-auto flex items-center gap-1 rounded-full border border-atlas-mist/30 px-3 py-1 text-xs">
          {m.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} Motion {m.enabled ? "on" : "off"}
        </button>
      </div>

      {/* Hero */}
      <header className="relative">
        <div className="relative aspect-[4/3] max-h-[70vh] w-full overflow-hidden md:aspect-[21/9]">
          {hero ? (
            <button onClick={() => setLightbox(0)} className="h-full w-full" aria-label="View full image">
              <AtlasImage image={hero} title={story.title} subtitle={story.city_name} width={1400} eager className="h-full w-full" imgClassName={quiet ? "" : motion.zoom} />
            </button>
          ) : <TitleCard title={story.title} subtitle={story.city_name} />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-atlas-night via-atlas-night/30 to-transparent" />
        </div>
        {hero && <p className="mx-auto max-w-3xl px-5 pt-2 text-[11px] text-atlas-mist">{hero.caption} {hero.attribution && <span>— {hero.attribution}</span>}</p>}
        <div className={`mx-auto max-w-3xl px-5 pt-4 ${enter}`}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-atlas-gold">{focusTone(story.history_focus)} history · {story.region ?? story.region_label}</p>
          <h1 className="mt-2 font-atlas text-3xl leading-tight md:text-5xl">{story.title}</h1>
          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-[10px] uppercase tracking-wider text-atlas-mist">Community or nation</dt><dd>{story.community}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-atlas-mist">Place</dt><dd>{story.city_name}{story.county ? `, ${story.county} County` : ""}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-atlas-mist">Period</dt><dd className="line-clamp-3">{story.period}</dd></div>
          </dl>
          <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-atlas-char px-3 py-1 text-[11px] text-atlas-mist">
            <BookOpen className="h-3.5 w-3.5" />
            {story.narrative_kind === "plaque" ? "Verified plaque transcription" : "Original research narrative — not a plaque transcription"}
          </p>
          {quiet && (
            <p className="mt-3 rounded-lg border border-atlas-mist/20 px-4 py-3 text-sm text-atlas-paper/90">
              This is a place of remembrance. Please visit quietly and with respect.
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 pt-6">
        {/* Reading surface */}
        <article className={`atlas-paper-surface rounded-2xl p-5 md:p-8 ${enter}`}>
          <p className="font-atlas text-lg italic leading-relaxed text-atlas-ink">{story.summary}</p>
          <div className="mt-5 space-y-4 font-atlas text-[17px] leading-[1.7] text-atlas-ink">
            {paragraphs.map((p, i) => <p key={i} className={enter} style={stagger(i, 80)}>{p}</p>)}
          </div>
          {story.why_it_matters && (
            <section className="mt-6 border-t border-atlas-paper-deep pt-5">
              <h2 className="font-atlas-sans text-[11px] uppercase tracking-[0.2em] text-atlas-cedar">Why this place matters</h2>
              <p className="mt-2 font-atlas text-[17px] leading-relaxed text-atlas-ink">{story.why_it_matters}</p>
            </section>
          )}
        </article>

        {/* Timeline — only when the period text carries years */}
        {years.length > 1 && (
          <section aria-labelledby="tl-h" className={enter}>
            <h2 id="tl-h" className="font-atlas text-xl">Timeline</h2>
            <ol className="mt-3 space-y-3 border-l border-atlas-gold/40 pl-4">
              {years.map((y, i) => (
                <li key={y} className={`relative ${enter}`} style={stagger(i, 90)}>
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-atlas-gold" />
                  <span className="text-sm text-atlas-paper/90">{y}</span>
                </li>
              ))}
            </ol>
            <p className="mt-1 text-[11px] text-atlas-mist">From the research workbook's historical period field.</p>
          </section>
        )}

        {/* Visiting */}
        <Expandable title="Visiting this place" icon={<MapPin className="h-4 w-4" />} defaultOpen>
          <p className="text-xs text-atlas-mist">{locationLabel(story)}{story.coord_precision ? ` · ${story.coord_precision}` : ""}</p>
          {story.address && <p className="mt-2 text-sm">{story.address}</p>}
          {story.location_relationship && <p className="mt-2 text-sm text-atlas-paper/85">{story.location_relationship}</p>}
          {story.visitor_connection && <p className="mt-2 text-sm text-atlas-paper/85">{story.visitor_connection}</p>}
          {story.access_notes && <p className="mt-2 text-sm"><strong className="font-medium">Access (verified):</strong> {story.access_notes}</p>}
        </Expandable>

        {/* Gallery */}
        {gallery.length > 0 && (
          <section aria-labelledby="g-h">
            <h2 id="g-h" className="font-atlas text-xl">Images</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {gallery.map((g, i) => (
                <li key={g.image_key} className={enter} style={stagger(i)}>
                  <button onClick={() => setLightbox(i)} className="block w-full overflow-hidden rounded-xl bg-atlas-char text-left atlas-lift" aria-label={`Open image: ${g.title ?? g.caption ?? ""}`}>
                    <AtlasImage image={g} title={story.title} width={600} className="aspect-[4/3]" />
                    <p className="line-clamp-2 p-2 text-[11px] text-atlas-mist">{g.caption}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sources */}
        <Expandable title={`Sources & articles (${refs.length})`} icon={<Info className="h-4 w-4" />}>
          <ul className="space-y-3">
            {refs.map((s) => (
              <li key={s.source_key} className="rounded-xl border border-atlas-mist/15 bg-atlas-night/40 p-3">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-atlas text-base leading-snug">{s.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${s.checked ? "bg-atlas-cedar/30 text-atlas-paper" : "bg-atlas-warn/30 text-atlas-paper"}`}>
                    {s.checked ? <><Check className="inline h-3 w-3" /> Checked</> : <><Clock className="inline h-3 w-3" /> Follow-up</>}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-atlas-mist">{[s.author, s.publisher, s.pub_date, s.source_type].filter(Boolean).join(" · ")}</p>
                {s.supports && <p className="mt-1.5 text-sm text-atlas-paper/85">{s.supports}</p>}
                {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1.5 inline-flex items-center gap-1 text-xs text-atlas-gold underline">Open source <ExternalLink className="h-3 w-3" /></a>}
              </li>
            ))}
          </ul>
        </Expandable>

        {/* Postcard preview (not collectible from preview) */}
        <section aria-labelledby="pc-h">
          <h2 id="pc-h" className="font-atlas text-xl">Postcard</h2>
          <p className="text-[11px] text-atlas-mist">Preview only. Postcards and Quest Coins are collected after a verified on-site visit once this story is published.</p>
          <button onClick={() => setFlipped((f) => !f)} aria-pressed={flipped} aria-label="Flip postcard"
            className="mt-3 block w-full max-w-md [perspective:1200px]">
            <div className={`relative aspect-[3/2] w-full ${m.enabled ? "transition-transform duration-500" : ""} [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
              <div className="absolute inset-0 overflow-hidden rounded-xl [backface-visibility:hidden]">
                <AtlasImage image={hero} title={story.title} subtitle={story.city_name} width={800} className="h-full w-full" />
                <span className="absolute bottom-2 left-3 font-atlas text-lg text-atlas-paper drop-shadow">{story.title.split(":")[0]}</span>
              </div>
              <div className="atlas-paper-surface absolute inset-0 space-y-1 rounded-xl p-4 text-left text-atlas-ink [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="font-atlas text-base leading-tight">{story.title}</p>
                <p className="text-[11px]">{story.city_name}, Washington · {story.marker_id}</p>
                <p className="line-clamp-3 text-xs">{story.summary}</p>
                {hero?.attribution && <p className="text-[10px] text-atlas-ink-soft">Image: {hero.attribution}</p>}
                <p className="text-[10px] text-atlas-ink-soft">Status: draft · not yet collectible{settings.questCoins && !quiet ? ` · ${settings.questCoins} Quest Coins (draft)` : ""}</p>
              </div>
            </div>
          </button>
        </section>

        {/* Activities: only real, configured H5P activities (none are invented) */}
        <MarkerActivities markerId={story.marker_id} />

        {related.length > 0 && (
          <section aria-labelledby="rel-h">
            <h2 id="rel-h" className="font-atlas text-xl">Related stories</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {related.map((r, i) => (
                <li key={r.marker_id} className={enter} style={stagger(i)}>
                  <Link to={`/explore/washington/story/${r.marker_id}`} className="block overflow-hidden rounded-xl bg-atlas-char atlas-lift">
                    <AtlasImage image={images.find((x) => x.marker_id === r.marker_id)} title={r.title} subtitle={r.city_name} width={400} className="aspect-[4/3]" />
                    <p className="line-clamp-2 p-2 font-atlas text-sm">{r.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {lightbox !== null && gallery[lightbox] && (
        <Lightbox img={gallery[lightbox]} onClose={() => setLightbox(null)} count={gallery.length} index={lightbox}
          onNav={(d) => setLightbox((i) => (i === null ? i : (i + d + gallery.length) % gallery.length))} quiet={quiet || !m.enabled} />
      )}
    </div>
  );
};

function Expandable({ title, icon, children, defaultOpen }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="overflow-hidden rounded-xl bg-atlas-char">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        {icon}<span className="flex-1 font-atlas text-lg">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden"><div className="px-4 pb-4">{children}</div></div>
      </div>
    </section>
  );
}

function Lightbox({ img, onClose, onNav, count, index, quiet }: { img: CImage; onClose: () => void; onNav: (d: number) => void; count: number; index: number; quiet: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [img]);
  return (
    <div role="dialog" aria-modal="true" aria-label={img.title ?? "Image"} className={`fixed inset-0 z-50 flex flex-col bg-atlas-night/95 ${quiet ? "" : motion.fade}`}>
      <div className="flex items-center justify-between p-3">
        <span className="text-xs text-atlas-mist">{index + 1} / {count}</span>
        <button autoFocus onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-atlas-char"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        {failed || !img.image_url ? <p className="text-sm text-atlas-mist">This image couldn't load.</p> : (
          <img src={sized(img.image_url, 1600)} alt={img.alt ?? ""} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
        )}
      </div>
      <div className="space-y-1 p-4 text-xs">
        <p className="text-atlas-paper">{img.caption}</p>
        <p className="text-atlas-mist">{img.attribution}{img.license ? ` · ${img.license}` : ""}</p>
        <div className="flex gap-4">
          {img.record_url && <a href={img.record_url} target="_blank" rel="noopener noreferrer nofollow" className="text-atlas-gold underline">Original record</a>}
          {count > 1 && <><button onClick={() => onNav(-1)} className="underline">Previous</button><button onClick={() => onNav(1)} className="underline">Next</button></>}
        </div>
      </div>
    </div>
  );
}

export default WashingtonStoryPage;
