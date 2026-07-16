import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicTeamProfileBySlug } from '@modules/teams/api/services/teams.service';
import TeamPublicProfilePage from '@modules/teams/ui/TeamPublicProfilePage';

type Props = {
  params: Promise<{ teamSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamSlug } = await params;
  const profile = await getPublicTeamProfileBySlug(teamSlug).catch(() => null);

  if (!profile) {
    return {
      title: 'Equipo no encontrado | Peloteras',
    };
  }

  return {
    title: `${profile.team.name} | Peloteras`,
    description: `Perfil publico de ${profile.team.name} en Peloteras.`,
  };
}

export default async function Page({ params }: Props) {
  const { teamSlug } = await params;
  const profile = await getPublicTeamProfileBySlug(teamSlug);

  if (!profile) notFound();

  return <TeamPublicProfilePage profile={profile} />;
}
