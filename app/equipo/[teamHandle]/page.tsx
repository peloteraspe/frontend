import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
  getPublicTeamProfileBySlug,
  listCaptainTeamInvitationCards,
  getViewerActiveTeamRole,
  getViewerFeaturedTeamId,
} from '@modules/teams/api/services/teams.service';
import TeamPublicProfilePage from '@modules/teams/ui/TeamPublicProfilePage';
import { buildPublicTeamPath, normalizePublicHandle } from '@shared/lib/publicProfilePaths';

type Props = {
  params: Promise<{ teamHandle: string }>;
};

const getTeamProfile = cache(getPublicTeamProfileBySlug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamHandle } = await params;
  const profile = await getTeamProfile(normalizePublicHandle(teamHandle)).catch(() => null);

  if (!profile) {
    return {
      title: 'Equipo no encontrado | Peloteras',
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = buildPublicTeamPath(profile.team.slug);
  const description = `Conoce el perfil, las jugadoras y las redes de ${profile.team.name} en Peloteras.`;

  return {
    title: `${profile.team.name} (@${profile.team.slug}) | Peloteras`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      title: `${profile.team.name} en Peloteras`,
      description,
      url: canonicalPath,
      ...(profile.team.avatar_url
        ? { images: [{ url: profile.team.avatar_url, alt: `Foto de ${profile.team.name}` }] }
        : {}),
    },
    twitter: {
      card: 'summary',
      title: `${profile.team.name} en Peloteras`,
      description,
      ...(profile.team.avatar_url ? { images: [profile.team.avatar_url] } : {}),
    },
  };
}

export default async function TeamProfileRoute({ params }: Props) {
  const { teamHandle } = await params;
  const profile = await getTeamProfile(normalizePublicHandle(teamHandle));

  if (!profile) notFound();

  const [viewerRole, featuredTeamId] = await Promise.all([
    getViewerActiveTeamRole(profile.team.id).catch(() => null),
    getViewerFeaturedTeamId().catch(() => null),
  ]);
  const captainInvitations =
    viewerRole === 'captain'
      ? await listCaptainTeamInvitationCards(profile.team.id).catch(() => [])
      : [];

  return (
    <TeamPublicProfilePage
      profile={profile}
      canManageInvitations={viewerRole === 'captain'}
      viewerRole={viewerRole}
      isFeatured={featuredTeamId === profile.team.id}
      captainInvitations={captainInvitations}
    />
  );
}
