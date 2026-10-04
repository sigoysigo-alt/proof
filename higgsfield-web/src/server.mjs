// Servidor local para generar vídeos con la API de Higgsfield.
//
// - Las credenciales (KEY_ID:KEY_SECRET) viven SOLO en el servidor: variable de
//   entorno HF_CREDENTIALS o fichero higgsfield-web/.env. El navegador nunca
//   las recibe.
// - Sin dependencias: Node >= 18 (http + fetch nativos).

import http from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInput, CUSTOM_MODEL_ID, findModel, publicCatalog, sanitizeEndpoint } from './models.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ENV_FILE = path.join(ROOT, '.env');
const API_BASE = (process.env.HF_API_BASE || 'https://api.higgsfield.ai').replace(/\/$/, '');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const MAX_JSON = 1024 * 1024; // 1 MiB
const MAX_UPLOAD = Number(process.env.MAX_UPLOAD_MB || 200) * 1024 * 1024;

// ---------------------------------------------------------------------------
// Credenciales
// ---------------------------------------------------------------------------

function loadEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = loadEnvFile();
let credentials =
  process.env.HF_CREDENTIALS ||
  fileEnv.HF_CREDENTIALS ||
  (process.env.HF_API_KEY && process.env.HF_API_SECRET ? `${process.env.HF_API_KEY}:${process.env.HF_API_SECRET}` : '');

const CRED_RE = /^[A-Za-z0-9._\-]+:[A-Za-z0-9._\-]+$/;

function keyHint() {
  if (!credentials) return null;
  const id = credentials.split(':')[0];
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : '••••';
}

