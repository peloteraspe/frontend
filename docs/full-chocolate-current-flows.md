# KAN-11 - Flujos actuales de eventos, inscripciones y pagos

Documento interno de discovery para el MVP tecnico Peloteras x Full Chocolate. No propone cambios funcionales; resume el comportamiento actual observado en el repo.

## Resumen ejecutivo

El flujo core actual ya cubre publicacion de eventos, inscripcion de jugadoras, pagos manuales, revision admin, tickets QR y asistencia. La entidad operativa que une inscripcion y pago es `assistants`: se crea como `pending` al confirmar pago manual, pasa a `approved` o `rejected` desde admin, y alimenta conteos, tickets y vistas de "Mis entradas".

Para Full Chocolate conviene extender este modelo alrededor de organizadoras/programas/finanzas/reportes, no crear un flujo paralelo de inscripciones o pagos.

## Mapa de rutas publicas

| Ruta | Proposito | Modulos principales |
| --- | --- | --- |
| `/events` | Explorador publico de eventos publicados. | `app/events/page.tsx`, `getEventsExplorer`, `EventExplorerClient` |
| `/events/[id]` | Detalle de evento. Permite ver eventos no publicados solo si el usuario es admin. | `EventDetailsPage`, `getEventDetails` |
| `/payments/[id]` | Pantalla de pago/inscripcion para un evento. Bloquea no publicados, sold out, ya aprobadas o pendientes. | `PaymentPage`, `getPaymentPageData` |
| `/tickets` | Entradas del usuario autenticado. | `TicketsPage`, `getUserTickets` |
| `/tickets/[userId]` | Entradas del usuario; redirige si se intenta ver otro usuario. | `enforceOnboardingGuard`, `TicketsPage` |
| `/check-in/[slug]` | Formulario publico de check-in por link/QR. No es el mismo flujo que ticket de evento. | `getPublicCheckinBySlug`, `CheckinPublicPage` |
| `/create-event` | Gateway para crear evento: valida onboarding/activacion y redirige a `/admin/events/new`. | `resolveCreateEventEntryState`, `CreateEventActivationGateway` |

## Mapa de rutas admin

| Ruta | Proposito | Guard observado |
| --- | --- | --- |
| `/admin/events` | Lista eventos propios o todos si superadmin; publica/oculta y destaca. | `getServerSupabase().auth.getUser`, `isSuperAdmin`, server actions |
| `/admin/events/new` | Crear evento desde formulario admin o plantilla. | Usuario autenticado; action valida admin |
| `/admin/events/[id]/edit` | Editar/eliminar evento y preparar comunicacion. | Usuario autenticado; actions validan ownership/admin |
| `/admin/events/[id]/participants` | Lista participantes pendientes/aprobadas y comunicaciones. | `assertCanManageEvent` |
| `/admin/payments` | Revision de pagos manuales por evento y estado. | Admin; superadmin puede ver todos los eventos |
| `/admin/scan` | Escaner de QR. | UI admin; APIs validan admin |
| `/admin/events/[id]/verified-player/[userId]` | Ficha de verificacion y marcado de asistencia. | Login + `isAdmin` |
| `/admin/check-ins` | Gestion de check-ins por slug. | API requiere superadmin |
| `/admin/check-ins/[id]` | Detalle de registros de check-in. | Servicio usa service role; pagina admin |
| `/admin/payment-methods` | Metodos de pago manuales de organizadora. | Relacionado con publicacion/pago |
| `/admin/coupons` | Cupones y reembolsos. | Relacionado con pagos |

## APIs y handlers relevantes

