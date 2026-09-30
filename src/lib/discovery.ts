import { useQuery } from "@tanstack/react-query";
import { invokeFn } from "@/lib/trails";

export type RevealStyle = "postcard_flip" | "envelope" | "time_capsule" | "echo_ripple" | "quiet_fade" | "none";
export const REVEAL_STYLES: { value: RevealStyle; label: string }[] = [
  { value: "postcard_flip", label: "Postcard Flip" },
  { value: "envelope", label: "Envelope Opening" },
  { value: "time_capsule", label: "Time Capsule" },
  { value: "echo_ripple", label: "Echo Ripple" },
  { value: "quiet_fade", label: "Quiet Fade" },
  { value: "none", label: "No animation" },
];

export interface PostcardData {
  id: string;
  title: string;
  location: string;
  front_url: string | null;
  front_alt: string;
  back_text: string;
  credits: string;
  sources: { name: string; url?: string }[];
  commemorative: boolean;
  marker_slug: string;
}

export interface RevealContent {
  bonus_story: string | null;
  reflection_prompt: string | null;
  audio_url: string | null;
  gallery: { url: string | null; alt: string; credit: string }[];
  postcard: PostcardData | null;
}

export interface DiscoveryStatus {
  marker_slug: string;
  marker_type: "physical" | "digital";
  visibility: "visible" | "mystery" | "unlisted";
  reveal_style: RevealStyle;
  sensitivity: "standard" | "sensitive";
  arrival_radius_m: number;
  clue: string | null;
  availability: "upcoming" | "active" | "ended";
  available_from: string | null;
  available_until: string | null;
  availability_tz: string;
  has_discovery: boolean;
  has_postcard: boolean;
  reward_kind: string;
  reward_quest: number;
  missing: string[];
  claimed: boolean;
  content: RevealContent | null;
}

export interface VerifyResult {
  verified: boolean;
  repeat?: boolean;
  pending?: boolean;
  guest_secret?: string;
  postcard_new?: boolean;
  quest?: number;
  badge?: string | null;
  sensitivity: string;
  reveal: RevealContent;
}

export const callDiscovery = <T,>(body: Record<string, unknown>) => invokeFn<T>("discovery", body);

export function useDiscoveryStatus(slug: string | undefined, userId: string | null) {
  return useQuery({
    queryKey: ["discovery-status", slug, userId],
    enabled: Boolean(slug),
    queryFn: () => callDiscovery<DiscoveryStatus>({ action: "status", marker_slug: slug }),
    staleTime: 60_000,
    retry: 1,
  });
}

// ---------- guest pending claims ----------
const PENDING_KEY = "markerquest_pending_discoveries";

export function getPendingSecrets(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}
export function addPendingSecret(secret: string) {
  const all = Array.from(new Set([...getPendingSecrets(), secret])).slice(-50);
  localStorage.setItem(PENDING_KEY, JSON.stringify(all));
}
export function clearPendingSecrets(keep: string[] = []) {
  if (keep.length) localStorage.setItem(PENDING_KEY, JSON.stringify(keep));
  else localStorage.removeItem(PENDING_KEY);
}

export function formatWindow(s: Pick<DiscoveryStatus, "available_from" | "available_until" | "availability_tz">) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { timeZone: s.availability_tz || undefined, dateStyle: "medium", timeStyle: "short" });
  if (s.available_from && s.available_until) return `${fmt(s.available_from)} – ${fmt(s.available_until)}`;
  if (s.available_from) return `From ${fmt(s.available_from)}`;
  if (s.available_until) return `Until ${fmt(s.available_until)}`;
  return "";
}

export const DIGITAL_LABEL = "Digital discovery — no physical plaque at this location.";
