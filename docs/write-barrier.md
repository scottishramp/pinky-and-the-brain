# The write barrier

Two agents are only interesting if they have different permissions.

Pinky is allowed to **talk** through the gateway.
The gateway may write only to the bus.
Brain is allowed to **write the repo**.

If Pinky can `git commit`, the capability separation—and most of its safety
benefit—has been lost.

## Why the barrier exists

1. **Honesty.** A webhook that says “saved” and then fails to commit has lied. A webhook that says “queued” can be telling the truth even if Brain is down until morning.
2. **Time.** Filing a fact well means reading related pages, checking the one-fact-one-page rule, dating and citing. That is not a 10-second chat turn.
3. **Cost.** The fast model stays cheap if it cannot start a tool loop.
4. **Safety.** The thing that talks to the public internet should not be the thing that can rewrite your life pages.
5. **Portability.** Brain can be swapped (Cursor CLI this month, Claude Code next) without changing how the human chats.

## What Pinky may do

- Read the published snapshot
- Read short chat history
- Answer a question that the snapshot clearly contains
- Describe a photo
- Reply with a fixed DEFER sentence when the snapshot does not contain the answer
- Reply with a fixed “queued for Brain” sentence when the human offered a fact
- Return a structured decision for the gateway to enqueue

## What Pinky may not do

- Create, edit, or delete knowledge pages
- Hold repository-write credentials
- Claim that it “saved,” “logged,” “noted,” or “updated” durable memory
- Claim that Brain is running *now*
- Dispatch the Brain runtime (no live workflow trigger from the gateway)
- Invent a fact that is not in the snapshot
- Persist image bytes into git

## What Brain may do

- Drain the bus
- Read the full repo, including inbox and staging
- Decide fact / task / no-op
- Edit pages and commit
- Publish a new snapshot
- Follow up on the same bot, or suppress a duplicate reply
- Use whatever other senses the workspace has (mail, calendar, docs)

## Prompt language that holds the line

Put this in Pinky’s system prompt in some form:

```
Answer ONLY from the compact context below. If the fact is not there,
do not invent it.

You cannot write durable memory. A slower scheduled agent files
knowledge later. Never say you already saved, logged, or updated it.

If this is a question you cannot answer from context, reply with
exactly the DEFER sentence.

If this is a fact the human wants remembered, acknowledge that it is
queued. Do not say it is already in the knowledge base.
```

Put this in Brain’s review prompt in some form:

```
You are the durable writer. The fast agent already replied.
Decide whether this message is a fact, a task, or a no-op.
If you write a fact, put it on the one right page, with a date
and a source. If the fast reply already covered the turn, output
the suppress token and nothing else.
```

## Tests that prove the barrier

These are cheaper than hope:

1. A unit test that the gateway never calls `git`.
2. A contract test that remember-this replies match `/queued|scheduled|later/i` and do not match `/saved|logged|noted|updated the (repo|knowledge)/i`.
3. A contract test that unknown questions return the exact DEFER sentence.
4. A publish test that the snapshot excludes `inbox/` and `state/` (or your equivalents).
5. A runner test that a commit happens only after the Brain agent exits.

## Common leaks

- **Live `repository_dispatch` from the gateway.** Feels responsive. Makes “queued” a lie, couples your chat SLA to CI, and trains Pinky to announce work it cannot see.
- **Pinky writes Redis keys that Brain treats as canon.** The bus is transport. Git is memory. If you start treating a Redis hash as the knowledge base, you have a second store.
- **“I’ll remember that” with no queue.** That is a lie even if the model is sincere.
- **Snapshot includes staging notes.** Pinky will treat unfiled guesses as facts.
- **Brain replies every time.** The human already got a fast answer. Follow up only when Brain did something the fast reply could not.

## The one-sentence test

If you unplug Brain for 24 hours, can Pinky still chat honestly?

Yes → the barrier is holding. Pinky answers from the last snapshot and keeps queueing.
No → Pinky was depending on a write path it should not have.
