import { lazy, Suspense, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Lock, QrCode, Scan, Sparkles } from "lucide-react";
import type { Marker } from "@/data/markers";
import { getMarkerArtifact } from "@/data/artifacts";
import { useMarkerDiscovered } from "@/hooks/useQuest";
import { useAuth } from "@/hooks/useAuth";

const ArtifactViewer = lazy(() => import("@/components/ArtifactViewer"));

/**
 * The site's collectible 3D artifact. Everyone can look at it and place it in
 * AR; claiming it (and the QUEST that comes with it) still requires the on-site
 * QR scan, which the server verifies.
 */
const MarkerArtifactCard = ({ marker }: { marker: Marker }) => {
  const artifact = getMarkerArtifact(marker);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: discovered } = useMarkerDiscovered(marker.id);
  const [arSupported, setArSupported] = useState(false);
  const arRef = useRef<(() => void) | null>(null);

  if (!artifact) return null;
  const claimed = Boolean(discovered);

  return (
    <div className="overflow-hidden rounded-xl bg-card elevation-1">
      <div className="flex items-center gap-3 p-4">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            claimed ? "bg-quest-gold/20 text-quest-gold" : "bg-secondary text-primary"
          }`}
        >
          <Box className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block font-display font-medium text-card-foreground">
            {artifact.name}
          </span>
          <span className="block truncate text-xs text-on-surface-variant">
            {claimed ? "Collected artifact" : "Artifact preview"}
            {artifact.rarity === "rare" ? " · Rare" : ""}
          </span>
        </div>
        {claimed && (
          <span className="flex items-center gap-1 rounded-full bg-quest-gold/15 px-2 py-1 text-[11px] font-medium text-quest-gold">
            <Sparkles className="h-3 w-3" />
            Claimed
          </span>
        )}
      </div>

      <div
        className={`relative mx-4 h-64 overflow-hidden rounded-xl ${
          claimed
            ? "bg-gradient-to-b from-quest-navy to-quest-navy/70 ring-2 ring-quest-gold/60"
            : "bg-gradient-to-b from-surface-variant to-secondary"
        }`}
      >
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          }
        >
          <ArtifactViewer
            src={artifact.modelUrl}
            iosSrc={artifact.iosModelUrl}
            alt={`3D model of the ${artifact.name} artifact for ${marker.name}`}
            locked={!claimed}
            onArSupport={setArSupported}
            arRef={arRef}
          />
        </Suspense>

        {!claimed && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-on-surface-variant backdrop-blur-sm">
            <Lock className="h-3 w-3" />
            Not yet collected
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm leading-relaxed text-on-surface-variant">{artifact.blurb}</p>

        <div className="mt-3 flex flex-col gap-2">
          {arSupported && (
            <button
              onClick={() => arRef.current?.()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground elevation-1 active:scale-[0.99] transition-transform"
            >
              <Scan className="h-4 w-4" />
              View in AR
            </button>
          )}

          {!claimed && (
            <button
              onClick={() => navigate(user ? "/scan" : `/auth?from=${encodeURIComponent(`/marker/${marker.id}`)}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 font-display text-sm font-medium text-foreground"
            >
              <QrCode className="h-4 w-4 text-primary" />
              {user ? "Scan on site to collect" : "Sign in to collect artifacts"}
            </button>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-on-surface-variant">
          {claimed
            ? "This artifact is recorded in your QUEST ledger and will carry over when artifacts become mintable."
            : "Drag to inspect the artifact now — scan this site's QR code in person to claim it and earn QUEST."}
          {artifact.attribution ? ` Model: ${artifact.attribution}.` : ""}
        </p>
      </div>
    </div>
  );
};

export default MarkerArtifactCard;