async function saveCredentials(value) {
  credentials = value;
  const env = loadEnvFile();
  env.HF_CREDENTIALS = value;
  const body = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  await writeFile(ENV_FILE, body, { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// Cliente Higgsfield
// ---------------------------------------------------------------------------

class HttpError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function explainStatus(status) {
  switch (status) {
    case 400: return 'Parámetros no válidos para este modelo.';
    case 401: return 'Credenciales de Higgsfield no válidas.';
    case 402:
    case 403: return 'Sin créditos suficientes o sin acceso a este modelo.';
    case 404: return 'Endpoint/modelo no encontrado en la API de Higgsfield.';
    case 422: return 'La API ha rechazado los parámetros (validación).';
    case 429: return 'Demasiadas peticiones. Espera un momento.';
    default: return `Error de la API de Higgsfield (HTTP ${status}).`;
  }
}

async function hf(method, pathname, body) {
  if (!credentials) throw new HttpError(412, 'Configura primero tu API key de Higgsfield.');
  let res;
  try {
    res = await fetch(API_BASE + pathname, {
      method,
      headers: {
        Authorization: `Key ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new HttpError(502, `No se pudo contactar con la API de Higgsfield: ${err.message}`);
  }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 2000) }; }
  if (!res.ok) throw new HttpError(res.status, explainStatus(res.status), data?.detail ?? data);
  return data;
}

// ---------------------------------------------------------------------------
// Utilidades HTTP
// ---------------------------------------------------------------------------

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, `Archivo demasiado grande (máx. ${Math.round(limit / 1024 / 1024)} MB).`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req, MAX_JSON);
  try {
    return JSON.parse(buf.toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'JSON no válido.');
  }
}

// Protección CSRF: otra web abierta en tu navegador no debe poder gastar tus
// créditos llamando a este servidor local.
function assertSameOrigin(req) {
  if (req.headers['x-hf-web'] !== '1') throw new HttpError(403, 'Petición rechazada.');
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`) throw new HttpError(403, 'Origen no permitido.');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, { error: 'No encontrado' });
  try {
    const st = await stat(file);
    if (!st.isFile()) throw new Error('not file');
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; style-src 'self'; script-src 'self'; connect-src 'self'",
    });
    res.end(data);
  } catch {
    send(res, 404, { error: 'No encontrado' });
  }
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

const REQUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const ALLOWED_UPLOAD = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|quicktime|webm)|audio\/(wav|x-wav|wave|mpeg|mp3|mp4|aac|ogg))$/;

function resolveRequest(body) {
  if (body.modelId === CUSTOM_MODEL_ID) {
    let endpoint;
    try {
      endpoint = sanitizeEndpoint(body.endpoint);
    } catch (err) {
      throw new HttpError(400, err.message);
    }
    const input = body.input;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new HttpError(400, 'El input personalizado debe ser un objeto JSON.');
    }
    return { endpoint, input };
  }
  const model = findModel(body.modelId);
  if (!model) throw new HttpError(400, 'Modelo desconocido.');
  try {
    return { endpoint: model.endpoint, input: buildInput(model, body.values, body.advanced) };
  } catch (err) {
    throw new HttpError(400, err.message);
  }
}

async function handleApi(req, res, pathname) {
  const method = req.method;

  if (method === 'GET' && pathname === '/api/models') {
    return send(res, 200, { models: publicCatalog() });
  }
  if (method === 'GET' && pathname === '/api/config') {
    return send(res, 200, { configured: Boolean(credentials), keyHint: keyHint(), apiBase: API_BASE });
  }

  if (method !== 'GET') assertSameOrigin(req);

  if (method === 'POST' && pathname === '/api/config') {
    const { credentials: value } = await readJson(req);
    const v = typeof value === 'string' ? value.trim() : '';
    if (!CRED_RE.test(v)) throw new HttpError(400, 'Formato esperado: KEY_ID:KEY_SECRET');
    await saveCredentials(v);
    return send(res, 200, { configured: true, keyHint: keyHint() });
  }

  if (method === 'POST' && pathname === '/api/upload') {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_UPLOAD.test(contentType)) throw new HttpError(415, `Tipo de archivo no soportado: ${contentType || 'desconocido'}`);
    const data = await readBody(req, MAX_UPLOAD);
    if (!data.length) throw new HttpError(400, 'Archivo vacío.');
    const slot = await hf('POST', '/files/generate-upload-url', { content_type: contentType });
    if (!slot?.upload_url || !slot?.public_url) throw new HttpError(502, 'Respuesta de subida inesperada.');
    const put = await fetch(slot.upload_url, {
      method: 'PUT',
      headers: slot.upload_headers || { 'Content-Type': contentType },
      body: data,
      signal: AbortSignal.timeout(300_000),
    });
    if (!put.ok) throw new HttpError(502, `Fallo al subir el archivo (HTTP ${put.status}).`);
    return send(res, 200, { url: slot.public_url });
  }

  if (method === 'POST' && pathname === '/api/preview') {
    return send(res, 200, resolveRequest(await readJson(req)));
  }

  if (method === 'POST' && pathname === '/api/estimate') {
    const { endpoint, input } = resolveRequest(await readJson(req));
    try {
      return send(res, 200, await hf('POST', '/estimate' + endpoint, input));
    } catch (err) {
      if (err instanceof HttpError && [403, 404, 405].includes(err.status)) {
        return send(res, 200, { unavailable: true });
      }
      throw err;
    }
  }

  if (method === 'POST' && pathname === '/api/generate') {
    const { endpoint, input } = resolveRequest(await readJson(req));
    const data = await hf('POST', endpoint, input);
    return send(res, 200, { ...data, endpoint, input });
  }

  const m = pathname.match(/^\/api\/requests\/([^/]+)\/(status|cancel)$/);
  if (m && REQUEST_ID_RE.test(m[1])) {
    if (m[2] === 'status' && method === 'GET') {
      return send(res, 200, await hf('GET', `/requests/${m[1]}/status`));
    }
    if (m[2] === 'cancel' && method === 'POST') {
      await hf('POST', `/requests/${m[1]}/cancel`);
      return send(res, 200, { canceled: true });
    }
  }

  send(res, 404, { error: 'Ruta no encontrada' });
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname.startsWith('/api/')) await handleApi(req, res, pathname);
      else if (req.method === 'GET') await serveStatic(req, res, pathname);
      else send(res, 405, { error: 'Método no permitido' });
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      if (!res.headersSent) {
        send(res, status, { error: err instanceof HttpError ? err.message : 'Error interno', detail: err.detail });
      }
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, HOST, () => {
    console.log(`Higgsfield Video Studio → http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(credentials ? `API key cargada (${keyHint()})` : 'Sin API key: configúrala desde la web o con HF_CREDENTIALS.');
  });
}
