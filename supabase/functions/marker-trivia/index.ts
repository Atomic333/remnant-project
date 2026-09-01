import {
  adminClient,
  corsHeaders,
  evaluateAchievements,
  getBalance,
  insertEvent,
  json,
  QUEST_RULES,
  requireUser,
} from "../_shared/quest.ts";

interface TriviaQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

const MODEL = "google/gemini-3.7-flash";

async function generateQuestions(context: {
  name: string;
  summary: string;
  story: string;
  sources: string;
}): Promise<TriviaQuestion[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write short multiple-choice trivia about local historical markers. Use ONLY the marker record provided. Never invent facts. Each question must be answerable from the record. Write warmly and plainly, for a curious visitor standing at the plaque.",
        },
        {
          role: "user",
          content:
            `Marker: ${context.name}\n\nSummary: ${context.summary}\n\nStory: ${context.story}\n\nSources: ${context.sources}\n\n` +
            "Write exactly 3 multiple-choice questions, each with exactly 4 options and one correct option.",
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "marker_trivia",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["questions"],
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["question", "options", "answer_index", "explanation"],
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    answer_index: { type: "integer" },
                    explanation: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("AI gateway error", res.status, detail);
    const err = new Error(`ai_${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { questions?: TriviaQuestion[] };
  const questions = (parsed.questions ?? [])
    .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4)
    .slice(0, 3)
    .map((q) => ({
      question: String(q.question),
      options: q.options.map((o) => String(o)),
      answer_index: Math.max(0, Math.min(3, Number(q.answer_index ?? 0))),
      explanation: String(q.explanation ?? ""),
    }));
  if (questions.length < 3) throw new Error("Could not generate a full trivia set");
  return questions;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "get");
    const markerId = String(body?.marker_id ?? "").slice(0, 120);
    if (!markerId) return json({ error: "marker_id required" }, 400);

    // QUEST is earned on location: only a verified QR-scan discovery unlocks trivia.
    const { data: discovery } = await admin
      .from("reward_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_type", "marker_discovery")
      .eq("source_id", markerId)
      .maybeSingle();

    if (!discovery) {
      return json({
        locked: true,
        questions: [],
        already_completed: false,
        previous_score: null,
        max_score: 0,
        error: "Visit this marker and scan its QR code to unlock trivia.",
      }, action === "grade" ? 403 : 200);
    }

    // ---- Serve the question set, generating and caching it on first request ----
    if (action === "get") {

      const { data: cached } = await admin
        .from("marker_trivia")
        .select("questions")
        .eq("marker_id", markerId)
        .maybeSingle();

      let questions = (cached?.questions as TriviaQuestion[] | undefined) ?? null;

      if (!questions || questions.length < 3) {
        const ctx = body?.context ?? {};
        try {
          questions = await generateQuestions({
            name: String(ctx?.name ?? markerId).slice(0, 300),
            summary: String(ctx?.summary ?? "").slice(0, 4000),
            story: String(ctx?.story ?? "").slice(0, 8000),
            sources: String(ctx?.sources ?? "").slice(0, 2000),
          });
        } catch (e) {
          const status = (e as Error & { status?: number }).status;
          if (status === 429) return json({ error: "Too many requests — try again shortly." }, 429);
          if (status === 402) return json({ error: "AI credits are exhausted for this workspace." }, 402);
          return json({ error: "Trivia is unavailable for this marker right now." }, 503);
        }
        await admin
          .from("marker_trivia")
          .upsert({ marker_id: markerId, questions }, { onConflict: "marker_id" });
      }

      const { data: completion } = await admin
        .from("quest_completions")
        .select("score, max_score")
        .eq("user_id", user.id)
        .eq("completion_type", "trivia")
        .eq("target_id", markerId)
        .maybeSingle();

      // Answers stay on the server.
      return json({
        questions: questions.map((q) => ({ question: q.question, options: q.options })),
        already_completed: Boolean(completion),
        previous_score: completion?.score ?? null,
        max_score: completion?.max_score ?? questions.length,
      });
    }

    // ---- Grade server-side, then award ----
    if (action === "grade") {
      const answers = Array.isArray(body?.answers) ? body.answers.map((a: unknown) => Number(a)) : [];
      const { data: cached } = await admin
        .from("marker_trivia")
        .select("questions")
        .eq("marker_id", markerId)
        .maybeSingle();
      const questions = (cached?.questions as TriviaQuestion[] | undefined) ?? [];
      if (questions.length === 0) return json({ error: "No trivia for this marker" }, 400);

      const results = questions.map((q, i) => ({
        correct: answers[i] === q.answer_index,
        answer_index: q.answer_index,
        explanation: q.explanation,
      }));
      const score = results.filter((r) => r.correct).length;
      const perfect = score === questions.length;

      const { error: compError } = await admin.from("quest_completions").insert({
        user_id: user.id,
        completion_type: "trivia",
        target_id: markerId,
        score,
        max_score: questions.length,
      });
      const alreadyScored = compError?.code === "23505";
      if (compError && !alreadyScored) throw compError;

      let amount = 0;
      let event = null;
      if (!alreadyScored && score > 0) {
        amount = score * QUEST_RULES.triviaPerCorrect + (perfect ? QUEST_RULES.triviaPerfectBonus : 0);
        event = await insertEvent(admin, {
          userId: user.id,
          eventType: "trivia",
          sourceType: "marker",
          sourceId: markerId,
          amount,
          title: perfect ? "Perfect trivia set" : `Trivia — ${score} correct`,
          metadata: { score, max_score: questions.length, perfect },
        });
      }

      const achievements = await evaluateAchievements(admin, user.id);
      return json({
        score,
        max_score: questions.length,
        perfect,
        results,
        awarded: Boolean(event),
        amount: event ? amount : 0,
        title: event?.title ?? (alreadyScored ? "Already scored" : "No QUEST this time"),
        achievements,
        balance: await getBalance(admin, user.id),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("marker-trivia error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
