# KAN-12 - Auditoria de guards admin, service role y rutas API sensibles

Documento interno de auditoria para el MVP tecnico Peloteras x Full Chocolate. No cambia comportamiento; consolida riesgos de permisos, datos sensibles y uso de `service role` antes de agregar organizadoras, finanzas, reportes y reparto.

## Resumen ejecutivo

El flujo actual protege la mayoria de acciones admin con una combinacion de:

- `app/admin/layout.tsx` exige `isAdmin` para renderizar cualquier pantalla bajo `/admin`.
- `isSuperAdmin` limita modulos globales como cupones, usuarios, comunicaciones globales y check-ins.
- `assertCanManageEvent` valida superadmin u ownership por `event.created_by_id`.
- `assertCanManageAssistant` valida admin y ownership del evento asociado al `assistant`.
- Varias rutas publicas con escritura usan rate limit y validaciones de payload.

El riesgo principal es que las operaciones mas sensibles usan `getAdminSupabase()` o APIs `auth.admin`, por lo que bypass-ean RLS y dependen completamente de guards de aplicacion. Esto es aceptable para algunos procesos server-side, pero Full Chocolate no deberia agregar organizadoras, finanzas, reportes o reparto sin cerrar los endpoints publicos/alternos que exponen datos o crean entidades operativas sin los mismos guards del admin.

## Alcance revisado

Se revisaron:

- Discovery previo: `docs/full-chocolate-current-flows.md`.
- Rutas bajo `app/admin`.
- Route handlers bajo `app/api` relacionados con eventos, pagos, tickets, check-ins, cupones, leads, usuarios, equipos y perfil.
- Server actions admin de eventos, pagos, usuarios y comunicaciones.
- Usos de `getAdminSupabase`, `src/core/api/supabase.admin.ts`, `SUPABASE_SERVICE_ROLE_KEY`, `auth.admin` y policies `service_role`.
- Migraciones locales para RLS/policies inferibles.

No se reviso Supabase real ni se imprimieron valores de entorno.

## Modelo de permisos observado

| Guard/helper | Archivo | Funcion | Observacion |
| --- | --- | --- | --- |
| `isAdmin` | `src/shared/lib/auth/isAdmin.ts` | Admin por superadmin, metadata `role`/`is_admin` o email en `ADMIN_EMAILS`. | Depende de metadata/Auth y variable de entorno; no es una policy DB. |
| `isSuperAdmin` | `src/shared/lib/auth/isAdmin.ts` | Superadmin por allowlist hardcodeada de emails. | Simple y explicito, pero no auditable desde DB/RLS. |
| `assertCanManageEvent` | `src/modules/admin/api/events/services/eventPermissions.service.ts` | Exige sesion; superadmin pasa; admin normal debe ser owner por `event.created_by_id`. | Guard central para participantes, comunicaciones, QR y asistencia. |
| `assertCanManageAssistant` | `src/modules/admin/api/payments/_actions.ts` | Exige admin; superadmin pasa; admin normal debe ser owner del evento del assistant. | Guard central para aprobar/rechazar pagos. |
| `requireSuperAdmin` | `app/api/coupons/*`, `app/api/admin/check-ins/route.ts` | Exige sesion y `isSuperAdmin`. | Correcto para cupones/check-ins globales. |
| `requireAdminUser` | Payment methods y wallet handlers | Exige sesion y `isAdmin`. | Payment methods filtra ownership; wallet queda abierto a cualquier admin. |
| Rate limits | `app/api/events`, `app/api/check-ins/register`, `app/api/leads/partners`, `app/api/organizer/activate`, `app/api/analytics/events`, `app/api/onboarding/by-email`, `app/api/players/search` | Limites por IP/request o usuario. | Mitigan abuso, no reemplazan permisos. |

## Usos relevantes de service role/admin client

