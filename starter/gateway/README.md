# Gateway starter

The gateway is the edge in front of Pinky. It is not Brain.

On every allowed message it must:

1. Fail closed on the allowlist
2. ACK the platform quickly (immediately for photos)
3. Call Pinky with the published snapshot + short history
4. Send the fast reply
5. Enqueue the inbox record, always

It must never `git commit`, dispatch Brain, or say that knowledge was saved.

`handler.example.js` is a sketch of that control flow, not a production Telegram client. Swap the `channel`, `pinky`, and `bus` ports for your stack.

Environment names you will likely need:

| Name | Where | Purpose |
|---|---|---|
| `BOT_TOKEN` | Gateway + Brain runtime | Send as the one bot |
| `ALLOWED_USER_IDS` | Gateway | Fail-closed allowlist |
| `PINKY_API_KEY` | Gateway | Fast model |
| `BUS_URL` / `BUS_TOKEN` | Gateway + Brain runtime | Queue, history, snapshot |

See `../../docs/contracts.md` and `../../docs/write-barrier.md`.
