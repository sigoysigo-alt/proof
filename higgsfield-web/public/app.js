// Interfaz de Higgsfield Video Studio. Habla solo con el servidor local (/api/*);
// las credenciales nunca pasan por aquí.

const $ = (sel) => document.querySelector(sel);
const STORAGE_KEY = 'hf-web-jobs-v1';
const ACTIVE = new Set(['submitting', 'queued', 'in_progress']);
const STATUS_LABEL = {
  submitting: 'Enviando…',
  queued: 'En cola',
  in_progress: 'Generando…',
  completed: 'Completado',
  failed: 'Fallido',
  nsfw: 'Bloqueado (NSFW)',
  canceled: 'Cancelado',
  error: 'Error',
};
const ACCEPT = {
  image: 'image/png,image/jpeg,image/webp',
  images: 'image/png,image/jpeg,image/webp',
  video: 'video/mp4,video/quicktime,video/webm',
  videos: 'video/mp4,video/quicktime,video/webm',
  audios: 'audio/wav,audio/mpeg,audio/mp4,audio/aac,audio/ogg',
};

let models = [];
let current = null;
let media = {}; // nombre de campo → URL o lista de URLs
let jobs = loadJobs();

// ---------------------------------------------------------------------------
// API local
// ---------------------------------------------------------------------------

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const isJson = body !== undefined && !(body instanceof Blob);
  const res = await fetch(path, {
    method,
    headers: {
      ...(method !== 'GET' ? { 'X-HF-Web': '1' } : {}),
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: isJson ? JSON.stringify(body) : body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail ? `\n${typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)}` : '';
    throw new Error((data.error || `HTTP ${res.status}`) + detail);
  }
  return data;
}

// ---------------------------------------------------------------------------
// API key
// ---------------------------------------------------------------------------

async function refreshKey() {
  const cfg = await api('/api/config');
  const btn = $('#keyBtn');
  btn.textContent = cfg.configured ? `API key: ${cfg.keyHint}` : 'Configurar API key';
  btn.className = `chip ${cfg.configured ? 'ok' : 'missing'}`;
  return cfg;
}

function openKeyDialog() {
  $('#keyError').hidden = true;
  $('#keyInput').value = '';
  $('#keyDialog').showModal();
}

$('#keyBtn').addEventListener('click', openKeyDialog);
$('#keyCancel').addEventListener('click', () => $('#keyDialog').close());
$('#keyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/config', { method: 'POST', body: { credentials: $('#keyInput').value } });
    $('#keyDialog').close();
    await refreshKey();
  } catch (err) {
    $('#keyError').textContent = err.message;
    $('#keyError').hidden = false;
  }
});

// ---------------------------------------------------------------------------
// Formulario dinámico
// ---------------------------------------------------------------------------

function renderModelSelect() {
  const select = $('#modelSelect');
  const families = new Map();
  for (const m of models) {
    if (!families.has(m.family)) families.set(m.family, []);
    families.get(m.family).push(m);
  }
  for (const [family, list] of families) {
    const group = document.createElement('optgroup');
    group.label = family;
    for (const m of list) group.append(new Option(m.name, m.id));
    select.append(group);
  }
  const other = document.createElement('optgroup');
  other.label = 'Otros';
  other.append(new Option('Endpoint personalizado (cualquier modelo)', 'custom'));
  select.append(other);

  const saved = safeGet('hf-web-model');
  if (saved && [...select.options].some((o) => o.value === saved)) select.value = saved;
  select.addEventListener('change', () => selectModel(select.value));
  selectModel(select.value);
}

function selectModel(id) {
  safeSet('hf-web-model', id);
  current = id === 'custom' ? { id: 'custom', name: 'Endpoint personalizado', fields: [] } : models.find((m) => m.id === id);
  media = {};
  $('#modelEndpoint').textContent = current.endpoint ? `POST ${current.endpoint}` : '';
  $('#modelNote').hidden = !current.note;
  $('#modelNote').textContent = current.note || '';
  $('#customFields').hidden = id !== 'custom';
  $('#advancedBox').hidden = id === 'custom';
  $('#estimate').hidden = true;
  $('#preview').hidden = true;
  hideError();

  const box = $('#fields');
  box.replaceChildren(...current.fields.map(renderField));
}

