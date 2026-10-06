import { useState } from "react";
import { CheckCircle2, ChevronDown, CircleAlert, Clock3, Puzzle } from "lucide-react";
import { useH5PActivities } from "@/hooks/useH5P";
import { useAuth } from "@/hooks/useAuth";
import { useQuestReward } from "@/components/QuestRewardProvider";
import QuestCoinIcon from "@/components/QuestCoinIcon";
import H5PActivity from "@/components/H5PActivity";
import { Button } from "@/components/ui/button";

const activityLabel = (kind?: string | null) => kind === "timeline" ? "Timeline activity" : "Story challenge";

const StatusMessage = ({ message }: { message: string }) => {
  const success = /finished|already collected/i.test(message);
  const failed = /couldn't|error|failed/i.test(message);
  const Icon = success ? CheckCircle2 : failed ? CircleAlert : Clock3;
  return (
    <p
      role="status"
      className={`mx-1 mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 font-activity-body text-sm leading-relaxed ${
        success ? "border-success/25 bg-success/10 text-activity-ink" : failed ? "border-destructive/25 bg-destructive/10 text-destructive" : "border-activity-border bg-activity-soft text-activity-ink"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
};

/** Interactive H5P activities for a marker. Free to play; signed-in finishers earn once. */
const MarkerActivities = ({ markerId }: { markerId: string }) => {
  const { items } = useH5PActivities(markerId);
  const { user } = useAuth();
  const { celebrate } = useQuestReward();
  const [open, setOpen] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});

  if (!items.length) return null;

  return (
    <section className="activity-shell overflow-hidden rounded-xl border border-activity-border bg-activity-surface shadow-activity">
      <header className="flex flex-col gap-3 px-4 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pt-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-activity-soft text-activity">
            <Puzzle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-activity-heading text-lg font-extrabold text-activity-ink">Activities</h2>
            <p className="font-activity-body text-xs text-activity-ink/65">{items.length} interactive {items.length === 1 ? "challenge" : "challenges"}</p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-activity-gold/40 bg-activity-gold/15 px-3 py-1.5 font-activity-body text-xs font-semibold text-activity-ink">
          <QuestCoinIcon className="h-4 w-4" />
          <span>{user ? "Earn Quest Coins" : "Sign in for Quest Coins"}</span>
        </div>
      </header>
      <ul className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
        {items.map((a) => {
          const isOpen = open === a.id;
          return (
            <li key={a.id} className="overflow-hidden rounded-lg border border-activity-border bg-activity-paper">
              <Button
                variant="ghost"
                onClick={() => setOpen(isOpen ? null : a.id)}
                aria-expanded={isOpen}
                aria-controls={`activity-${a.id}`}
                className="group h-auto min-h-16 w-full justify-between gap-3 rounded-none px-4 py-3 text-left hover:bg-activity-soft sm:px-5 sm:py-4"
              >
                <span className="min-w-0 flex-1 whitespace-normal">
                  <span className="mb-1 block font-activity-body text-[11px] font-bold uppercase text-activity">{activityLabel(a.kind)}</span>
                  <span className="block font-activity-heading text-sm font-bold leading-snug text-activity-ink sm:text-base">{a.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {user && a.reward_amount > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-activity-gold/20 px-2 py-1 font-activity-body text-xs font-semibold text-activity-ink">
                      <QuestCoinIcon className="h-3.5 w-3.5" /> {a.reward_amount}
                    </span>
                  )}
                  <ChevronDown className={`h-5 w-5 text-activity transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </span>
              </Button>
              {isOpen && (
                <div id={`activity-${a.id}`} className="animate-fade-in border-t border-activity-border p-2 sm:p-4">
                  <div className="overflow-hidden rounded-lg bg-activity-surface p-1 sm:p-2">
                    <H5PActivity
                      activityId={a.id}
                      sharedLibraries={a.generated}
                      onAward={celebrate}
                      onStatus={(s) => setStatus((p) => ({ ...p, [a.id]: s }))}
                    />
                  </div>
                  {status[a.id] && <StatusMessage message={status[a.id]} />}
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
