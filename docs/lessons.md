# Lessons

Operating notes from a working instance, stripped of personal detail. Each one earned a failure.

## Gateway

**ACK photos first.** Chat platforms wait about a minute for webhook 200. A vision call can take longer. Return 200, then describe in the background. Diagnose from gateway logs, not the platform’s last-error string — that string goes stale.

**Thinking tokens count against the output cap.** A “Flash” model that thinks on medium can truncate a JSON describe mid-string. For photos: plain prose, minimal thinking, a large output cap, one retry on 429/503.

**The platform’s red icon is not a taxonomy.** A leftover 504, a model 503, a truncated JSON parse, and a vision budget abort all look like “the bot failed.” Classify from your own logs.

**Env beats code defaults.** Changing the default model in source does nothing if the host has `FAST_MODEL` set. Update the secret and redeploy.

**Do not deploy the gateway from a git checkout if the host keys off the commit author.** Stage a git-free copy, or publish knowledge over the bus and keep deploys for code.

## Pinky

**Never invent.** The most common lie is a confident birthday, meal, or address that is not in the snapshot.

**Never claim a write.** “Got it, I saved that” is the second most common lie. Queue language only.

**DEFER is a feature.** A fixed handoff sentence is better than a wrong answer. The human already knows Brain exists if you have described the architecture once.

**Give Pinky a clock.** “Today” without a timezone is how you log meals on the wrong day.

## Bus

**Same Redis (or equivalent) in both places.** If the gateway writes a queue the runtime cannot read, Brain is decorative.

**Snapshot ≠ deploy.** New facts should reach Pinky when Brain publishes, not when someone remembers to redeploy.

**History is not knowledge.** Do not merge the last 20 chat turns into the snapshot. They expire.

## Brain

**Install the CLI before you use it.** CI path updates apply to later steps only.

**Print mode leaves git flags.** After the agent edits, clear `assume-unchanged` / `skip-worktree` on those paths or the persist step commits nothing.

**Give the runner a git identity** before the first commit. A rebase without `user.name` will drop the work.

**Cache only watermarks.** If CI restores a cached copy of `inbox/` or ledgers, you will spend a week wondering why every commit is refused for conflict markers.

**Do not push to the learning repo while Brain is mid-run** if you can avoid it. Its persist step rebases. A conflict there costs the run’s edits.

**One workflow sends proactive chat.** A read-only ingest job that also texts the human will double-fire or fail its permissions. Split “fetch” from “talk.”

**Brain files from descriptions.** Re-downloading the photo inside the agent is usually wasted minutes. Keep bytes out of git.

## Knowledge

**Staging is not a page.** An extractor that appends the same dentist four times is working as designed until a consolidator files once.

**The human’s answers outrank model guesses.** Once a person has classified a sender or corrected a fact, a later sweep does not overwrite it.

**One overdue page at a time.** A nightly interrogation of the whole life is how you train the human to mute the bot.

## Health

**Keep a canary.** A health GET that reports file count and one fact you know should be present will catch a snapshot that silently rolled back.

**`version` as a chat command** is worth the ten lines. You will ask “which bot am I talking to?” more than once.
