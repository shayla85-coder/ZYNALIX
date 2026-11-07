const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const MAX_BODY_BYTES = 40_000;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1_200;
const MAX_HISTORY_LENGTH = 9_000;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
const DEFAULT_SERVICES = [
  ["Mantenimiento preventivo", "Mantenimiento", "Desde $50.000", "Limpieza interna, pasta térmica y revisión completa para que rinda como el primer día."],
  ["Reparación y formateo", "Mantenimiento", "Desde $60.000", "Instalación de sistema, programas y respaldo de tu información."],
  ["Redes y WiFi", "Mantenimiento", "Desde $80.000", "Cobertura estable en casa u oficina, configuración y seguridad."],
  ["Recuperación de datos", "Mantenimiento", "Cotización", "Rescatamos archivos de discos y memorias dañadas."],
  ["Páginas web", "Desarrollo", "Desde $600.000", "Sitios rápidos, responsive y con tu identidad de marca."],
  ["Aplicaciones a la medida", "Desarrollo", "Cotización", "Sistemas de inventario, reservas o gestión hechos para tu negocio."],
  ["Tiendas en línea", "Desarrollo", "Desde $1.200.000", "Catálogo, carrito y panel para administrar tus productos."],
  ["Automatización con IA", "Desarrollo", "Cotización", "Chatbots y flujos que atienden a tus clientes por ti."]
];
const MODEL_INSTRUCTIONS = `Eres Zyna, asistente virtual de ZYNALIX, un negocio de Cartagena, Colombia que ofrece mantenimiento y reparación de computadores, redes y WiFi, recuperación de datos, páginas web, tiendas en línea, aplicaciones a la medida y automatización.
Responde en español, con tono amable, claro y breve. Responde preguntas generales con naturalidad, pero prioriza orientar sobre tecnología, los servicios y la atención de ZYNALIX. No inventes precios, garantías, medios de pago, disponibilidad, diagnósticos ni promesas. Los precios de referencia publicados son: mantenimiento preventivo desde $50.000; reparación y formateo desde $60.000; redes y WiFi desde $80.000; páginas web desde $600.000; tiendas en línea desde $1.200.000. Recuperación de datos, aplicaciones a la medida y automatización requieren cotización. La atención es en Cartagena y el soporte remoto cubre Colombia; el horario publicado es lunes a viernes de 8:00 a. m. a 6:00 p. m. y sábados de 9:00 a. m. a 1:00 p. m.; la respuesta se ofrece en menos de 24 horas.
Cuando no conozcas un dato, dilo claramente y orienta al formulario de contacto o al WhatsApp del sitio. No solicites contraseñas, datos bancarios ni información sensible. Para incidentes de hardware potencialmente peligrosos, recomienda apagar y desconectar el equipo. No afirmes que eres una persona ni que realizaste acciones fuera de este chat.`;

const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]]
]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value));
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    req.on("data", chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        settled = true;
        reject(new HttpError(413, "El mensaje es demasiado grande."));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "La solicitud no tiene un formato válido."));
      }
    });
    req.on("error", error => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function validateMessages(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !Array.isArray(body.messages) || body.messages.length < 1 ||
      body.messages.length > MAX_MESSAGES) {
    throw new HttpError(400, "La conversación no tiene un formato válido.");
  }

  let totalLength = 0;
  const messages = body.messages.map(message => {
    if (!message || typeof message !== "object" ||
        !["user", "model"].includes(message.role) ||
        typeof message.text !== "string" ||
        message.text.trim().length === 0 ||
        message.text.length > MAX_MESSAGE_LENGTH) {
      throw new HttpError(400, "Hay un mensaje vacío o demasiado largo.");
    }
    totalLength += message.text.length;
    return {
      role: message.role,
      parts: [{ text: message.text.trim() }]
    };
  });

  if (totalLength > MAX_HISTORY_LENGTH ||
      messages[messages.length - 1].role !== "user") {
    throw new HttpError(400, "La conversación supera el límite permitido.");
  }
  return messages;
}

function checkRateLimit(limits, key, max, windowMs) {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || now - entry.startedAt >= windowMs) {
    limits.set(key, { startedAt: now, count: 1 });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count += 1;
  return false;
}