| Archivo | Entrada relacionada | Tablas/Auth sensibles | Guard observado | Riesgo |
| --- | --- | --- | --- | --- |
| `src/core/api/supabase.admin.ts` | Helper base | Usa `SUPABASE_SERVICE_ROLE_KEY`. | Solo server-side por import. | Cualquier consumidor bypass-ea RLS. |
| `src/modules/admin/api/events/_actions.ts` | Server actions `createEvent`, `updateEvent`, `deleteEvent`, `setEventPublished`, `setEventFeatured` | `event`, `eventFeatures`, `eventPaymentMethod`, `profile`, wallet. | `getAuthenticatedAdminContext`, `assertCanManageEvent`, `isSuperAdmin`. | Bajo/medio: guard correcto, pero service role concentra escrituras core. |
| `src/modules/payments/api/handlers/payments.confirm.ts` | `POST /api/payments/confirm` | `event`, `assistants`, `coupon`, `coupon_redemption`, `profile`, `auth.users`. | Sesion obligatoria; valida evento, cupo, estado propio y cupon. | Medio: ruta publica autenticada escribe pago con service role. |
| `src/modules/admin/api/payments/_actions.ts` | `approveAssistant`, `rejectAssistant` | `assistants`, `ticket`, `coupon`, `coupon_redemption`, `auth.users`. | `assertCanManageAssistant`. | Medio: cambios financieros/ticket dependen de guard app. |
| `app/api/tickets/resolve/route.ts` | `POST /api/tickets/resolve` | `ticket`. | Sesion, `isAdmin`, `assertCanManageEvent`. | Bajo: guard y ownership antes de devolver ruta. |
| `src/modules/tickets/api/services/qrAttendance.service.ts` | Ficha verificada y `markAttendance` | `assistants`, `ticket`, `event`, `profile`, `auth.users`, posiciones. | Consumidores admin validan `assertCanManageEvent`; servicio no valida por si solo. | Medio: servicio sensible reusable; cualquier nuevo consumidor debe validar antes. |
| `src/modules/tickets/api/services/google-wallet.service.ts` | Wallet classes/tickets | `wallet_provider_settings`, wallet URLs. | Llamado desde admin actions/handlers. | Medio: contiene credenciales wallet en DB y usa service role. |
| `src/modules/checkins/api/services/checkins.service.ts` | `/admin/check-ins`, `/check-in/[slug]`, `/api/check-ins/register` | `event_checkin`, `event_checkin_registration`, `event`. | Admin APIs superadmin; registro publico con rate limit y validacion. | Medio: PII de check-ins se escribe publicamente y se lee con service role. |
| `app/api/coupons/*` | Admin cupones, validacion y reembolsos | `coupon`, `coupon_redemption`, `event`, `profile`, `auth.users`. | Cupones admin superadmin; validar cupon exige sesion; reembolso exige organizadora o superadmin segun accion. | Medio: datos financieros y emails enriquecidos con `auth.admin`. |
| `src/modules/admin/api/users/services/adminUsers.service.ts` | `/admin/users`, activacion organizadora, broadcasts | `auth.users`, `profile`, metadata admin. | Pantalla y actions superadmin; activacion organizadora por endpoint autenticado propio. | Medio/alto: modifica roles/metadata con `auth.admin`. |
| `app/api/onboarding/by-email/route.ts` | Lookup por email | `auth.users`, `profile`. | Sin sesion; rate limit; service role. | Bloqueante: enumeracion de usuarios/perfil por email. |
| `src/modules/home/api/getHeroVerifiedPlayers.ts` | Home | `auth.users`, `profile`. | Lectura server-side para vista publica. | Bajo/medio: revisar minimizacion de datos. |
| `src/modules/events/api/services/eventTicketReminder.service.ts` | Cron reminders | `event`, `assistants`, `profile`, `auth.users`, `ticket`, `event_ticket_reminder_delivery`. | Cron debe validar secreto en route. | Medio: service role masivo; depende de guard del cron. |

## Rutas y acciones sensibles

