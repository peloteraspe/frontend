import { jsonNoStore } from '@core/api/responses';
import { getServerSupabase } from '@core/api/supabase.server';

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonNoStore({ count: 0 }, 401);

  const { error: expirationError } = await supabase.rpc('expire_visible_team_invitations', {
    p_team_id: null,
  });
  if (expirationError) return jsonNoStore({ error: 'Count failed' }, 500);

  const { count, error } = await supabase
    .from('team_invitation')
    .select('id', { count: 'exact', head: true })
    .eq('invitee_user_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (error) return jsonNoStore({ error: 'Count failed' }, 500);
  return jsonNoStore({ count: count ?? 0 });
}
