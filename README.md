# Pinky and The Brain

A two-agent architecture for personal assistants that need fast chat and durable memory.

- **Pinky** replies in seconds from a read-only knowledge snapshot and recent chat history.
- **Brain** runs asynchronously with tools, updates the canonical knowledge repo, and publishes the next snapshot.
- Both use one bot identity, so the user sees one assistant.

The key constraint is the **write barrier**: Pinky may reply, the gateway may
enqueue, and only Brain may write durable memory.

> Architecture name inspired by the animated series. Not affiliated with Warner Bros.

## Architecture

```text
User
  │
  ▼
Chat platform + bot
  │
  ▼
Gateway ─────► Pinky ─────► fast reply
  │              ▲
  │              └── snapshot + recent history
  ▼
Bus (durable inbox, history, snapshot)
  │
  ▼
Brain runtime ─► agentic CLI ─► private knowledge repo
                                  │
                                  └── publish next snapshot
```

| Component | Responsibility |
|---|---|
| Gateway | Authenticate, acknowledge, invoke Pinky, enqueue, and reply |
| Pinky | Answer from supplied context or defer; never write durable state |
| Bus | Durable inbox, short-lived chat history, and published snapshot |
| Brain | Review queued messages, use tools, update the repo, and follow up when useful |
| Knowledge repo | Canonical Markdown knowledge, code, workflows, and audit history |

The chat platform, models, queue, agentic CLI, and runtime are replaceable. The contracts are not.

## Core contracts

1. **Write barrier:** Pinky cannot edit the knowledge repo.
2. **Durable enqueue:** every accepted message reaches Brain, even if Pinky answered it.
3. **Answer or defer:** Pinky uses only the supplied snapshot and history; missing facts produce a fixed defer response.
4. **Queued, not saved:** Pinky never claims durable memory was updated.
5. **Snapshot publication:** Brain publishes selected knowledge pages; Pinky never reads the repo directly.
6. **Idempotent processing:** duplicate deliveries cannot produce duplicate writes or replies.
7. **Fail closed:** unknown senders are rejected.
8. **No duplicate reply:** Brain stays silent when Pinky already handled the turn.

See [contracts](docs/contracts.md) and the [write barrier](docs/write-barrier.md).

## Reference stack

The original implementation uses:

- Telegram for chat
- A serverless HTTP gateway
- A fast multimodal LLM for Pinky
- Redis for the inbox, history, and snapshot
- An agentic CLI running on GitHub Actions for Brain
- A private Git repository of Markdown files as canonical memory

These are examples, not requirements. See [adapters](docs/adapters.md).

## Starter

`starter/` contains vendor-neutral examples:

```text
starter/
├── AGENTS.md                 # Agent identity and operating rules
├── knowledge/                # Canonical Markdown knowledge
├── schemas/                  # Bus and snapshot JSON Schemas
├── gateway/                  # Pinky gateway control flow
└── brain/                    # Brain prompt, workflow, and snapshot publisher
```

To prototype:

```sh
npm test
npm run snapshot
```

Copy `starter/` into a **private** repository before adding personal data. Then implement the gateway and bus ports for your stack, configure an agentic CLI, and schedule Brain.

## Documentation

- [Architecture](docs/architecture.md) — data flow and security boundaries
- [Components](docs/pieces.md) — ownership of each component
- [Contracts](docs/contracts.md) — message, snapshot, defer, and reply contracts
- [Write barrier](docs/write-barrier.md) — capability separation and tests
- [Knowledge base](docs/knowledge-base.md) — repository structure and publishing rules
- [Adapters](docs/adapters.md) — replacing vendors and runtimes
- [Reference stack](docs/reference-stack.md) — one deployed configuration
- [Operational lessons](docs/lessons.md) — production failure modes
- [Security](SECURITY.md) — deployment boundaries and vulnerability reporting

## Status

This is an architecture reference and starter skeleton, not a hosted assistant or turnkey deployment.

MIT licensed.
