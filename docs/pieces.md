# Pieces

Each piece owns one job. If two pieces share a job, the write barrier starts to leak.

## Learning repo

**Owns:** durable knowledge, operating procedures, scripts, workflows, committed machine state.

**Must not own:** raw message bodies you would regret committing, image bytes, secrets.

This is one tree with two roles:

- **Knowledge.** Markdown pages, one concern per page, dated and sourced.
- **Functions.** The code that fetches mail, publishes the snapshot, drains the queue, runs Brain.

Do not split “memory repo” and “code repo” on the first implementation. Brain needs the pages and the tools in the same checkout. Public deliverables (a blog, a game, this framework) can live in other repos. The life itself stays in the private learning repo.

Suggested layout is in [knowledge-base.md](knowledge-base.md) and `starter/`.

## Chat platform

**Owns:** message transport, media download URLs, delivery to a user id.

**Must not own:** knowledge, classification, or memory.

Telegram is a good first adapter: bots, webhooks, photos, a stable user id. Slack, Discord, iMessage, and SMS work if you can authenticate the sender and ACK quickly.

## Bot identity

**Owns:** the name the human DMs; the token the gateway and Brain use to send.

**Must not own:** a second personality. Pinky and Brain are not two bots.

Create the bot on the platform. Put the token in the gateway environment *and* the Brain runtime. Both need to speak.

## Gateway

**Owns:** HTTP ingress, allowlist, webhook ACK, calling Pinky, durably
enqueueing the bus record, and sending the fast reply.

**Must not own:** durable knowledge writes, agentic tool use, or “I have dispatched Brain.”

Prefer the word **gateway** over **router**. A router implies a live fork to the slow agent. The working design is an edge that always queues and sometimes answers.

Host it wherever a webhook can reach in time. Serverless HTTP is enough. Photos need an immediate 200 and a background continue; chat platforms will retry or error if you hold the request for a vision call.

## Pinky

**Owns:** the fast answer. Optional: describing an image in prose.

**Must not own:** repo writes, tool loops, or claims that memory was saved.

Give Pinky:

- A system prompt that states the write barrier in plain language
- The published snapshot
- Short history
- A clock (do not let it guess the date)
- A fixed DEFER sentence
- A fixed “queued for Brain” sentence for remember-this turns

A multimodal model is a bonus, not a requirement. If Pinky can see photos, Brain should still file from the written description. That keeps image bytes out of git and keeps Brain portable across CLIs that cannot see the original file.

## Bus

**Owns:** three keys, conceptually:

| Key | Direction | Contents |
|---|---|---|
| Inbox queue | Gateway → Brain | Durable, retryable record per allowed message |
| Chat history | Gateway ↔ Pinky | Last N turns, TTL |
| Snapshot | Brain → Pinky | Curated Markdown + hash + file list |

**Must not own:** the canonical knowledge. If Redis disappears, Brain still has git. Pinky just gets dumber until the next publish.

Redis is a convenient store for all three. You can split them. The inbox must
support claim/ack or equivalent retry semantics; a destructive pop can lose a
message when Brain fails.

## Brain agent

**Owns:** judgment. Fact vs task vs no-op. Page edits. Optional follow-up text.

**Must not own:** the webhook, the fast reply, or a second source of truth.

This is a headless agentic CLI in a workspace: `cursor-agent -p`, `claude -p`, or equivalent. Print mode. Trust the workspace. Bound it with a timeout.

Two invocation styles are enough:

1. **Full agent.** Check out the repo, read the review task, edit pages, leave a reply or a suppress token.
2. **Structured call.** JSON in, JSON out, for classification inside a pipeline. Always keep a deterministic fallback.

## Brain runtime

**Owns:** waking up, installing the CLI, injecting secrets, draining the queue, committing, publishing the snapshot, sending optional follow-ups.

**Must not own:** knowledge content. The runtime is a loop, not a memory.

GitHub Actions is the reference because the repo already lives on GitHub and the minutes are cheap if Brain is daily, not continuous. A small always-on box works. A second CI works. The requirement is a clock, a checkout, and a network path to the bus and the bot.

## Brain workspace

**Owns:** the files and tools the agent can actually touch.

**Must not own:** the human’s entire laptop by default.

Runtime and workspace are easy to conflate. They are why “Brain environment” appeared twice.

- Runtime = *when and where the process runs*
- Workspace = *what it is allowed to see*

A Brain agent on a laptop with your browser logged in is a different system from the same CLI on `ubuntu-latest` with two API tokens. Write down the workspace. Include timeouts. Include which secrets exist. Include that print-mode CLIs sometimes leave git flags that block the next commit — the runtime must unstick those paths before `git add`.

## Optional pieces

These showed up in a working instance and are not required to have the architecture.

| Piece | Why it exists |
|---|---|
| Extra senses | Mail, calendar, docs. Brain learns while nobody is chatting. |
| Question loop | Brain asks a few things when a page is overdue or a sender is unclear. |
| Photo materialize | After Pinky describes, Brain downloads the file to object storage and keeps a label → URL registry. |
| Version / canary | A `version` command and a health GET so you know which snapshot is live. |
| Fast-context manifest | Generated file list; a test fails if it is stale. |

Do not add a live dispatch from the gateway to Brain unless you are ready to give up the honesty of “queued.”