function renderField(f) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.dataset.name = f.name;
  const label = document.createElement('span');
  label.textContent = f.label + (f.required ? ' *' : '');

  let control;
  switch (f.type) {
    case 'text':
      control = document.createElement('textarea');
      control.rows = 4;
      control.placeholder = f.placeholder || '';
      break;
    case 'select':
      control = document.createElement('select');
      for (const o of f.options) control.append(new Option(String(o), String(o)));
      if (f.default !== undefined) control.value = String(f.default);
      break;
    case 'number':
      control = document.createElement('input');
      control.type = 'number';
      Object.assign(control, { min: f.min, max: f.max, step: f.step ?? 1 });
      if (f.default !== undefined) control.value = f.default;
      label.textContent += ` (${f.min}–${f.max})`;
      break;
    case 'boolean':
    case 'onoff': {
      wrap.classList.add('inline');
      control = document.createElement('input');
      control.type = 'checkbox';
      control.checked = Boolean(f.default);
      control.name = f.name;
      wrap.append(control, label);
      return wrap;
    }
    default:
      return renderMediaField(f, wrap, label);
  }
  control.name = f.name;
  wrap.append(label, control);
  return wrap;
}

function renderMediaField(f, wrap, label) {
  const multiple = f.type.endsWith('s') && f.type !== 'image' && f.type !== 'video';
  wrap.classList.add('media-field');

  const file = document.createElement('input');
  file.type = 'file';
  file.accept = ACCEPT[f.type] || '';
  file.multiple = multiple;

  const urlRow = document.createElement('div');
  urlRow.className = 'url-add';
  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.placeholder = 'o pega una URL pública https://…';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'ghost small';
  addBtn.textContent = 'Añadir';
  urlRow.append(urlInput, addBtn);

  const uploads = document.createElement('div');
  uploads.className = 'uploads';

  const kind = f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : 'audio';

  const redraw = () => {
    const list = multiple ? media[f.name] || [] : media[f.name] ? [media[f.name]] : [];
    uploads.replaceChildren(...list.map((item) => thumb(item, kind, () => {
      if (multiple) media[f.name] = media[f.name].filter((x) => x !== item);
      else delete media[f.name];
      redraw();
    })));
  };

  const add = (url) => {
    if (multiple) {
      media[f.name] = [...(media[f.name] || []), url];
      if (f.max && media[f.name].length > f.max) media[f.name] = media[f.name].slice(0, f.max);
    } else {
      media[f.name] = url;
    }
    redraw();
  };

  addBtn.addEventListener('click', () => {
    const v = urlInput.value.trim();
    if (!/^https?:\/\//i.test(v)) return showError('Introduce una URL que empiece por https://');
    add(v);
    urlInput.value = '';
  });

  file.addEventListener('change', async () => {
    const files = [...file.files];
    file.value = '';
    for (const fl of files) {
      const placeholder = document.createElement('div');
      placeholder.className = 'thumb';
      placeholder.textContent = 'Subiendo…';
      uploads.append(placeholder);
      try {
        const { url } = await api('/api/upload', { method: 'POST', body: fl, headers: { 'Content-Type': fl.type } });
        add(url);
      } catch (err) {
        placeholder.remove();
        showError(`No se pudo subir «${fl.name}»: ${err.message}`);
      }
    }
  });

  wrap.append(label, file, urlRow, uploads);
  return wrap;
}

function thumb(url, kind, onRemove) {
  const el = document.createElement('div');
  el.className = 'thumb';
  if (kind === 'image') {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    el.append(img);
  } else if (kind === 'video') {
    const v = document.createElement('video');
    v.src = url;
    v.muted = true;
    el.append(v);
  } else {
    el.textContent = 'Audio ✓';
  }
  el.title = url;
  const x = document.createElement('button');
  x.type = 'button';
  x.textContent = '×';
  x.addEventListener('click', onRemove);
  el.append(x);
  return el;
}

function collectRequest() {
  if (current.id === 'custom') {
    let input;
    try {
      input = JSON.parse($('#customInput').value || '{}');
    } catch {
      throw new Error('El input personalizado no es JSON válido.');
    }
    return { modelId: 'custom', endpoint: $('#customEndpoint').value, input };
  }
  const values = {};
  for (const f of current.fields) {
    if (f.name in media) { values[f.name] = media[f.name]; continue; }
    const el = $('#fields').querySelector(`[name="${CSS.escape(f.name)}"]`);
    if (!el) continue;
    values[f.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  let advanced;
  const raw = $('#advancedInput').value.trim();
  if (raw) {
    try {
      advanced = JSON.parse(raw);
    } catch {
      throw new Error('Los ajustes avanzados no son JSON válido.');
    }
  }
  return { modelId: current.id, values, advanced };
}

function showError(msg) {
  $('#formError').textContent = msg;
  $('#formError').hidden = false;
}
function hideError() {
  $('#formError').hidden = true;
}

$('#previewBtn').addEventListener('click', async () => {
  hideError();
  try {
    const data = await api('/api/preview', { method: 'POST', body: collectRequest() });
    $('#preview').textContent = `POST ${data.endpoint}\n\n${JSON.stringify(data.input, null, 2)}`;
    $('#preview').hidden = false;
  } catch (err) {
    showError(err.message);
  }
});

$('#estimateBtn').addEventListener('click', async () => {
  hideError();
  const btn = $('#estimateBtn');
  btn.disabled = true;
  try {
    const data = await api('/api/estimate', { method: 'POST', body: collectRequest() });
    const parts = [];
    if (data.credits !== undefined) parts.push(`${data.credits} créditos`);
    if (data.usd !== undefined) parts.push(`${data.usd} USD`);
    $('#estimate').textContent = data.unavailable || !parts.length
      ? 'La API no ofrece estimación para este modelo.'
      : `Coste estimado: ${parts.join(' · ')}`;
    $('#estimate').hidden = false;
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
  }
});

$('#genForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  let request;
  try {
    request = collectRequest();
  } catch (err) {
    return showError(err.message);
  }
  const btn = $('#generateBtn');
  btn.disabled = true;
  const job = {
    localId: crypto.randomUUID(),
    modelName: current.name,
    prompt: request.values?.prompt || request.input?.prompt || '',
    status: 'submitting',
    createdAt: Date.now(),
  };
  jobs.unshift(job);
  renderJobs();
  try {
    const data = await api('/api/generate', { method: 'POST', body: request });
    Object.assign(job, { requestId: data.request_id, endpoint: data.endpoint }, extract(data));
  } catch (err) {
    // No llegó a crearse en Higgsfield: se muestra en el formulario, no en el historial.
    jobs = jobs.filter((j) => j !== job);
    showError(err.message);
  } finally {
    btn.disabled = false;
    saveJobs();
    renderJobs();
    schedulePoll();
  }
});

// ---------------------------------------------------------------------------
// Trabajos y polling
// ---------------------------------------------------------------------------

function extract(data) {
  const out = { status: data.status || 'queued' };
  if (data.video?.url) out.videoUrl = data.video.url;
  if (Array.isArray(data.videos) && data.videos[0]?.url) out.videoUrl = data.videos[0].url;
  if (Array.isArray(data.images)) out.images = data.images.map((i) => i.url).filter(Boolean);
  if (data.error) out.error = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  if (out.status === 'failed' && !out.error) out.error = 'La generación ha fallado (créditos reembolsados).';
  if (out.status === 'nsfw') out.error = 'Contenido rechazado por moderación (créditos reembolsados).';
  return out;
}

let pollTimer = null;
function schedulePoll() {
  clearTimeout(pollTimer);
  if (jobs.some((j) => ACTIVE.has(j.status) && j.requestId)) pollTimer = setTimeout(poll, 4000);
}

async function poll() {
  const active = jobs.filter((j) => ACTIVE.has(j.status) && j.requestId);
  await Promise.all(active.map(async (job) => {
    try {
      Object.assign(job, extract(await api(`/api/requests/${encodeURIComponent(job.requestId)}/status`)));
      job.pollErrors = 0;
    } catch (err) {
      job.pollErrors = (job.pollErrors || 0) + 1;
      if (job.pollErrors >= 5) Object.assign(job, { status: 'error', error: err.message });
    }
  }));
  saveJobs();
  renderJobs();
  schedulePoll();
}

function renderJobs() {
  const list = $('#jobs');
  $('#emptyJobs').hidden = jobs.length > 0;
  list.replaceChildren(...jobs.map((job) => {
    const li = $('#jobTpl').content.firstElementChild.cloneNode(true);
    li.querySelector('.job-model').textContent = job.modelName;
    const badge = li.querySelector('.badge');
    badge.textContent = STATUS_LABEL[job.status] || job.status;
    badge.classList.add(job.status);
    li.querySelector('.job-prompt').textContent = job.prompt;

    const mediaBox = li.querySelector('.job-media');
    if (job.videoUrl) {
      const v = document.createElement('video');
      v.src = job.videoUrl;
      v.controls = true;
      v.playsInline = true;
      v.preload = 'metadata';
      mediaBox.append(v);
    } else if (job.images?.length) {
      const img = document.createElement('img');
      img.src = job.images[0];
      img.alt = '';
      mediaBox.append(img);
    }

    const dl = li.querySelector('.job-download');
    const resultUrl = job.videoUrl || job.images?.[0];
    if (resultUrl) {
      dl.href = resultUrl;
      dl.hidden = false;
    }

    const cancel = li.querySelector('.job-cancel');
    cancel.hidden = job.status !== 'queued';
    cancel.addEventListener('click', async () => {
      try {
        await api(`/api/requests/${encodeURIComponent(job.requestId)}/cancel`, { method: 'POST', body: {} });
        job.status = 'canceled';
      } catch (err) {
        job.error = `No se pudo cancelar (solo se puede mientras está en cola): ${err.message}`;
      }
      saveJobs();
      renderJobs();
    });

    li.querySelector('.job-remove').addEventListener('click', () => {
      jobs = jobs.filter((j) => j !== job);
      saveJobs();
      renderJobs();
    });

    if (job.error) {
      const e = li.querySelector('.job-error');
      e.textContent = job.error;
      e.hidden = false;
    }
    li.querySelector('.job-meta').textContent = [
      new Date(job.createdAt).toLocaleString(),
      job.requestId ? `id: ${job.requestId}` : '',
    ].filter(Boolean).join(' · ');
    return li;
  }));
}

$('#clearBtn').addEventListener('click', () => {
  if (!confirm('¿Quitar todas las generaciones del historial? (Los vídeos no se borran de Higgsfield.)')) return;
  jobs = jobs.filter((j) => ACTIVE.has(j.status));
  saveJobs();
  renderJobs();
});

// ---------------------------------------------------------------------------
// Persistencia local (solo historial; nunca credenciales)
// ---------------------------------------------------------------------------

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* sin almacenamiento: no pasa nada */ }
}
function loadJobs() {
  try {
    const list = JSON.parse(safeGet(STORAGE_KEY) || '[]');
    // Un envío interrumpido por recargar la página no tiene request_id: ya no se puede seguir.
    return list.map((j) => (j.status === 'submitting' ? { ...j, status: 'error', error: 'Envío interrumpido.' } : j));
  } catch {
    return [];
  }
}
function saveJobs() {
  safeSet(STORAGE_KEY, JSON.stringify(jobs.slice(0, 100)));
}

// ---------------------------------------------------------------------------

(async function init() {
  try {
    const [{ models: list }, cfg] = await Promise.all([api('/api/models'), refreshKey()]);
    models = list;
    renderModelSelect();
    renderJobs();
    schedulePoll();
    if (!cfg.configured) openKeyDialog();
  } catch (err) {
    showError(`No se pudo iniciar: ${err.message}`);
  }
})();
