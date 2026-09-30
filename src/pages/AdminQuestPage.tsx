import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { newIdempotencyKey, questAdmin } from "@/hooks/useQuest";
import { ItemPreview } from "@/pages/StorePage";

const input = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground";
const label = "block text-[11px] font-medium text-on-surface-variant";
const card = "rounded-xl bg-card p-4 elevation-1 space-y-3";
const btn = "rounded-lg bg-primary px-4 py-2 font-display text-xs font-medium text-primary-foreground disabled:opacity-50";

type Tab = "rules" | "store" | "events" | "campaigns" | "wallets" | "contributions" | "review" | "analytics";
const toLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

async function run<T>(fn: () => Promise<T>, ok = "Saved") {
  try { const r = await fn(); toast.success(ok); return r; }
  catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); return null; }
}

function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className={label}>{l}</span>{children}</label>;
}

function RuleCard({ rule, onSaved }: { rule: any; onSaved: () => void }) {
  const [r, setR] = useState(rule);
  useEffect(() => setR(rule), [rule]);
  const set = (k: string, v: unknown) => setR({ ...r, [k]: v });
  return (
    <div className={card}>
      <p className="font-display text-sm font-medium">{r.name}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field l="Coins"><input type="number" min={0} className={input} value={r.amount} onChange={(e) => set("amount", Number(e.target.value))} /></Field>
        <Field l="Verification">
          <select className={input} value={r.verification} onChange={(e) => set("verification", e.target.value)}>
            <option value="scan">In-app QR scan</option><option value="proximity">Arrival check (GPS)</option>
            <option value="rotating_code">Rotating staff code</option><option value="staff">Staff confirmation</option>
          </select>
        </Field>
        <Field l="Starts"><input type="datetime-local" className={input} value={toLocal(r.starts_at)} onChange={(e) => set("starts_at", fromLocal(e.target.value))} /></Field>
        <Field l="Ends"><input type="datetime-local" className={input} value={toLocal(r.ends_at)} onChange={(e) => set("ends_at", fromLocal(e.target.value))} /></Field>
        <Field l="Time zone"><input className={input} value={r.timezone} onChange={(e) => set("timezone", e.target.value)} /></Field>
        <Field l="Cooldown (hours, repeatable only)"><input type="number" min={0} className={input} value={r.cooldown_hours} onChange={(e) => set("cooldown_hours", Number(e.target.value))} /></Field>
        <Field l="Cap per visitor (repeatable only)"><input type="number" min={1} className={input} value={r.cap_per_user ?? ""} onChange={(e) => set("cap_per_user", e.target.value ? Number(e.target.value) : null)} /></Field>
      </div>
      <Field l="Description shown to visitors"><input className={input} value={r.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2"><input type="checkbox" checked={r.repeatable} onChange={(e) => set("repeatable", e.target.checked)} /> Repeatable</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={r.stacks_with_trail} onChange={(e) => set("stacks_with_trail", e.target.checked)} /> Stacks with trail bonus</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={r.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
      </div>
      <button className={btn} onClick={async () => { if (await run(() => questAdmin("save_rule", { code: r.code, rule: r }))) onSaved(); }}>Save rule</button>
    </div>
  );
}

function ItemCard({ item, codes, onSaved }: { item: any; codes?: Record<string, number>; onSaved: () => void }) {
  const [it, setIt] = useState(item);
  const [paste, setPaste] = useState("");
  useEffect(() => setIt(item), [item]);
  const set = (k: string, v: unknown) => setIt({ ...it, [k]: v });
  const partner = it.item_type === "partner";
  return (
    <div className={card}>
      <div className="flex gap-3"><div className="w-20"><ItemPreview item={it} /></div><div className="flex-1"><input className={input} value={it.name} onChange={(e) => set("name", e.target.value)} aria-label="Name" /></div></div>
      <Field l="Description"><input className={input} value={it.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field l="Price (Quest Coins)"><input type="number" min={0} className={input} value={it.cost} onChange={(e) => set("cost", Number(e.target.value))} /></Field>
        <Field l="Type">
          <select className={input} value={it.item_type} onChange={(e) => set("item_type", e.target.value)}>
            <option value="accessory">Badge / accessory</option><option value="frame">Postcard frame</option><option value="theme">Profile theme</option>
            <option value="collectible">Collectible</option><option value="partner">Partner reward</option>
          </select>
        </Field>
        <Field l="Stock (blank = unlimited)"><input type="number" min={0} className={input} value={it.inventory ?? ""} disabled={partner} onChange={(e) => set("inventory", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field l="Preview (JSON)"><input className={input} value={JSON.stringify(it.preview ?? {})} onChange={(e) => { try { set("preview", JSON.parse(e.target.value)); } catch { /* typing */ } }} /></Field>
        <Field l="Available from"><input type="datetime-local" className={input} value={toLocal(it.starts_at)} onChange={(e) => set("starts_at", fromLocal(e.target.value))} /></Field>
        <Field l="Available until"><input type="datetime-local" className={input} value={toLocal(it.ends_at)} onChange={(e) => set("ends_at", fromLocal(e.target.value))} /></Field>
      </div>
      {partner && (
        <div className="space-y-2 rounded-lg bg-surface-variant p-3">
          <Field l="Partner name (real, confirmed partner only)"><input className={input} value={it.partner_name ?? ""} onChange={(e) => set("partner_name", e.target.value)} /></Field>
          <Field l="Partner website"><input className={input} value={it.sponsor_url ?? ""} onChange={(e) => set("sponsor_url", e.target.value)} /></Field>
          <Field l="Redemption instructions"><textarea className={input} value={it.redemption_instructions ?? ""} onChange={(e) => set("redemption_instructions", e.target.value)} /></Field>
          <Field l="Code valid for (days)"><input type="number" min={1} className={input} value={it.code_expires_days ?? ""} onChange={(e) => set("code_expires_days", e.target.value ? Number(e.target.value) : null)} /></Field>
          <p className="text-[11px] text-on-surface-variant">Codes: {Object.entries(codes ?? {}).map(([k, v]) => `${v} ${k}`).join(", ") || "none yet"}</p>
          <textarea className={input} placeholder="Paste single-use partner codes, one per line" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button className={btn} disabled={!paste.trim()} onClick={async () => { if (await run(() => questAdmin("add_partner_codes", { reward_code: it.code, codes: paste.split(/\s+/) }), "Codes added")) { setPaste(""); onSaved(); } }}>Add codes</button>
        </div>
      )}
      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-2"><input type="checkbox" checked={it.published && it.active} onChange={(e) => setIt({ ...it, published: e.target.checked, active: e.target.checked })} /> Published</label>
        <span className="text-on-surface-variant">{it.sold} sold</span>
      </div>
      <button className={btn} onClick={async () => { if (await run(() => questAdmin("save_item", { code: it.code, item: it }))) onSaved(); }}>Save item</button>
    </div>
  );
}

function EventCard({ ev, campaigns, onSaved }: { ev: any; campaigns: any[]; onSaved: () => void }) {
  const [e, setE] = useState(ev);
  const [code, setCode] = useState<{ code: string; expires_in: number } | null>(null);
  const [email, setEmail] = useState("");
  useEffect(() => setE(ev), [ev]);
  const set = (k: string, v: unknown) => setE({ ...e, [k]: v });
  useEffect(() => {
    if (!code) return;
    const t = setTimeout(() => questAdmin("event_code", { id: e.id }).then(setCode).catch(() => setCode(null)), code.expires_in * 1000);
    return () => clearTimeout(t);
  }, [code, e.id]);
  return (
    <div className={card}>
      <p className="text-[11px] text-on-surface-variant">Event code for visitors: <span className="font-mono text-foreground">{e.code}</span></p>
      <Field l="Name"><input className={input} value={e.name} onChange={(x) => set("name", x.target.value)} /></Field>
      <Field l="Description"><input className={input} value={e.description} onChange={(x) => set("description", x.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field l="Location"><input className={input} value={e.location ?? ""} onChange={(x) => set("location", x.target.value)} /></Field>
        <Field l="Coins (blank = rule default)"><input type="number" min={0} className={input} value={e.amount ?? ""} onChange={(x) => set("amount", x.target.value ? Number(x.target.value) : null)} /></Field>
        <Field l="Starts"><input type="datetime-local" className={input} value={toLocal(e.starts_at)} onChange={(x) => set("starts_at", fromLocal(x.target.value))} /></Field>
        <Field l="Ends"><input type="datetime-local" className={input} value={toLocal(e.ends_at)} onChange={(x) => set("ends_at", fromLocal(x.target.value))} /></Field>
        <Field l="Time zone"><input className={input} value={e.timezone} onChange={(x) => set("timezone", x.target.value)} /></Field>
        <Field l="Verification">
          <select className={input} value={e.verification} onChange={(x) => set("verification", x.target.value)}>
            <option value="rotating_code">Rotating code</option><option value="staff">Staff confirmation only</option>
          </select>
        </Field>
        <Field l="Campaign">
          <select className={input} value={e.campaign_code ?? ""} onChange={(x) => set("campaign_code", x.target.value || null)}>
            <option value="">None</option>{campaigns.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={e.published} onChange={(x) => set("published", x.target.checked)} /> Published</label>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={async () => { if (await run(() => questAdmin("save_event", { id: e.id, data: e }))) onSaved(); }}>Save event</button>
        {e.verification === "rotating_code" && <button className={btn} onClick={() => questAdmin("event_code", { id: e.id }).then(setCode).catch((x) => toast.error(x.message))}>Show check-in code</button>}
      </div>
      {code && <p className="rounded-lg bg-surface-variant p-3 text-center font-mono text-3xl tracking-[0.3em]" aria-live="polite">{code.code}</p>}
      <div className="flex gap-2">
        <input className={input} placeholder="Visitor email to confirm attendance" value={email} onChange={(x) => setEmail(x.target.value)} />
        <button className={btn} disabled={!email} onClick={async () => { const r = await run(() => questAdmin("confirm_attendance", { id: e.id, email }), "Done"); if (r && !(r as any).awarded) toast((r as any).reason ?? "Already collected"); }}>Confirm</button>
      </div>
    </div>
  );
}

const AdminQuestPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("rules");
  const { data, isLoading, error } = useQuery({ queryKey: ["quest-admin"], queryFn: () => questAdmin("overview") });
  const analytics = useQuery({ queryKey: ["quest-analytics"], queryFn: () => questAdmin("analytics"), enabled: tab === "analytics" && Boolean(data?.is_admin) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["quest-admin"] });

  const [newCode, setNewCode] = useState("");
  const [adj, setAdj] = useState({ email: "", amount: "", reason: "" });
  const [adjKey, setAdjKey] = useState(newIdempotencyKey());
  const [lookup, setLookup] = useState<{ email: string; rows: any[] | null }>({ email: "", rows: null });
  const [refundReason, setRefundReason] = useState("");
  const [partnerCode, setPartnerCode] = useState("");

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error || !data) return <div className="p-6 text-sm text-destructive">Couldn't load the Quest Coin manager.</div>;
  const isAdm = data.is_admin;
  const tabs: [Tab, string][] = isAdm
    ? [["rules", "Rules"], ["store", "Store"], ["events", "Events"], ["campaigns", "Campaigns"], ["wallets", "Wallets"], ["contributions", "Contributions"], ["review", "Review"], ["analytics", "Analytics"]]
    : [["events", "Events"], ["campaigns", "Campaigns"]];
  const activeTab = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  return (
    <div className="min-h-screen pb-16">
      <PageHeader title="Quest Coin Manager" back />
      <div className="space-y-4 px-4">
        <div className="flex gap-1 overflow-x-auto pb-1" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={activeTab === k} onClick={() => setTab(k)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${activeTab === k ? "bg-primary text-primary-foreground" : "bg-surface-variant text-on-surface-variant"}`}>{l}</button>
          ))}
        </div>

        {activeTab === "rules" && (data.rules ?? []).map((r: any) => <RuleCard key={r.code} rule={r} onSaved={refresh} />)}

        {activeTab === "store" && (
          <>
            <div className={card}>
              <Field l="New item code (letters, numbers, underscores)"><input className={input} value={newCode} onChange={(e) => setNewCode(e.target.value)} /></Field>
              <button className={btn} disabled={!newCode} onClick={async () => { if (await run(() => questAdmin("save_item", { code: newCode, item: { published: false, active: false, item_type: "collectible" } }), "Draft item created")) { setNewCode(""); refresh(); } }}>Create draft item</button>
            </div>
            {(data.items ?? []).map((i: any) => <ItemCard key={i.code} item={i} codes={data.code_counts?.[i.code]} onSaved={refresh} />)}
          </>
        )}

        {(activeTab === "events" || activeTab === "campaigns") && (
          <div className={card}>
            <Field l={`New ${activeTab === "events" ? "event" : "campaign"} code`}><input className={input} value={newCode} onChange={(e) => setNewCode(e.target.value)} /></Field>
            <button className={btn} disabled={!newCode} onClick={async () => { if (await run(() => questAdmin(activeTab === "events" ? "save_event" : "save_campaign", { new_code: newCode, data: { name: newCode } }), "Created")) { setNewCode(""); refresh(); } }}>Create</button>
          </div>
        )}
        {activeTab === "events" && (data.events ?? []).map((e: any) => <EventCard key={e.id} ev={e} campaigns={data.campaigns ?? []} onSaved={refresh} />)}
        {activeTab === "campaigns" && (data.campaigns ?? []).map((c: any) => (
          <CampaignCard key={c.code} c={c} onSaved={refresh} />
        ))}

        {activeTab === "wallets" && (
          <>
            <div className={card}>
              <p className="font-display text-sm font-medium">Balance adjustment</p>
              <Field l="Visitor email"><input className={input} value={adj.email} onChange={(e) => setAdj({ ...adj, email: e.target.value })} /></Field>
              <Field l="Amount (negative to deduct)"><input type="number" className={input} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} /></Field>
              <Field l="Reason (required)"><input className={input} value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} /></Field>
              <button className={btn} disabled={!adj.email || !adj.amount || !adj.reason.trim()} onClick={async () => {
                if (await run(() => questAdmin("adjust", { email: adj.email, amount: Number(adj.amount), reason: adj.reason, idempotency_key: adjKey }), "Adjusted")) { setAdj({ email: "", amount: "", reason: "" }); setAdjKey(newIdempotencyKey()); }
              }}>Apply adjustment</button>
            </div>
            <div className={card}>
              <p className="font-display text-sm font-medium">Refund a purchase</p>
              <div className="flex gap-2">
                <input className={input} placeholder="Visitor email" value={lookup.email} onChange={(e) => setLookup({ ...lookup, email: e.target.value })} />
                <button className={btn} onClick={async () => { const r: any = await run(() => questAdmin("lookup_redemptions", { email: lookup.email }), "Loaded"); if (r) setLookup({ ...lookup, rows: r.redemptions }); }}>Find</button>
              </div>
              <Field l="Refund reason (required)"><input className={input} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} /></Field>
              {(lookup.rows ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                  <span>{r.reward_code} · {r.quest_spent} · {r.status}</span>
                  {!r.refunded_at && !r.redeemed_at && <button className={btn} disabled={!refundReason.trim()} onClick={async () => { if (await run(() => questAdmin("refund", { redemption_id: r.id, reason: refundReason }), "Refunded")) setLookup({ ...lookup, rows: lookup.rows!.map((x) => x.id === r.id ? { ...x, refunded_at: "now", status: "refunded" } : x) }); }}>Refund</button>}
                </div>
              ))}
            </div>
            <div className={card}>
              <p className="font-display text-sm font-medium">Validate a partner code</p>
              <div className="flex gap-2">
                <input className={input} value={partnerCode} onChange={(e) => setPartnerCode(e.target.value)} placeholder="Code shown by the visitor" />
                <button className={btn} disabled={!partnerCode} onClick={async () => { if (await run(() => questAdmin("validate_partner_code", { code: partnerCode }), "Valid: marked as used")) setPartnerCode(""); }}>Redeem</button>
              </div>
            </div>
          </>
        )}

        {activeTab === "contributions" && (
          (data.requests ?? []).length === 0 ? <p className="text-xs text-on-surface-variant">No submissions yet.</p> :
          (data.requests ?? []).map((r: any) => (
            <div key={r.id} className={card}>
              <p className="font-display text-sm font-medium">{r.location_name}</p>
              <p className="text-xs text-on-surface-variant">{r.why_it_matters}</p>
              <p className="text-[11px] text-on-surface-variant">{r.status} · {r.submitted_by ? "Signed-in visitor" : "No account (no coins)"}</p>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button className={btn} onClick={async () => { const x: any = await run(() => questAdmin("review_contribution", { id: r.id, approve: true }), "Approved"); if (x?.note) toast(x.note); refresh(); }}>Approve</button>
                  <button className="rounded-lg bg-surface-variant px-4 py-2 text-xs" onClick={async () => { await run(() => questAdmin("review_contribution", { id: r.id, approve: false }), "Declined"); refresh(); }}>Decline</button>
                </div>
              )}
            </div>
          ))
        )}

        {activeTab === "review" && (
          <>
            <p className="font-display text-sm font-medium">Open review flags</p>
            {(data.flags ?? []).length === 0 && <p className="text-xs text-on-surface-variant">Nothing flagged.</p>}
            {(data.flags ?? []).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                <span>{f.kind.replace(/_/g, " ")} · {JSON.stringify(f.details)} · {new Date(f.created_at).toLocaleString()}</span>
                <button className={btn} onClick={async () => { await run(() => questAdmin("resolve_flag", { id: f.id }), "Resolved"); refresh(); }}>Resolve</button>
              </div>
            ))}
            <p className="pt-3 font-display text-sm font-medium">Audit log</p>
            {(data.audit ?? []).map((a: any) => (
              <p key={a.id} className="border-b border-border py-1 text-[11px] text-on-surface-variant">{new Date(a.created_at).toLocaleString()} · {a.action} · {a.target_type} {a.target_id}{a.reason ? ` · "${a.reason}"` : ""}</p>
            ))}
          </>
        )}

        {activeTab === "analytics" && (
          analytics.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> :
          <div className="grid grid-cols-2 gap-3">
            {Object.entries({ "Coins issued": analytics.data?.issued, "Coins spent": analytics.data?.spent, Refunded: analytics.data?.refunded, Adjustments: analytics.data?.adjusted, Outstanding: analytics.data?.outstanding, "Trail completions": analytics.data?.trail_completions, "Store purchases": analytics.data?.redemptions, "Partner codes used": analytics.data?.partner_redeemed })
              .map(([k, v]) => <div key={k} className={card}><p className={label}>{k}</p><p className="font-display text-xl tabular-nums">{Number(v ?? 0).toLocaleString()}</p></div>)}
          </div>
        )}
      </div>
    </div>
  );
};

function CampaignCard({ c: init, onSaved }: { c: any; onSaved: () => void }) {
  const [c, setC] = useState(init);
  useEffect(() => setC(init), [init]);
  return (
    <div className={card}>
      <Field l="Name"><input className={input} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field l="Coin budget (blank = none)"><input type="number" min={0} className={input} value={c.budget ?? ""} onChange={(e) => setC({ ...c, budget: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field l="Used"><input disabled className={input} value={c.spent} /></Field>
        <Field l="Starts"><input type="datetime-local" className={input} value={toLocal(c.starts_at)} onChange={(e) => setC({ ...c, starts_at: fromLocal(e.target.value) })} /></Field>
        <Field l="Ends"><input type="datetime-local" className={input} value={toLocal(c.ends_at)} onChange={(e) => setC({ ...c, ends_at: fromLocal(e.target.value) })} /></Field>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} /> Active</label>
      <button className={btn} onClick={async () => { if (await run(() => questAdmin("save_campaign", { code: c.code, data: c }))) onSaved(); }}>Save campaign</button>
    </div>
  );
}

export default AdminQuestPage;