| Ruta/accion | Sensibilidad | Sesion | Rol/ownership | Estado |
| --- | --- | --- | --- | --- |
| `app/admin/layout.tsx` | UI admin completa | Si | `isAdmin` | OK como primera barrera UI. |
| `/admin/events` | Eventos propios/todos | Si por layout | Superadmin ve todos; admin filtra por `created_by_id`. | OK. |
| `/admin/events/new` | Crear evento | Si por layout | Action exige `isAdmin`; payment methods propios. | OK. |
| `/admin/events/[id]/edit` | Editar/eliminar/publicar | Si por layout | Actions validan owner o superadmin. | OK. |
| `/admin/events/[id]/participants` | Participantes/PII | Si por layout | `assertCanManageEvent`; perfiles ampliados solo superadmin. | OK. |
| `/admin/payments` | Pagos/operaciones/cupones | Si por layout | Lista eventos propios salvo superadmin; actions con `assertCanManageAssistant`. | OK con riesgo de datos financieros. |
| `/admin/scan` | Escaneo QR | Si por layout | APIs validan admin y ownership. | OK. |
| `/admin/check-ins` y detalle | Registros PII check-in | Si | Superadmin en page/API. | OK, sensible. |
| `/admin/coupons` | Cupones/reembolsos | Si | Superadmin. | OK. |
| `/admin/users` | Lista usuarios y toggles admin | Si | Page superadmin; action superadmin. | OK, muy sensible. |
| `/admin/communications` | Correos globales | Si | Superadmin. | OK. |
| `/admin/payment-methods` | QR/numeros de pago | Si por layout | API exige admin y filtra `created_by`. | OK. |
| `/admin/wallet` | Credenciales/config wallet | Si por layout | API exige admin, no superadmin. | Medio: evaluar si debe ser superadmin. |
| `POST /api/events` | Crea eventos alterno | Si | No exige `isAdmin`; no usa readiness/payment method del admin. | Bloqueante. |
| `POST /api/payments/confirm` | Crea/actualiza `assistants` pending | Si | Solo usuario propio; valida evento/cupo/cupon. | Medio. |
| `POST /api/tickets/issue` | Emite ticket propio | Si | Valida `assistant.user === user.id`. | OK. |
| `POST /api/tickets/resolve` | Resuelve QR a ficha admin | Si | `isAdmin` + `assertCanManageEvent`. | OK. |
| `POST /api/tickets/attendance` | Marca ticket usado | Si | `isAdmin` + `assertCanManageEvent`. | OK. |
| `POST /api/tickets/validate` | Validador legacy | No llega al guard | Modulo deshabilitado con 503. | Bajo mientras siga deshabilitado. |
| `POST /api/check-ins/register` | Escribe PII check-in publico | No | Rate limit + check-in activo. | Medio. |
| `GET /api/check-ins/qr` | Genera QR por slug | No | Slug valido. | Bajo. |
| `POST /api/coupons/validate` | Valida cupon | Si | Usuario propio; valida email individual y uso. | OK/medio. |
| `GET/POST/PATCH/DELETE /api/coupons` | Gestion cupones | Si | Superadmin. | OK. |
| `GET/POST /api/coupons/reimburse` | Reembolsos cupones | Si | GET superadmin; request organizadora o superadmin; mark_sent superadmin. | OK/medio. |
| `POST /api/leads/partners` | Escribe leads con contacto | No | Rate limit + validaciones. | Medio por PII publica. |
| `POST /api/waitlist` | Email publico | No | Validacion email; RLS public insert. | Bajo. |
| `POST /api/onboarding/by-email` | Lookup user/profile por email | No | Rate limit; service role. | Bloqueante. |
| `GET /api/players/search` | Busca jugadoras | Si | Rate limit; sesion requerida; respuesta minima sin email. | OK tras KAN-25. |
| `POST /api/organizer/activate` | Auto-activa admin/organizadora | Si | Usuario propio; rate limit; compromisos + telefono. | Medio/alto. |
| `POST /api/teams` | Crea equipo | Si | Owner = usuario actual. | Bajo para Full Chocolate. |
| `POST /api/analytics/events` | Escribe analytics | Opcional | Rate limit; RLS public insert. | Bajo/medio si payload recibe PII. |
| `GET/POST /api/admin/wallet/*` | Config wallet | Si | `isAdmin`. | Medio: credenciales deberian ser superadmin-only. |
| `GET/POST /api/admin/payment-methods` | Metodos de pago | Si | `isAdmin`, ownership por `created_by`. | OK. |
| `GET/POST /api/admin/check-ins` | Gestion check-ins | Si | Superadmin. | OK. |
| `GET/POST /api/cron/event-ticket-reminders` | Recordatorios masivos | Debe validar secreto | Pendiente revisar/validar runtime. | Medio, pendiente Supabase/runtime. |

