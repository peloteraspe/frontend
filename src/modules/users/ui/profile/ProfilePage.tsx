'use client';

import Image from 'next/image';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@core/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import soccerBall from '@core/assets/soccer-ball.svg';

import ProfileUpdateForm from '@modules/users/ui/ProfileUpdateForm';
import TeamSection from '@modules/teams/ui/TeamSection';
import UserImage from '@shared/ui/UserImage';

import {
  fetchProfile,
  fetchLevels,
  fetchPlayersPosition,
  updateProfile,
} from '@modules/users/api/profile.client';
import type { UserProfileData } from '@modules/users/model/types';

import type { OptionSelectNumber } from './types';
import {
  findCurrentOptionByLabel,
  findCurrentOptionByValue,
  findCurrentOptionsByLabels,
} from './selectors';

export default function ProfilePage() {
  const PROFILE_LOAD_TIMEOUT_MS = 15000;
  const { user, loading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [positions, setPositions] = useState<OptionSelectNumber[]>([]);
  const [levels, setLevels] = useState<OptionSelectNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const withFallbackTimeout = useCallback(
    async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), PROFILE_LOAD_TIMEOUT_MS);
      });

      const result = await Promise.race([promise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    },
    [PROFILE_LOAD_TIMEOUT_MS]
  );

  const loadProfileData = useCallback(async () => {
    if (!user || isLoadingData) return;

    try {
      setIsLoadingData(true);
      setIsLoading(true);
      setError(null);

      const [profileResult, positionsResult, levelsResult] = await Promise.all([
        withFallbackTimeout(
          fetchProfile(user.id).catch((err) => {
            console.error('Error fetching profile:', err);
            return null;
          }),
          null
        ),
        withFallbackTimeout(
          fetchPlayersPosition().catch((err) => {
            console.error('Error fetching positions:', err);
            return [];
          }),
          []
        ),
        withFallbackTimeout(
          fetchLevels().catch((err) => {
            console.error('Error fetching levels:', err);
            return [];
          }),
          []
        ),
      ]);

      setProfileData(profileResult);
      setPositions((positionsResult || []) as OptionSelectNumber[]);
      setLevels((levelsResult || []) as OptionSelectNumber[]);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
      setIsLoadingData(false);
    }
  }, [user, isLoadingData, withFallbackTimeout]);

  const handleProfileUpdated = useCallback((nextProfileData: UserProfileData | null) => {
    if (!nextProfileData) return;

    setProfileData((currentProfileData) => ({
      ...(currentProfileData ?? {}),
      ...nextProfileData,
    }));
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      setIsLoading(false);
      router.push('/login');
      return;
    }

    if (user && !hasLoaded && !isLoadingData && !loading) {
      loadProfileData();
    }
  }, [user, loading, hasLoaded, isLoadingData, loadProfileData, router]);

  // Loading
  if (loading || isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-6 animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-8 w-52 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-100" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="mt-4 h-12 w-full rounded bg-slate-100" />
            <div className="mt-4 h-12 w-full rounded bg-slate-100" />
            <div className="mt-4 h-12 w-full rounded bg-slate-100" />
          </div>
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="mt-4 h-20 w-full rounded bg-slate-100" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
          <Image src={soccerBall} alt="Cargando perfil" width={20} height={20} className="animate-spin" />
          {loading ? 'Verificando autenticación...' : 'Cargando perfil...'}
        </div>
      </div>
    );
  }

  // Redirecting
  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error al cargar el perfil</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadProfileData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const positionOptions = positions || [];
  const levelOptions = levels || [];
  const hasCatalogFallback = positionOptions.length === 0 || levelOptions.length === 0;

  const currentLevelOption =
    findCurrentOptionByValue(levelOptions, profileData?.level_id) ??
    findCurrentOptionByLabel(levelOptions, profileData?.level);

  const currentPositionOptions = findCurrentOptionsByLabels(
    positionOptions,
    (profileData?.player_position ?? []).map((position: { name?: string | null }) => position?.name)
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Mi perfil</h1>
            <p className="mt-2 text-sm text-slate-600">
              Mantén tus datos al día para que los eventos y equipos encajen mejor contigo.
            </p>
          </div>
          <div className="rounded-xl border border-[#54086F]/20 bg-[#54086F]/5 px-3 py-2">
            <div className="flex items-center justify-end gap-3">
              <UserImage
                src={user.avatar_url}
                name={profileData?.username || user.email || 'Usuario'}
                size={48}
              />
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#54086F]">Cuenta activa</p>
                <p className="text-sm font-semibold text-slate-800">
                  {profileData?.username || user.email || 'Sin nombre'}
                </p>
              </div>
            </div>
            <p className="mt-1 text-right text-xs text-slate-600">{user.email || 'Sin correo'}</p>
          </div>
        </div>
      </header>

      {hasCatalogFallback && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No pudimos cargar completamente niveles o posiciones. Puedes continuar y reintentar más tarde.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ProfileUpdateForm
            userProfile={profileData?.username || ''}
            updateProfile={updateProfile}
            onProfileUpdated={handleProfileUpdated}
            userId={user.id}
            levelsData={currentLevelOption}
            levelsOptions={levelOptions}
            playerPositionOptions={positionOptions}
            positionsData={currentPositionOptions}
          />
        </div>

        <aside className="space-y-6">
          <TeamSection currentUserId={user.id} />
        </aside>
      </div>
    </section>
  );
}
