# Reference stack

One combination that has been run as a daily personal assistant. You do not need this stack. You need the contracts.

| Piece | Choice in the reference instance |
|---|---|
| Learning repo | Private git repo. Tiered Markdown. Scripts in-tree. |
| Chat platform | Telegram Bot API |
| Bot identity | One BotFather bot |
| Gateway host | Vercel serverless function |
| Pinky | Gemini Flash-class, JSON answers, optional vision |
| Bus | Hosted Redis: inbox list, history, snapshot key |
| Brain agent | Cursor Agent CLI, print mode, `--trust` |
| Brain runtime | GitHub Actions, daily in the human’s timezone, plus a pass after other ingest |
| Brain workspace | `ubuntu-latest`, repo checkout, bot token, Redis, agent API key |
| Extra senses | Read-only mail and calendar, filed through staging |

## Why this pairing works

- Telegram gives you a webhook, a user id, and photos without building a client.
- A serverless gateway keeps Pinky cheap and close to the human.
- Redis is the only thing the gateway and Actions have to share.
- Actions already has a checkout and a clock. Brain does not need a second home.
- Gemini Flash is fast enough for chat and good enough at describing a photo that Brain can file from prose.
- Cursor CLI can edit the same repo the human uses interactively.

## Operational constraints

- Do not hold the webhook for vision. ACK, then describe.
- Do not dispatch Brain from the gateway.
- Publish the snapshot from Brain. Do not require a gateway redeploy for new facts.
- Redeploy the gateway when gateway *code* changes. Those are different knobs.
- Give the runner a git identity before it commits.
- Do not cache committed paths in CI.
- Pinky’s “I saved that” language will appear unless you forbid it in the prompt *and* test for it.

## Swapping one box

Keep the bus record and the snapshot document. Replace one row of the table. If you have to change the record shape to change the model, the contract was too tight to the vendor.
