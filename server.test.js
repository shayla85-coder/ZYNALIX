const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { afterEach, test } = require("node:test");
const { createServer } = require("./server");

const servers = [];
const tempDirectories = [];

async function startServer(options) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "zynalix-test-"));
  tempDirectories.push(directory);
  const server = createServer({
    storeFile: path.join(directory, "data.json"),
    adminUsername: "admin",
    adminPassword: "a-secure-test-password",
    sessionSecret: "a-test-session-secret-with-more-than-thirty-two-characters",
    ...options
  });
  servers.push(server);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server =>
    new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  ));
  await Promise.all(tempDirectories.splice(0).map(directory =>
    fs.rm(directory, { recursive: true, force: true })
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

test("provides a file-backed service catalog and protects admin endpoints", async () => {
  const base = await startServer({ apiKey: "" });
  const catalog = await fetch(`${base}/api/services`);
  assert.equal(catalog.status, 200);
  assert.equal((await catalog.json()).services.length, 8);
  assert.equal((await fetch(`${base}/api/admin/messages`)).status, 401);
});

test("stores contact requests and quotes for the authenticated admin", async () => {
  const base = await startServer();
  const contact = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cliente ZYNALIX",
      email: "cliente@example.com",
      service: "Mantenimiento preventivo",
      message: "Necesito revisar mi computador."
    })
  });
  assert.equal(contact.status, 201);

  const services = (await (await fetch(`${base}/api/services`)).json()).services;
  const quote = await fetch(`${base}/api/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cliente ZYNALIX",
      email: "cliente@example.com",
      items: [{ serviceId: services[0].id, quantity: 2 }],
      modality: "remote",
      priority: "normal"
    })
  });
  assert.equal(quote.status, 201);
  assert.equal((await quote.json()).estimatedTotal, 100000);

  const login = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "a-secure-test-password" })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const messages = await fetch(`${base}/api/admin/messages`, { headers: { Cookie: cookie } });
  assert.equal(messages.status, 200);
  assert.equal((await messages.json()).messages.length, 1);
  const quotes = await fetch(`${base}/api/admin/quotes`, { headers: { Cookie: cookie } });
  assert.equal(quotes.status, 200);
  assert.equal((await quotes.json()).quotes.length, 1);

  const addService = await fetch(`${base}/api/admin/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: "Diagnóstico remoto",
      category: "Mantenimiento",
      price: "Desde $25.000",
      description: "Revisión inicial del equipo."
    })
  });
  assert.equal(addService.status, 201);
  assert.equal((await (await fetch(`${base}/api/services`)).json()).services.length, 9);
});

test("keeps administrator data after restarting the server", async () => {
  const firstBase = await startServer();
  const storeFile = path.join(tempDirectories[0], "data.json");
  const contact = await fetch(`${firstBase}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cliente",
      email: "cliente@example.com",
      service: "Redes y WiFi",
      message: "Necesito ayuda con mi red."
    })
  });
  assert.equal(contact.status, 201);

  const firstServer = servers.pop();
  await new Promise((resolve, reject) =>
    firstServer.close(error => error ? reject(error) : resolve())
  );
  const secondBase = await startServer({ storeFile });
  const login = await fetch(`${secondBase}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "a-secure-test-password" })
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const messages = await fetch(`${secondBase}/api/admin/messages`, { headers: { Cookie: cookie } });
  assert.equal((await messages.json()).messages.length, 1);
});

test("does not allow administrator login without configured credentials", async () => {
  const base = await startServer({
    adminPassword: "",
    sessionSecret: "a-test-session-secret-with-more-than-thirty-two-characters"
  });
  const response = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "password" })
  });
  assert.equal(response.status, 503);
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