| Ruta/API | Metodo | Escritura/lectura | Archivo |
| --- | --- | --- | --- |
| `/api/events` | `GET` | Lee eventos publicados, catalagos y filtros. | `src/modules/events/api/handlers/events.ts` |
| `/api/events` | `POST` | Crea evento por API alterna con rate limit y validaciones propias. | `src/modules/events/api/handlers/events.ts` |
| `/api/events/[id]` | `GET` | Lee detalle publico publicado. | `src/modules/events/api/handlers/event.byId.ts` |
| `/api/payments/confirm` | `POST` | Crea/actualiza `assistants` como `pending`; registra cupon si aplica; envia emails. | `src/modules/payments/api/handlers/payments.confirm.ts` |
| `/api/tickets/issue` | `POST` | Emite/sincroniza ticket para una inscripcion del usuario. | `src/modules/tickets/api/handlers/tickets.issue.ts` |
| `/api/tickets/resolve` | `POST` | Resuelve QR a ruta de verificacion admin. | `app/api/tickets/resolve/route.ts` |
| `/api/tickets/attendance` | `POST` | Marca asistencia cambiando `ticket.status` a `used`. | `app/api/tickets/attendance/route.ts` |
| `/api/tickets/validate` | `POST` | Validador QR legacy deshabilitado (`QR_VALIDATION_MODULE_ENABLED = false`). | `src/modules/tickets/api/handlers/tickets.validate.ts` |
| `/api/admin/check-ins` | `GET/POST` | Lista/crea check-ins; requiere superadmin. | `app/api/admin/check-ins/route.ts` |
| `/api/check-ins/register` | `POST` | Registra persona en check-in publico con rate limit. | `app/api/check-ins/register/route.ts` |
| `/api/check-ins/qr` | `GET` | Genera imagen QR del check-in. | `app/api/check-ins/qr/route.ts` |
| `/api/coupons/validate` y `/api/coupons/reimburse` | varios | Validacion y flujo de reembolso de cupones. | `app/api/coupons/*` |

## Flujo actual de eventos

```text
Organizadora entra a /create-event
  -> resolveCreateEventEntryState valida sesion/onboarding/activacion
  -> si falta activacion: muestra gateway
  -> si esta lista: redirige a /admin/events/new

/admin/events/new
  -> lee catalogos, features y paymentMethod de la organizadora
  -> submit llama createEvent(parseEventFormData)
  -> createEvent valida admin, ownership de metodos de pago y datos del formulario
  -> inserta event
  -> sincroniza eventFeatures y eventPaymentMethod
  -> intenta crear clase Google Wallet del evento
  -> revalida /admin/events, /events, /events/[id], /payments/[id], /
```

Edicion/publicacion:

```text
/admin/events/[id]/edit
  -> carga event, eventFeatures, eventPaymentMethod, paymentMethod y participantes
  -> updateEvent valida admin + ownership por created_by_id salvo superadmin
  -> actualiza event, eventFeatures y eventPaymentMethod
  -> setEventPublished(true) exige readiness:
       detalles: titulo + inicio/fin validos
       ubicacion: location_text + lat/lng
       pagos: al menos un paymentMethod activo vinculado
       cancha: description.field_reserved_confirmed true
```

Estados de evento observados:

- `event.is_published = false`: borrador/no disponible para publico y pagos.
- `event.is_published = true` o ausencia de `false`: publicado.
- `event.is_featured = true/false`: destacado, solo superadmin puede gestionarlo.
- No se encontro un enum/tabla de estados de evento adicional en el repo; pendiente de verificar en Supabase si existen constraints o valores historicos.

## Flujo actual de inscripcion de jugadoras

```text
Jugadora abre /events/[id]
  -> detalle consulta event, features, assistants approved y estado propio pending/approved
  -> CTA lleva a /payments/[id]

/payments/[id]
  -> getPaymentPageData valida:
       event existe
       is_published no es false
       usuaria no tiene assistant pending/approved
       evento tiene paymentMethod activo vinculado
       cupos disponibles segun assistants approved
  -> UI solicita numero de operacion manual o cupón aplicable

POST /api/payments/confirm
  -> requiere sesion
  -> valida evento publicado y no finalizado
  -> bloquea si ya existe assistant approved o pending
  -> valida cupón si aplica
  -> valida sold out contra assistants approved y trigger de DB
  -> inserta o actualiza assistants:
       event = eventId
       user = user.id
       operationNumber = 8 digitos, salvo cupón cubre 100%
       state = pending
  -> registra coupon_redemption si aplica
  -> envia email a jugadora y aviso al admin del evento
```