function validateText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${label} es obligatorio y no debe exceder ${maxLength} caracteres.`);
  }
  return value.trim();
}

function validateEmail(value) {
  const email = validateText(value, "El correo", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Ingresa un correo válido.");
  }
  return email.toLowerCase();
}

function numericPrice(price) {
  const match = String(price).replace(/\./g, "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function createStore(filePath) {
  let state;
  let loading;
  let writes = Promise.resolve();

  async function load() {
    if (state) return state;
    if (!loading) {
      loading = (async () => {
        try {
          state = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
          if (!state || !Array.isArray(state.services) ||
              !Array.isArray(state.messages) || !Array.isArray(state.quotes) ||
              !Number.isSafeInteger(state.nextServiceId) ||
              !Number.isSafeInteger(state.nextRecordId)) {
            throw new Error("El archivo de datos del panel no tiene el formato esperado.");
          }
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          state = {
            services: DEFAULT_SERVICES.map(([name, category, price, description], index) => ({
              id: index + 1,
              n: name,
              c: category,
              p: price,
              d: description
            })),
            messages: [],
            quotes: [],
            nextServiceId: DEFAULT_SERVICES.length + 1,
            nextRecordId: 1
          };
          await persist(state);
        }
        return state;
      })();
    }
    return loading;
  }

  async function persist(value) {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.promises.writeFile(temporaryPath, JSON.stringify(value, null, 2), {
        encoding: "utf8",
        mode: 0o600
      });
      await fs.promises.rename(temporaryPath, filePath);
    } catch (error) {
      await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  function update(change) {
    const operation = writes.then(async () => {
      const current = await load();
      const next = structuredClone(current);
      const result = change(next);
      await persist(next);
      state = next;
      return result;
    });
    writes = operation.catch(() => {});
    return operation;
  }

  return { load, update };
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(cookie => {
    const separator = cookie.indexOf("=");
    return separator < 0
      ? ["", ""]
      : [cookie.slice(0, separator).trim(), cookie.slice(separator + 1).trim()];
  }).filter(([name]) => name));
}

function signSession(expiresAt, secret) {
  const payload = String(expiresAt);
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function isAdminRequest(req, secret) {
  if (!secret) return false;
  const token = parseCookies(req.headers.cookie).zynalix_admin;
  if (!token) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra || !/^\d+$/.test(expiresAt) ||
      Number(expiresAt) < Date.now()) return false;
  const expected = signSession(Number(expiresAt), secret).split(".")[1];
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function requireJson(req) {
  if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "La solicitud debe ser JSON.");
  }
}

function createServer({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || "gemini-3.6-flash",
  fetchImpl = fetch,
  storeFile = path.join(ROOT, "data", "zynalix.json"),
  adminUsername = process.env.ADMIN_USERNAME,
  adminPassword = process.env.ADMIN_PASSWORD,
  sessionSecret = process.env.ADMIN_SESSION_SECRET,
  secureCookies = process.env.NODE_ENV === "production"
} = {}) {
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error("GEMINI_MODEL contiene caracteres no permitidos.");
  }

  const requestsByIp = new Map();
  const formRequestsByIp = new Map();
  const loginRequestsByIp = new Map();
  const store = createStore(storeFile);
  const server = http.createServer(async (req, res) => {
    setSecurityHeaders(res);
    const pathname = new URL(req.url, "http://localhost").pathname;
    const clientIp = req.socket.remoteAddress || "unknown";

    if (pathname.startsWith("/api/admin/") || pathname === "/api/services" ||
        pathname === "/api/contact" || pathname === "/api/quotes") {
      if (["POST", "DELETE", "PATCH"].includes(req.method) && !sameOrigin(req)) {
        return sendJson(res, 403, { error: "Origen de solicitud no permitido." });
      }

      if (pathname === "/api/admin/login" && req.method === "POST") {
        try {
          requireJson(req);
          if (!adminUsername || !adminPassword || adminPassword.length < 12 ||
              !sessionSecret || sessionSecret.length < 32) {
            return sendJson(res, 503, {
              error: "Configura ADMIN_USERNAME, ADMIN_PASSWORD (mínimo 12 caracteres) y ADMIN_SESSION_SECRET (mínimo 32 caracteres)."
            });
          }
          if (checkRateLimit(loginRequestsByIp, clientIp, 5, 15 * 60 * 1000)) {
            return sendJson(res, 429, { error: "Demasiados intentos. Espera 15 minutos." });
          }
          const body = await readJsonBody(req);
          const matches = (provided, expected) => {
            const left = Buffer.from(typeof provided === "string" ? provided : "");
            const right = Buffer.from(expected);
            return left.length === right.length && crypto.timingSafeEqual(left, right);
          };
          if (!matches(body?.username, adminUsername) || !matches(body?.password, adminPassword)) {
            return sendJson(res, 401, { error: "Usuario o contraseña incorrectos." });
          }
          const expiresAt = Date.now() + ADMIN_SESSION_MS;
          const cookie = `zynalix_admin=${signSession(expiresAt, sessionSecret)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_MS / 1000}${secureCookies ? "; Secure" : ""}`;
          res.setHeader("Set-Cookie", cookie);
          return sendJson(res, 200, { message: "Sesión iniciada." });
        } catch (error) {
          if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
          console.error("No se pudo autenticar al administrador:", error.message);
          return sendJson(res, 500, { error: "No se pudo iniciar sesión." });
        }
      }

      if (pathname === "/api/admin/logout" && req.method === "POST") {
        res.setHeader("Set-Cookie", "zynalix_admin=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0" +
          (secureCookies ? "; Secure" : ""));
        return sendJson(res, 200, { message: "Sesión cerrada." });
      }

      if (pathname.startsWith("/api/admin/") &&
          !isAdminRequest(req, sessionSecret)) {
        return sendJson(res, 401, { error: "Inicia sesión para acceder al panel." });
      }

      try {
        if (pathname === "/api/services" && req.method === "GET") {
          return sendJson(res, 200, { services: (await store.load()).services });
        }
        if (pathname === "/api/contact" && req.method === "POST") {
          requireJson(req);
          if (checkRateLimit(formRequestsByIp, `contact:${clientIp}`, 5, 60 * 60 * 1000)) {
            return sendJson(res, 429, { error: "Se alcanzó el límite de solicitudes. Inténtalo más tarde." });
          }
          const body = await readJsonBody(req);
          const message = {
            id: 0,
            name: validateText(body?.name, "El nombre", 120),
            email: validateEmail(body?.email),
            service: validateText(body?.service, "El servicio", 120),
            message: validateText(body?.message, "El mensaje", 2_000),
            created_at: new Date().toISOString()
          };
          message.id = await store.update(data => {
            message.id = data.nextRecordId++;
            data.messages.unshift(message);
            return message.id;
          });
          return sendJson(res, 201, { id: message.id, message: "Solicitud guardada." });
        }
        if (pathname === "/api/quotes" && req.method === "POST") {
          requireJson(req);
          if (checkRateLimit(formRequestsByIp, `quote:${clientIp}`, 5, 60 * 60 * 1000)) {
            return sendJson(res, 429, { error: "Se alcanzó el límite de cotizaciones. Inténtalo más tarde." });
          }
          const body = await readJsonBody(req);
          const name = validateText(body?.name, "El nombre", 120);
          const email = validateEmail(body?.email);
          if (!Array.isArray(body?.items) || !body.items.length ||
              body.items.length > DEFAULT_SERVICES.length) {
            throw new HttpError(400, "Selecciona entre uno y ocho servicios.");
          }
          if (!["remote", "onsite"].includes(body?.modality) ||
              !["normal", "urgent"].includes(body?.priority)) {
            throw new HttpError(400, "La modalidad o prioridad no es válida.");
          }
          const quote = await store.update(data => {
            const seen = new Set();
            const items = body.items.map(item => {
              const serviceId = Number(item?.serviceId);
              const quantity = Number(item?.quantity);
              if (!Number.isSafeInteger(serviceId) || !Number.isInteger(quantity) ||
                  quantity < 1 || quantity > 20 || seen.has(serviceId)) {
                throw new HttpError(400, "Uno de los servicios o cantidades no es válido.");
              }
              seen.add(serviceId);
              const service = data.services.find(entry => entry.id === serviceId);
              if (!service) throw new HttpError(400, "Uno de los servicios ya no está disponible.");
              const unitPrice = numericPrice(service.p);
              return {
                serviceId,
                name: service.n,
                quantity,
                unitPrice,
                subtotal: unitPrice * quantity
              };
            });
            const pendingItems = items.filter(item => item.unitPrice === 0).length;
            const baseTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
            const estimatedTotal = baseTotal * (body.priority === "urgent" ? 1.2 : 1) +
              (body.modality === "onsite" ? 30_000 : 0);
            const savedQuote = {
              id: data.nextRecordId++,
              name,
              email,
              modality: body.modality,
              priority: body.priority,
              estimated_total: estimatedTotal,
              pending_items: pendingItems,
              items,
              created_at: new Date().toISOString()
            };
            data.quotes.unshift(savedQuote);
            return savedQuote;
          });
          return sendJson(res, 201, {
            id: quote.id,
            estimatedTotal: quote.estimated_total,
            pendingItems: quote.pending_items
          });
        }
        if (pathname === "/api/admin/session" && req.method === "GET") {
          return sendJson(res, 200, { authenticated: true });
        }
        if (pathname === "/api/admin/messages" && req.method === "GET") {
          return sendJson(res, 200, { messages: (await store.load()).messages.slice(0, 100) });
        }
        if (pathname === "/api/admin/quotes" && req.method === "GET") {
          return sendJson(res, 200, { quotes: (await store.load()).quotes.slice(0, 100) });
        }
        if (pathname === "/api/admin/services" && req.method === "GET") {
          return sendJson(res, 200, { services: (await store.load()).services });
        }
        if (pathname === "/api/admin/services" && req.method === "POST") {
          requireJson(req);
          const body = await readJsonBody(req);
          const service = {
            n: validateText(body?.name, "El nombre", 120),
            c: validateText(body?.category, "La categoría", 60),
            p: validateText(body?.price, "El precio", 80),
            d: validateText(body?.description, "La descripción", 500)
          };
          const savedService = await store.update(data => {
            if (data.services.some(entry => entry.n.toLowerCase() === service.n.toLowerCase())) {
              throw new HttpError(409, "Ya existe un servicio con ese nombre.");
            }
            const entry = { id: data.nextServiceId++, ...service };
            data.services.push(entry);
            return entry;
          });
          return sendJson(res, 201, { service: savedService });
        }
        const deleteMatch = pathname.match(/^\/api\/admin\/(messages|services)\/(\d+)$/);
        if (deleteMatch && req.method === "DELETE") {
          const result = await store.update(data => {
            const collection = deleteMatch[1] === "messages" ? data.messages : data.services;
            const index = collection.findIndex(entry => entry.id === Number(deleteMatch[2]));
            if (index < 0) return false;
            collection.splice(index, 1);
            return true;
          });
          if (!result) return sendJson(res, 404, { error: "El registro ya no existe." });
          return sendJson(res, 200, { message: "Registro eliminado." });
        }
        if (pathname.startsWith("/api/admin/")) {
          return sendJson(res, 404, { error: "Ruta administrativa no encontrada." });
        }
      } catch (error) {
        if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
        console.error("No se pudo completar la operación del panel:", error.message);
        return sendJson(res, 500, { error: "No se pudo completar la operación. Revisa el servidor e inténtalo de nuevo." });
      }
    }

    if (pathname === "/api/chat") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendJson(res, 405, { error: "Este endpoint solo acepta mensajes POST." });
      }
      if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        return sendJson(res, 415, { error: "La solicitud debe ser JSON." });
      }
      if (req.headers["content-length"] &&
          Number(req.headers["content-length"]) > MAX_BODY_BYTES) {
        req.resume();
        return sendJson(res, 413, { error: "El mensaje es demasiado grande." });
      }
      const now = Date.now();
      const ip = req.socket.remoteAddress || "unknown";
      const entry = requestsByIp.get(ip);
      if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
        requestsByIp.set(ip, { startedAt: now, count: 1 });
      } else if (entry.count >= RATE_LIMIT) {
        return sendJson(res, 429, {
          error: "Se alcanzó el límite temporal de mensajes. Inténtalo de nuevo en un minuto."
        });
      } else {
        entry.count += 1;
      }

      try {
        const body = await readJsonBody(req);
        const contents = validateMessages(body);
        if (!apiKey) {
          return sendJson(res, 503, {
            error: "El asistente aún no está configurado. Añade la clave GEMINI_API_KEY al servidor."
          });
        }
        const upstream = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: MODEL_INSTRUCTIONS }] },
              contents,
              generationConfig: { maxOutputTokens: 450, temperature: 0.6 }
            }),
            signal: AbortSignal.timeout(20_000)
          }
        );

        if (!upstream.ok) {
          if (upstream.status === 429) {
            return sendJson(res, 429, {
              error: "El servicio de IA alcanzó su límite de uso. Inténtalo más tarde."
            });
          }
          console.error(`Gemini API respondió con HTTP ${upstream.status}.`);
          return sendJson(res, 502, {
            error: "No pudimos obtener una respuesta del asistente. Inténtalo de nuevo más tarde."
          });
        }

        const result = await upstream.json();
        const answer = result.candidates?.[0]?.content?.parts
          ?.map(part => part.text)
          .filter(text => typeof text === "string")
          .join("")
          .trim();
        if (!answer) {
          console.error("Gemini API respondió sin texto.");
          return sendJson(res, 502, {
            error: "El asistente no pudo generar una respuesta. Inténtalo de nuevo."
          });
        }
        return sendJson(res, 200, { answer });
      } catch (error) {
        if (error instanceof HttpError) {
          return sendJson(res, error.status, { error: error.message });
        }
        console.error("No se pudo completar la solicitud a Gemini:", error.message);
        return sendJson(res, 502, {
          error: "No pudimos conectar con el asistente. Revisa tu conexión e inténtalo de nuevo."
        });
      }
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      res.writeHead(405);
      return res.end();
    }

    const file = STATIC_FILES.get(pathname);
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No encontrado.");
    }

    try {
      const content = await fs.promises.readFile(path.join(ROOT, file[0]));
      res.writeHead(200, {
        "Content-Type": file[1],
        "Cache-Control": "no-cache"
      });
      return res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      console.error("No se pudo leer un archivo del sitio:", error.message);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No se pudo cargar el sitio.");
    }
  });

  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT debe ser un número entre 1 y 65535.");
  }
  createServer().listen(port, host, () => {
    console.log(`ZYNALIX disponible en http://localhost:${port}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Falta GEMINI_API_KEY; el sitio carga, pero el chat con IA no responderá.");
    }
  });
}

module.exports = { createServer };
