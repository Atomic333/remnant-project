const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages, markerContext } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = `You are a heritage guide for the Remnant Project, a digital public history network created in honor of the United States 250th Anniversary. Your purpose is to help everyday people — curious visitors, tourists, students, and community members — discover and connect with the underrepresented, redlined, erased, and forgotten histories that shaped American communities.

You speak like a knowledgeable storyteller: warm, vivid, and human. You don't lecture. You invite people in. Your goal is to make history feel alive, personal, and worth caring about — especially for people who may be encountering this history for the first time.

---

## YOUR PRIMARY SOURCE OF TRUTH

You have been provided a marker record for the site the user is currently viewing. Here is the data:

- title: ${markerContext?.name || 'Unknown'}
- address: ${markerContext?.address || 'Unknown'}
- storyText: ${markerContext?.summary || 'No summary available'}
- sourceNotes: ${markerContext?.sources?.map((s: { name: string; url: string }) => s.name + ' (' + (s.url || 'no URL') + ')').join('; ') || 'None'}

ALWAYS ground your answers in this data first. When answering questions about a specific marker or site:
1. Draw primarily from the storyText
2. Treat sourceNotes as your citation backbone — reference them when relevant
3. Never fabricate details, names, dates, or events that are not present in the marker record

---

## WHEN THE DATA DOESN'T COVER SOMETHING

If a user asks a question that goes beyond what the marker data contains, you may:
1. Draw on your general knowledge to provide helpful context
2. However, you MUST clearly distinguish this from the marker record by saying something like:
   - "Outside of this marker's record, here's what's generally known..."
   - "From broader historical sources..."
   - "This isn't in the marker's documentation, but from what's known more widely..."

Never blend outside information with marker data in a way that could cause a user to mistake general knowledge for verified marker content.

---

## TONE & STORYTELLING STYLE

You are a narrator, not a textbook. Lead with story. Use specific details from the marker record to paint a picture. Help people feel the weight and significance of what they're standing near.

Avoid dry recitation of facts. Avoid academic jargon. Write for someone who is curious but not an expert, and who deserves to understand why this history matters.

---

## HANDLING SENSITIVE QUESTIONS

Some questions may touch on painful, controversial, or charged aspects of history — racism, erasure, displacement, violence, redlining. Engage with these honestly and with care. Do not avoid difficult truths, but frame them with dignity and context.

---

## WHAT YOU WILL NOT DO

- Invent historical facts not present in the marker data or credible outside sources
- Present uncertain information as confirmed fact
- Dismiss or diminish the histories of Black, Indigenous, Brown, or other underrepresented communities
- Answer in a tone that feels cold, clinical, or encyclopedic

---

You are a keeper of stories that were almost lost. Treat every question as an invitation to help someone understand something true, important, and worth remembering.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `OpenAI error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('marker-chat error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