Estados de `assistants.state` usados por la app:

- `pending`: inscripcion/pago en revision.
- `approved`: pago aprobado; cuenta como participante y habilita ticket activo.
- `rejected`: pago rechazado; ticket se revoca.

Nota: `assistants.state` es `text` en la migracion base y no se observo check constraint en repo. Pendiente de verificar en Supabase si hay constraints adicionales o valores historicos.

## Flujo actual de pagos manuales

```text
/admin/payments?event=[id]&state=pending
  -> lista assistants filtrados por event/state
  -> organizadora ve sus eventos; superadmin ve todos
  -> muestra operationNumber o cupón

Admin aprueba
  -> approveAssistant(assistantId)
  -> assertCanManageAssistant: admin + owner del event o superadmin
  -> revisa capacidad antes de cambiar estado
  -> si hay cupón, exige reembolso sent/confirmed antes de aprobar
  -> update assistants.state = approved
  -> ensureTicketForAssistant sincroniza ticket active
  -> envia email de pago aprobado

Admin rechaza
  -> rejectAssistant(assistantId)
  -> update assistants.state = rejected
  -> si hay cupón, puede cancelar redemption y liberar uso
  -> ensureTicketForAssistant sincroniza ticket revoked
  -> envia email de pago rechazado
```

Los pagos manuales no tienen una tabla `payments` separada en este flujo. La evidencia de pago vive en `assistants.operationNumber` y el estado vive en `assistants.state`. Los metodos de pago disponibles se leen desde `paymentMethod` y se vinculan al evento por `eventPaymentMethod`.

Estados relacionados:

- Pago/inscripcion: `pending`, `approved`, `rejected` en `assistants.state`.
- Ticket: `pending`, `active`, `used`, `revoked` en `ticket.status` con constraint en migracion.
- Cupon/reembolso: `not_requested`, `requested`, `sent`, `confirmed`, `canceled` en `coupon_redemption.reimbursement_status`.
- Emails de pago: `pending`, `approved`, `rejected`, `coupon_pending` a nivel de servicio de email, no como tabla core observada.

## Tickets QR y asistencia

```text
assistant pending/approved/rejected
  -> ensureTicketForAssistant
  -> ticket.status:
       pending si assistant.state no es approved/rejected
       active si assistant.state = approved
       revoked si assistant.state = rejected
       used se conserva si ya fue marcado

/tickets
  -> lista assistants del usuario
  -> junta event, ticket, eventType, level, features
  -> muestra QR solo si ticket active o used

/api/tickets/resolve
  -> admin escanea QR
  -> busca ticket por qr_token con service role
  -> valida ownership del evento
  -> devuelve /admin/events/[eventId]/verified-player/[userId]

/api/tickets/attendance
  -> admin + ownership del evento
  -> markAttendance exige assistant approved y ticket active
  -> update ticket set status = used, used_at = now
```

## Check-ins publicos

El modulo `checkins` es paralelo al flujo de tickets/assistants. Sirve para generar links/QR publicos por slug y capturar datos simples de personas.

```text
Superadmin crea check-in en /admin/check-ins
  -> POST /api/admin/check-ins
  -> insert event_checkin(event_id, name, slug, created_by)

Persona abre /check-in/[slug]
  -> getPublicCheckinBySlug busca event_checkin activo
  -> POST /api/check-ins/register
  -> valida nombre, apellido, email y celular
  -> insert event_checkin_registration
```

## Tablas por flujo

