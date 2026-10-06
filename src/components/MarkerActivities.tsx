import { useState } from "react";
import { ChevronDown, Puzzle } from "lucide-react";
import { useH5PActivities } from "@/hooks/useH5P";
import { useAuth } from "@/hooks/useAuth";
import { useQuestReward } from "@/components/QuestRewardProvider";
import QuestCoinIcon from "@/components/QuestCoinIcon";
import H5PActivity from "@/components/H5PActivity";

/** Interactive H5P activities for a marker. Free to play; signed-in finishers earn once. */
const MarkerActivities = ({ markerId }: { markerId: string }) => {
  const { items } = useH5PActivities(markerId);
  const { user } = useAuth();
  const { celebrate } = useQuestReward();
  const [open, setOpen] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});

  if (!items.length) return null;

  return (
    <section className="overflow-hidden rounded-xl bg-card elevation-1">
      <div className="flex items-center gap-2 px-4 pt-4">
        <Puzzle className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-on-surface">Activities</h2>
      </div>
      {!user && (
        <p className="px-4 pt-1 text-xs text-on-surface-variant">Sign in to earn Quest Coins for finishing.</p>
      )}
      <ul className="divide-y divide-border">
        {items.map((a) => {
          const isOpen = open === a.id;
          return (
            <li key={a.id}>
              <button
                onClick={() => setOpen(isOpen ? null : a.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm text-on-surface">{a.title}</span>
                <span className="flex items-center gap-2">
                  {user && a.reward_amount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <QuestCoinIcon className="h-3.5 w-3.5" /> {a.reward_amount}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
              {isOpen && (
                <div className="px-2 pb-3">
                  <H5PActivity
                    activityId={a.id}
                    sharedLibraries={a.generated}
                    onAward={celebrate}
                    onStatus={(s) => setStatus((p) => ({ ...p, [a.id]: s }))}
                  />
                  {status[a.id] && (
                    <p role="status" className="px-2 pt-2 text-xs text-on-surface-variant">{status[a.id]}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default MarkerActivities;
