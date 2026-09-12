# Architecture

Pinky and The Brain is a **capability split**, not a branding exercise.

Most chatbot stacks pick one model and give it both jobs: answer now, and remember forever. That forces a bad trade. Either the chat is slow because the model is running tools against a repo, or the memory is shallow because the chat model cannot safely write.

This architecture gives the jobs to two agents that share a repo **asynchronously**.

## The first piece list, corrected

The original inventory was:

1. Self-learning repo (functions + knowledge base)
2. Chat platform
3. Chatbot
4. Router (hosted function + fast model?)
5. Pinky LLM
6. Brain agentic CLI
7. Brain environment
8. Brain environment *(listed twice)*

That is the right shape. The names need a few splits.

### Keep

- **Learning repo.** This is the distinctive store. It is knowledge *and* functions. Brain writes pages; scripts and workflows are part of the same tree.
- **Chat platform.** Telegram is one adapter. The platform is not the bot.
- **Pinky LLM.** Fast, cheap, preferably multimodal. Pinky is a mind, not a host.
- **Brain agentic CLI.** Cursor CLI, Claude Code, Codex, Aider — anything that can check out a repo and edit it headlessly.

### Split

- **“Router” → Gateway + Pinky.** The hosted function is the **gateway**: webhook, allowlist, ACK, enqueue, send. The model it calls is **Pinky**. Hosting them together is convenient, not required. “Router” is leftover language from designs that dispatched the slow agent in realtime. The working design does not. It answers or defers, and it always queues.
- **“Chatbot” → Bot identity.** The human addresses one bot. Pinky and Brain both speak through it. A second “chatbot” piece doubles a surface that should stay singular.
- **“Brain environment” × 2 → runtime + workspace.** The duplicate was useful. **Runtime** is the scheduler and compute (GitHub Actions, a cron VM). **Workspace** is the checkout, tools, and secrets the agent may touch. Same CLI, different rooms.

### Add

- **Bus.** Queue (Pinky → Brain), short history (Pinky session memory), published snapshot (Brain → Pinky). Without this, the two agents cannot share state without sharing a process.
- **Write barrier.** A rule, not a service. Pinky never writes the repo. See [write-barrier.md](write-barrier.md).
- **Context publication.** Brain chooses which pages Pinky may see and publishes them. Pinky does not `git pull`.
- **Allowlist.** Fail closed. An empty list means nobody.
- **Extra senses (optional).** Email, calendar, and docs can feed Brain without going through Pinky. Pinky is one mouth. Brain can have more ears.
- **Cadence.** Brain is scheduled on purpose. Realtime Brain is a different product: more cost, more failure modes, more pressure to lie about what was saved.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Surface                                                    │
│    chat platform  →  bot identity                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ webhook
┌──────────────────────────▼──────────────────────────────────┐
│  Fast path                                                  │
│    gateway  →  Pinky  →  reply                              │
│         \       ↑                                           │
│          \      published snapshot + short history          │
│           \                                                 │
│            →  bus (enqueue every allowed message)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ later
┌──────────────────────────▼──────────────────────────────────┐
│  Slow path                                                  │
│    runtime wakes  →  drain bus  →  Brain agent in workspace │
│         →  edit learning repo  →  commit                    │
│         →  publish snapshot  →  optional follow-up          │
└─────────────────────────────────────────────────────────────┘
```

## Why git, not a vector store

A vector database is a good index. It is a poor **source of truth** for a life.

This architecture treats the repo as canonical:

- Any agent runtime can read it (Cursor today, Claude Code tomorrow).
- History is reviewable. A bad fact can be reverted.
- Pages have owners, related links, and review cadences.
- Functions (scripts, workflows, playbooks) live next to the facts they use.
- Pinky’s context is a **publication** of that repo, not a second memory that can drift.

You can add embeddings on top. Do not let the index become the memory.

## What Pinky is allowed to know

Pinky sees:

1. A published snapshot of pages marked for fast context (plus a tiny always-on set: the Tier 0 overview, the directory, a version stamp).
2. A short rolling chat history.
3. The current message, and if you support photos, the image bytes for that turn.

Pinky does not see:

- The rest of the git history
- Inbox files, ledgers, or staging notes
- Secrets
- Other people’s messages

Brain decides the snapshot. That is how a reclusive agent teaches a fast one without giving it the keys.

## What Brain does with a message

Brain is not a second chatbot. It is a reviewer. For each queued message it chooses exactly one:

| Decision | Meaning |
|---|---|
| **Fact** | Write or update a knowledge page. Cite the source and the date. |
| **Task** | Do work: code, a script, an external action the workspace allows. |
| **No-op** | Already handled, already known, or not durable. |

Then it either sends a follow-up from the same bot, or it emits a suppress token so the human is not double-texted.

## Cadence is part of the architecture

Brain runs later. In a working instance that is “morning, in this timezone,” plus an extra pass after other ingest jobs. That is not only a cost hack.

- The human gets an honest fast answer now.
- Durable writes happen when there is time to read the repo, not in a 10-second webhook.
- Pinky is allowed to say “queued,” and that statement stays true.
- Extra senses (mail, calendar) can share the same Brain pass.

If you make Brain realtime, you still need the write barrier. You have just spent the isolation that made Pinky cheap and honest.

## Extra senses

Chat is one intake. Brain can also learn from:

- Mail the human has granted access to
- Calendars shared read-only
- Documents the human pointed at

Those paths should write **staging**, not pages, until a consolidation pass files them. Staging is not knowledge. See [knowledge-base.md](knowledge-base.md).

## Health

The gateway should expose a cheap GET that reports:

- Gateway / Pinky version
- Snapshot hash and file list
- Whether history and the queue are configured
- A canary fact you expect in the snapshot

Knowledge is not “live” until the canary matches. A deploy that ships old snapshot files, or a publish step that failed, will look like a working bot that has forgotten last week.

## Security posture

- The learning repo that holds a life should be **private**.
- This framework repo is public and must stay free of personal facts.
- Secrets live in the gateway host and the Brain runtime, never in git.
- Contact details and last-four account digits may be acceptable in a *private* knowledge repo. Full account numbers, passwords, and government ids are not. Do not invent a “private vault” inside this framework; that is a different system.
- Pinky and Brain both speak as the bot. Neither should send as the human’s personal email or phone.
