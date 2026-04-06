

# Replace "The Story" Tab with an OpenAI Chatbot

## Summary
Replace the "The Story" accordion section in the marker detail page with an inline AI chatbot powered by your own OpenAI API key. The chatbot will use marker context (name, summary, sources) as system prompt context so users can ask questions about each marker.

## Setup Steps

### 1. Store your OpenAI API key
I'll use the secret management tool to securely store your OpenAI API key as `OPENAI_API_KEY`. You'll be prompted to paste it in.

### 2. Enable Lovable Cloud & create edge function
Create `supabase/functions/marker-chat/index.ts` that:
- Accepts `{ messages, markerId }` from the client
- Looks up marker data to build a system prompt (using your provided system prompt + marker context)
- Calls `https://api.openai.com/v1/chat/completions` with your `OPENAI_API_KEY`
- Streams the response back via SSE

### 3. Build chat UI component
Create `src/components/MarkerChat.tsx`:
- Simple chat interface with message list and input field
- Renders AI responses with `react-markdown`
- Streams tokens in real-time
- Auto-scrolls to latest message
- Shows typing indicator while streaming

### 4. Update MarkerDetailPage
- Replace the "story" section (`key: "story"`, icon: `Sparkles`, label: "The Story") with a new "chat" section (icon: `MessageCircle`, label: "Ask About This")
- When expanded, render `<MarkerChat markerId={marker.id} />` instead of the story text
- Remove the story loading skeleton logic

## Technical Details

- **Edge function**: Proxies to OpenAI API with streaming, includes CORS headers, handles 429/402 errors
- **System prompt**: Your custom system prompt + marker-specific context (name, address, summary, sources)
- **Frontend streaming**: SSE line-by-line parsing with token-by-token rendering
- **Dependencies**: `react-markdown` for rendering AI responses

