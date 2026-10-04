// Tests del servidor contra una API de Higgsfield simulada (sin red).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const calls = [];
let mock;
let app;
let base;

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

before(async () => {
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/files/generate-upload-url') {
        const port = mock.address().port;
        return res.end(JSON.stringify({ upload_url: `http://127.0.0.1:${port}/put/x`, public_url: 'https://cdn.example/x.png' }));
      }
      if (req.url === '/put/x') return res.end('');
      if (req.url.startsWith('/requests/') && req.url.endsWith('/status')) {
        return res.end(JSON.stringify({ status: 'completed', request_id: 'abcdef12-3456', video: { url: 'https://cdn.example/v.mp4' } }));
      }
      if (req.url.startsWith('/estimate/')) {
        res.statusCode = 404;
        return res.end('{}');
      }
      if (req.url === '/bytedance/seedance-2.5/text-to-video') {
        return res.end(JSON.stringify({ status: 'queued', request_id: 'abcdef12-3456' }));
      }
      res.statusCode = 422;
      res.end(JSON.stringify({ detail: 'bad' }));
    });
  });
  const mockPort = await listen(mock);
  process.env.HF_API_BASE = `http://127.0.0.1:${mockPort}`;
  process.env.HF_CREDENTIALS = 'kid:ksecret';
  const { createServer } = await import('../src/server.mjs');
  app = createServer();
  base = `http://127.0.0.1:${await listen(app)}`;
});

after(() => {
  app.close();
  mock.close();
});

const post = (path, body, headers = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-HF-Web': '1', ...headers },
    body: typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body),
  });

test('lista modelos sin exponer funciones', async () => {
  const { models } = await (await fetch(base + '/api/models')).json();
  assert.ok(models.length >= 10);
  assert.ok(models.every((m) => m.endpoint.startsWith('/')));
});

test('config no devuelve el secreto', async () => {
  const cfg = await (await fetch(base + '/api/config')).json();
  assert.equal(cfg.configured, true);
  assert.ok(!JSON.stringify(cfg).includes('ksecret'));
});

test('genera con Seedance 2.5 aplicando valores por defecto y auth Key', async () => {
  const res = await post('/api/generate', { modelId: 'seedance-2.5-text', values: { prompt: 'Un faro' } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.request_id, 'abcdef12-3456');
  const call = calls.find((c) => c.url === '/bytedance/seedance-2.5/text-to-video');
  assert.equal(call.auth, 'Key kid:ksecret');
  assert.deepEqual(JSON.parse(call.body), {
    prompt: 'Un faro', duration: 5, resolution: '720p', aspect_ratio: '16:9', generate_audio: true, output_format: 'mp4',
  });
});

test('valida campos obligatorios y rangos', async () => {
  let res = await post('/api/generate', { modelId: 'seedance-2.5-text', values: {} });
  assert.equal(res.status, 400);
  res = await post('/api/generate', { modelId: 'seedance-2.5-text', values: { prompt: 'x', duration: 99 } });
  assert.equal(res.status, 400);
  res = await post('/api/generate', { modelId: 'seedance-2.5-reference', values: { prompt: 'x' } });
  assert.equal(res.status, 400);
});

test('DoP envía input_images y Kling envía sound on/off', async () => {
  let res = await post('/api/preview', { modelId: 'higgsfield-dop', values: { prompt: 'p', input_image: 'https://a.b/c.png' } });
  let data = await res.json();
  assert.deepEqual(data.input.input_images, [{ type: 'image_url', image_url: 'https://a.b/c.png' }]);
  assert.equal(data.input.model, 'dop-turbo');

  res = await post('/api/preview', { modelId: 'kling-2.6-pro-image', values: { image_url: 'https://a.b/c.png', sound: false, duration: '10' } });
  data = await res.json();
  assert.equal(data.input.sound, 'off');
  assert.equal(data.input.duration, 10);
});

test('endpoint personalizado: acepta rutas simples y rechaza hosts o traversal', async () => {
  let res = await post('/api/preview', { modelId: 'custom', endpoint: 'kling-video/v2.6/pro/image-to-video', input: { a: 1 } });
  assert.equal((await res.json()).endpoint, '/kling-video/v2.6/pro/image-to-video');
  for (const endpoint of ['https://evil.com/x', '/../files/x', '/requests/abc/cancel', '//evil.com']) {
    res = await post('/api/preview', { modelId: 'custom', endpoint, input: {} });
    assert.equal(res.status, 400, endpoint);
  }
});

test('rechaza peticiones sin cabecera propia o de otro origen (CSRF)', async () => {
  let res = await fetch(base + '/api/generate', { method: 'POST', body: '{}' });
  assert.equal(res.status, 403);
  res = await post('/api/generate', {}, { Origin: 'https://evil.example' });
  assert.equal(res.status, 403);
});

test('subida: pide URL firmada y hace PUT', async () => {
  const res = await post('/api/upload', new Uint8Array([1, 2, 3]), { 'Content-Type': 'image/png' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).url, 'https://cdn.example/x.png');
  assert.ok(calls.some((c) => c.method === 'PUT' && c.url === '/put/x'));
  const bad = await post('/api/upload', 'x', { 'Content-Type': 'text/html' });
  assert.equal(bad.status, 415);
});

test('estado, estimación no disponible y errores de la API', async () => {
  let res = await fetch(base + '/api/requests/abcdef12-3456/status');
  assert.equal((await res.json()).video.url, 'https://cdn.example/v.mp4');
  res = await fetch(base + '/api/requests/..%2Ffiles/status');
  assert.equal(res.status, 404);
  res = await post('/api/estimate', { modelId: 'seedance-2.5-text', values: { prompt: 'x' } });
  assert.equal((await res.json()).unavailable, true);
  res = await post('/api/generate', { modelId: 'kling-3.0-std-text', values: { prompt: 'x' } });
  assert.equal(res.status, 422);
});

test('no sirve archivos fuera de public/', async () => {
  const res = await fetch(base + '/..%2Fsrc%2Fserver.mjs');
  assert.equal(res.status, 404);
  const index = await fetch(base + '/');
  assert.equal(index.status, 200);
});
