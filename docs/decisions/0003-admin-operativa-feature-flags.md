# 0003 - Admin operativa con organizadoras y feature flags

## Estado

Aceptada

## Contexto

Peloteras esta incorporando el MVP tecnico Peloteras x Full Chocolate. Las organizadoras que operan eventos necesitan acceso al area admin, pero no todas deben tener las mismas capacidades ni acceso a funciones globales sensibles.

El sistema actual ya usa `isAdmin` como barrera general del admin y `isSuperAdmin` para capacidades globales o mas sensibles. Tambien existen entidades core que no deben reemplazarse en este ticket: `profile`, `event.created_by_id`, `partner_leads`, pagos, tickets y check-ins.

## Decision

Se agrega una capa minima de base de datos con dos tablas:

- `organizers`: representa el estado de negocio de una organizadora. Puede vincularse a `auth.users`, `profile` y a una postulacion previa en `partner_leads`, pero no reemplaza esas tablas.
- `admin_feature_flags`: representa permisos operativos habilitables por `user_id` para admins no-superadmin.

`isAdmin` se mantiene como acceso general al area admin. `isSuperAdmin` mantiene acceso total y sigue reservando funciones globales sensibles. Las flags de `admin_feature_flags` se usaran en tickets futuros para acotar acciones operativas sin crear un sistema complejo de roles.

Las funciones globales sensibles siguen reservadas para superadmin por ahora:

- usuarios,
- wallet global,
- cupones globales,
- comunicaciones globales,
- ver todos los eventos.

## Detalles de modelado

`organizers.status` acepta:

- `pilot`,
- `active`,
- `paused`,
- `inactive`.

`organizers.source` acepta:

- `full_chocolate`,
- `peloteras`,
- `other`.

`admin_feature_flags` es unica por `user_id` para evitar configuraciones duplicadas por admin operativa. Todas las flags nacen en `false`; este ticket no otorga permisos ni activa admins automaticamente.

Se agregan indices para consultas futuras por `user_id`, `partner_lead_id`, `status` y `source`. Las relaciones opcionales de `organizers` usan `ON DELETE SET NULL` para conservar el registro de negocio si se elimina o desvincula el usuario/perfil/postulacion. Las flags usan `ON DELETE CASCADE` contra `auth.users` porque no deben quedar permisos de usuarios eliminados.

## Seguridad y RLS

Las tablas nuevas nacen con RLS habilitado y una policy minima para `service_role`.

KAN-14 agrega una vista operativa en `/admin/organizers` solo para superadmin. La vista usa server components y server actions que validan sesion superadmin antes de usar `getAdminSupabase()` para leer o escribir `organizers`, `partner_leads` y `admin_feature_flags`.

No se agregan policies para `anon` ni `authenticated` en este flujo porque las tablas nuevas siguen consumiendose solo desde servidor con service role y guard explicito de superadmin. Si alguna lectura o escritura se mueve a cliente autenticado, debera agregarse una policy RLS especifica y documentar sesion, rol, ownership y datos sensibles, siguiendo la regla de `docs/decisions/0002.md`.

## Consecuencias

### Positivas

- Se modela la organizadora como entidad de negocio sin romper `profile` ni ownership actual de eventos.
- Se habilita un camino simple para permisos operativos sin crear roles complejos.
- Las capacidades sensibles siguen protegidas por `isSuperAdmin`.
- No se cambia el comportamiento actual de admins existentes.

### Riesgos y pendientes

- Las flags no tienen efecto hasta que los guards de aplicacion las consulten en tickets futuros.
- Habra que definir policies RLS especificas si alguna lectura o escritura se mueve a cliente autenticado.
- KAN-15 o tickets posteriores deberan asociar eventos a organizadoras sin reemplazar `event.created_by_id`.
- La auditoria de cambios de flags queda pendiente para un ticket futuro si se necesita trazabilidad mas detallada.
