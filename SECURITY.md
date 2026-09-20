# Security

This public repository contains architecture and example code only. Do not add
personal knowledge, credentials, tokens, account numbers, raw messages, or
media.

Deployments built from this framework should:

- keep the populated knowledge repository private;
- fail closed when the sender allowlist is missing;
- give Pinky no repository-write credentials;
- store secrets in the gateway and Brain runtime, not in Git;
- use a durable queue with retries and idempotent consumers;
- keep raw documents and media outside the knowledge repository; and
- expose only explicitly selected knowledge in Pinky's snapshot.

Report vulnerabilities privately through
[GitHub security advisories](https://github.com/scottishramp/pinky-and-the-brain/security/advisories/new).
