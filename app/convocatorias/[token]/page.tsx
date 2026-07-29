import { notFound, redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import {
  claimTeamInvitationByToken,
  getTeamInvitationByToken,
} from '@modules/teams/api/services/teams.service';

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InvitationTokenRoute({ params }: Props) {
  const { token } = await params;
  const invitation = await getTeamInvitationByToken(token).catch(() => null);
  if (!invitation) notFound();

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/convocatorias/${encodeURIComponent(token)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (invitation.invitee_user_id === user.id) {
    redirect(`/convocatorias?invitation=${invitation.id}`);
  }

  const claimedInvitation = await claimTeamInvitationByToken(token).catch(() => null);
  if (!claimedInvitation || claimedInvitation.invitee_user_id !== user.id) notFound();

  redirect(`/convocatorias?invitation=${claimedInvitation.id}`);
}
