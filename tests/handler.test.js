const { test } = require("node:test");
const assert = require("node:assert/strict");
const { handleMessage, DEFER, QUEUED } = require("../starter/gateway/handler.example.js");

function ports(overrides = {}) {
  const sent = [];
  const queued = [];
  return {
    allowlist: ["1"],
    bundledContext: "Pickup is at 3:30.",
    sent,
    queued,
    bus: {
      getSnapshot: async () => ({ context: "Pickup is at 3:30." }),
      getHistory: async () => [],
      appendHistory: async () => {},
      enqueue: async (record) => queued.push(record),
    },
    channel: {
      ack: async () => {},
      send: async (chatId, text) => sent.push({ chatId, text }),
    },
    pinky: {
      complete: async () => ({ route: "lightweight_answer", response: "Pickup is at 3:30.", confidence: 0.9 }),
    },
    ...overrides,
  };
}

const event = {
  userId: "1",
  chatId: "9",
  messageId: "m1",
  channel: "telegram",
  conversationKey: "9",
  text: "What time is pickup?",
};

test("unknown senders are dropped and not queued", async () => {
  const p = ports();
  const result = await handleMessage({ ...event, userId: "999" }, p);
  assert.equal(result.status, "dropped");
  assert.equal(p.queued.length, 0);
  assert.equal(p.sent.length, 0);
});

test("empty allowlist denies everyone", async () => {
  const p = ports({ allowlist: [] });
  const result = await handleMessage(event, p);
  assert.equal(result.status, "dropped");
});

test("answered turns are still enqueued", async () => {
  const p = ports();
  const result = await handleMessage(event, p);
  assert.equal(result.status, "ok");
  assert.equal(p.sent[0].text, "Pickup is at 3:30.");
  assert.equal(p.queued.length, 1);
  assert.equal(p.queued[0].schema_version, 1);
  assert.equal(p.queued[0].fast_response, "Pickup is at 3:30.");
});

test("enqueue succeeds before the gateway replies", async () => {
  const calls = [];
  const p = ports();
  p.bus.enqueue = async () => calls.push("enqueue");
  p.channel.send = async () => calls.push("send");
  await handleMessage(event, p);
  assert.deepEqual(calls, ["enqueue", "send"]);
});

test("enqueue failure cannot produce a false success reply", async () => {
  const p = ports();
  p.bus.enqueue = async () => {
    throw new Error("queue unavailable");
  };
  await assert.rejects(() => handleMessage(event, p), /queue unavailable/);
  assert.equal(p.sent.length, 0);
});

test("questions without context become DEFER", async () => {
  const p = ports({
    pinky: { complete: async () => ({ route: "task", response: "I will look that up", confidence: 0.2 }) },
  });
  const result = await handleMessage(event, p);
  assert.equal(result.response, DEFER);
});

test("low-confidence question answers become DEFER", async () => {
  const p = ports({
    pinky: {
      complete: async () => ({
        route: "lightweight_answer",
        response: "Probably 4:00.",
        confidence: 0.4,
      }),
    },
  });
  const result = await handleMessage(event, p);
  assert.equal(result.response, DEFER);
});

test("knowledge updates cannot claim a write", async () => {
  const p = ports({
    pinky: {
      complete: async () => ({
        route: "knowledge_update",
        response: "Got it, I saved that to the knowledge base.",
        confidence: 0.7,
      }),
    },
  });
  const result = await handleMessage({ ...event, text: "We switched dentists." }, p);
  assert.equal(result.response, QUEUED);
});

test("completed-write claims are replaced even without a repository noun", async () => {
  const p = ports({
    pinky: {
      complete: async () => ({
        route: "task",
        response: "Got it, saved.",
        confidence: 0.9,
      }),
    },
  });
  const result = await handleMessage(
    { ...event, text: "Please remember the dentist change." },
    p,
  );
  assert.equal(result.response, QUEUED);
});
