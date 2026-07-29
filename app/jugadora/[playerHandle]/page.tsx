import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPublicPlayerProfileByUsername } from '@modules/users/api/services/publicPlayer.service';
import PlayerPublicProfilePage from '@modules/users/ui/public/PlayerPublicProfilePage';
import { buildPublicPlayerPath, normalizePublicHandle } from '@shared/lib/publicProfilePaths';

type Props = {
  params: Promise<{ playerHandle: string }>;
};

const getPlayerProfile = cache(getPublicPlayerProfileByUsername);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { playerHandle } = await params;
  const profile = await getPlayerProfile(normalizePublicHandle(playerHandle)).catch(() => null);

  if (!profile) {
    return {
      title: 'Jugadora no encontrada | Peloteras',
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = buildPublicPlayerPath(profile.username);
  const description = `Conoce el perfil deportivo y los equipos de @${profile.username} en Peloteras.`;

  return {
    title: `@${profile.username} | Peloteras`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'profile',
      title: `@${profile.username} en Peloteras`,
      description,
      url: canonicalPath,
      ...(profile.avatar_url
        ? { images: [{ url: profile.avatar_url, alt: `Foto de @${profile.username}` }] }
        : {}),
    },
    twitter: {
      card: 'summary',
      title: `@${profile.username} en Peloteras`,
      description,
      ...(profile.avatar_url ? { images: [profile.avatar_url] } : {}),
    },
  };
}

export default async function PlayerProfileRoute({ params }: Props) {
  const { playerHandle } = await params;
  const profile = await getPlayerProfile(normalizePublicHandle(playerHandle));

  if (!profile) notFound();

  return <PlayerPublicProfilePage profile={profile} />;
}
