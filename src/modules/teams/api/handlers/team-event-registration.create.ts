import { NextResponse } from 'next/server';
import { getServerSupabase } from '@core/api/supabase.server';

type RouteContext = { params: Promise<{ id: string }> };

function errorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String((error as any)?.message || '');
  const dictionary: Array<[string, string]> = [
    ['AUTH_REQUIRED', 'Debes iniciar sesión.'],
    ['CAPTAIN_REQUIRED', 'Solo la capitana puede inscribir al equipo.'],
    ['TEAM_REGISTRATION_DISABLED', 'Este evento no acepta inscripciones grupales.'],
    ['EVENT_NOT_AVAILABLE', 'El evento no está disponible.'],
    ['EVENT_ENDED', 'Las inscripciones para este evento ya cerraron.'],
    ['OPERATION_NUMBER_INVALID', 'Ingresa un número de operación de 8 dígitos.'],
    ['PAYMENT_METHOD_NOT_AVAILABLE', 'Selecciona un método de pago disponible para el evento.'],
    ['TEAM_MEMBERS_REQUIRED', 'Selecciona al menos una integrante.'],
    ['DUPLICATE_TEAM_MEMBER', 'La selección contiene integrantes repetidas.'],
    ['ACTIVE_TEAM_MEMBERS_REQUIRED', 'Todas las jugadoras deben ser integrantes activas.'],
    ['TEAM_SIZE_OUT_OF_RANGE', 'La cantidad seleccionada no cumple los límites del evento.'],
    ['TEAM_ALREADY_REGISTERED', 'Este equipo ya tiene una inscripción activa en el evento.'],
    ['MEMBER_ALREADY_REGISTERED', 'Una de las jugadoras ya está inscrita en este evento.'],
    ['EVENT_SOLD_OUT', 'No quedan cupos suficientes para todo el equipo.'],
    ['TEAM_REGISTRATION_NOT_FOUND', 'No encontramos la inscripción grupal.'],
    ['TEAM_REGISTRATION_NOT_CANCELLABLE', 'La inscripción ya no se puede cancelar.'],
    ['EVENT_ALREADY_STARTED', 'El evento ya inició y la inscripción no se puede cancelar.'],
  ];
  return dictionary.find(([key]) => raw.includes(key))?.[1] || raw || 'No se pudo inscribir al equipo.';
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const teamId = Number(body?.teamId);
    const memberUserIds = Array.isArray(body?.memberUserIds)
      ? body.memberUserIds.map((value: unknown) => String(value || '').trim()).filter(Boolean)
      : [];
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return NextResponse.json({ error: 'Equipo inválido.' }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .rpc('create_team_event_registration', {
        p_event_id: eventId,
        p_team_id: teamId,
        p_member_user_ids: memberUserIds,
        p_operation_number: String(body?.operationNumber || '').trim(),
        p_payment_method_id: Number(body?.paymentMethodId),
      })
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ registration: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const registrationId = Number(body?.registrationId);
    if (!Number.isInteger(registrationId) || registrationId <= 0) {
      return NextResponse.json({ error: 'Inscripción inválida.' }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const { data, error } = await supabase.rpc('cancel_team_event_registration', {
      p_registration_id: registrationId,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ registration: data });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
