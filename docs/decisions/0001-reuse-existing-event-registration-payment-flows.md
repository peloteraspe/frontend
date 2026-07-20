# 0001 - Reutilizar flujos existentes de eventos, inscripciones, pagos y tickets

## Estado

Aceptada

## Contexto

Durante KAN-11 se documentaron los flujos actuales de eventos, inscripciones y pagos de Peloteras.

El discovery confirmó que la plataforma ya cuenta con:
- publicación de eventos,
- inscripción de jugadoras,
- pagos manuales,
- revisión admin,
- tickets QR,
- asistencia/check-in de tickets.

La entidad operativa central es `assistants`, que actualmente une:
- inscripción de la jugadora,
- número de operación manual,
- estado de revisión del pago,
- habilitación de ticket.

Los estados principales observados son:
- `pending`,
- `approved`,
- `rejected`.

También existen `paymentMethod`, `eventPaymentMethod` y `ticket`, que ya soportan el flujo operativo.

## Decisión

Para el MVP Peloteras × Full Chocolate no se creará un flujo paralelo de inscripción, pago ni tickets.

Se reutilizarán las entidades y flujos existentes:
- `event`,
- `assistants`,
- `paymentMethod`,
- `eventPaymentMethod`,
- `ticket`.

Las nuevas funcionalidades de Full Chocolate se construirán como una capa encima del modelo actual:
- organizadoras,
- programa,
- costos,
- ingresos,
- utilidad,
- reparto,
- reporte post-evento,
- checklist/método.

## Consecuencias

### Positivas

- Evitamos duplicar lógica de pagos e inscripciones.
- Reducimos riesgo de romper tickets QR y asistencia.
- Aprovechamos el admin existente.
- El MVP se puede construir con PRs más pequeños.
- Validamos el modelo de negocio sin reconstruir la plataforma.

### Riesgos

- `assistants` mezcla inscripción y pago manual, por lo que cualquier cambio financiero debe ser cuidadoso.
- Si en el futuro se crea una tabla formal de pagos, deberá migrarse sin romper `assistants.state`.
- Hay que verificar en Supabase real si existen valores históricos adicionales en `assistants.state`.

## Implicaciones para próximas features

- KAN-13/KAN-14 deben crear organizadoras sin reemplazar `profile` ni `event.created_by_id`.
- KAN-15 debe asociar eventos a organizadoras sin romper ownership actual.
- KAN-18 debe crear finanzas como ledger o resumen por evento, no como reemplazo de pagos.
- KAN-20 debe calcular reparto desde utilidad neta, no ejecutar pagos reales.
- Ningún ticket debe crear un nuevo flujo paralelo de inscripción o ticket QR.