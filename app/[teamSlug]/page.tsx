import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicTeamProfileBySlug } from '@modules/teams/api/services/teams.service';
import { buildPublicTeamPath } from '@shared/lib/publicProfilePaths';

type Props = {
  params: Promise<{ teamSlug: string }>;
};

export const metadata = {
  robots: { index: false, follow: true },
};

export default async function LegacyTeamProfileRoute({ params }: Props) {
  const { teamSlug } = await params;
  const profile = await getPublicTeamProfileBySlug(teamSlug);

  if (!profile) notFound();

  permanentRedirect(buildPublicTeamPath(profile.team.slug));
}
