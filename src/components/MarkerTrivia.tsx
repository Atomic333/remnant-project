import { useState } from "react";
import { Brain, Check, Loader2, Lock, Navigation, QrCode, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Marker } from "@/data/markers";
import {
  fetchTrivia,
  gradeTrivia,
  useMarkerDiscovered,
  type TriviaResult,
  type TriviaSet,
} from "@/hooks/useQuest";
import { useQuestReward } from "@/components/QuestRewardProvider";
import { useAuth } from "@/hooks/useAuth";

/** Marker trivia: questions are generated and graded entirely server-side. */
const MarkerTrivia = ({ marker }: { marker: Marker }) => {
  const { user } = useAuth();
  const { celebrate } = useQuestReward();
  const { data: discovered, isLoading: checkingDiscovery } = useMarkerDiscovered(marker.id);
  const [set, setSet] = useState<TriviaSet | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<TriviaResult | null>(null);

  const start = async () => {
    setLoading(true);
    try {
      const data = await fetchTrivia(marker.id, {
        name: marker.name,
        summary: marker.summary,
        story: marker.story,
        sources: marker.sources.map((s) => s.name).join(", "),
      });
      if (data.locked) {
        toast.error("Scan this marker's QR code on site to unlock trivia.");
        return;
      }
      setSet(data);
      setAnswers(new Array(data.questions.length).fill(-1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Trivia is unavailable right now");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!set) return;
    setGrading(true);
    try {
      const res = await gradeTrivia(marker.id, answers);
      setResult(res);
      celebrate(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not score your answers");
    } finally {
      setGrading(false);
    }
  };

  /** On-site earning gate — shown to guests and to anyone who hasn't scanned here. */
  const LockedPanel = ({ signedIn }: { signedIn: boolean }) => (
    <div>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-quest-navy text-quest-gold">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display text-sm font-medium text-card-foreground">
            Earned on location
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            QUEST is only awarded to explorers who stand at the site and scan the plaque's QR code.
            {signedIn
              ? " Visit this marker, scan its code, and the trivia set unlocks here."
              : " Create a free account, then scan the plaque's code to start earning."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {signedIn ? (
          <Link
            to="/map"
            className="interactive flex items-center gap-2 rounded-full bg-quest-navy px-4 py-2 font-display text-xs font-medium text-quest-gold"
          >
            <QrCode className="h-3.5 w-3.5" />
            Scan QR code
          </Link>
        ) : (
          <Link
            to="/auth"
            className="interactive flex items-center gap-2 rounded-full bg-quest-navy px-4 py-2 font-display text-xs font-medium text-quest-gold"
          >
            <QrCode className="h-3.5 w-3.5" />
            Sign in to earn
          </Link>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="interactive flex items-center gap-2 rounded-full border border-border px-4 py-2 font-display text-xs font-medium text-on-surface-variant"
        >
          <Navigation className="h-3.5 w-3.5" />
          Directions
        </a>
      </div>
    </div>
  );

  if (!user) return <LockedPanel signedIn={false} />;

  if (checkingDiscovery) {
    return (
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking your discoveries…
      </div>
    );
  }

  if (!discovered) return <LockedPanel signedIn />;

  if (!set) {
    return (
      <div>
        <p className="text-sm text-on-surface-variant">
          You scanned this plaque — answer three questions about the site to earn QUEST.
        </p>
        <button
          onClick={start}
          disabled={loading}
          className="interactive mt-3 flex items-center gap-2 rounded-full bg-quest-navy px-4 py-2 font-display text-xs font-medium text-quest-gold disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          {loading ? "Preparing questions…" : "Start trivia"}
        </button>
      </div>
    );
  }


  const allAnswered = answers.every((a) => a >= 0);

  return (
    <div className="space-y-4">
      {set.already_completed && !result && (
        <p className="rounded-lg bg-surface-variant px-3 py-2 text-xs text-on-surface-variant">
          You already scored {set.previous_score}/{set.max_score} here — replaying is just for fun, no
          extra QUEST.
        </p>
      )}

      {set.questions.map((q, qi) => (
        <div key={qi}>
          <p className="text-sm font-medium text-foreground">
            {qi + 1}. {q.question}
          </p>
          <div className="mt-2 space-y-1.5">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const graded = result?.results?.[qi];
              const isAnswer = graded && graded.answer_index === oi;
              return (
                <button
                  key={oi}
                  disabled={Boolean(result)}
                  onClick={() =>
                    setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)))
                  }
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    isAnswer
                      ? "border-success bg-success/10 text-foreground"
                      : selected && result
                        ? "border-destructive bg-destructive/10 text-foreground"
                        : selected
                          ? "border-primary bg-secondary text-foreground"
                          : "border-border text-on-surface-variant"
                  }`}
                >
                  {result && isAnswer && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
                  {result && selected && !isAnswer && (
                    <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
          {result?.results?.[qi]?.explanation && (
            <p className="mt-1.5 text-xs text-on-surface-variant">
              {result.results[qi].explanation}
            </p>
          )}
        </div>
      ))}

      {result ? (
        <p className="font-display text-sm font-medium text-foreground">
          {result.score}/{result.max_score} correct
          {result.amount > 0 ? ` · +${result.amount} QUEST earned` : ""}
        </p>
      ) : (
        <button
          onClick={submit}
          disabled={!allAnswered || grading}
          className="interactive flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {grading && <Loader2 className="h-4 w-4 animate-spin" />}
          {grading ? "Scoring…" : "Submit answers"}
        </button>
      )}
    </div>
  );
};

export default MarkerTrivia;
