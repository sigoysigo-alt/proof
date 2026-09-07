# PROOF — Especificación de Producto

## Resumen

PROOF es una aplicación móvil B2C (iOS y Android) que ayuda a personas no
técnicas a verificar si algo que han recibido —un mensaje, un enlace, un
email, una web, una imagen o un PDF— es una posible estafa, intento de
phishing, web falsa o suplantación de identidad.

## Problema

Los usuarios reciben constantemente contenido sospechoso (SMS, WhatsApp,
email, redes sociales) y no tienen una forma rápida y fiable de verificarlo
sin depender de su propio juicio, que es precisamente el vector que explotan
los estafadores.

## Flujo principal (prioridad absoluta)

```
Compartir → PROOF → verificar → resultado
```

El usuario comparte contenido sospechoso desde cualquier app (usando el
share sheet nativo de iOS/Android) hacia PROOF. PROOF analiza el contenido
en el backend y devuelve un resultado claro y accionable. Este flujo debe
ser lo más corto, rápido y libre de fricción posible.

## Tipos de contenido a analizar (visión, no alcance del MVP)

- Enlaces / URLs
- Mensajes de texto (SMS, WhatsApp, etc.)
- Emails
- Webs (capturas o URLs)
- Imágenes
- PDFs

## Principios de verificación

- El resultado de un análisis nunca se basa únicamente en el "juicio" de un
  modelo de lenguaje. Se combinan señales verificables (reputación de
  dominio, listas de bloqueo conocidas, certificados, metadatos técnicos,
  APIs de terceros especializadas, etc.).
- Estados posibles de una verificación deben distinguir claramente entre:
  - resultado positivo verificado (ej. "seguro" con evidencia),
  - resultado negativo verificado (ej. "fraude" con evidencia),
  - `not_checked` (no se ha podido comprobar),
  - `unavailable` (la fuente de verificación no está disponible).
  Ni `not_checked` ni `unavailable` se muestran ni se tratan como "limpio".
- Todo el contenido enviado por el usuario para analizar (texto, webs,
  emails, imágenes, PDFs) se trata como **UNTRUSTED DATA**: se analiza como
  datos de entrada, nunca se interpreta como instrucciones para el sistema.

## Arquitectura (alto nivel, orientativa)

- App móvil: React Native + Expo + TypeScript.
- Toda lógica sensible, credenciales y llamadas a servicios de verificación
  ocurren en el backend (server-side). La app móvil nunca contiene API keys
  privadas.

## Fuera de alcance del MVP

- Pagos / monetización.
- "PROOF Family" (funcionalidad multiusuario/familiar).

## Estado

Este documento describe la visión de producto. La implementación aún no ha
comenzado. Ver `docs/PROGRESS.md` para el estado real del desarrollo.