## Hallazgos bloqueantes

### B1 - `POST /api/onboarding/by-email` permite enumerar usuarias y datos de perfil sin sesion

Evidencia: `app/api/onboarding/by-email/route.ts` usa `getAdminSupabase()` y `auth.admin.listUsers` para buscar por email. La ruta no exige sesion; solo aplica rate limit. Si el email existe devuelve `userId`, email, confirmacion de correo, username, onboarding step, perfil completo y level.

Impacto: expone datos de jugadoras/perfiles y permite confirmar existencia de cuentas. Para Full Chocolate, esto afecta reportes, finanzas, reparto y cualquier modulo con datos personales.

Fix sugerido: cerrar la ruta a contexto autenticado/admin o reemplazarla por un flujo que no revele existencia ni campos de perfil. Si se necesita para onboarding, devolver respuestas indistinguibles y mover el lookup sensible a un flujo de sesion propia.

Estado KAN-24: corregido. `POST /api/onboarding/by-email` ya no usa service role ni `auth.admin.listUsers`; exige sesion propia, valida que el email solicitado sea el del usuario autenticado y solo devuelve campos minimos de onboarding.

### B2 - `POST /api/events` crea eventos desde una ruta alterna sin `isAdmin`

Evidencia: `src/modules/events/api/handlers/events.ts` en `POST` exige sesion y rate limit, pero no exige `isAdmin`, no usa `validateEventFormInput`, no valida payment methods propios ni readiness de publicacion. Inserta `event` directamente con el cliente de sesion.

Impacto: introduce un entrypoint paralelo al admin. KAN-11 ya habia detectado que varias lecturas tratan `event.is_published !== false` como publicado; si un evento queda con `is_published = null`, podria comportarse como publicado segun rutas existentes. Para Full Chocolate, esto rompe control de organizadoras, costos, utilidad y reparto.

Fix sugerido: deshabilitar o alinear `POST /api/events` con el mismo guard y reglas de `createEvent`; como PR pequeno, exigir `isAdmin` y setear explicitamente `is_published: false` si se mantiene.

### B3 - `GET /api/players/search` parece exponer emails de jugadoras sin sesion

Evidencia: `src/modules/teams/api/handlers/players.search.ts` no exige sesion y consulta `users_view` seleccionando `id, name, email, avatar`.

Impacto: exposicion publica de emails/perfiles de jugadoras por busqueda de nombre. Para Full Chocolate, esto es incompatible con reportes/usuarios/organizadoras si no se define minimizacion de datos.

Fix sugerido: exigir sesion para buscar jugadoras y devolver solo campos estrictamente necesarios; ocultar email salvo contexto admin/autorizado.

Estado KAN-25: corregido. `GET /api/players/search` mantiene rate limit, exige sesion antes de procesar la busqueda y devuelve solo `id`, `name` y `avatar`; el flujo de equipos ya no consume ni renderiza `email` en sugerencias.

## Hallazgos medios

### M1 - RLS/policies de tablas core no estan en migraciones locales

Evidencia: la migracion base crea `event`, `assistants`, `profile`, `paymentMethod`, `eventFeatures`, etc., pero solo habilita RLS para `waitlist_emails`. No se observaron `alter table ... enable row level security` ni policies locales para `event`, `assistants`, `profile`, `ticket`, `coupon`, `coupon_redemption`, `event_checkin` o `event_checkin_registration`.

