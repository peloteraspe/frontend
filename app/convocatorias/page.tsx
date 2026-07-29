import { redirect } from 'next/navigation';
import { getServerSupabase } from '@core/api/supabase.server';
import { listViewerTeamInvitationCards } from '@modules/teams/api/services/teams.service';
import TeamInvitationsPage from '@modules/teams/ui/TeamInvitationsPage';

type Props = {
  searchParams: Promise<{ invitation?: string }>;
};

export const metadata = {
  title: 'Convocatorias | Peloteras',
  robots: { index: false, follow: false },
};

export default async function InvitationsRoute({ searchParams }: Props) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Fconvocatorias');

  const params = await searchParams;
  const highlightedInvitationId = Number(params.invitation);
  const invitations = await listViewerTeamInvitationCards();

  return (
    <TeamInvitationsPage
      initialInvitations={invitations}
      highlightedInvitationId={
        Number.isSafeInteger(highlightedInvitationId) && highlightedInvitationId > 0
          ? highlightedInvitationId
          : null
      }
    />
  );
}
