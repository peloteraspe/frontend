import 'server-only';

import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';

export async function assertCanManageEvent(eventId: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para gestionar este evento.');
  }

  if (isSuperAdmin(user as any)) {
    return { supabase, user };
  }

  const { data: event, error } = await supabase
    .from('event')
    .select('created_by_id')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!event) throw new Error('Evento no encontrado.');
  if (String(event.created_by_id || '') !== String(user.id || '')) {
    throw new Error('No tienes permisos para comunicar este evento.');
  }

  return { supabase, user };
}
