import { useEffect, useMemo, useState } from "react";
import { Award, Gem, Sparkles, X } from "lucide-react";
import type { UnlockedAchievement } from "@/hooks/useQuest";

export interface ArtifactReveal {
  amount: number;
  title: string;
  rarity?: string;
  achievements?: UnlockedAchievement[];
}

interface Props {
  reveal: ArtifactReveal | null;
  onDismiss: () => void;
}

/** Count up to the awarded amount so QUEST lands like an unearthed find. */
function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);
  return value;
}

const ArtifactRewardOverlay = ({ reveal, onDismiss }: Props) => {
  const active = Boolean(reveal);
  const amount = useCountUp(reveal?.amount ?? 0, active);
  const rare = reveal?.rarity === "rare";

  // Fixed dust trajectories so the particles don't re-randomize on re-render.
  const dust = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        dx: `${Math.round(Math.cos((i / 14) * Math.PI * 2) * 110)}px`,
        dy: `${Math.round(Math.sin((i / 14) * Math.PI * 2) * 110 - 30)}px`,
        delay: `${i * 45}ms`,
      })),
    [],
  );

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [active, onDismiss]);

  if (!reveal) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-6"
      role="dialog"
      aria-live="polite"
      aria-label="QUEST earned"
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute inset-0 bg-quest-navy/80 backdrop-blur-md animate-fade-in"
      />

      <div className="relative w-full max-w-sm animate-artifact-rise">
        <button
          onClick={onDismiss}
          aria-label="Close"
          className="absolute -top-3 -right-1 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-quest-navy-soft/90 text-quest-gold icon-press"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relic-surface artifact-glow-strong overflow-hidden rounded-xl border border-quest-gold/30 px-6 pb-6 pt-9 text-center">
          {/* Seal + dust */}
          <div className="relative mx-auto mb-5 h-24 w-24">
            <span className="absolute inset-0 rounded-full border border-quest-gold/50 animate-relic-ring" />
            <span
              className="absolute -inset-3 rounded-full border border-dashed border-quest-cyan/40 animate-ring-spin"
              aria-hidden
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-quest-gold/12 animate-seal-crack">
              {rare ? (
                <Gem className="h-10 w-10 text-quest-gold" />
              ) : (
                <Sparkles className="h-10 w-10 text-quest-gold" />
              )}
            </div>
            {dust.map((d, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-quest-gold animate-dust-drift"
                style={{
                  ["--dx" as string]: d.dx,
                  ["--dy" as string]: d.dy,
                  animationDelay: d.delay,
                }}
              />
            ))}
          </div>

          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-quest-cyan">
            {rare ? "Rare artifact unearthed" : "Artifact recovered"}
          </p>

          <p className="mt-3 font-display text-5xl font-medium quest-gold-text quest-engraved">
            +{amount}
          </p>
          <p className="mt-1 font-display text-xs uppercase tracking-[0.3em] text-quest-gold/80">QUEST</p>

          <p className="mt-4 text-sm text-white/80">{reveal.title}</p>

          {reveal.achievements && reveal.achievements.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-quest-gold/20 pt-4 text-left">
              {reveal.achievements.map((a) => (
                <div key={a.code} className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-quest-gold" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm text-white">{a.name}</p>
                    <p className="text-xs text-white/60">
                      Achievement unlocked · +{a.quest_reward} QUEST
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onDismiss}
            className="interactive mt-6 w-full rounded-xl bg-quest-gold py-3 font-display text-sm font-medium text-quest-navy"
          >
            Add to my collection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtifactRewardOverlay;
