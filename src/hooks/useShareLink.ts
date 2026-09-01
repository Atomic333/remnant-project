import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export const SHARE_BASE_URL = "https://markerquest.ai";

function randomCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Public share link state for the signed-in visitor's visit history. */
export function useShareLink() {
  const { user } = useAuth();
  const { profile, update } = useProfile();
  const [busy, setBusy] = useState(false);

  const code = profile?.share_code ?? null;
  const enabled = Boolean(profile?.share_enabled && code);
  const shareUrl = code ? `${SHARE_BASE_URL}/u/${code}` : null;

  /** Turn sharing on (minting a code the first time) or off. */
  const setEnabled = async (next: boolean): Promise<string | null> => {
    if (!user) return null;
    setBusy(true);
    try {
      if (!next) {
        await update({ share_enabled: false });
        return null;
      }

      let nextCode = code;
      if (!nextCode) {
        // Retry on the (very unlikely) unique-code collision.
        for (let attempt = 0; attempt < 5 && !nextCode; attempt++) {
          const candidate = randomCode();
          const { error } = await supabase
            .from("profiles")
            .update({ share_code: candidate, share_enabled: true })
            .eq("id", user.id);
          if (!error) nextCode = candidate;
          else if (!error.message.includes("share_code")) throw error;
        }
        if (!nextCode) throw new Error("Couldn't create a share link. Please try again.");
      } else {
        await update({ share_enabled: true });
      }

      await update({ share_enabled: true });
      return nextCode ? `${SHARE_BASE_URL}/u/${nextCode}` : null;
    } finally {
      setBusy(false);
    }
  };

  return { code, enabled, shareUrl, setEnabled, busy };
}
