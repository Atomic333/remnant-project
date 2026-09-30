import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { callDiscovery, clearPendingSecrets, getPendingSecrets } from "@/lib/discovery";

/** After sign-in, save discoveries a guest verified earlier. The server re-checks every claim. */
const PendingDiscoveryClaimer = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!user || done.current === user.id) return;
    const secrets = getPendingSecrets();
    if (!secrets.length) return;
    done.current = user.id;
    callDiscovery<{ results: { secret: string; ok: boolean; error?: string }[] }>({ action: "claim_pending", secrets })
      .then(({ results }) => {
        clearPendingSecrets();
        const saved = results.filter((r) => r.ok).length;
        if (saved) {
          toast({ title: `${saved} discover${saved === 1 ? "y" : "ies"} saved to your account` });
          qc.invalidateQueries({ queryKey: ["postcards"] });
          qc.invalidateQueries({ queryKey: ["discovery-status"] });
        }
      })
      .catch(() => {
        done.current = null; // keep the claims and retry on the next load
      });
  }, [user, qc]);

  return null;
};

export default PendingDiscoveryClaimer;
