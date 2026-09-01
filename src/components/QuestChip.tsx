import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useQuestBalance } from "@/hooks/useQuest";
import { useQuestReward } from "@/components/QuestRewardProvider";

/** Compact gold QUEST balance, tappable straight to the Rewards page. */
const QuestChip = ({ size = "sm" }: { size?: "sm" | "lg" }) => {
  const navigate = useNavigate();
  const { balance, signedIn } = useQuestBalance();
  const { pulseKey } = useQuestReward();
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (pulseKey === 0) return;
    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), 1300);
    return () => window.clearTimeout(timer);
  }, [pulseKey]);

  if (!signedIn) return null;

  const large = size === "lg";

  return (
    <button
      onClick={() => navigate("/rewards")}
      aria-label={`${balance} QUEST — open rewards`}
      className={`interactive flex items-center gap-1.5 rounded-full border border-quest-gold/40 bg-quest-gold/10 ${
        large ? "px-4 py-2" : "px-2.5 py-1.5"
      } ${pulsing ? "animate-gold-pulse" : ""}`}
    >
      <Sparkles className={large ? "h-4 w-4 text-quest-gold" : "h-3.5 w-3.5 text-quest-gold"} />
      <span
        className={`font-display font-medium tabular-nums text-quest-gold ${
          large ? "text-base" : "text-xs"
        }`}
      >
        {balance.toLocaleString()}
      </span>
      <span
        className={`font-display uppercase tracking-widest text-quest-gold/70 ${
          large ? "text-[10px]" : "text-[9px]"
        }`}
      >
        Quest
      </span>
    </button>
  );
};

export default QuestChip;
