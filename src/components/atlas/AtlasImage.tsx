import { useState } from "react";
import type { CImage } from "@/hooks/useCollection";

/** Wikimedia Special:FilePath supports ?width= for responsive sizes. */
export function sized(url: string, width: number) {
  if (/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(url)) return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
  return url;
}

/** Designed title card used whenever no cleared image exists or a load fails. Abstract only. */
export const TitleCard = ({ title, subtitle, className = "" }: { title: string; subtitle?: string | null; className?: string }) => (
  <div className={`atlas-contours flex h-full w-full flex-col justify-end bg-atlas-char p-5 ${className}`} role="img" aria-label={`Title card: ${title}`}>
    <span className="font-atlas-sans text-[10px] uppercase tracking-[0.18em] text-atlas-gold">{subtitle ?? "Washington"}</span>
    <span className="mt-1 line-clamp-3 font-atlas text-xl leading-tight text-atlas-paper">{title}</span>
  </div>
);

interface Props {
  image: CImage | null | undefined;
  title: string;
  subtitle?: string | null;
  width?: number;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

/** Cleared image with graceful fallback. Aspect/size comes from the parent to avoid layout shift. */
const AtlasImage = ({ image, title, subtitle, width = 800, className = "", imgClassName = "", eager }: Props) => {
  const [failed, setFailed] = useState(false);
  if (!image?.image_url || !image.cleared || failed) return <div className={className}><TitleCard title={title} subtitle={subtitle} /></div>;
  return (
    <div className={`overflow-hidden bg-atlas-char ${className}`}>
      <img
        src={sized(image.image_url, width)}
        alt={image.alt ?? image.caption ?? title}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </div>
  );
};

export default AtlasImage;
