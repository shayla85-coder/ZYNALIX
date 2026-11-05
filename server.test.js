const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { createServer } = require("./server");

const servers = [];

async function startServer(options) {
  const server = createServer(options);
  servers.push(server);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server =>
    new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  ));
});

test("serves the page and does not expose server files", async () => {
  const base = await startServer({ apiKey: "" });
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /connect-src 'self'/);
  assert.match(await page.text(), /<!DOCTYPE html>/i);
  assert.equal((await fetch(`${base}/server.js`)).status, 404);
});

test("reports missing Gemini configuration without sending messages", async () => {
  const base = await startServer({ apiKey: "" });
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", text: "Hola" }] })
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /GEMINI_API_KEY/);
});

test("rejects malformed or oversized conversation history", async () => {
  const base = await startServer({ apiKey: "test-key" });
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", text: "x".repeat(1_201) }] })
  });
  assert.equal(response.status, 400);
});

test("forwards consented messages to Gemini without exposing its key to the browser", async () => {
  let request;
  const base = await startServer({
    apiKey: "server-only-test-key",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "¡Hola! ¿En qué te ayudo?" }] } }]
        })
      };
    }
  });
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", text: "Hola" }] })
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: "¡Hola! ¿En qué te ayudo?" });
  assert.equal(request.options.headers["x-goog-api-key"], "server-only-test-key");
  assert.match(request.url, /models\/gemini-3\.6-flash:generateContent$/);
  assert.equal(JSON.stringify(request.options.body).includes("server-only-test-key"), false);
});

test("rate limits requests from the same client", async () => {
  let calls = 0;
  const base = await startServer({
    apiKey: "test-key",
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, json: async () => ({
        candidates: [{ content: { parts: [{ text: "Respuesta" }] } }]
      }) };
    }
  });
  const send = () => fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", text: "Hola" }] })
  });
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await send()).status, 200);
  }
  assert.equal((await send()).status, 429);
  assert.equal(calls, 10);
});