| Flujo | Tablas principales | Uso |
| --- | --- | --- |
| Eventos | `event` | Datos base, publicacion, destacado, owner (`created_by_id`) |
| Eventos | `eventType`, `level` | Catalogos |
| Eventos | `features`, `eventFeatures` | Extras/caracteristicas del evento |
| Eventos/pagos | `paymentMethod`, `eventPaymentMethod` | Metodos manuales activos y vinculacion por evento |
| Inscripciones/pagos | `assistants` | Registro de jugadora, numero de operacion y estado de pago |
| Tickets | `ticket` | QR, wallet URLs, status y asistencia |
| Usuarios | `profile`, `profile_position`, `player_position`, `level`, `auth.users` | Nombre, correo, nivel y posiciones |
| Cupones | `coupon`, `coupon_redemption` | Descuento, uso y reembolso a organizadora |
| Check-ins | `event_checkin`, `event_checkin_registration` | Link/QR publico y registros de check-in |
| Comunicaciones | `event_announcement`, `event_announcement_recipient` | Historial/envios relacionados a participantes |
| Recordatorios | `event_ticket_reminder_delivery` | Control de recordatorios de tickets |
| Analytics | `product_analytics_events` | Eventos de producto |

## Lecturas, escrituras y validaciones relevantes

Lecturas principales:

- `getEventsExplorer`: `event` publicado, catalogos, conteo de `assistants approved`, estado propio `pending/approved`.
- `getEventDetails`: `event`, `eventFeatures`, `features`, `assistants approved`, `profile`; fallback a backend legacy si no existe en Supabase.
- `getPaymentPageData`: `event`, `assistants`, `eventPaymentMethod`, `paymentMethod`.
- `getAssistantsWithDetails`: `assistants`, `event`, `profile`, `coupon_redemption`, `coupon`.
- `getUserTickets`: `assistants`, `ticket`, `event`, `eventType`, `level`, `eventFeatures`, `features`, `profile`.
- `getVerifiedPlayerData`: `assistants`, `ticket`, `event`, `profile`, `level`, posiciones y `auth.users`.

Escrituras principales:

- `createEvent`: inserta `event`, `eventFeatures`, `eventPaymentMethod`.
- `updateEvent`: actualiza `event`, resetea/sincroniza `eventFeatures` y `eventPaymentMethod`.
- `deleteEvent`: borra relaciones y `event`.
- `setEventPublished`: actualiza `event.is_published`.
- `setEventFeatured`: actualiza `event.is_featured`.
- `POST /api/payments/confirm`: inserta/actualiza `assistants`, registra `coupon_redemption`.
- `approveAssistant` / `rejectAssistant`: actualiza `assistants.state`, sincroniza `ticket`, actualiza `coupon_redemption` si aplica.
- `ensureTicketForAssistant`: inserta/actualiza `ticket`.
- `markAttendance`: actualiza `ticket.status = used` y `used_at`.
- `createCheckin`: inserta `event_checkin`.
- `createCheckinRegistration`: inserta `event_checkin_registration`.

Validaciones existentes:

- Fechas: inicio/fin validos y fin posterior al inicio.
- Publicacion: titulo, ubicacion con coordenadas, metodo de pago activo y cancha reservada.
- Pago: evento publicado, no finalizado, no inscripcion pendiente/aprobada previa, numero de operacion de 8 digitos salvo cupón total.
- Capacidad: conteo de `assistants approved` en app y trigger `assistants_enforce_event_capacity` en DB para `pending/approved`.
- Ownership: admin no superadmin solo gestiona eventos donde `event.created_by_id = user.id`.
- Metodos de pago: solo se aceptan metodos creados por la cuenta de la organizadora y activos para publicar/pagar.
- Cupon: activo, no expirado, max uses, evento compatible, email asignado si individual, no reutilizado salvo redemption cancelada.
- Check-in publico: slug valido, check-in activo, email valido, celular requerido, email unico por check-in.

## Uso de service role y guards

Uso de `getAdminSupabase` observado:

