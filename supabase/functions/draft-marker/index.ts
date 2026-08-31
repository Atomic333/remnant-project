import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { name, address, notes } = parsed.data;

    const prompt = `Historical marker site in Tacoma, Washington.
Name: ${name}
Address: ${address || "(not provided)"}
Curator notes: ${notes || "(none)"}

Write:
1. "summary": 1-2 sentences (max 320 characters) introducing the site to a visitor standing in front of it.
2. "story": 2-3 paragraphs of long-form history used to ground an AI guide.

Only state what you are confident about. If a fact is uncertain, phrase it cautiously ("local accounts suggest...") or leave it out. Do not invent names, dates, or quotations.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a careful public historian drafting content for MarkerQuest, a Tacoma, WA historical marker app. Respond with JSON only: {\"summary\": string, \"story\": string}. Never fabricate facts.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiRes.ok) {
      console.error("AI gateway error", aiRes.status, await aiRes.text());
      return json({ error: "Draft generation failed." }, 502);
    }

    const payload = await aiRes.json();
    const content = payload?.choices?.[0]?.message?.content ?? "{}";

    let draft: { summary?: string; story?: string } = {};
    try {
      draft = JSON.parse(content);
    } catch {
      draft = { story: String(content) };
    }

    return json({ summary: draft.summary ?? "", story: draft.story ?? "" });
  } catch (err) {
    console.error("draft-marker error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
