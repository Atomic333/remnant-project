import { useEffect, useMemo, useState } from "react";
import { Award, X } from "lucide-react";
import type { UnlockedAchievement } from "@/hooks/useQuest";
import QuestCoinIcon, { coinLabel } from "@/components/QuestCoinIcon";
import { playCoinChime, prefersReducedMotion } from "@/lib/questSound";

export interface ArtifactReveal {
  amount: number;
  title: string;
  rarity?: string;
  achievements?: UnlockedAchievement[];
  /** Sensitive historical site: quiet acknowledgment, no celebration. */
  quiet?: boolean;
}

interface Props {
  reveal: ArtifactReveal | null;
  onDismiss: () => void;
}

/** Count up to the awarded amount so QUEST lands like an unearthed find. */
function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (active && prefersReducedMotion()) {
      setValue(target);
      return;
    }
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
  const quiet = Boolean(reveal?.quiet);
  const calm = quiet || prefersReducedMotion();

  useEffect(() => {
    if (active && !quiet) playCoinChime();
  }, [active, quiet]);

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
      aria-label="Quest Coins earned"
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute inset-0 bg-quest-navy/80 backdrop-blur-md animate-fade-in"
      />

      <div className={`relative w-full max-w-sm ${calm ? "animate-fade-in" : "animate-artifact-rise"}`}>
        <button
          onClick={onDismiss}
          aria-label="Close"
          className="absolute -top-3 -right-1 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-quest-navy-soft/90 text-quest-gold icon-press"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relic-surface artifact-glow-strong overflow-hidden rounded-xl border border-quest-gold/30 px-6 pb-6 pt-9 text-center">
          {/* Seal + dust */}
          {calm ? (
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-quest-gold/10">
              <QuestCoinIcon className="h-9 w-9" />
            </div>
          ) : (
          <div className="relative mx-auto mb-5 h-24 w-24">
            <span className="absolute inset-0 rounded-full border border-quest-gold/50 animate-relic-ring" />
            <span
              className="absolute -inset-3 rounded-full border border-dashed border-quest-cyan/40 animate-ring-spin"
              aria-hidden
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-quest-gold/12 animate-seal-crack">
              <QuestCoinIcon className="h-12 w-12" />
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
          )}

          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-quest-cyan">
            {quiet ? "Thank you for visiting" : rare ? "Rare find" : "Verified visit"}
          </p>

          <p className="mt-3 font-display text-lg text-white" aria-live="polite">
            You earned <span className="quest-gold-text font-medium">{coinLabel(amount)}</span>
          </p>

          <p className="mt-4 text-sm text-white/80">{reveal.title}</p>

          {reveal.achievements && reveal.achievements.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-quest-gold/20 pt-4 text-left">
              {reveal.achievements.map((a) => (
                <div key={a.code} className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-quest-gold" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm text-white">{a.name}</p>
                    <p className="text-xs text-white/60">
                      Achievement unlocked · +{coinLabel(a.quest_reward)}
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
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtifactRewardOverlay;
