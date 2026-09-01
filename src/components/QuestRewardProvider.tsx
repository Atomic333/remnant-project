import { createContext, useCallback, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ArtifactRewardOverlay, { type ArtifactReveal } from "@/components/ArtifactRewardOverlay";
import type { QuestAward } from "@/hooks/useQuest";

interface QuestRewardContextValue {
  /** Play the artifact reveal for a server award result (no-op when nothing was awarded). */
  celebrate: (award: QuestAward | ArtifactReveal | null | undefined) => void;
  /** Last celebrated amount — lets the header chip pulse in step with the reveal. */
  pulseKey: number;
}

const QuestRewardContext = createContext<QuestRewardContextValue>({
  celebrate: () => {},
  pulseKey: 0,
});

export const useQuestReward = () => useContext(QuestRewardContext);

const QuestRewardProvider = ({ children }: { children: React.ReactNode }) => {
  const [reveal, setReveal] = useState<ArtifactReveal | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const queryClient = useQueryClient();

  const celebrate = useCallback(
    (award: QuestAward | ArtifactReveal | null | undefined) => {
      if (!award) return;
      const amount = award.amount ?? 0;
      const achievements = award.achievements ?? [];
      const bonus = achievements.reduce((sum, a) => sum + (a.quest_reward ?? 0), 0);
      if (amount + bonus <= 0) return;

      setReveal({
        amount: amount + bonus,
        title: award.title || "A new find joins your collection",
        rarity: (award as QuestAward).rarity,
        achievements,
      });
      setPulseKey((k) => k + 1);

      // Balance, history and achievements all changed server-side.
      queryClient.invalidateQueries({ queryKey: ["quest-balance"] });
      queryClient.invalidateQueries({ queryKey: ["quest-history"] });
      queryClient.invalidateQueries({ queryKey: ["quest-achievements"] });
      queryClient.invalidateQueries({ queryKey: ["quest-discovery-count"] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
    [queryClient],
  );

  return (
    <QuestRewardContext.Provider value={{ celebrate, pulseKey }}>
      {children}
      <ArtifactRewardOverlay reveal={reveal} onDismiss={() => setReveal(null)} />
    </QuestRewardContext.Provider>
  );
};

export default QuestRewardProvider;
