import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, HelpCircle, Loader2, Lock, MapPinned, QrCode, ShieldAlert, Sparkles } from "lucide-react";
import type { Marker } from "@/data/markers";
import { useAuth } from "@/hooks/useAuth";
import DiscoveryReveal from "@/components/DiscoveryReveal";
import {
  addPendingSecret, callDiscovery, DIGITAL_LABEL, formatWindow, useDiscoveryStatus,
  type RevealContent, type VerifyResult,
} from "@/lib/discovery";

interface Props {
  marker: Marker;
  /** True when this page was opened from the in-app QR scanner just now. */
  scanVerified: boolean;
}

type Ready = { content: RevealContent; outcome: string | null; pending: boolean };

function outcomeText(r: VerifyResult, sensitive: boolean) {
  if (r.pending) return sensitive ? "Sign in to save this remembrance." : "Sign in to save this to My Postcards. You won't need to scan again.";
  if (r.repeat) return "Already in your collection. Enjoy it again.";
  const parts: string[] = [];
  if (r.postcard_new) parts.push(sensitive ? "Saved to your remembrances." : "Postcard saved to My Postcards.");
  if (r.quest) parts.push(sensitive ? `${r.quest} QUEST added.` : `+${r.quest} QUEST`);
  if (r.badge) parts.push("Badge unlocked.");
  return parts.join(" ") || "Discovery saved.";
}

const DiscoveryPanel = ({ marker, scanVerified }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: status, isLoading, refetch } = useDiscoveryStatus(marker.id, user?.id ?? null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const triedQr = useRef(false);

  const sensitive = status?.sensitivity === "sensitive";

  const verify = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await callDiscovery<VerifyResult>({ marker_slug: marker.id, ...body });
      if (r.guest_secret) addPendingSecret(r.guest_secret);
      setReady({ content: r.reveal, outcome: outcomeText(r, sensitive), pending: Boolean(r.pending) });
      if (!r.pending) {
        qc.invalidateQueries({ queryKey: ["discovery-status"] });
        qc.invalidateQueries({ queryKey: ["postcards"] });
        if (r.quest) qc.invalidateQueries({ queryKey: ["quest"] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach MarkerQuest. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  // A fresh in-app scan verifies automatically; the reveal still waits for the visitor's tap.
  useEffect(() => {
    if (!scanVerified || triedQr.current || authLoading || !status) return;
    if (!status.has_discovery || status.marker_type !== "physical" || status.availability !== "active" || status.missing.length) return;
    triedQr.current = true;
    void verify({ action: "verify_qr" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanVerified, authLoading, status]);

  const discoverHere = () => {
    if (!("geolocation" in navigator)) {
      setError("This browser can't share your location, so the discovery can't be verified here.");
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        void verify({ action: "verify_arrival", lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for MarkerQuest, so we can't confirm you're here. The history above is still yours to read. Allow location in your browser settings to collect this discovery."
            : "We couldn't get a GPS fix. Move into the open, wait a few seconds, and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  if (isLoading || !status) return null;
  const digital = status.marker_type === "digital";

  if (!status.has_discovery) {
    return digital ? <DigitalLabel /> : null;
  }

  const windowText = formatWindow(status);
  const header = (
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-quest-navy text-quest-gold">
        {status.visibility === "mystery" && !status.claimed ? <HelpCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <span className="font-display font-medium text-card-foreground">
        {sensitive ? "Explore this story" : status.visibility === "mystery" && !status.claimed ? "Mystery discovery" : "Discovery"}
      </span>
    </div>
  );

  const openReveal = (content: RevealContent, outcome: string | null) => {
    setReady((r) => r ?? { content, outcome, pending: false });
    setOpen(true);
  };

  let body: React.ReactNode;
  if (status.claimed && status.content && !ready) {
    body = (
      <>
        <p className="text-sm text-on-surface-variant">{sensitive ? "You saved this remembrance." : "You've collected this discovery."}</p>
        <button onClick={() => openReveal(status.content!, null)} className="mt-3 w-full rounded-xl bg-secondary py-3 font-display text-sm font-medium text-secondary-foreground">
          Replay reveal
        </button>
      </>
    );
  } else if (status.availability !== "active") {
    body = (
      <p className="flex items-start gap-2 text-sm text-on-surface-variant">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          {status.availability === "upcoming" ? "Opens soon." : "This discovery has ended."} {windowText}
        </span>
      </p>
    );
  } else if (status.missing.length) {
    body = (
      <div className="text-sm text-on-surface-variant">
        <p className="flex items-center gap-2 font-medium text-card-foreground"><Lock className="h-4 w-4" /> Locked</p>
        <ul className="mt-1 list-disc pl-5">{status.missing.map((m) => <li key={m}>{m}</li>)}</ul>
      </div>
    );
  } else if (ready) {
    body = (
      <div className="rounded-xl bg-quest-navy p-4 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-quest-gold" />
        <p className="mt-2 font-display text-base font-medium text-background">Stop somewhere safe to reveal your discovery</p>
        <button onClick={() => setOpen(true)} className="mt-4 w-full rounded-xl bg-quest-gold py-3 font-display text-sm font-semibold text-quest-navy">
          Reveal Discovery
        </button>
        {ready.pending && (
          <button
            onClick={() => navigate(`/auth?from=${encodeURIComponent(`/marker/${marker.id}`)}`)}
            className="mt-2 w-full text-xs text-background/80 underline"
          >
            Sign in to save it
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <>
        {status.visibility === "mystery" && status.clue && (
          <p className="mb-3 rounded-lg bg-surface-variant px-3 py-2 text-sm italic text-card-foreground">Clue: {status.clue}</p>
        )}
        {windowText && <p className="mb-2 text-xs text-on-surface-variant">Available {windowText}</p>}
        {digital ? (
          <>
            <p className="text-sm text-on-surface-variant">
              Be within {status.arrival_radius_m} m of this spot, then check in. We only use your location once, when you tap.
            </p>
            <button disabled={busy} onClick={discoverHere} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
              Discover here
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant">
              {sensitive ? "Scan this marker's plaque with the MarkerQuest scanner to save this remembrance." : "Scan this marker's plaque with the MarkerQuest scanner to unlock what's hidden here."}
            </p>
            <button disabled={busy} onClick={() => navigate("/map?scan=1")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Open scanner
            </button>
          </>
        )}
      </>
    );
  }

  return (
    <>
      {digital && <DigitalLabel />}
      <div className="rounded-xl bg-card p-4 elevation-1">
        {header}
        {body}
        {error && (
          <div role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
            <button onClick={() => { setError(null); void refetch(); if (scanVerified && !digital) void verify({ action: "verify_qr" }); }} className="ml-2 underline">
              Try again
            </button>
          </div>
        )}
      </div>
      {ready && (
        <DiscoveryReveal
          open={open}
          onClose={() => setOpen(false)}
          style={status.reveal_style}
          sensitive={sensitive}
          markerName={marker.name}
          content={ready.content}
          outcome={ready.outcome}
        />
      )}
    </>
  );
};

const DigitalLabel = () => (
  <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">{DIGITAL_LABEL}</p>
);

export default DiscoveryPanel;
