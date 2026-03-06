# Runbook de Lanzamiento (Dev)

Este runbook está pensado para la ventana de lanzamiento del 8 de marzo de 2026, usando entorno `dev`.

## 1) Preparación (T-30 min)

- Verificar que `dev` está desplegado con el último commit.
- Verificar variables en Vercel (`Development/Preview`):
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Verificar migración de Supabase aplicada:
  - `20260306120000_event_featured_flag.sql`
- Ejecutar prueba corta de carga:
  - `npm run loadtest:dev -- https://<tu-dev-url>`

## 2) Señales a monitorear

- `5xx` en endpoints críticos:
  - `/api/events`
  - `/api/events/[id]`
  - `/api/onboarding/by-email`
  - `/api/players/search`
- Timeouts o degradación:
  - Respuestas con `degraded: true` en `/api/events`
  - Respuestas con `timeout: true` en endpoints de Mapbox
- Tasa de `429`:
  - Esperada en picos/bots
  - No esperada si impacta usuarias legítimas de forma masiva

## 3) Umbrales de acción

- Estado verde:
  - 5xx < 2% en endpoints críticos
  - Sin caída sostenida por más de 5 min
- Estado amarillo:
  - 5xx entre 2% y 5% por más de 5 min
  - Subida de latencia sostenida
- Estado rojo:
  - 5xx > 5% por más de 10 min
  - errores 504/timeout repetidos en home o eventos

## 4) Respuesta por incidente

### A) Pico de 429 (posible abuso o límites muy agresivos)

1. Confirmar endpoint afectado.
2. Si son bots o scraping:
   - mantener límites actuales.
3. Si afecta flujo legítimo:
   - ajustar límites en código (solo endpoint afectado),
   - desplegar fix rápido.

### B) Timeout en `/api/events` o home

1. Confirmar si `/api/events` responde con `degraded: true`.
2. Revisar latencia de Supabase y consultas de evento/catálogos.
3. Si persiste:
   - rollback al deploy previo estable.

### C) Fallo de dependencia externa (Mapbox / Google Wallet)

1. Confirmar errores 502 o timeout en los endpoints respectivos.
2. Mantener fallback activo (ya implementado).
3. Comunicar internamente “funcionalidad degradada” sin bloquear flujo principal.

## 5) Rollback

1. Abrir proyecto en Vercel.
2. Ir a Deployments.
3. Promover el último deployment estable.
4. Validar smoke rápido:
   - home
   - `/api/events`
   - login/signup

## 6) Checklist de cierre

- No hay 5xx sostenidos.
- Flujos críticos operativos:
  - ver eventos
  - signup/login
  - creación/gestión básica de eventos
- Registrar incidentes y causa raíz para postmortem.

