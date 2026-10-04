// Catálogo de modelos de vídeo de la API de Higgsfield (https://api.higgsfield.ai).
//
// Cada entrada describe el endpoint y los campos del formulario. El servidor
// construye el payload final a partir de este catálogo (es la fuente de verdad),
// así el navegador nunca decide qué se envía a la API.
//
// Tipos de campo:
//   text      → string (textarea)
//   select    → string o número de una lista cerrada
//   number    → número con min/max/step
//   boolean   → casilla
//   onoff     → casilla que se envía como "on" / "off" (Kling)
//   image     → una imagen (se sube a Higgsfield y se envía su URL)
//   images / videos / audios → varias referencias (URLs subidas)
//   video     → un vídeo de entrada (URL subida)

const ASPECT_SEEDANCE = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'];

const prompt = (required) => ({
  name: 'prompt',
  label: 'Prompt',
  type: 'text',
  required,
  placeholder: 'Describe la escena, el movimiento de cámara, la luz…',
});

const generateAudio = { name: 'generate_audio', label: 'Generar audio nativo', type: 'boolean', default: true };

function seedance(version, workflow) {
  const is25 = version === '2.5';
  const resolutions = is25 ? ['480p', '720p'] : ['480p', '720p', '1080p', '4k'];
  const durMax = is25 ? 30 : 15;
  const fields = [prompt(['text', 'edit', 'extend'].includes(workflow))];

  if (workflow === 'image') {
    fields.push(
      { name: 'image_url', label: 'Imagen inicial', type: 'image', required: true },
      { name: 'end_image_url', label: 'Imagen final (opcional)', type: 'image' },
    );
  }
  if (workflow === 'edit' || workflow === 'extend') {
    fields.push({ name: 'video_url', label: 'Vídeo de origen', type: 'video', required: true });
  }
  if (workflow !== 'edit') {
    fields.push({ name: 'duration', label: 'Duración (s)', type: 'number', min: 4, max: durMax, step: 1, default: 5 });
  }
  fields.push({ name: 'resolution', label: 'Resolución', type: 'select', options: resolutions, default: '720p' });
  if (workflow === 'text' || workflow === 'reference') {
    fields.push({ name: 'aspect_ratio', label: 'Relación de aspecto', type: 'select', options: ASPECT_SEEDANCE, default: '16:9' });
  }
  fields.push(generateAudio);
  if (is25) {
    fields.push({ name: 'output_format', label: 'Formato de salida', type: 'select', options: ['mp4', 'mov'], default: 'mp4' });
  }
  if (workflow === 'reference' || workflow === 'edit' || workflow === 'extend') {
    const lim = !is25 && workflow === 'reference' ? { img: 9, vid: 3, aud: 3 } : { img: 30, vid: 10, aud: 10 };
    fields.push(
      { name: 'image_urls', label: `Imágenes de referencia (máx. ${lim.img})`, type: 'images', max: lim.img },
      { name: 'video_urls', label: `Vídeos de referencia (máx. ${lim.vid})`, type: 'videos', max: lim.vid },
      { name: 'audio_urls', label: `Audios de referencia (máx. ${lim.aud})`, type: 'audios', max: lim.aud },
    );
  }

  const labels = {
    text: 'Texto a vídeo',
    image: 'Imagen a vídeo',
    reference: 'Referencias a vídeo',
    edit: 'Editar vídeo',
    extend: 'Extender vídeo',
  };
  const slug = { text: 'text-to-video', image: 'image-to-video', reference: 'reference-to-video', edit: 'video-edit', extend: 'video-extend' };

  return {
    id: `seedance-${version}-${workflow}`,
    family: `Seedance ${version}`,
    name: `Seedance ${version} · ${labels[workflow]}`,
    endpoint: `/bytedance/seedance-${version}/${slug[workflow]}`,
    workflow,
    fields,
    requireOneOf: workflow === 'reference'
      ? (is25 ? ['image_urls', 'video_urls', 'audio_urls'] : ['image_urls', 'video_urls'])
      : undefined,
  };
}

