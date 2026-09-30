import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestCoinIcon from "@/components/QuestCoinIcon";
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
      onClick={() => navigate("/wallet")}
      aria-label={`${balance} Quest Coins — open wallet`}
      className={`interactive flex items-center gap-1.5 rounded-full border border-quest-gold/40 bg-quest-gold/10 ${
        large ? "px-4 py-2" : "px-2.5 py-1.5"
      } ${pulsing ? "animate-gold-pulse" : ""}`}
    >
      <QuestCoinIcon className={large ? "h-4 w-4" : "h-3.5 w-3.5"} />
      <span
        className={`font-display font-medium tabular-nums text-quest-gold ${
          large ? "text-base" : "text-xs"
        }`}
      >
        {balance.toLocaleString()}
      </span>
    </button>
  );
};

export default QuestChip;
