import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Lock } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import QuestCoinIcon, { coinLabel } from "@/components/QuestCoinIcon";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { equipItem, newIdempotencyKey, purchaseItem, useEntitlements, useQuestBalance, useRewardsCatalog, type RewardCatalogRow } from "@/hooks/useQuest";

const TYPE_NAMES: Record<string, string> = { accessory: "Badges & accessories", frame: "Postcard frames", theme: "Profile themes", collectible: "Special collectibles", partner: "Partner rewards" };
const ORDER = ["accessory", "frame", "theme", "collectible", "partner"];

/** Small visual preview for any store item. Colors come from admin-set item data. */
export const ItemPreview = ({ item }: { item: Pick<RewardCatalogRow, "item_type" | "preview" | "name"> }) => {
  const p = item.preview ?? {};
  if (item.item_type === "theme")
    return <div className="h-16 w-full rounded-lg" style={{ background: `linear-gradient(135deg, ${p.from ?? "#0f3b46"}, ${p.to ?? "#b87333"})` }} aria-label={`${item.name} preview`} />;
  if (item.item_type === "frame")
    return <div className="flex h-16 w-full items-center justify-center rounded-lg bg-surface-variant"><div className="h-12 w-16 rounded-sm border-4 bg-card" style={{ borderColor: p.color ?? "#b87333" }} /></div>;
  return <div className="flex h-16 w-full items-center justify-center rounded-lg text-3xl" style={{ background: `${p.color ?? "#d4af37"}22` }} aria-hidden>{p.emoji ?? "🎁"}</div>;
};

const StorePage = () => {
  const { balance } = useQuestBalance();
  const { data, isLoading, isError } = useRewardsCatalog();
  const { data: owned } = useEntitlements();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<RewardCatalogRow | null>(null);
  const [busy, setBusy] = useState(false);
  const keyRef = useRef<string | null>(null);

  const ownedMap = new Map((owned ?? []).map((e) => [e.reward_code, e]));
  const now = Date.now();
  const items = (data?.rewards ?? []).filter((r) => !r.ends_at || Date.parse(r.ends_at) > now);

  const refresh = () => ["quest-balance", "quest-history", "rewards-catalog", "entitlements"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const buy = async () => {
    if (!confirm) return;
    setBusy(true);
    keyRef.current ??= newIdempotencyKey(); // same key on retry → never charged twice
    try {
      const r = await purchaseItem(confirm.code, keyRef.current);
      toast.success(r.redemption_code ? `${confirm.name}: your code is ${r.redemption_code}` : `${confirm.name} is yours`);
      keyRef.current = null;
      setConfirm(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed. Nothing was charged.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleEquip = async (code: string, equip: boolean) => {
    try { await equipItem(code, equip); refresh(); toast.success(equip ? "Equipped" : "Unequipped"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't change that"); }
  };

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Reward Store" back />
      <div className="space-y-5 px-4">
        <Link to="/wallet" className="flex items-center justify-between rounded-xl border border-quest-gold/30 bg-quest-gold/5 px-4 py-3">
          <span className="text-xs text-on-surface-variant">Your balance</span>
          <span className="flex items-center gap-1.5 font-display text-base font-medium text-quest-gold"><QuestCoinIcon className="h-4 w-4" />{balance.toLocaleString()}</span>
        </Link>
        <p className="text-[11px] text-on-surface-variant">Your basic postcard for each site always comes free with the visit. Coins unlock extra designs and personalization.</p>

        {isLoading && <p className="text-xs text-on-surface-variant">Loading the store…</p>}
        {isError && <p className="rounded-xl bg-destructive/10 p-4 text-xs text-destructive">The store couldn't load. Try again in a moment.</p>}

        {ORDER.map((type) => {
          const group = items.filter((i) => i.item_type === type);
          if (!group.length) return null;
          return (
            <section key={type}>
              <h2 className="mb-2 font-display text-sm font-medium text-foreground">{TYPE_NAMES[type]}</h2>
              <div className="grid grid-cols-2 gap-3">
                {group.map((item) => {
                  const own = ownedMap.get(item.code);
                  const soldOut = item.inventory !== null && item.sold >= item.inventory;
                  const upcoming = item.starts_at && Date.parse(item.starts_at) > now;
                  const short = item.cost - balance;
                  const equippable = ["theme", "frame", "accessory"].includes(item.item_type);
                  return (
                    <article key={item.code} className="flex flex-col rounded-xl border border-border p-3">
                      <ItemPreview item={item} />
                      <p className="mt-2 font-display text-sm text-foreground">{item.name}</p>
                      <p className="mt-0.5 flex-1 text-[11px] text-on-surface-variant">{item.description}</p>
                      {item.partner_name && <p className="mt-1 text-[11px] text-quest-cyan">{item.partner_name}</p>}
                      <p className="mt-2 flex items-center gap-1 font-display text-sm text-quest-gold"><QuestCoinIcon className="h-3.5 w-3.5" />{item.cost.toLocaleString()}</p>
                      {item.inventory !== null && !soldOut && <p className="text-[10px] text-on-surface-variant">{item.inventory - item.sold} left</p>}
                      {own ? (
                        equippable ? (
                          <button onClick={() => toggleEquip(item.code, !own.equipped)} className="interactive mt-2 flex items-center justify-center gap-1 rounded-full border border-success/50 py-1.5 text-xs text-success">
                            {own.equipped ? <><Check className="h-3 w-3" /> Equipped</> : "Equip"}
                          </button>
                        ) : <p className="mt-2 text-center text-xs text-success">Owned</p>
                      ) : soldOut ? (
                        <p className="mt-2 text-center text-xs text-on-surface-variant">Sold out</p>
                      ) : upcoming ? (
                        <p className="mt-2 text-center text-xs text-on-surface-variant">Available {new Date(item.starts_at!).toLocaleDateString()}</p>
                      ) : short > 0 ? (
                        <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-on-surface-variant"><Lock className="h-3 w-3" />{coinLabel(short)} more needed</p>
                      ) : (
                        <button onClick={() => { keyRef.current = null; setConfirm(item); }} className="interactive mt-2 rounded-full bg-quest-gold py-1.5 font-display text-xs font-medium text-quest-navy">Get</button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Get {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This uses {confirm ? coinLabel(confirm.cost) : ""}. You'll have {confirm ? coinLabel(Math.max(balance - confirm.cost, 0)) : ""} left. Your explorer progress stays the same.
              {confirm?.redemption_instructions ? ` ${confirm.redemption_instructions}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); buy(); }}>{busy ? "Confirming…" : "Confirm"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
};

export default StorePage;