function cinemaStudio(workflow) {
  const fields = [
    prompt(true),
    { name: 'duration', label: 'Duración (s)', type: 'number', min: 4, max: 30, step: 1, default: 5 },
    { name: 'resolution', label: 'Resolución', type: 'select', options: ['480p', '720p'], default: '720p' },
    { name: 'aspect_ratio', label: 'Relación de aspecto', type: 'select', options: ['16:9'], default: '16:9' },
    generateAudio,
  ];
  if (workflow === 'reference') {
    fields.push(
      { name: 'image_urls', label: 'Imágenes de referencia', type: 'images', max: 30 },
      { name: 'video_urls', label: 'Vídeos de referencia', type: 'videos', max: 30 },
    );
  }
  return {
    id: `cinema-studio-4.0-${workflow}`,
    family: 'Higgsfield Cinema Studio 4.0',
    name: `Cinema Studio 4.0 · ${workflow === 'text' ? 'Texto a vídeo' : 'Referencias a vídeo'}`,
    endpoint: '/higgsfield/cinema-studio/4.0',
    workflow,
    fields,
    requireOneOf: workflow === 'reference' ? ['image_urls', 'video_urls'] : undefined,
    maxCombined: workflow === 'reference' ? { fields: ['image_urls', 'video_urls'], max: 30 } : undefined,
  };
}

const klingCommon = (durMin, durMax) => [
  { name: 'duration', label: 'Duración (s)', type: 'number', min: durMin, max: durMax, step: 1, default: 5 },
  { name: 'sound', label: 'Audio nativo', type: 'onoff', default: true },
  { name: 'cfg_scale', label: 'Fidelidad al prompt (cfg_scale)', type: 'number', min: 0, max: 1, step: 0.05, default: 0.5 },
];

export const MODELS = [
  seedance('2.5', 'text'),
  seedance('2.5', 'image'),
  seedance('2.5', 'reference'),
  seedance('2.5', 'edit'),
  seedance('2.5', 'extend'),
  seedance('2.0', 'text'),
  seedance('2.0', 'image'),
  seedance('2.0', 'reference'),
  cinemaStudio('text'),
  cinemaStudio('reference'),
  {
    id: 'kling-3.0-std-text',
    family: 'Kling 3.0',
    name: 'Kling 3.0 Standard · Texto a vídeo',
    endpoint: '/kling-video/v3.0/std/text-to-video',
    workflow: 'text',
    fields: [
      prompt(true),
      ...klingCommon(3, 15),
      { name: 'aspect_ratio', label: 'Relación de aspecto', type: 'select', options: ['16:9', '9:16', '1:1'], default: '16:9' },
      { name: 'multi_shots', label: 'Multi-plano', type: 'boolean', default: false },
    ],
  },
  {
    id: 'kling-3.0-std-image',
    family: 'Kling 3.0',
    name: 'Kling 3.0 Standard · Imagen a vídeo',
    endpoint: '/kling-video/v3.0/std/image-to-video',
    workflow: 'image',
    fields: [
      prompt(false),
      { name: 'image_url', label: 'Imagen inicial', type: 'image', required: true },
      { name: 'last_image_url', label: 'Imagen final (opcional)', type: 'image' },
      ...klingCommon(3, 15),
      { name: 'multi_shots', label: 'Multi-plano', type: 'boolean', default: false },
    ],
  },
  {
    id: 'kling-3.0-turbo-image',
    family: 'Kling 3.0',
    name: 'Kling 3.0 Turbo · Imagen a vídeo',
    endpoint: '/kling-video/v3.0-turbo/image-to-video',
    workflow: 'image',
    note: 'Parámetros basados en Kling 3.0 Standard. Si la API rechaza alguno, usa "Ajustes avanzados (JSON)".',
    fields: [
      prompt(false),
      { name: 'image_url', label: 'Imagen inicial', type: 'image', required: true },
      ...klingCommon(3, 15),
    ],
  },
  {
    id: 'kling-2.6-pro-image',
    family: 'Kling 2.6',
    name: 'Kling 2.6 Pro · Imagen a vídeo',
    endpoint: '/kling-video/v2.6/pro/image-to-video',
    workflow: 'image',
    fields: [
      prompt(false),
      { name: 'image_url', label: 'Imagen inicial', type: 'image', required: true },
      { name: 'duration', label: 'Duración (s)', type: 'select', options: [5, 10], default: 5 },
      { name: 'sound', label: 'Audio nativo', type: 'onoff', default: true },
      { name: 'cfg_scale', label: 'Fidelidad al prompt (cfg_scale)', type: 'number', min: 0, max: 1, step: 0.05, default: 0.5 },
    ],
  },
  {
    id: 'higgsfield-dop',
    family: 'Higgsfield DoP',
    name: 'Higgsfield DoP · Imagen a vídeo',
    endpoint: '/v1/image2video/dop',
    workflow: 'image',
    fields: [
      prompt(true),
      { name: 'model', label: 'Variante', type: 'select', options: ['dop-lite', 'dop-turbo', 'dop-standard'], default: 'dop-turbo' },
      { name: 'input_image', label: 'Imagen', type: 'image', required: true },
    ],
    // DoP espera las imágenes como [{ type: 'image_url', image_url }].
    transform(input) {
      const { input_image: url, ...rest } = input;
      return { ...rest, input_images: [{ type: 'image_url', image_url: url }] };
    },
  },
];

