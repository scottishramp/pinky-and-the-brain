# Architecture

Pinky and The Brain separates low-latency conversation from tool-enabled,
durable work. The two agents communicate asynchronously through a bus and a
published view of a private Git repository.

## Data flow

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

The gateway is an edge service, not the durable worker. It authenticates the
sender, invokes Pinky, records the turn, and returns a fast response. It does
not dispatch Brain synchronously.

The Brain **runtime** is the scheduler and compute environment. The Brain
**workspace** is the checkout, tools, network access, and secrets available to
the agent. Keeping these concepts separate makes the security boundary clear.

## System invariants

- The knowledge repository is the canonical durable store.
- Pinky has no credentials that can modify the repository.
- Every accepted inbound message enters a durable, retryable inbox.
- Brain processes messages idempotently and acknowledges them only after
  durable work completes.
- Pinky receives a curated snapshot, never a repository checkout.
- Chat history is temporary conversational state, not durable knowledge.
- Snapshot publication and gateway deployment are independent operations.
- Unknown senders are rejected before model invocation.

## Why Git is canonical

A vector database is a good index. It is a poor **source of truth** for a life.

This architecture treats the repo as canonical:

- Any agent runtime can read it (Cursor today, Claude Code tomorrow).
- History is reviewable. A bad fact can be reverted.
- Pages have owners, related links, and review cadences.
- Functions (scripts, workflows, playbooks) live next to the facts they use.
- Pinky’s context is a **publication** of that repo, not a second memory that can drift.

You can add embeddings on top. Do not let the index become the memory.

## Pinky's context

Pinky sees:

1. A published snapshot of pages marked for fast context, plus the Tier 0 overview and directory.
2. A short rolling chat history.
3. The current message, and if you support photos, the image bytes for that turn.

Pinky does not see:

- The rest of the git history
- Inbox files, ledgers, or staging notes
- Secrets
- Other people’s messages

Brain decides the snapshot. That is how a reclusive agent teaches a fast one without giving it the keys.

## Brain's review loop

Brain is not a second chatbot. It is a reviewer. For each queued message it chooses exactly one:

| Decision | Meaning |
|---|---|
| **Fact** | Write or update a knowledge page. Cite the source and the date. |
| **Task** | Do work: code, a script, an external action the workspace allows. |
| **No-op** | Already handled, already known, or not durable. |

Then it either sends a follow-up from the same bot, or it emits a suppress token so the human is not double-texted.

The runtime should use claim/ack semantics or an equivalent visibility timeout.
A destructive queue pop before processing creates an at-most-once system and
can lose messages when the agent or CI job fails.

## Scheduling

Brain runs asynchronously: on a schedule, from an explicit trigger, or both.
That is not only a cost optimization.

- The human gets an honest fast answer now.
- Durable writes happen when there is time to read the repo, not in a 10-second webhook.
- Pinky is allowed to say “queued,” and that statement stays true.
- Extra senses (mail, calendar) can share the same Brain pass.

If you make Brain realtime, you still need the write barrier. You have just spent the isolation that made Pinky cheap and honest.

## Additional inputs

Chat is one intake. Brain can also learn from:

- Mail the human has granted access to
- Calendars shared read-only
- Documents the human pointed at

Those paths should write **staging**, not pages, until a consolidation pass files them. Staging is not knowledge. See [knowledge-base.md](knowledge-base.md).

## Observability

The gateway should expose a cheap GET that reports:

- Gateway / Pinky version
- Snapshot hash and file list
- Whether history and the queue are configured
- A canary fact you expect in the snapshot

Knowledge is not “live” until the canary matches. A deploy that ships old snapshot files, or a publish step that failed, will look like a working bot that has forgotten last week.

The Brain runtime should also report queue depth, oldest-message age, last
successful commit, last snapshot publication, and dead-letter count.

## Security boundary

- The learning repo that holds a life should be **private**.
- This framework repo is public and must stay free of personal facts.
- Secrets live in the gateway host and the Brain runtime, never in git.
- Contact details and last-four account digits may be acceptable in a *private* knowledge repo. Full account numbers, passwords, and government ids are not. Do not invent a “private vault” inside this framework; that is a different system.
- Pinky and Brain both speak as the bot. Neither should send as the human’s personal email or phone.
