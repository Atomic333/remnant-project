import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, X, SkipForward, RotateCcw } from "lucide-react";
import Postcard from "@/components/Postcard";
import { useReducedMotion } from "@/lib/trails";
import type { RevealContent, RevealStyle } from "@/lib/discovery";

interface Props {
  open: boolean;
  onClose: () => void;
  style: RevealStyle;
  sensitive: boolean;
  markerName: string;
  content: RevealContent;
  /** Server-confirmed outcome text, e.g. "+50 QUEST" or "Saved to My Postcards". */
  outcome?: string | null;
  preview?: boolean;
}

const DURATION = 1600;

/** Full-screen reveal. Plays only when opened by a tap; never auto-plays. */
const DiscoveryReveal = ({ open, onClose, style, sensitive, markerName, content, outcome, preview }: Props) => {
  const reduced = useReducedMotion();
  const effective: RevealStyle = sensitive && style !== "none" ? "quiet_fade" : style;
  const animate = !reduced && effective !== "none";
  const [phase, setPhase] = useState<"playing" | "done">(animate ? "playing" : "done");
  const [runKey, setRunKey] = useState(0);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhase(animate ? "playing" : "done");
    if (!animate) return;
    const t = setTimeout(() => setPhase("done"), DURATION);
    return () => clearTimeout(t);
  }, [open, animate, runKey]);

  useEffect(() => {
    if (!open) audioRef.current?.pause();
  }, [open]);

  if (!open) return null;
  const pc = content.postcard;
  const hero = pc?.front_url ?? content.gallery[0]?.url ?? null;

  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (muted) {
      a.muted = false;
      void a.play().catch(() => undefined);
    } else {
      a.muted = true;
      a.pause();
    }
    setMuted(!muted);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${markerName} discovery`} className="fixed inset-0 z-[60] flex flex-col bg-quest-navy/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-quest-gold">
          {preview ? "Preview — nothing is saved" : sensitive ? "Explore this story" : "Your discovery"}
        </span>
        <div className="flex items-center gap-2">
          {content.audio_url && (
            <button onClick={toggleAudio} aria-label={muted ? "Play audio" : "Mute audio"} className="flex h-9 w-9 items-center justify-center rounded-full bg-background/10 text-background">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
          {phase === "playing" ? (
            <button onClick={() => setPhase("done")} className="flex items-center gap-1 rounded-full bg-background/10 px-3 py-2 text-xs font-medium text-background">
              <SkipForward className="h-3.5 w-3.5" /> Skip animation
            </button>
          ) : (
            animate && (
              <button onClick={() => setRunKey((k) => k + 1)} className="flex items-center gap-1 rounded-full bg-background/10 px-3 py-2 text-xs font-medium text-background">
                <RotateCcw className="h-3.5 w-3.5" /> Replay
              </button>
            )
          )}
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-background/10 text-background">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {content.audio_url && <audio ref={audioRef} src={content.audio_url} muted preload="none" />}

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {phase === "playing" ? (
          <div key={runKey} className="flex h-full min-h-[60vh] items-center justify-center" aria-hidden>
            <RevealStage style={effective} image={hero} />
          </div>
        ) : (
          <div className="mx-auto max-w-md animate-fade-in space-y-4 pt-2">
            <h2 className="font-display text-xl font-semibold text-background">{markerName}</h2>
            {outcome && (
              <p className="rounded-lg bg-background/10 px-3 py-2 text-sm text-background">{outcome}</p>
            )}
            {pc && <Postcard card={{ ...pc, locked: false }} />}
            {content.bonus_story && (
              <div className="rounded-xl bg-card p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">{sensitive ? "Remembrance" : "Bonus story"}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-card-foreground">{content.bonus_story}</p>
              </div>
            )}
            {content.gallery.filter((g) => g.url).length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {content.gallery.filter((g) => g.url).map((g, i) => (
                  <figure key={i} className="overflow-hidden rounded-lg bg-card">
                    <img src={g.url!} alt={g.alt} className="aspect-square w-full object-cover" />
                    {g.credit && <figcaption className="px-2 py-1 text-[10px] text-on-surface-variant">{g.credit}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            {content.reflection_prompt && (
              <div className="rounded-xl border border-background/20 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-background/70">Reflect</p>
                <p className="text-sm italic text-background">{content.reflection_prompt}</p>
              </div>
            )}
            <button onClick={onClose} className="w-full rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function RevealStage({ style, image }: { style: RevealStyle; image: string | null }) {
  const art = image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-primary/40" />;
  switch (style) {
    case "postcard_flip":
      return (
        <div className="h-44 w-64 [perspective:1000px]">
          <div className="dr-flip relative h-full w-full [transform-style:preserve-3d]">
            <div className="absolute inset-0 rounded-xl bg-card [backface-visibility:hidden]" />
            <div className="absolute inset-0 overflow-hidden rounded-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">{art}</div>
          </div>
        </div>
      );
    case "envelope":
      return (
        <div className="relative h-40 w-64">
          <div className="dr-rise absolute inset-x-4 bottom-4 top-0 overflow-hidden rounded-lg">{art}</div>
          <div className="absolute inset-x-0 bottom-0 h-24 rounded-b-lg bg-quest-gold-deep" />
          <div className="dr-flap absolute inset-x-0 top-16 h-24 origin-top bg-quest-gold [clip-path:polygon(0_0,100%_0,50%_70%)]" />
        </div>
      );
    case "time_capsule":
      return (
        <div className="relative flex h-52 w-40 flex-col items-center">
          <div className="dr-glow absolute inset-6 rounded-full bg-quest-gold/40 blur-2xl" />
          <div className="dr-lid relative z-10 h-12 w-32 rounded-t-full bg-quest-gold" />
          <div className="dr-rise relative z-0 mt-1 h-24 w-28 overflow-hidden rounded-lg">{art}</div>
          <div className="relative z-10 -mt-6 h-12 w-32 rounded-b-3xl bg-quest-gold-deep" />
        </div>
      );
    case "echo_ripple":
      return (
        <div className="relative flex h-64 w-64 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="dr-ripple absolute h-24 w-24 rounded-full border-2 border-quest-gold/60" style={{ animationDelay: `${i * 250}ms` }} />
          ))}
          <div className="dr-fade-in h-40 w-40 overflow-hidden rounded-full">{art}</div>
        </div>
      );
    default:
      return <div className="dr-quiet h-44 w-64 overflow-hidden rounded-xl">{art}</div>;
  }
}

export default DiscoveryReveal;