- Crear/editar eventos desde server actions (`src/modules/admin/api/events/_actions.ts`) para escribir `event`, relaciones y wallet.
- `POST /api/payments/confirm` para validar evento/cupones, escribir `assistants` y `coupon_redemption`, y consultar emails de auth.
- Pagos admin para `coupon_redemption`/`coupon` y emails de auth.
- Tickets/verificacion QR para buscar `ticket`, `assistants`, `profile`, `auth.users` y marcar asistencia.
- Check-ins para listar/crear `event_checkin` y registros publicos.

Guards principales:

- `isAdmin`: requerido para gestionar eventos/pagos/tickets/asistencia.
- `isSuperAdmin`: requerido para destacados, ver todos los eventos, reembolsos globales y gestionar check-ins.
- `assertCanManageEvent`: permite superadmin o owner por `created_by_id`.
- `assertCanManageAssistant`: permite superadmin o owner del evento asociado al assistant.
- `enforceOnboardingGuard`: protege `/tickets` y fuerza autenticacion/onboarding.
- Rate limits en `/api/events`, `/api/check-ins/register` y otros endpoints.

## Riesgos tecnicos detectados

- `assistants` mezcla inscripcion y pago manual. Crear una tabla nueva de pagos sin migracion cuidadosa puede duplicar estados y romper conteos/tickets.
- `POST /api/events` y server actions admin crean eventos con validaciones distintas. Full Chocolate debe elegir un unico entrypoint o encapsular reglas compartidas.
- `assistants.state` no muestra constraint en migracion base; si existen estados historicos en Supabase, pueden no estar representados por tipos TS.
- `getEventDetails` tiene fallback a backend legacy. Puede ocultar diferencias entre Supabase y datos antiguos.
- `ticket` puede faltar en entornos sin migracion; varios servicios lo manejan como tabla opcional.
- Check-ins publicos no validan contra `assistants` ni tickets; no deben confundirse con asistencia pagada.
- `event.is_published !== false` trata `null` como publicado en varias lecturas. Confirmar datos existentes antes de asumir boolean estricto.
- `service role` se usa en rutas publicas de pago/check-in para escribir datos; mantener guards y rate limits al extender.
- Reembolsos de cupones condicionan aprobacion de pagos; finanzas Full Chocolate debe respetar `coupon_redemption` para no aprobar casos incompletos.

## Recomendaciones para Full Chocolate

- Organizadoras: extender alrededor de `event.created_by_id`, `paymentMethod.created_by` y guards existentes. Evitar un owner paralelo sin sincronizacion con `auth.users`.
- Programa/temporadas: modelar como agrupador de eventos y referenciar `event.id`; no duplicar `event`, `eventType`, `level` ni `features`.
- Finanzas: partir de `assistants` + `paymentMethod` + `eventPaymentMethod` + `coupon_redemption`. Si se agrega ledger, que derive o referencie `assistant_id` y preserve `assistants.state` como fuente operativa del pago.
- Reportes: construir queries sobre `event`, `assistants`, `ticket`, `coupon_redemption` y `event_checkin_registration`; mantener check-ins separados de participantes aprobadas.
- Tickets/asistencia: reutilizar `ensureTicketForAssistant`, `getVerifiedPlayerData` y `markAttendance`; no emitir QRs desde otro modulo.
- Publicacion de eventos: reutilizar `getEventPublishReadiness` y `validateEventFormInput` para nuevas pantallas Full Chocolate.
- Pagos manuales: si Full Chocolate agrega estados financieros, mapearlos explicitamente a `assistants.state` y documentar transiciones para evitar doble aprobacion.

## Pendientes de verificar en Supabase

- Si `assistants.state` tiene valores historicos distintos de `pending`, `approved`, `rejected`.
- Si `event.is_published` contiene `null` y como debe interpretarse en produccion.
- Si existen RLS policies que agreguen restricciones no visibles desde el codigo.
- Si el fallback legacy de detalle de evento sigue activo en produccion.
- Si todas las tablas opcionales (`ticket`, `event_checkin`, `coupon_redemption`, `event_ticket_reminder_delivery`) existen en todos los entornos.