export const CUSTOM_MODEL_ID = 'custom';

export function findModel(id) {
  return MODELS.find((m) => m.id === id);
}

/** Versión serializable del catálogo para el navegador (sin funciones). */
export function publicCatalog() {
  return MODELS.map(({ transform, ...rest }) => rest);
}

const MEDIA_LIST = new Set(['images', 'videos', 'audios']);
const MEDIA_ONE = new Set(['image', 'video']);

function isHttpUrl(v) {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Valida los valores del formulario contra el catálogo y devuelve el payload
 * para la API. Lanza Error con un mensaje en español si algo no cuadra.
 */
export function buildInput(model, values, advanced) {
  const input = {};
  const errors = [];
  values = values && typeof values === 'object' ? values : {};

  for (const f of model.fields) {
    let v = values[f.name];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

    if (empty) {
      if (f.required) errors.push(`Falta "${f.label}".`);
      else if (f.default !== undefined && !MEDIA_ONE.has(f.type) && !MEDIA_LIST.has(f.type)) {
        input[f.name] = f.type === 'onoff' ? (f.default ? 'on' : 'off') : f.default;
      }
      continue;
    }

    switch (f.type) {
      case 'text':
        if (typeof v !== 'string') { errors.push(`"${f.label}" debe ser texto.`); break; }
        if (v.length > 10000) { errors.push(`"${f.label}" es demasiado largo.`); break; }
        input[f.name] = v;
        break;
      case 'select': {
        const match = f.options.find((o) => String(o) === String(v));
        if (match === undefined) errors.push(`Valor no válido para "${f.label}".`);
        else input[f.name] = match;
        break;
      }
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n) || n < f.min || n > f.max) errors.push(`"${f.label}" debe estar entre ${f.min} y ${f.max}.`);
        else input[f.name] = n;
        break;
      }
      case 'boolean':
        input[f.name] = v === true || v === 'true';
        break;
      case 'onoff':
        input[f.name] = v === true || v === 'true' || v === 'on' ? 'on' : 'off';
        break;
      default:
        if (MEDIA_ONE.has(f.type)) {
          if (!isHttpUrl(v)) errors.push(`"${f.label}" debe ser una URL válida.`);
          else input[f.name] = v;
        } else if (MEDIA_LIST.has(f.type)) {
          if (!Array.isArray(v) || !v.every(isHttpUrl)) errors.push(`"${f.label}" debe ser una lista de URLs.`);
          else if (f.max && v.length > f.max) errors.push(`"${f.label}": máximo ${f.max}.`);
          else input[f.name] = v;
        }
    }
  }

  if (model.requireOneOf && !model.requireOneOf.some((k) => input[k]?.length)) {
    errors.push('Añade al menos una referencia (imagen, vídeo o audio).');
  }
  if (model.maxCombined) {
    const total = model.maxCombined.fields.reduce((s, k) => s + (input[k]?.length || 0), 0);
    if (total > model.maxCombined.max) errors.push(`Máximo ${model.maxCombined.max} referencias en total.`);
  }
  if (errors.length) throw new Error(errors.join(' '));

  let payload = model.transform ? model.transform(input) : input;
  if (advanced && typeof advanced === 'object' && !Array.isArray(advanced)) {
    payload = { ...payload, ...advanced };
  }
  return payload;
}

/** Endpoints personalizados: solo rutas relativas simples, nada de hosts ni "..". */
export function sanitizeEndpoint(endpoint) {
  if (typeof endpoint !== 'string') throw new Error('Endpoint no válido.');
  let e = endpoint.trim();
  if (e.startsWith('https://api.higgsfield.ai')) e = e.slice('https://api.higgsfield.ai'.length);
  if (!e.startsWith('/')) e = '/' + e;
  if (!/^\/[A-Za-z0-9._\-/]+$/.test(e) || e.includes('..') || e.includes('//')) {
    throw new Error('Endpoint no válido. Ejemplo: /kling-video/v2.6/pro/image-to-video');
  }
  if (/^\/(requests|files|estimate|agents?)\b/.test(e)) {
    throw new Error('Ese endpoint no es un modelo de generación.');
  }
  return e;
}