Impacto: si Supabase real tampoco tiene RLS robusto, el modelo depende de que cada handler use el cliente correcto y aplique guards. Esto es riesgoso para finanzas, reportes y reparto.

Fix sugerido: en un PR posterior, verificar Supabase real y documentar/crear policies por tabla. No hacerlo en este ticket.

### M2 - `service role` centraliza operaciones financieras y de tickets

Evidencia: pagos, cupones, reembolsos, tickets y QR usan `getAdminSupabase()` para consultar/escribir `assistants`, `coupon_redemption`, `coupon`, `ticket` y datos de Auth.

Impacto: cualquier nuevo handler Full Chocolate que reutilice servicios sin el guard previo podria exponer o modificar pagos/tickets de eventos ajenos.

Fix sugerido: extraer wrappers de autorizacion por dominio o documentar en tests que `markAttendance`, servicios de cupones y servicios de check-ins requieren guard previo.

### M3 - Wallet admin acepta cualquier admin, aunque guarda credenciales sensibles

Evidencia: `src/modules/admin/api/wallet/handlers/wallet.settings.ts` y `wallet.classes.ts` usan `requireAdminUser()` con `isAdmin`, no `isSuperAdmin`.

Impacto: una organizadora/admin podria consultar o modificar configuracion global de Google Wallet si accede a la ruta/API. La tabla `wallet_provider_settings` guarda `service_account_private_key`.

Fix sugerido: cambiar guard a superadmin-only en un PR dedicado y revisar UI/nav.

### M4 - Autoactivacion de organizadora modifica metadata admin con service role

Evidencia: `POST /api/organizer/activate` exige sesion y compromisos, luego `activateOrganizerByUserId` setea `is_admin: true` y `role: admin` en Auth metadata via `auth.admin.updateUserById`.

Impacto: es un flujo deliberado, pero eleva privilegios. Para Full Chocolate, organizadoras tendran acceso a admin/eventos/pagos; requiere monitoreo, auditoria y pruebas de abuso.

Fix sugerido: agregar registro/auditoria persistente y revisar si activacion debe quedar pendiente de aprobacion o limitada a rol `organizer` antes de finanzas/reparto.

### M5 - Check-ins publicos capturan PII sin sesion

Evidencia: `POST /api/check-ins/register` escribe nombre, apellido, email y telefono en `event_checkin_registration` con rate limit y check-in activo, usando service role en servicio.

Impacto: esperado para QR publico, pero sensible. No debe mezclarse con asistencia pagada ni reportes de participantes aprobadas.

Fix sugerido: mantener separado de `assistants`/`ticket`; agregar retencion/export control cuando se creen reportes.

### M6 - Cupones y reembolsos exponen datos financieros enriquecidos a superadmin

Evidencia: `GET /api/coupons/reimburse` lista `coupon_redemption` y enriquece con emails/nombres de jugadora y organizadora mediante `auth.admin`.

Impacto: acceso superadmin parece correcto, pero al agregar reparto/finanzas hay que evitar reutilizar este payload para organizadoras sin filtrar.

Fix sugerido: crear endpoints separados para organizadora con filtro obligatorio por `organizer_user_id` o `event.created_by_id`.

### M7 - Cron de recordatorios usa service role masivo

Evidencia: `src/modules/events/api/services/eventTicketReminder.service.ts` lista usuarios Auth, eventos, assistants y tickets; route `app/api/cron/event-ticket-reminders/route.ts` debe proteger la ejecucion.

Impacto: un cron mal protegido puede disparar lecturas/envios masivos.

Fix sugerido: verificar secreto/headers en runtime y documentar manualmente en Supabase/Vercel.

## Hallazgos bajos

### L1 - QR legacy esta deshabilitado, pero no debe reactivarse sin ownership

`POST /api/tickets/validate` retorna 503 antes de validar sesion porque `QR_VALIDATION_MODULE_ENABLED = false`. Si se reactiva, debe incorporar `assertCanManageEvent`; hoy el codigo legacy valida admin pero no ownership.

