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

function looksLikeQuestion(text) {
  return (
    /\?/.test(text) ||
    /^(who|what|when|where|why|how|is|are|do|does|did|can|could|would|should|will|was|were|have|has)\b/i.test(
      text.trim(),
    )
  );
}

function assertNoWriteClaim(text) {
  const claimsCompletedWrite =
    /\b(saved|logged|noted|recorded|remembered)\b/i.test(text) ||
    /\bupdated\b.{0,40}\b(knowledge|repo|repository|memory)\b/i.test(text);
  if (claimsCompletedWrite) {
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
  const confidence = Math.max(0, Math.min(1, Number(decision.confidence) || 0));
  let response = String(decision.response || "").trim() || DEFER;
  if (
    looksLikeQuestion(event.text || "") &&
    (route === "task" || (route === "lightweight_answer" && confidence < 0.7))
  ) {
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
    confidence,
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

module.exports = {
  handleMessage,
  assertNoWriteClaim,
  looksLikeQuestion,
  DEFER,
  QUEUED,
};
