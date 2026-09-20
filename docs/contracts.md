# Contracts

Implementations change. These shapes should stay stable enough that Pinky, the gateway, and Brain can be rewritten without inventing a new dialect.

JSON Schema copies live in `starter/schemas/`.

## Inbound bus record

The gateway writes one JSON object per allowed message onto the inbox queue. Brain drains it.

```json
{
  "schema_version": 1,
  "message_id": "platform-native-id",
  "channel": "telegram",
  "chat_id": "123",
  "user_id": "456",
  "username": "optional",
  "sender_display_name": "optional",
  "conversation_key": "chat-or-thread-id",
  "text": "What time is pickup?",
  "route": "lightweight_answer",
  "confidence": 0.8,
  "fast_response": "Pickup is at 3:30.",
  "async_task_title": "",
  "async_task_body": "What time is pickup?",
  "photo_label": "",
  "photo_description": "",
  "media": null,
  "received_at": "2026-09-12T18:20:00Z"
}
```

| Field | Rule |
|---|---|
| `schema_version` | Contract version. Reject unsupported versions explicitly. |
| `message_id` | Idempotency key. Brain must skip duplicates. |
| `channel` | Adapter name. `telegram`, `slack`, … |
| `text` | Caption or body. Empty only when media exists. |
| `route` | Pinky’s classification, advisory. Brain may disagree. |
| `fast_response` | What Pinky already said. Brain uses this to avoid double replies. |
| `photo_*` | Set only when Pinky described an image. |
| `media` | Platform file ids and metadata. No bytes. |

`route` is one of:

- `lightweight_answer` — Pinky answered from context
- `knowledge_update` — human offered a fact; queued, not saved
- `task` — work or a question Pinky deferred
- `needs_clarification`
- `ignore`

Brain’s durable classes can be coarser: **fact**, **task**, **no-op**.

## Delivery semantics

The inbox must be durable and retryable:

- enqueue before Pinky claims that an item was queued;
- claim a message with a visibility timeout or lease;
- acknowledge it only after Brain's durable changes and reply decision succeed;
- retry failed claims and move repeatedly failing records to a dead-letter queue;
- use `message_id` as an idempotency key for knowledge writes and follow-up replies.

A destructive `LPOP` before processing is not sufficient: a runner crash would
lose the message.

## DEFER

When the message is a question and the snapshot does not contain the answer, Pinky replies with **exactly**:

```
*DEFER* The slower, smarter agent might be able to help with this
```

You may change the words, but they must be:

- Fixed (not improvised per question)
- Obviously a handoff, not an answer
- Easy for tests and for humans to recognize

The original message is still queued. Pinky does not assign the work. Brain decides.

## Queued, not saved

When the human offers a fact (“we switched dentists,” “I ate lunch”), Pinky’s reply must acknowledge a **queue**, not a write.

Good: “Queued for the scheduled agent.”
Bad: “Got it, I saved that to your knowledge base.”

## Snapshot document

Brain publishes one JSON object Pinky reads on every turn:

```json
{
  "schema_version": 1,
  "context": "# AGENTS.md\n…\n# knowledge/you.md\n…",
  "context_hash": "sha256-of-context",
  "context_length": 18420,
  "context_files": ["AGENTS.md", "knowledge/index.md", "knowledge/you.md"],
  "published_at": "2026-09-12T13:30:00Z"
}
```

Optional canary fields (`has_some_expected_fact`) are worth the embarrassment they save.

Pinky treats `context` as the only durable memory it has. If the key is missing, fall back to a bundle shipped with the gateway deploy, and admit it may be stale.

## Chat history

Last N turns (10 is enough) keyed by `conversation_key`, with a TTL. History is for pronouns and follow-ups. It is not knowledge. Do not publish history into the snapshot.

## Suppress token

If Brain reviews a message and the fast reply already covered the turn, Brain’s stdout is exactly:

```
NO_CHAT_REPLY
```

The runtime must treat that token as “send nothing.”

## Photo split

1. Gateway ACKs the webhook immediately.
2. Pinky describes the image in the background.
3. Fast reply includes a unique label (`{username}_{YYYYMMDDHHmmss}` or similar) and the prose description.
4. Bus record gets `photo_label`, `photo_description`, and the platform `file_id`.
5. Brain never reopens the image unless you deliberately add that tool. Default: file from the description, store the file outside git, keep a label → URL registry.

## Allowlist

The gateway loads a set of platform user ids from the environment. Empty set = deny all. Unknown users are dropped with no reply. Brain should also refuse to send to ids that are not on the notify list.

## Health GET

`GET` on the webhook path (or `/health`) returns JSON:

```json
{
  "ok": true,
  "gateway_version": "1.0.0",
  "context_hash": "…",
  "context_files": ["AGENTS.md", "knowledge/you.md"],
  "history_configured": true,
  "queue_configured": true
}
```

A deploy is not done until this matches the repo you think you published.

## Intent at the door

Direct messages from the allowlisted human are **instructions**. Forwarded or shared material without a note from the human is **source**, not an instruction. Brain should not treat a forwarded newsletter as “do this.”
