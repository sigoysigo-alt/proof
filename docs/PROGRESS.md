# PROOF — Progreso del Proyecto

## Estado actual: ITERACIÓN 1 completada — proyecto Expo y navegación básica

Fecha: 2026-09-07

### Hecho

- Repositorio inicializado.
- Creado `CLAUDE.md` con las reglas de trabajo del proyecto.
- Creado `docs/PRODUCT_SPEC.md` con la especificación maestra completa de
  producto (55 secciones).
- Creado `.gitignore` para proyecto React Native + Expo + TypeScript.
- Creado este documento (`docs/PROGRESS.md`).
- **ITERACIÓN 1 del MVP:**
  - Proyecto Expo (SDK 57) creado con React Native + TypeScript.
  - Expo Router configurado (file-based routing en `src/app`).
  - Navegación básica entre 3 pantallas: Home → Analizando → Resultado.
  - Home (`src/app/index.tsx`): título "PROOF", subtítulo "¿Te puedes
    fiar?", campo para pegar texto o URL, botón para subir captura/imagen
    (`expo-image-picker`), CTA "VERIFICAR".
  - Pantalla de análisis provisional (`src/app/analyze.tsx`): indicador de
    carga y aviso explícito de que no se realiza ninguna verificación real
    todavía.
  - Pantalla de resultado provisional (`src/app/result.tsx`): clasificación
    (`likely_legitimate` / `caution` / `high_risk` / `unverifiable`), score,
    razones, fuentes "consultadas" y "no aplicables", y qué no se ha podido
    comprobar — todo con datos DEMO fijos (`src/data/demoResults.ts`).
  - Distintivo `DemoBadge` visible en las pantallas de análisis y
    resultado, dejando claro que **no hay verificación real** en esta
    iteración.
  - Sistema de diseño mínimo (`src/constants/theme.ts`,
    `src/constants/classification.ts`): mobile-first, limpio, sin
    dashboard ni sidebar.
  - `eslint.config.js` (basado en `eslint-config-expo`) y script
    `typecheck` (`tsc --noEmit`) añadidos.
  - Verificado: `npm run lint`, `npm run typecheck` y `npx expo export
    --platform web` pasan sin errores.

### No implementado todavía (fuera de alcance de esta iteración)

- Backend, API, rate limiting.
- Verification Engine, providers (RDAP, reputación de URL, identidad
  oficial, registros oficiales, teléfono, email).
- Integración con OpenAI / Structured Output / protecciones de prompt
  injection reales.
- Supabase / base de datos / persistencia.
- Android Share (`ACTION_SEND`) e iOS Share Extension.
- Historial, notificaciones, deep links, cámara/escaneo.
- Cualquier verificación real: todos los resultados actuales son
  ficticios y están marcados como DEMO.

### Próximos pasos

- ITERACIÓN 2: backend, URL normalizer, domain parser, Risk Engine
  determinista y tests (ver `docs/PRODUCT_SPEC.md`, sección 54).

## Historial

- 2026-09-07: Preparación profesional del repositorio.
- 2026-09-07: Especificación maestra de producto completada en
  `docs/PRODUCT_SPEC.md`.
- 2026-09-07: ITERACIÓN 1 del MVP — proyecto Expo, navegación y pantallas
  provisionales con datos DEMO.

## Herramienta aparte: Higgsfield Video Studio (`higgsfield-web/`)

Fecha: 2026-10-04

- Web local independiente de la app PROOF (no forma parte del MVP) para
  generar vídeos con la API de Higgsfield.
- Servidor Node sin dependencias; credenciales solo server-side (`.env`).
- Modelos: Seedance 2.5/2.0, Cinema Studio 4.0, Kling 3.0 (Std/Turbo),
  Kling 2.6 Pro, DoP y endpoint personalizado.
- Tests (`npm test` en `higgsfield-web/`) contra API simulada: 10/10 OK.
- Pendiente: probar contra la API real con una key (el entorno de desarrollo
  no tiene acceso de red a api.higgsfield.ai).
- `eslint.config.js` ignora `higgsfield-web/**` para no mezclarla con el lint
  de la app Expo.
