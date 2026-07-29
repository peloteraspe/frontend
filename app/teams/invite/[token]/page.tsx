import { redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import {
  getTeamInvitationLinkPreview,
  resolveTeamLinkInvitation,
} from '@modules/teams/api/services/teams.service';
import TeamGeneralInvitationPage from '@modules/teams/ui/TeamGeneralInvitationPage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: 'Invitación de equipo | Peloteras',
  robots: { index: false, follow: false },
};

export default async function TeamInvitationLinkRoute({ params }: Props) {
  const { token } = await params;
  if (!UUID_PATTERN.test(token)) {
    return <TeamGeneralInvitationPage preview={null} mode="invalid" />;
  }

  const supabase = await getServerSupabase();
  const [preview, userResult] = await Promise.all([
    getTeamInvitationLinkPreview(token).catch(() => null),
    supabase.auth.getUser(),
  ]);
  if (!preview) return <TeamGeneralInvitationPage preview={null} mode="invalid" />;

  const user = userResult.data.user;
  const nextPath = `/teams/invite/${token}`;

  if (!user) {
    const { error } = await supabase.from('product_analytics_events').insert({
      event_name: 'team_invitation_login_required',
      source: 'team_invitation_link',
      channel: 'team_invitation_link',
      payload: { team_id: preview.teamId },
    });
    if (error) console.warn('Team invitation login-required analytics failed:', error.code);

    return (
      <TeamGeneralInvitationPage
        preview={preview}
        mode="login_required"
        loginHref={`/login?next=${encodeURIComponent(nextPath)}`}
        signupHref={`/signUp?next=${encodeURIComponent(nextPath)}`}
      />
    );
  }

  let invitationId: number | null = null;
  try {
    const invitation = await resolveTeamLinkInvitation(token);
    invitationId = invitation.id;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('already an active team member')) {
      return <TeamGeneralInvitationPage preview={preview} mode="already_member" />;
    }
    if (message.includes('profile is required')) {
      redirect(`/signUp?step=2&next=${encodeURIComponent(nextPath)}`);
    }
    return <TeamGeneralInvitationPage preview={null} mode="invalid" />;
  }

  const { error: analyticsError } = await supabase
    .from('product_analytics_events')
    .insert({
      event_name: 'team_invitation_return_completed',
      user_id: user.id,
      source: 'team_invitation_link',
      channel: 'team_invitation_link',
      payload: { team_id: preview.teamId, invitation_id: invitationId },
    });
  if (analyticsError) console.warn('Team invitation return analytics failed:', analyticsError.code);

  redirect(`/convocatorias?invitation=${invitationId}`);
}
