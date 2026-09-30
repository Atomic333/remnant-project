import { useState } from "react";
import { ImageOff, Lock, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";

export interface PostcardView {
  title: string;
  location: string;
  front_url?: string | null;
  front_alt?: string;
  back_text?: string;
  credits?: string;
  sources?: { name: string; url?: string }[];
  marker_slug?: string | null;
  collected_at?: string | null;
  commemorative?: boolean;
  locked?: boolean;
}

/** A flippable postcard. Tap, Enter or Space turns it over. */
const Postcard = ({ card, initialBack = false }: { card: PostcardView; initialBack?: boolean }) => {
  const [back, setBack] = useState(initialBack);
  const [broken, setBroken] = useState(false);
  if (card.locked) {
    return (
      <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-variant/50 p-3 text-center">
        <Lock className="h-5 w-5 text-on-surface-variant" />
        <p className="font-display text-sm font-medium text-foreground">{card.title}</p>
        {card.location && <p className="text-xs text-on-surface-variant">{card.location}</p>}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setBack((b) => !b)}
      aria-pressed={back}
      aria-label={`${card.title} postcard. ${back ? "Showing the back." : "Showing the front."} Press to turn it over.`}
      className="group relative block aspect-[3/2] w-full text-left [perspective:1000px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      <div
        className="relative h-full w-full rounded-xl transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d]"
        style={{ transform: back ? "rotateY(180deg)" : "none" }}
      >
        {/* Front */}
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-card elevation-1 [backface-visibility:hidden]">
          {card.front_url && !broken ? (
            <img src={card.front_url} alt={card.front_alt || card.title} onError={() => setBroken(true)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-variant">
              <ImageOff className="h-6 w-6 text-on-surface-variant" aria-hidden />
              <span className="sr-only">Artwork unavailable</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-3">
            <p className="font-display text-sm font-semibold text-background">{card.title}</p>
            <p className="text-[11px] text-background/85">{card.location}</p>
          </div>
          <RotateCw className="absolute right-2 top-2 h-4 w-4 text-background/90 drop-shadow" aria-hidden />
        </div>
        {/* Back */}
        <div className="absolute inset-0 flex flex-col overflow-y-auto rounded-xl border border-border bg-card p-3 elevation-1 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="font-display text-sm font-semibold text-card-foreground">{card.title}</p>
          <p className="mb-1 text-[11px] text-on-surface-variant">{card.location}</p>
          <p className="text-xs leading-relaxed text-card-foreground">{card.back_text}</p>
          {card.credits && <p className="mt-2 text-[10px] text-on-surface-variant">Image: {card.credits}</p>}
          {!!card.sources?.length && (
            <p className="text-[10px] text-on-surface-variant">
              Sources: {card.sources.map((s) => s.name).join("; ")}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2 text-[10px] text-on-surface-variant">
            {card.collected_at ? <span>Collected {new Date(card.collected_at).toLocaleDateString()}</span> : <span />}
            {card.marker_slug && (
              <Link to={`/marker/${card.marker_slug}`} onClick={(e) => e.stopPropagation()} className="font-medium text-primary underline">
                View marker
              </Link>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default Postcard;