### L2 - `POST /api/analytics/events` permite payload libre

Tiene rate limit y RLS public insert, pero el payload JSON es flexible. Evitar enviar PII en eventos de producto y documentar allowlist si se usan reportes.

### L3 - `POST /api/leads/partners` y `POST /api/waitlist` son escrituras publicas

Tienen validaciones y/o policies public insert. Mantener rate limits y evitar que estos datos entren a reportes operativos sin consentimiento/filtrado.

### L4 - `isSuperAdmin` esta hardcodeado por email

Es claro y estable para MVP, pero no auditable desde Supabase. Si Full Chocolate crece, conviene mover roles a claims/tabla auditada con historial.

## RLS/policies inferibles desde migraciones

| Tabla | RLS local | Policies locales observadas | Nota |
| --- | --- | --- | --- |
| `waitlist_emails` | Si | `allow_public_insert_waitlist` para `anon, authenticated`. | Escritura publica controlada por unique email. |
| `partner_leads` | Si | `partner_leads_public_insert`; `partner_leads_service_role_all`. | Public insert esperado. |
| `product_analytics_events` | Si | `product_analytics_events_public_insert`; `product_analytics_events_service_role_all`. | Public insert esperado. |
| `wallet_provider_settings` | Si | `wallet_provider_settings_service_role_all`. | Solo service role; contiene secreto sensible. |
| `event_announcement` | Si | `event_announcement_service_role_all`. | Historial de correos solo service role. |
| `event_announcement_recipient` | Si | `event_announcement_recipient_service_role_all`. | Contiene emails/estado de destinatarias. |
| `event_ticket_reminder_delivery` | Si | `event_ticket_reminder_delivery_service_role_all`. | Contiene emails y errores de envio. |
| `event` | No observado | Ninguna en repo. | Pendiente verificar en Supabase real. |
| `assistants` | No observado | Ninguna en repo. | Pendiente verificar en Supabase real. |
| `profile` | No observado | Ninguna en repo. | Pendiente verificar en Supabase real. |
| `paymentMethod` / `eventPaymentMethod` | No observado | Ninguna en repo. | Pendiente verificar en Supabase real. |
| `ticket` | No observado | Ninguna en repo. | Pendiente verificar en Supabase real. |
| `coupon` / `coupon_redemption` | No observado | Ninguna en repo. | Pendiente verificar en Supabase real. |
| `event_checkin` / `event_checkin_registration` | No observado | Ninguna en repo. | Pendiente verificar en Supabase real. |

## Riesgos especificos para Full Chocolate

- Organizadoras: no agregar un owner paralelo sin mapearlo a `event.created_by_id`, `paymentMethod.created_by` y `organizer_user_id` de `coupon_redemption`.
- Finanzas: no calcular utilidad/reparto desde endpoints publicos; derivar de `assistants.state = approved`, `event.price`, `coupon_redemption` y metodos de pago con ownership validado.
- Reportes: separar participantes pagadas (`assistants` + `ticket`) de check-ins publicos (`event_checkin_registration`).
- Reparto: bloquear cualquier endpoint de payout/reembolso a organizadora que no filtre por `event.created_by_id` o `organizer_user_id`.
- Usuarios: antes de dashboards de organizadora, cerrar exposicion publica de emails en `onboarding/by-email` y `players/search`.
- Service role: cualquier nuevo route handler debe documentar su guard antes de llamar servicios que usan `getAdminSupabase()`.

## Fixes pequenos recomendados por PR

1. PR KAN-12A: cerrar enumeracion de usuarios.
   - `POST /api/onboarding/by-email` cerrado en KAN-24.
   - `GET /api/players/search` cerrado en KAN-25: sesion requerida y payload sin `email`.

2. PR KAN-12B: alinear creacion alterna de eventos.
   - Exigir `isAdmin` en `POST /api/events` o descontinuar la ruta.
   - Setear `is_published: false` explicitamente.
   - Reusar validaciones de `createEvent` o dejar la ruta solo para el admin.

