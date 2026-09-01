import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Coffee,
  Compass,
  Gem,
  Gift,
  Lock,
  MapPin,
  Sparkles,
  Stamp,
  Ticket,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import {
  questRank,
  redeemReward,
  useAchievements,
  useQuestBalance,
  useRewardHistory,
  useRewardsCatalog,
  useVerifiedDiscoveryCount,
  type RewardCatalogRow,
} from "@/hooks/useQuest";
import { useQuestReward } from "@/components/QuestRewardProvider";

const rewardIcons: Record<string, typeof Gift> = {
  "circle-user": Award,
  "map-pin": MapPin,
  stamp: Stamp,
  coffee: Coffee,
  ticket: Ticket,
  book: Gem,
  gift: Gift,
};

const tierStyles: Record<string, string> = {
  bronze: "border-quest-gold-deep/40 text-quest-gold-deep",
  silver: "border-quest-cyan/40 text-quest-cyan",
  gold: "border-quest-gold/50 text-quest-gold",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const RewardsPage = () => {
  const { balance, lifetime_earned, lifetime_spent } = useQuestBalance();
  const { data: history } = useRewardHistory();
  const { data: achievements } = useAchievements();
  const { data: catalog } = useRewardsCatalog();
  const { data: discoveries = 0 } = useVerifiedDiscoveryCount();
  const { celebrate } = useQuestReward();
  const queryClient = useQueryClient();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [tab, setTab] = useState<"rewards" | "history" | "achievements">("rewards");

  const rank = questRank(lifetime_earned);
  const rewards = catalog?.rewards ?? [];
  const redemptions = catalog?.redemptions ?? [];
  const ownedCodes = new Set(redemptions.map((r) => r.reward_code));

  const isUnlocked = (r: RewardCatalogRow) =>
    !r.unlock_criteria?.discoveries || discoveries >= r.unlock_criteria.discoveries;

  const available = rewards.filter((r) => isUnlocked(r) && balance >= r.cost);
  const locked = rewards.filter((r) => !isUnlocked(r) || balance < r.cost);

  const handleRedeem = async (reward: RewardCatalogRow) => {
    setRedeeming(reward.code);
    try {
      const result = await redeemReward(reward.code);
      queryClient.invalidateQueries({ queryKey: ["quest-balance"] });
      queryClient.invalidateQueries({ queryKey: ["quest-history"] });
      queryClient.invalidateQueries({ queryKey: ["rewards-catalog"] });
      toast.success(
        result.redemption_code
          ? `${reward.name} — code ${result.redemption_code}`
          : `${reward.name} added to your collection`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Redemption failed");
    } finally {
      setRedeeming(null);
    }
  };

  const RewardRow = ({ reward, locked: isLocked }: { reward: RewardCatalogRow; locked: boolean }) => {
    const Icon = rewardIcons[reward.icon] ?? Gift;
    const needs = reward.unlock_criteria?.discoveries ?? 0;
    const criteriaUnmet = needs > 0 && discoveries < needs;
    const owned = reward.kind === "cosmetic" && ownedCodes.has(reward.code);

    return (
      <div
        className={`rounded-xl border p-4 ${
          isLocked ? "border-border bg-surface-variant/50" : "border-quest-gold/30 bg-quest-gold/5"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isLocked ? "bg-surface-variant text-on-surface-variant" : "bg-quest-gold/15 text-quest-gold"
            }`}
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-sm font-medium text-foreground">{reward.name}</p>
              <span className="shrink-0 font-display text-xs font-medium text-quest-gold tabular-nums">
                {reward.cost.toLocaleString()} Q
              </span>
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">{reward.description}</p>
            {reward.partner_name && (
              <p className="mt-1 text-[11px] text-quest-cyan">{reward.partner_name}</p>
            )}

            {owned ? (
              <p className="mt-3 text-xs font-medium text-success">In your collection</p>
            ) : isLocked ? (
              <p className="mt-3 text-xs text-on-surface-variant">
                {criteriaUnmet
                  ? `Unlocks at ${needs} verified discoveries — ${needs - discoveries} to go`
                  : `${(reward.cost - balance).toLocaleString()} more QUEST needed`}
              </p>
            ) : (
              <button
                onClick={() => handleRedeem(reward)}
                disabled={redeeming === reward.code}
                className="interactive mt-3 rounded-full bg-quest-gold px-4 py-1.5 font-display text-xs font-medium text-quest-navy disabled:opacity-60"
              >
                {redeeming === reward.code ? "Redeeming…" : "Redeem"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Rewards" back />

      <div className="space-y-5 px-4">
        {/* Balance — artifact plaque */}
        <section className="relic-surface artifact-glow overflow-hidden rounded-xl border border-quest-gold/25 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-quest-cyan">
              Exploration currency
            </p>
            <span className="flex items-center gap-1.5 rounded-full border border-quest-gold/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-quest-gold">
              <Compass className="h-3 w-3" />
              {rank.title}
            </span>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <span className="font-display text-5xl font-medium quest-gold-text quest-engraved tabular-nums">
              {balance.toLocaleString()}
            </span>
            <span className="pb-2 font-display text-xs uppercase tracking-[0.3em] text-quest-gold/80">
              Quest
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-quest-gold/15 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50">Lifetime earned</p>
              <p className="font-display text-lg text-white tabular-nums">
                {lifetime_earned.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50">Spent</p>
              <p className="font-display text-lg text-white tabular-nums">
                {lifetime_spent.toLocaleString()}
              </p>
            </div>
          </div>

          {rank.next && (
            <p className="mt-4 text-xs text-white/60">
              {(rank.next.min - lifetime_earned).toLocaleString()} QUEST until{" "}
              <span className="text-quest-gold">{rank.next.title}</span>
            </p>
          )}
        </section>

        {/* Tabs */}
        <div className="flex gap-2 rounded-full bg-surface-variant p-1">
          {(["rewards", "history", "achievements"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full py-2 font-display text-xs font-medium capitalize transition-colors ${
                tab === key ? "bg-card text-foreground elevation-1" : "text-on-surface-variant"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {tab === "rewards" && (
          <>
            <section>
              <h2 className="mb-2 font-display text-sm font-medium text-foreground">
                Available now
              </h2>
              {available.length === 0 ? (
                <p className="rounded-xl bg-surface-variant p-4 text-xs text-on-surface-variant">
                  Nothing in reach yet. Scan a marker plaque to earn your first QUEST.
                </p>
              ) : (
                <div className="space-y-3">
                  {available.map((r) => (
                    <RewardRow key={r.code} reward={r} locked={false} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-2 font-display text-sm font-medium text-foreground">Locked</h2>
              <div className="space-y-3">
                {locked.map((r) => (
                  <RewardRow key={r.code} reward={r} locked />
                ))}
              </div>
            </section>

            {redemptions.filter((r) => r.redemption_code).length > 0 && (
              <section>
                <h2 className="mb-2 font-display text-sm font-medium text-foreground">
                  Your perk codes
                </h2>
                <div className="space-y-2">
                  {redemptions
                    .filter((r) => r.redemption_code)
                    .map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                      >
                        <span className="text-xs text-on-surface-variant">
                          {formatDate(r.created_at)}
                        </span>
                        <span className="font-mono text-sm font-medium text-quest-gold">
                          {r.redemption_code}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "history" && (
          <section className="space-y-2">
            {(history ?? []).length === 0 && (
              <p className="rounded-xl bg-surface-variant p-4 text-xs text-on-surface-variant">
                Your ledger is empty. Every discovery, trivia set and achievement will appear here.
              </p>
            )}
            {(history ?? []).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-sm text-foreground">{row.title}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {row.event_type.replace(/_/g, " ")} · {formatDate(row.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-display text-sm font-medium tabular-nums ${
                    row.quest_amount >= 0 ? "text-quest-gold" : "text-on-surface-variant"
                  }`}
                >
                  {row.quest_amount >= 0 ? "+" : ""}
                  {row.quest_amount.toLocaleString()}
                </span>
              </div>
            ))}
          </section>
        )}

        {tab === "achievements" && (
          <section className="grid grid-cols-2 gap-3">
            {(achievements ?? []).map((a) => {
              const unlocked = Boolean(a.unlocked_at);
              return (
                <div
                  key={a.code}
                  className={`rounded-xl border p-4 text-center ${
                    unlocked
                      ? `bg-quest-gold/5 ${tierStyles[a.tier] ?? tierStyles.gold}`
                      : "border-border bg-surface-variant/40 text-on-surface-variant"
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-current/10">
                    {unlocked ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <Lock className="h-4 w-4 opacity-60" />
                    )}
                  </div>
                  <p className="font-display text-sm font-medium text-foreground">{a.name}</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant">{a.description}</p>
                  <p className="mt-2 text-[11px] font-medium">
                    {unlocked ? `Unlocked · +${a.quest_reward}` : `+${a.quest_reward} QUEST`}
                  </p>
                </div>
              );
            })}
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RewardsPage;
