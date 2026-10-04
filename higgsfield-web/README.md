# Higgsfield Video Studio

Web local para generar vídeos con la [API de Higgsfield](https://docs.higgsfield.ai)
desde el navegador. Sin dependencias: solo Node.js ≥ 18.

## Arrancar

```bash
cd higgsfield-web
npm start            # → http://127.0.0.1:3000
```

La primera vez la web te pedirá la API key en formato `KEY_ID:KEY_SECRET`
(la creas en tu cuenta de Higgsfield → API). También puedes:

```bash
cp .env.example .env   # y rellena HF_CREDENTIALS=KEY_ID:KEY_SECRET
# o
HF_CREDENTIALS=KEY_ID:KEY_SECRET npm start
```

Variables opcionales: `PORT` (3000), `HOST` (127.0.0.1), `MAX_UPLOAD_MB` (200),
`HF_API_BASE` (https://api.higgsfield.ai).

## Modelos incluidos

| Modelo | Modos | Endpoint |
|---|---|---|
| Seedance 2.5 | texto, imagen, referencias, editar, extender | `/bytedance/seedance-2.5/*` |
| Seedance 2.0 | texto, imagen, referencias | `/bytedance/seedance-2.0/*` |
| Cinema Studio 4.0 | texto, referencias | `/higgsfield/cinema-studio/4.0` |
| Kling 3.0 Standard | texto, imagen (inicio/fin) | `/kling-video/v3.0/std/*` |
| Kling 3.0 Turbo | imagen | `/kling-video/v3.0-turbo/image-to-video` |
| Kling 2.6 Pro | imagen | `/kling-video/v2.6/pro/image-to-video` |
| Higgsfield DoP | imagen (lite / turbo / standard) | `/v1/image2video/dop` |
| **Endpoint personalizado** | cualquier otro modelo del catálogo (Veo, Wan, MiniMax, Hailuo, Sora…) con JSON libre | — |

Cada formulario valida duración, resolución, aspecto, audio, etc. antes de enviar.
"Ajustes avanzados (JSON)" permite añadir campos extra (p. ej. `seed`) y
"Ver JSON" muestra exactamente lo que se enviará.

## Cómo funciona

- El navegador solo habla con el servidor local (`/api/*`). Las credenciales se
  quedan en el servidor (`.env`, ignorado por git) y se envían a Higgsfield con
  `Authorization: Key KEY_ID:KEY_SECRET`.
- Imágenes/vídeos/audios que subes se envían a Higgsfield con
  `POST /files/generate-upload-url` + `PUT` a la URL firmada.
- Cada generación es asíncrona: `POST /<endpoint>` → `GET /requests/{id}/status`
  cada 4 s hasta `completed` / `failed` / `nsfw`. Se puede cancelar mientras está
  en cola (`POST /requests/{id}/cancel`).
- "Estimar coste" usa `POST /estimate/<endpoint>` si la API lo ofrece.
- El historial de generaciones se guarda en el `localStorage` del navegador.
- Protección básica: el servidor escucha solo en `127.0.0.1` y rechaza peticiones
  de otros orígenes (para que otra web no pueda gastar tus créditos).

## Tests

```bash
npm test   # usa una API de Higgsfield simulada, no gasta créditos
```

> Los endpoints y parámetros se han tomado de los SDKs oficiales
> (`@higgsfield/client`, `higgsfield-client`) y de la documentación pública.
> No se ha podido probar contra la API real desde el entorno de desarrollo; si
> algún modelo devuelve error 422, revisa sus parámetros en docs.higgsfield.ai y
> ajústalos con "Ajustes avanzados" o en `src/models.mjs`.