3. PR KAN-12C: endurecer configuracion global.
   - Cambiar wallet settings/classes a superadmin-only.
   - Agregar prueba de acceso directo a `/api/admin/wallet/settings`.

4. PR KAN-12D: crear tests de autorizacion para rutas sensibles.
   - Casos no autenticado, autenticado no admin, admin no owner y superadmin para pagos, tickets, eventos y check-ins.

5. PR KAN-12E: verificar y documentar RLS real.
   - Comparar policies reales de Supabase con migraciones.
   - Crear plan de migrations RLS para `event`, `assistants`, `profile`, `ticket`, `coupon`, `coupon_redemption`, `paymentMethod`, `event_checkin`.

6. PR Full Chocolate posterior: endpoints financieros por organizadora.
   - Crear endpoints separados para reportes/reparto con filtros obligatorios por ownership.
   - No reutilizar payloads superadmin de reembolsos para organizadoras.

## Pendiente de verificar en Supabase real

- Si RLS esta habilitado en `event`, `assistants`, `profile`, `ticket`, `coupon`, `coupon_redemption`, `paymentMethod`, `eventPaymentMethod`, `event_checkin` y `event_checkin_registration`.
- Si existen policies no presentes en migraciones locales.
- Si `event.is_published` contiene `null` en produccion y como lo interpretan las queries.
- Si `assistants.state` tiene valores historicos fuera de `pending`, `approved`, `rejected`.
- Si `coupon_redemption.reimbursement_status` ya esta migrado a `not_requested`, `requested`, `sent`, `confirmed`, `canceled` en todos los entornos.
- Si `users_view` expone emails a `anon` o si RLS/view grants lo limitan en Supabase real.
- Si `POST /api/events` puede insertar con cliente anon/authenticated en produccion o queda bloqueado por RLS real.
- Si el cron `event-ticket-reminders` esta protegido por secreto en Vercel/Supabase y no es invocable publicamente.
- Si buckets de QR de payment methods son publicos por requerimiento de producto y no contienen imagenes con datos adicionales.

## Recomendacion de siguiente PR

El siguiente PR deberia cerrar el bloqueante de entrypoint alterno `POST /api/events`. KAN-24 ya cerro `POST /api/onboarding/by-email` y KAN-25 cerro `GET /api/players/search`.

## Comentario sugerido para Jira

KAN-12 completado como auditoria documental sin cambios funcionales.

Se agrego `docs/security-admin-api-audit.md` con:

- mapa de guards admin/superadmin/ownership;
- lista de usos relevantes de `getAdminSupabase`, `auth.admin` y `service role`;
- rutas y server actions sensibles con sesion, rol y ownership observado;
- riesgos para jugadoras, pagos, tickets, perfiles, check-ins y futuras features Full Chocolate;
- severidades bloqueante/medio/bajo;
- fixes pequenos propuestos por PR;
- pendientes de verificar en Supabase real.

Riesgos bloqueantes detectados:

- `POST /api/onboarding/by-email` permite lookup de usuarias/perfil por email sin sesion, usando service role.
- `POST /api/events` es un entrypoint alterno de creacion de eventos sin `isAdmin` ni reglas completas del admin.
- `GET /api/players/search` parecia exponer emails de jugadoras sin sesion; corregido en KAN-25.

Riesgos medios principales:

- RLS de tablas core no es inferible desde migraciones locales.
- Service role concentra pagos, tickets, cupones, check-ins, wallet y usuarios.
- Wallet settings usa guard `isAdmin` aunque guarda credenciales globales.
- Autoactivacion de organizadora eleva metadata admin con service role.

Pendiente de verificar en Supabase real:

- policies/RLS reales de tablas core;
- grants de `users_view`;
- valores historicos de `event.is_published`, `assistants.state` y `coupon_redemption.reimbursement_status`;
- proteccion runtime del cron de recordatorios.

No se cerró ni transicionó el ticket.
