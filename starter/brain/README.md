# Brain starter

Brain is a scheduled job, not a webhook.

1. Checkout the learning repo
2. Drain the bus inbox
3. Write a short review task per message
4. Run the agentic CLI in the workspace
5. Commit only what changed
6. Publish a new snapshot
7. Send a follow-up, or nothing if the CLI printed `NO_CHAT_REPLY`

`workflow.example.yml` is a GitHub Actions sketch. `review-prompt.example.md` is the prompt body. `publish-snapshot.example.js` concatenates `fast_context: true` pages and would SET them on your bus.

Secrets the runtime needs:

| Name | Purpose |
|---|---|
| `BOT_TOKEN` | Optional follow-up on the same bot |
| `BUS_URL` / `BUS_TOKEN` | Drain inbox, publish snapshot |
| `AGENT_API_KEY` | Headless CLI |

Do not give this job write tokens it does not need. Extra senses (mail, calendar) belong in later jobs, and those jobs should not drain the chat queue.
