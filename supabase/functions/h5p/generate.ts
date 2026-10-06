/**
 * Generates grounded H5P activities (story challenge + timeline) for one marker.
 * Content comes only from the marker's own text; every item carries an evidence
 * quote that must appear verbatim in that text or the item is dropped.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "h5p-content";
const MODEL = "openai/gpt-6-astra";

export interface SourceInput { slug: string; title: string; text: string; sensitive: boolean; credits: string }

const norm = (s: string) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^a-z0-9'" ]+/g, " ").replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dragSafe = (s: string) => s.replace(/[*:]/g, " ").replace(/\s+/g, " ").trim();

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["multiple_choice", "true_false", "fill_in", "timeline"],
  properties: {
    multiple_choice: { type: "array", items: { type: "object", additionalProperties: false, required: ["question", "correct", "wrong", "evidence"],
      properties: { question: { type: "string" }, correct: { type: "string" }, wrong: { type: "array", items: { type: "string" } }, evidence: { type: "string" } } } },
    true_false: { type: "array", items: { type: "object", additionalProperties: false, required: ["statement", "is_true", "evidence"],
      properties: { statement: { type: "string" }, is_true: { type: "boolean" }, evidence: { type: "string" } } } },
    fill_in: { type: "object", additionalProperties: false, required: ["sentences"],
      properties: { sentences: { type: "array", items: { type: "object", additionalProperties: false, required: ["sentence", "missing_word"],
        properties: { sentence: { type: "string" }, missing_word: { type: "string" } } } } } },
    timeline: { type: "array", items: { type: "object", additionalProperties: false, required: ["year", "event", "evidence"],
      properties: { year: { type: "string" }, event: { type: "string" }, evidence: { type: "string" } } } },
  },
};

type Gen = {
  multiple_choice: { question: string; correct: string; wrong: string[]; evidence: string }[];
  true_false: { statement: string; is_true: boolean; evidence: string }[];
  fill_in: { sentences: { sentence: string; missing_word: string }[] };
  timeline: { year: string; event: string; evidence: string }[];
};

async function askModel(src: SourceInput): Promise<Gen> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("AI is not configured.");
  const tone = src.sensitive
    ? "This is a sensitive site (harm, loss, injustice or sacred meaning). Ask only respectful, factual questions. No playful wording, no trick or 'gotcha' statements; all true/false statements must be true."
    : "Keep wording warm and clear for a general audience.";
  const instructions = `You write short history learning activities for a historical marker app. Use ONLY facts stated in the marker text. Never add outside knowledge, guesses or invented details. ${tone}
Return JSON:
- multiple_choice: 3 questions, each with 1 correct answer and 3 plausible wrong answers. "evidence" is an exact sentence fragment copied verbatim from the text that contains the correct answer.
- true_false: 2 statements. "evidence" is an exact verbatim fragment proving the answer.
- fill_in.sentences: 3 sentences copied verbatim from the text; missing_word is one key word or short name (1-3 words) that appears in that sentence.
- timeline: every dated event in the text (a 4-digit year written in the text, plus a short event description under 15 words). "evidence" is the verbatim fragment containing the year. Empty array if the text has fewer than 3 years.`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL, stream: true, store: false, reasoning: { effort: "low" }, instructions,
      input: [{ role: "user", content: `Marker: ${src.title}\n\nMarker text:\n${src.text}` }],
      text: { format: { type: "json_schema", name: "activities", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    const err = new Error(res.status === 402 ? "Out of AI credits." : res.status === 429 ? "AI is busy, try again shortly." : `AI request failed (${res.status}).`);
    (err as Error & { status?: number; detail?: string }).status = res.status;
    console.error("AI error", res.status, t.slice(0, 500));
    throw err;
  }
  let out = "", buf = "";
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        if (ev.type === "response.refusal.delta") throw new Error("The AI declined this marker.");
      } catch (e) { if (e instanceof Error && e.message.includes("declined")) throw e; }
    }
  }
  return JSON.parse(out) as Gen;
}

const mcUI = { checkAnswerButton: "Check", submitAnswerButton: "Submit", showSolutionButton: "Show solution", tryAgainButton: "Retry", tipsLabel: "Show tip", scoreBarLabel: "You got :num out of :total points", tipAvailable: "Tip available", feedbackAvailable: "Feedback available", readFeedback: "Read feedback", wrongAnswer: "Wrong answer", correctAnswer: "Correct answer", shouldCheck: "Should have been checked", shouldNotCheck: "Should not have been checked", noInput: "Please answer before viewing the solution", a11yCheck: "Check the answers.", a11yShowSolution: "Show the solution.", a11yRetry: "Retry the task." };
const confirm = { confirmCheck: { header: "Finish?", body: "Are you sure?", cancelLabel: "Cancel", confirmLabel: "Finish" }, confirmRetry: { header: "Retry?", body: "Are you sure?", cancelLabel: "Cancel", confirmLabel: "Confirm" } };
const dragL10n = { checkAnswer: "Check", submitAnswer: "Submit", tryAgain: "Retry", showSolution: "Show solution", dropZoneIndex: "Drop Zone @index.", empty: "Drop Zone @index is empty.", contains: "Drop Zone @index contains draggable @draggable.", ariaDraggableIndex: "@index of @count draggables.", tipLabel: "Show tip", correctText: "Correct!", incorrectText: "Incorrect!", resetDropTitle: "Reset drop", resetDropDescription: "Are you sure you want to reset this drop zone?", grabbed: "Draggable is grabbed.", cancelledDragging: "Cancelled dragging.", correctAnswer: "Correct answer:", feedbackHeader: "Feedback", scoreBarLabel: "You got :num out of :total points", a11yCheck: "Check the answers.", a11yShowSolution: "Show the solution.", a11yRetry: "Retry the task.", overallFeedback: [{ from: 0, to: 100, feedback: "Score: @score of @total." }], media: { disableImageZooming: true }, ...confirm };

const LIBS = {
  qs: { machineName: "H5P.QuestionSet", majorVersion: 1, minorVersion: 17 },
  mc: { machineName: "H5P.MultiChoice", majorVersion: 1, minorVersion: 16 },
  tf: { machineName: "H5P.TrueFalse", majorVersion: 1, minorVersion: 8 },
  dt: { machineName: "H5P.DragText", majorVersion: 1, minorVersion: 10 },
};

export function buildActivities(src: SourceInput, g: Gen) {
  const body = norm(src.text);
  const has = (s: string) => !!s && norm(s).length > 2 && body.includes(norm(s));
  const mc = (g.multiple_choice ?? []).filter((q) => has(q.evidence) && norm(q.evidence).includes(norm(q.correct)) && q.wrong?.length >= 2
    && !q.wrong.some((w) => norm(w) === norm(q.correct))).slice(0, 3);
  const tf = (g.true_false ?? []).filter((t) => has(t.evidence) && (!src.sensitive || t.is_true)).slice(0, 2);
  const fill = (g.fill_in?.sentences ?? []).filter((s) => has(s.sentence) && s.missing_word && norm(s.sentence).includes(norm(s.missing_word))
    && s.sentence.includes(s.missing_word)).slice(0, 3);
  const tl = (g.timeline ?? []).filter((t) => /^\d{4}$/.test(t.year) && has(t.evidence) && t.evidence.includes(t.year))
    .sort((a, b) => Number(a.year) - Number(b.year));
  const uniqYears = new Set(tl.map((t) => t.year));

  const questions: unknown[] = [];
  for (const q of mc) questions.push({ library: "H5P.MultiChoice 1.16", subContentId: crypto.randomUUID(), params: {
    question: `<p>${esc(q.question)}</p>`, answers: [{ text: `<div>${esc(q.correct)}</div>`, correct: true, tipsAndFeedback: { tip: "", chosenFeedback: "", notChosenFeedback: "" } },
      ...q.wrong.slice(0, 3).map((w) => ({ text: `<div>${esc(w)}</div>`, correct: false, tipsAndFeedback: { tip: "", chosenFeedback: "", notChosenFeedback: "" } }))],
    UI: mcUI, behaviour: { enableRetry: true, enableSolutionsButton: true, enableCheckButton: true, singlePoint: true, randomAnswers: true, showSolutionsRequiresInput: true, type: "auto", confirmCheckDialog: false, confirmRetryDialog: false, autoCheck: false, passPercentage: 100, showScorePoints: true },
    overallFeedback: [{ from: 0, to: 100 }], media: { disableImageZooming: true }, ...confirm } });
  for (const t of tf) questions.push({ library: "H5P.TrueFalse 1.8", subContentId: crypto.randomUUID(), params: {
    question: `<p>${esc(t.statement)}</p>`, correct: t.is_true ? "true" : "false",
    l10n: { trueText: "True", falseText: "False", score: "You got @score of @total points", checkAnswer: "Check", submitAnswer: "Submit", showSolutionButton: "Show solution", tryAgain: "Retry", wrongAnswerMessage: "Wrong answer", correctAnswerMessage: "Correct answer", scoreBarLabel: "You got :num out of :total points", a11yCheck: "Check the answers.", a11yShowSolution: "Show the solution.", a11yRetry: "Retry the task." },
    behaviour: { enableRetry: true, enableSolutionsButton: true, enableCheckButton: true, confirmCheckDialog: false, confirmRetryDialog: false, autoCheck: false },
    media: { disableImageZooming: true }, ...confirm } });
  if (fill.length >= 2) {
    const text = fill.map((s) => dragSafe(s.sentence).replace(dragSafe(s.missing_word), `*${dragSafe(s.missing_word)}*`)).join("\n");
    questions.push({ library: "H5P.DragText 1.10", subContentId: crypto.randomUUID(), params: {
      taskDescription: "<p>Drag the missing words into the story.</p>", textField: text,
      behaviour: { enableRetry: true, enableSolutionsButton: true, enableCheckButton: true, instantFeedback: false }, ...dragL10n } });
  }

  const out: { kind: "challenge" | "timeline"; title: string; mainLibrary: string; content: unknown; deps: unknown[] }[] = [];
  if (questions.length >= 3) {
    out.push({ kind: "challenge", title: `${src.title}: Story challenge`, mainLibrary: "H5P.QuestionSet", deps: [LIBS.qs, LIBS.mc, LIBS.tf, LIBS.dt], content: {
      introPage: { showIntroPage: true, title: "Story challenge", introduction: `<p>Questions drawn only from this marker's story. ${esc(src.credits)}</p>`, startButtonText: "Start" },
      progressType: "dots", passPercentage: 0, questions,
      texts: { prevButton: "Previous question", nextButton: "Next question", finishButton: "Finish", textualProgress: "Question: @current of @total questions", jumpToQuestion: "Question %d of %total", questionLabel: "Question", readSpeakerProgress: "Question @current of @total", unansweredText: "Unanswered", answeredText: "Answered", currentQuestionText: "Current question" },
      disableBackwardsNavigation: false, randomQuestions: false,
      endGame: { showResultPage: true, showSolutionButton: true, showRetryButton: true, noResultMessage: "Finished", message: "Your result:", overallFeedback: [{ from: 0, to: 100, feedback: "Thanks for exploring this story." }], solutionButtonText: "Show solution", retryButtonText: "Retry", finishButtonText: "Finish", showAnimations: false, skippable: false, skipButtonText: "Skip video" },
      override: { checkButton: true },
    } });
  }
  if (uniqYears.size >= 3) {
    const seen = new Set<string>();
    const lines = tl.filter((t) => !seen.has(t.year) && seen.add(t.year)).slice(0, 8).map((t) => `*${t.year}* — ${dragSafe(t.event)}`);
    out.push({ kind: "timeline", title: `${src.title}: Timeline`, mainLibrary: "H5P.DragText", deps: [LIBS.dt], content: {
      taskDescription: `<p>Put the story in order: drag each year to the event it belongs to. ${esc(src.credits)}</p>`, textField: lines.join("\n"),
      behaviour: { enableRetry: true, enableSolutionsButton: true, enableCheckButton: true, instantFeedback: false }, ...dragL10n } });
  }
  return out;
}

async function removeGenerated(admin: SupabaseClient, slug: string) {
  const { data: old } = await admin.from("h5p_activities").select("id, storage_prefix").eq("marker_slug", slug).eq("generated", true);
  for (const a of old ?? []) {
    await admin.storage.from(BUCKET).remove([`${a.storage_prefix}/h5p.json`, `${a.storage_prefix}/content/content.json`]);
    await admin.from("h5p_activities").delete().eq("id", a.id);
  }
}

export async function generateFor(admin: SupabaseClient, userId: string, src: SourceInput) {
  const gen = await askModel(src);
  const acts = buildActivities(src, gen);
  if (!acts.length) return { created: 0, reason: "Not enough facts in the marker text to build an activity." };
  await removeGenerated(admin, src.slug);
  const { count } = await admin.from("h5p_activities").select("id", { count: "exact", head: true }).eq("marker_slug", src.slug);
  let pos = count ?? 0;
  const enc = new TextEncoder();
  for (const a of acts) {
    const id = crypto.randomUUID();
    const prefix = `${src.slug}/${id}`;
    const h5p = { title: a.title, language: "en", mainLibrary: a.mainLibrary, embedTypes: ["div"], license: "U", preloadedDependencies: a.deps };
    for (const [p, v] of [["h5p.json", h5p], ["content/content.json", a.content]] as const) {
      const { error } = await admin.storage.from(BUCKET).upload(`${prefix}/${p}`, enc.encode(JSON.stringify(v)), { contentType: "application/json", upsert: true });
      if (error) throw error;
    }
    const { error } = await admin.from("h5p_activities").insert({
      id, marker_slug: src.slug, title: a.title.slice(0, 120), library: a.mainLibrary, storage_prefix: prefix,
      position: pos++, created_by: userId, published: true, generated: true, kind: a.kind,
    });
    if (error) throw error;
  }
  return { created: acts.length, kinds: acts.map((a) => a.kind) };
}
