# QDB Assistant (website chat)

An AI chat assistant for quasidb.com. Visitors click **Ask QDB** in the corner
of the page and get an instant answer about the QDB Sheet, the plans, the free
tools and the ideas the guides teach. Anything it can't answer, it hands over
to the QDB Discord or the contact form.

```
visitor's browser  ──►  qdb-chat Worker (Cloudflare)  ──►  Claude API
chat/chat.js            worker/src/index.js
                        keeps the API key secret, rate limits,
                        adds the site's content, stores nothing
```

- **Widget:** `chat/chat.js`, loaded on the homepage, guides, games hub,
  downloads, COT and sentiment pages. It stays hidden until `ENDPOINT` at the
  top of the file is set and the Worker says it is online.
- **Worker:** `worker/src/index.js` (the proxy), `worker/src/prompt.js` (rules
  and tone), `worker/knowledge/notes.md` (facts that aren't on the site; edit
  freely).
- **Knowledge:** `scripts/chat_knowledge.py` turns the site's pages into text
  for the assistant on every deploy, so it always matches the live site. Live
  numbers (today's crowd, COT readings) are left out on purpose: it links to
  /sentiment/ and /cot/ instead.
- **Deploy:** `.github/workflows/chat-worker.yml` deploys the Worker whenever
  the Worker, the notes or the pages it learns from change.

## Guardrails
- No trade signals, entries, stops, targets or market predictions, and no
  personalised advice. It explains how to read the tools and points to the
  free pages instead.
- Says it's an AI, never pretends to be Dave.
- Answers only from the site and the notes; says "I don't know" and hands over
  otherwise.
- Tells visitors not to share card details or passwords; payment and access
  questions go to Dave.

## Privacy
- QDB stores nothing: the Worker keeps no chat history and logs no message
  text (Cloudflare logs are switched off in `wrangler.toml`).
- The conversation lives only in the visitor's browser tab and is gone when
  they close it or press **New chat**.
- GoatCounter counts only that the chat was opened and that a question was
  asked, never what was asked.
- Questions are sent to Anthropic's API to get an answer. Anthropic doesn't
  train on API data by default and keeps it only for a limited time for
  safety monitoring.

## Costs
Cloudflare Workers is free at this size (100,000 requests a day).

Claude is pay as you go. Rough monthly cost for **300 chats a month** (about
10 a day, three questions each):

| Model (`MODEL` in `wrangler.toml`) | Per chat | 300 chats/month |
|---|---|---|
| `claude-opus-5-5` (default, best judgement on the guardrails) | about $0.10 to $0.13 | about $30 to $40 |
| `claude-haiku-5-5` (much cheaper, simpler answers) | under $0.01 | about $1 to $2 |

Most of the cost is sending the site's content (about 11,000 tokens) with the
first question of each chat; it's cached for an hour, so busier hours cost
less per chat.

**Spending cap:** buy prepaid credits in the Claude Console with auto-reload
**off**. When the credits run out the assistant shows "offline, reach Dave on
Discord" and nothing more is spent. You can also set a monthly limit under
Settings → Limits.

Each visitor can ask at most 6 questions a minute, questions are capped at
800 characters, and only the last 12 messages of a chat are sent.

## Setup (Dave, about 15 minutes)

1. **Claude API key**
   - Sign in at https://platform.claude.com (the Claude Console).
   - Billing: buy credits (start with $20) and leave auto-reload off.
   - API keys → Create key, name it `qdb-website-chat`, copy it.
2. **Cloudflare** (the account that holds quasidb.com)
   - Workers & Pages: if asked, pick a workers.dev subdomain (for example
     `quasidb`).
   - Copy your **Account ID** (Workers & Pages overview, right-hand side).
   - My Profile → API Tokens → Create Token → template **Edit Cloudflare
     Workers** → Account Resources: your account → Continue → Create. Copy it.
3. **GitHub secrets** in quasidb/quasidb.github.io → Settings → Secrets and
   variables → Actions → New repository secret, three times:
   - `ANTHROPIC_API_KEY`: the Claude key
   - `CLOUDFLARE_API_TOKEN`: the Cloudflare token
   - `CLOUDFLARE_ACCOUNT_ID`: the Account ID
4. **Deploy:** Actions → **Chat assistant** → Run workflow. The run summary
   shows the Worker's address, like `https://qdb-chat.quasidb.workers.dev`.
5. **Switch the widget on:** put that address in `ENDPOINT` at the top of
   `chat/chat.js` (or ask Claude to). The **Ask QDB** button then appears on the
   site.

## Day to day
- **Turn it off:** set `CHAT_ENABLED = "false"` in `wrangler.toml` and push.
  The button disappears from the site.
- **Teach it something:** add a line to `worker/knowledge/notes.md` and push.
- **Change the model:** edit `MODEL` in `wrangler.toml` and push.
- **Local test:** `cd worker && npm install`, create `worker/.dev.vars` with
  `ANTHROPIC_API_KEY=...` and `ALLOWED_ORIGINS=http://localhost:8000`, run
  `python3 ../scripts/chat_knowledge.py && npx wrangler dev`, serve the site
  with `python3 -m http.server 8000` and load a page with
  `<script src="/chat/chat.js" data-endpoint="http://localhost:8787" defer></script>`.
