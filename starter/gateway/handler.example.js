// Sketch of the gateway control flow. Ports are injected so the
// Telegram / Slack / HTTP details stay out of the architecture.

const DEFER = "*DEFER* The slower, smarter agent might be able to help with this";
const QUEUED = "Queued for the scheduled agent. It is not in the knowledge base yet.";

const ALLOWED_ROUTES = new Set([
  "lightweight_answer",
  "knowledge_update",
  "task",
  "needs_clarification",
  "ignore",
]);

function isAllowed(userId, allowlist) {
  return allowlist.length > 0 && allowlist.includes(String(userId));
}

function assertNoWriteClaim(text) {
  if (/\b(saved|logged|noted|updated)\b.+\b(knowledge|repo|memory)\b/i.test(text)) {
    return QUEUED;
  }
  return text;
}

async function handleMessage(event, ports) {
  const { allowlist, bus, pinky, channel } = ports;
  if (!isAllowed(event.userId, allowlist)) {
    return { status: "dropped" };
  }

  if (event.hasMedia) {
    await channel.ack(event);
  }

  const snapshot = (await bus.getSnapshot()) || { context: ports.bundledContext || "" };
  const history = (await bus.getHistory(event.conversationKey)) || [];

  const decision = await pinky.complete({
    text: event.text,
    context: snapshot.context,
    history,
    hasMedia: Boolean(event.hasMedia),
    media: event.media,
    deferSentence: DEFER,
    queuedSentence: QUEUED,
  });

  const route = ALLOWED_ROUTES.has(decision.route) ? decision.route : "task";
  let response = String(decision.response || "").trim() || DEFER;
  if (route === "task" && /[?]/.test(event.text || "")) {
    response = DEFER;
  }
  if (route === "knowledge_update") {
    response = QUEUED;
  }
  response = assertNoWriteClaim(response);

  // Enqueue before claiming success to the user. In production, enqueue()
  // should publish to a durable queue with retries and claim/ack semantics.
  await bus.enqueue({
    schema_version: 1,
    message_id: event.messageId,
    channel: event.channel,
    chat_id: String(event.chatId),
    user_id: String(event.userId),
    conversation_key: event.conversationKey,
    text: event.text || "",
    route,
    confidence: decision.confidence || 0,
    fast_response: response,
    async_task_body: event.text || "",
    photo_label: decision.photo_label || "",
    photo_description: decision.photo_description || "",
    media: event.media || null,
    received_at: new Date().toISOString(),
  });
  await channel.send(event.chatId, response);
  await bus.appendHistory(event.conversationKey, [
    { role: "user", text: event.text },
    { role: "assistant", text: response },
  ]);

  return { status: "ok", route, response };
}

module.exports = { handleMessage, DEFER, QUEUED };
