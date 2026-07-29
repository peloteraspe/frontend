import { getAdminSupabase } from '@core/api/supabase.admin';

export type TeamRegistrationPayment = {
  id: number;
  eventId: number;
  eventTitle: string;
  createdAt: string;
  operationNumber: string;
  state: 'pending' | 'approved' | 'rejected' | 'cancelled';
  participantCount: number;
  unitPrice: number;
  totalAmount: number;
  priceMode: 'per_player' | 'fixed_team';
  paymentMethodName: string | null;
  rejectReason: string | null;
  teamId: number;
  teamName: string;
  captainName: string;
  memberNames: string[];
};

type PaymentEventScope = {
  eventId?: string;
  eventIds: string[] | null;
};

export async function getTeamRegistrationPayments(input: PaymentEventScope & {
  state: 'pending' | 'approved' | 'rejected' | 'cancelled';
  search?: string;
}) {
  const admin = getAdminSupabase();
  const eventId = String(input.eventId || '').trim();
  const eventIds =
    input.eventIds === null
      ? null
      : Array.from(new Set((input.eventIds || []).map((id) => String(id).trim()).filter(Boolean)));

  if (!eventId && eventIds?.length === 0) return [];

  let query = admin
    .from('team_event_registration')
    .select('id,event_id,created_at,operation_number,state,participant_count,unit_price,total_amount,price_mode,payment_method_id,reject_reason,team_id,registered_by_user_id')
    .eq('state', input.state)
    .order('created_at', { ascending: false })
    .limit(100);
  if (eventId) query = query.eq('event_id', eventId);
  else if (eventIds) query = query.in('event_id', eventIds);
  const search = String(input.search || '').replace(/\D/g, '');
  if (search) query = query.ilike('operation_number', `%${search}%`);

  const { data: registrations, error } = await query;
  if (error) throw new Error(error.message);
  if (!registrations?.length) return [];

  const teamIds = Array.from(new Set(registrations.map((row) => Number(row.team_id))));
  const registrationEventIds = Array.from(new Set(registrations.map((row) => Number(row.event_id))));
  const registrationIds = registrations.map((row) => Number(row.id));
  const userIds = Array.from(new Set(registrations.map((row) => String(row.registered_by_user_id))));
  const paymentMethodIds = Array.from(
    new Set(registrations.map((row) => Number(row.payment_method_id)).filter((id) => Number.isInteger(id) && id > 0))
  );

  const [{ data: teams }, { data: events }, { data: members }, { data: profiles }, { data: paymentMethods }] = await Promise.all([
    admin.from('team').select('id,name').in('id', teamIds),
    admin.from('event').select('id,title').in('id', registrationEventIds),
    admin.from('team_event_registration_member').select('registration_id,user_id').in('registration_id', registrationIds),
    admin.from('profile').select('user,username').in('user', userIds),
    paymentMethodIds.length
      ? admin.from('paymentMethod').select('id,name,type').in('id', paymentMethodIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const memberUserIds = Array.from(new Set((members ?? []).map((row) => String(row.user_id))));
  const { data: memberProfiles } = memberUserIds.length
    ? await admin.from('profile').select('user,username').in('user', memberUserIds)
    : { data: [] };
  const teamNameById = new Map((teams ?? []).map((row) => [Number(row.id), String(row.name || 'Equipo')]));
  const eventTitleById = new Map(
    (events ?? []).map((row) => [Number(row.id), String(row.title || `Evento #${row.id}`)])
  );
  const usernameById = new Map(
    [...(profiles ?? []), ...(memberProfiles ?? [])].map((row) => [String(row.user), String(row.username || 'Jugadora')])
  );
  const paymentMethodNameById = new Map(
    (paymentMethods ?? []).map((row: any) => [
      Number(row.id),
      String(row.name || row.type || 'Método de pago'),
    ])
  );

  return registrations.map((row) => ({
    id: Number(row.id),
    eventId: Number(row.event_id),
    eventTitle: eventTitleById.get(Number(row.event_id)) || `Evento #${row.event_id}`,
    createdAt: String(row.created_at),
    operationNumber: String(row.operation_number),
    state: row.state as TeamRegistrationPayment['state'],
    participantCount: Number(row.participant_count),
    unitPrice: Number(row.unit_price),
    totalAmount: Number(row.total_amount),
    priceMode: row.price_mode === 'fixed_team' ? 'fixed_team' : 'per_player',
    paymentMethodName: paymentMethodNameById.get(Number(row.payment_method_id)) || null,
    rejectReason: String(row.reject_reason || '').trim() || null,
    teamId: Number(row.team_id),
    teamName: teamNameById.get(Number(row.team_id)) || 'Equipo',
    captainName: usernameById.get(String(row.registered_by_user_id)) || 'Capitana',
    memberNames: (members ?? [])
      .filter((member) => Number(member.registration_id) === Number(row.id))
      .map((member) => usernameById.get(String(member.user_id)) || 'Jugadora'),
  })) satisfies TeamRegistrationPayment[];
}

export async function getTeamRegistrationPaymentCounts(scope: PaymentEventScope) {
  const admin = getAdminSupabase();
  const eventId = String(scope.eventId || '').trim();
  const eventIds =
    scope.eventIds === null
      ? null
      : Array.from(new Set((scope.eventIds || []).map((id) => String(id).trim()).filter(Boolean)));

  if (!eventId && eventIds?.length === 0) {
    return { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  }

  const count = async (state: 'pending' | 'approved' | 'rejected' | 'cancelled') => {
    let query = admin
      .from('team_event_registration')
      .select('id', { count: 'exact', head: true })
      .eq('state', state);
    if (eventId) query = query.eq('event_id', eventId);
    else if (eventIds) query = query.in('event_id', eventIds);
    const { count: value, error } = await query;
    if (error) throw new Error(error.message);
    return value || 0;
  };
  const [pending, approved, rejected, cancelled] = await Promise.all([
    count('pending'), count('approved'), count('rejected'), count('cancelled'),
  ]);
  return { pending, approved, rejected, cancelled };
}
