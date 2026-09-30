import { useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Lock, Sparkles, Store, ChevronRight, KeyRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import QuestCoinIcon, { coinLabel } from "@/components/QuestCoinIcon";
import { toast } from "sonner";
import {
  eventCheckin,
  questRank,
  useAchievements,
  useEntitlements,
  useQuestBalance,
  useRewardHistory,
  useRewardRules,
  useRewardsCatalog,
  type RewardEventRow,
} from "@/hooks/useQuest";
import { useQuestReward } from "@/components/QuestRewardProvider";
import { ItemPreview } from "@/pages/StorePage";

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const TYPE_LABEL: Record<string, string> = {
  marker_discovery: "Plaque visit",
  discovery_reward: "Discovery",
  trivia: "History challenge",
  marker_trail_complete: "Trail",
  trail_complete: "Trail",
  event_quest: "Event",
  contribution_approved: "Contribution",
  achievement: "Achievement",
  purchase: "Store",
  refund: "Refund",
  adjustment: "Adjustment",
  redemption: "Store",
};

function rowLink(r: RewardEventRow) {
  if (r.source_type === "marker" && r.source_id) return `/marker/${r.source_id}`;
  if (r.source_type === "trail") return "/trails";
  if (r.source_type === "redemption") return "/store";
  return null;
}

const WalletPage = () => {
  const { balance, lifetime_earned, loading } = useQuestBalance();
  const history = useRewardHistory();
  const { data: achievements } = useAchievements();
  const { data: rules } = useRewardRules();
  const { data: owned } = useEntitlements();
  const { data: catalog } = useRewardsCatalog();
  const { celebrate } = useQuestReward();
  const [tab, setTab] = useState<"history" | "collection" | "earn">("history");
  const [eventCode, setEventCode] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checking, setChecking] = useState(false);
  const rank = questRank(lifetime_earned);
  const partnerCodes = (catalog?.redemptions ?? []).filter((r) => r.redemption_code && r.status !== "refunded");

  const submitCheckin = async () => {
    setChecking(true);
    try {
      const r = await eventCheckin(eventCode.trim(), checkin.trim());
      if (r.awarded) celebrate(r);
      else toast(r.reason ?? "Already collected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-in failed. Nothing was saved; try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Quest Wallet" back />
      <div className="space-y-5 px-4">
        <section className="relic-surface artifact-glow overflow-hidden rounded-xl border border-quest-gold/25 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-quest-cyan">Spendable balance</p>
            <span className="flex items-center gap-1.5 rounded-full border border-quest-gold/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-quest-gold">
              <Compass className="h-3 w-3" /> {rank.title}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <QuestCoinIcon className="h-10 w-10" />
            <span className="font-display text-5xl font-medium quest-gold-text quest-engraved tabular-nums" aria-label={coinLabel(balance)}>
              {loading ? "…" : balance.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/60">Quest Coins</p>
          <div className="mt-4 border-t border-quest-gold/15 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Lifetime earned</p>
            <p className="font-display text-lg text-white tabular-nums">{lifetime_earned.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-white/50">Spending coins never lowers your explorer progress or rank.</p>
          </div>
        </section>

        <Link to="/store" className="interactive flex items-center justify-between rounded-xl bg-quest-gold px-5 py-4 font-display text-sm font-medium text-quest-navy">
          <span className="flex items-center gap-2"><Store className="h-4 w-4" /> Open the Reward Store</span>
          <ChevronRight className="h-4 w-4" />
        </Link>

        <div className="flex gap-2 rounded-full bg-surface-variant p-1" role="tablist">
          {([["history", "History"], ["collection", "Collection"], ["earn", "How to earn"]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`flex-1 rounded-full py-2 font-display text-xs font-medium transition-colors ${tab === k ? "bg-card text-foreground elevation-1" : "text-on-surface-variant"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "history" && (
          <section className="space-y-2">
            {history.isLoading && <p className="text-xs text-on-surface-variant">Loading your history…</p>}
            {history.isError && <p className="rounded-xl bg-destructive/10 p-4 text-xs text-destructive">Couldn't load your history. Pull to refresh or try again.</p>}
            {!history.isLoading && (history.data ?? []).length === 0 && (
              <p className="rounded-xl bg-surface-variant p-4 text-xs text-on-surface-variant">No coins yet. Scan a marker plaque with the MarkerQuest scanner to earn your first Quest Coins.</p>
            )}
            {(history.data ?? []).map((row) => {
              const link = rowLink(row);
              const body = (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm text-foreground">{row.title}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {TYPE_LABEL[row.event_type] ?? row.event_type.replace(/_/g, " ")} · {fmt(row.created_at)}
                      {(row as RewardEventRow & { status?: string }).status === "reversed" ? " · Refunded" : " · Confirmed"}
                    </p>
                  </div>
                  <span className={`shrink-0 font-display text-sm font-medium tabular-nums ${row.quest_amount >= 0 ? "text-quest-gold" : "text-on-surface-variant"}`}>
                    {row.quest_amount >= 0 ? "+" : ""}{row.quest_amount.toLocaleString()}
                  </span>
                </div>
              );
              return link ? <Link key={row.id} to={link} className="block">{body}</Link> : <div key={row.id}>{body}</div>;
            })}
          </section>
        )}

        {tab === "collection" && (
          <section className="space-y-4">
            <Link to="/postcards" className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm text-foreground">
              My postcards <ChevronRight className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="mb-2 font-display text-sm font-medium text-foreground">Store items</h2>
              {(owned ?? []).length === 0 ? (
                <p className="rounded-xl bg-surface-variant p-4 text-xs text-on-surface-variant">Nothing yet. Items you get in the store appear here.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(owned ?? []).map((e) => e.item && (
                    <Link to="/store" key={e.reward_code} className="rounded-xl border border-border p-3">
                      <ItemPreview item={e.item} />
                      <p className="mt-2 truncate font-display text-xs text-foreground">{e.item.name}</p>
                      {e.equipped && <p className="text-[11px] text-success">Equipped</p>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {partnerCodes.length > 0 && (
              <div>
                <h2 className="mb-2 font-display text-sm font-medium text-foreground">Partner codes</h2>
                {partnerCodes.map((r) => (
                  <div key={r.id} className="mb-2 flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <span className="text-xs text-on-surface-variant">{r.status === "redeemed" ? "Used" : r.expires_at ? `Expires ${fmt(r.expires_at)}` : fmt(r.created_at)}</span>
                    <span className="font-mono text-sm font-medium text-quest-gold">{r.redemption_code}</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <h2 className="mb-2 font-display text-sm font-medium text-foreground">Achievements</h2>
              <div className="grid grid-cols-2 gap-3">
                {(achievements ?? []).map((a) => (
                  <div key={a.code} className={`rounded-xl border p-3 text-center ${a.unlocked_at ? "border-quest-gold/40 bg-quest-gold/5" : "border-border bg-surface-variant/40"}`}>
                    {a.unlocked_at ? <Sparkles className="mx-auto h-4 w-4 text-quest-gold" /> : <Lock className="mx-auto h-4 w-4 text-on-surface-variant" />}
                    <p className="mt-1 font-display text-xs font-medium text-foreground">{a.name}</p>
                    <p className="text-[11px] text-on-surface-variant">+{coinLabel(a.quest_reward)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "earn" && (
          <section className="space-y-3">
            {(rules ?? []).map((r) => (
              <div key={r.code} className="flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="font-display text-sm text-foreground">{r.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{r.description}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 font-display text-sm text-quest-gold"><QuestCoinIcon className="h-3.5 w-3.5" />{r.amount}</span>
              </div>
            ))}
            <div className="rounded-xl bg-surface-variant p-4 text-xs text-on-surface-variant">
              <p className="font-medium text-foreground">What stacks</p>
              <p className="mt-1">A plaque visit and a trail bonus both pay: scanning each stop earns its marker coins, and finishing every required stop adds the trail bonus. Scanning the same marker again, on or off a trail, never pays twice.</p>
              <p className="mt-2">Coins are earned only, can't be bought, transferred or cashed out. History is always free.</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="flex items-center gap-2 font-display text-sm text-foreground"><KeyRound className="h-4 w-4" /> Event check-in</p>
              <p className="mt-1 text-[11px] text-on-surface-variant">At a special event, enter the event name code and the 6-digit code shown by staff.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input aria-label="Event code" value={eventCode} onChange={(e) => setEventCode(e.target.value)} placeholder="Event code" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <input aria-label="Check-in code" inputMode="numeric" value={checkin} onChange={(e) => setCheckin(e.target.value)} placeholder="6-digit code" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <button onClick={submitCheckin} disabled={checking || !eventCode || checkin.length < 6}
                className="interactive mt-3 w-full rounded-lg bg-primary py-2 font-display text-sm text-primary-foreground disabled:opacity-50">
                {checking ? "Checking…" : "Check in"}
              </button>
            </div>
          </section>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default WalletPage;
