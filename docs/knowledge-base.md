# Knowledge base

The learning repo is the memory. Pinky sees a publication of it. Brain is the editor.

## Tiers

Give every page a job so a new agent (and Pinky) can find things.

| Tier | Lives at | Job |
|---|---|---|
| 0 | `AGENTS.md` | Who the human is, who the agent is, how to behave, where the rest lives. The only required read. |
| 1 | `knowledge/index.md` | Directory. One line per page. |
| 2 | `knowledge/…` | One page per life domain, person, project, or resource. |
| 3 | `knowledge/connections/` | How to connect: env var *names*, token locations, failure modes. Never values. |

Keep machinery out of the knowledge tree:

- `ops/` — playbooks, path registries, the fast-context manifest
- `state/` — ledgers, policies, staging. Rarely read by hand.
- `inbox/` — temporary intake from chat, mail, docs, photos
- `archive/` — retired pages and closed tasks

A page that is both “how email works” and “Mom’s birthday” will rot. Split it.

## Frontmatter

Every Tier 2 page should carry at least:

```yaml
---
title: Household
tier: 2
status: active
created: 2026-09-12
updated: 2026-09-12
last_reviewed: 2026-09-12
review_every_days: 30
sensitivity: medium
fast_context: true
---
```

| Field | Why |
|---|---|
| `fast_context` | Brain’s publisher includes the page in Pinky’s snapshot when true. |
| `last_reviewed` + `review_every_days` | Brain can ask a few open questions when a page is stale. |
| `sensitivity` | `high` pages are never published, even when `fast_context: true`. |
| `status` | `active` or `retired`. Retired pages move to `archive/` with one line left in the index. |

## One fact, one page

A birthday lives on the person’s page. Other pages link to it. If you copy the date onto three pages, Brain will update one and Pinky will cite another.

Write facts like this:

```markdown
- 2018-07-01: moved to the current city. (Human, 2026-09-12)
```

Every fact gets a **date** and a **source**. The source is who said it or which document it came from, plus the day you learned it.

## Intake is not knowledge

| Place | What it is |
|---|---|
| `inbox/` | Normalized messages. Temporary. |
| `state/learned/` | Staging bullets from sweeps. Not filed. |
| `knowledge/` | Synthesized, cited, on the right page. |

Automated extractors write staging. A consolidation pass (Brain, or a script Brain runs) files bullets onto pages and marks them merged. If you ship staging into Pinky’s snapshot, Pinky will speak guesses as facts.

## What goes in the snapshot

Publish:

- Tier 0 (`AGENTS.md`)
- The directory
- Every page with `fast_context: true`

Do not publish:

- `inbox/`
- `state/` ledgers
- connection pages that describe how to use tokens
- retired archive except a one-line pointer if you truly need it
- every page with `sensitivity: high`

Rebuild a manifest file in `ops/` so a test can fail when the snapshot set is stale.

## Open questions

Every thin or stale page should have an `## Open questions` section. Brain asks a few at a time, one page at a time, through the same bot. Answers get written onto the page, cited, and `last_reviewed` bumps.

This is how the repo keeps learning when the human is not volunteering facts.

## When something ends

Set `status: retired`, move the page to `archive/`, leave one line in the index. Do not delete history. Pinky should stop seeing the full page unless you still want it in context.

## Privacy

This framework is public. A filled-in learning repo should be **private**.

Fine in a private knowledge repo: names, addresses, last-four account digits, school names.

Not fine in any git repo this architecture describes: passwords, full account numbers, government ids, raw mail bodies, image bytes.

Put source files in object storage or a Drive the Brain workspace can reach. Commit links and descriptions.

If you later want a real vault for material you would not put in git at all, that is a different system. Do not improvise one inside these pages.
