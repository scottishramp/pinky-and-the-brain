# Adapters

Every box in the piece list is replaceable. The contracts are not.

## Chat platform

You need:

- A stable user id for the allowlist
- A webhook or poller the gateway can ACK quickly
- A send API Brain can call with the same bot token
- Optional: file download by id, so Pinky can see photos

| Platform | Notes |
|---|---|
| Telegram | Strong first adapter. User ids, webhooks, photos, silent drop of strangers. |
| Slack | Use the member id, not the display name. Ack within the platform’s deadline; do vision in the background. |
| Discord | Same idea; watch message-content intent and PMs vs channels. |
| iMessage / SMS | Identity is the hard part. Pair to a small allowlisted number. |

Do not run two platforms into two knowledge bases. Run two gateways into **one** bus and **one** repo.

## Gateway host

Anything that can serve HTTPS and keep a secret.

| Host | Notes |
|---|---|
| Vercel / Netlify / Cloudflare Functions | Fine for text. For photos, ACK first and continue in the background; raise `maxDuration` if the platform lets you. |
| Fly / a VPS | Easier long vision calls; you own the process. |
| The Brain runtime itself | Possible, usually a mistake. Do not make chat wait on CI. |

Keep git metadata out of a deploy if your host bills or blocks on the author of the commit. Publish the snapshot over the bus instead of baking the whole knowledge tree into every deploy.

## Pinky model

Pick a model that is cheap, fast, and obedient about JSON or a fixed DEFER sentence. Multimodal is worth it if you will accept photos.

| Kind | Notes |
|---|---|
| Gemini Flash-class | Good reference: cheap, vision, JSON MIME. Thinking tokens can steal your output cap — set thinking low for describe. |
| OpenAI / Anthropic small | Fine. Keep the write-barrier prompt identical. |
| Local small model | Only if it reliably defers instead of inventing missing facts. |

Temperature stays low. Give it a clock. Cap output. Retry once on 429/503.

## Bus

| Store | Notes |
|---|---|
| Redis (hosted or Upstash) | One place for queue, history, snapshot. Simple. |
| SQS + KV | Queue in SQS, snapshot and history in KV. |
| Postgres | Use `LISTEN`/`NOTIFY` or polling. Heavier, easy to inspect. |
| Repo files | Possible for a solo laptop Brain. Do not make the gateway commit. |

The snapshot key should be replaced atomically. The inbox needs claim/ack
semantics, retries, and a dead-letter path. History should expire.

## Brain agent

| CLI | Notes |
|---|---|
| Cursor Agent CLI | `cursor-agent -p --trust --model …`. Print mode. Needs an API key in CI. |
| Claude Code | Headless `-p` equivalent. Same workspace rules. |
| Codex / Aider / custom | If it can edit a checkout and print a final answer, it qualifies. |

Install the CLI **before** any step that needs it. Pass `--trust` or the workspace prompt will hang CI. After the agent exits, unstick any `assume-unchanged` / `skip-worktree` bits it left before you commit.

## Brain runtime

| Runtime | Notes |
|---|---|
| GitHub Actions | Natural if the repo is on GitHub. Daily cron is enough. Watch private-repo minute budgets. |
| Other CI | Same idea: schedule + `workflow_dispatch`. |
| A small VM | Use when Actions minutes or permissions get in the way. |
| The human’s laptop | Fine for experiments. A learning loop that only runs when the lid is open is not a learning loop. |

Cache only gitignored watermarks. Caching committed inbox or ledger files will restore conflict markers onto a clean checkout and block every later commit.

## Knowledge language

Markdown is the point. Any agent can read it. JSON is for ledgers and manifests, not for the facts you want Pinky to say out loud.

## Adding an extra sense

1. Fetch into `inbox/` with a normalized record.
2. Do not let that fetch drain the chat queue.
3. Let Brain (or a staging script) extract facts into `state/learned/`.
4. Consolidate onto pages in a later pass.
5. Publish the snapshot only after pages change.

Mail is not a second Pinky. It is a sense for Brain.
