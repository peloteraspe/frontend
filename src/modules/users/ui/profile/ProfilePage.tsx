'use client';

import Image from 'next/image';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@core/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { Title2XL } from '@core/ui/Typography';
import soccerBall from '@core/assets/soccer-ball.svg';

import ProfileUpdateForm from '@modules/users/ui/ProfileUpdateForm';
import TeamSection from '@modules/teams/ui/TeamSection';

import {
  fetchProfile,
  fetchLevels,
  fetchPlayersPosition,
  updateProfile,
} from '@modules/users/api/profile.client';

import type { OptionSelectNumber } from './types';
import {
  findCurrentOptionByLabel,
  findCurrentOptionByValue,
  findCurrentOptionsByLabels,
} from './selectors';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [positions, setPositions] = useState<OptionSelectNumber[]>([]);
  const [levels, setLevels] = useState<OptionSelectNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProfileData = useCallback(async () => {
    if (!user || isLoadingData) return;

    try {
      setIsLoadingData(true);
      setIsLoading(true);
      setError(null);

      const [profileResult, positionsResult, levelsResult] = await Promise.all([
        fetchProfile(user.id).catch((err) => {
          console.error('Error fetching profile:', err);
          return null;
        }),
        fetchPlayersPosition().catch((err) => {
          console.error('Error fetching positions:', err);
          return [];
        }),
        fetchLevels().catch((err) => {
          console.error('Error fetching levels:', err);
          return [];
        }),
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
  }, [user, isLoadingData]);

  useEffect(() => {
    if (!loading && !user) {
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
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center flex flex-col items-center">
          <div className="mb-5 animate-spin">
            <Image src={soccerBall} alt="Cargando perfil" width={64} height={64} priority />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {loading ? 'Verificando autenticación...' : 'Cargando perfil...'}
          </p>
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

  const currentLevelOption =
    findCurrentOptionByValue(levelOptions, profileData?.level_id) ??
    findCurrentOptionByLabel(levelOptions, profileData?.level);

  const currentPositionOptions = findCurrentOptionsByLabels(
    positionOptions,
    (profileData?.player_position ?? []).map((position: { name?: string | null }) => position?.name)
  );

  return (
    <div className="container mx-auto">
      <div className="p-6 md:p-10 bg-white min-h-screen">
        <div className="text-stone-900 mb-12">
          <Title2XL fontWeight="extrabold">Mi Perfil</Title2XL>
        </div>

        <div className="space-y-8 max-w-lg">
          <ProfileUpdateForm
            userProfile={profileData?.username || ''}
            updateProfile={updateProfile}
            userId={user.id}
            levelsData={currentLevelOption}
            levelsOptions={levelOptions}
            playerPositionOptions={positionOptions}
            positionsData={currentPositionOptions}
          />
        </div>

        <div className="mt-12 space-y-6">
          <div className="text-stone-900">
            <Title2XL fontWeight="extrabold">Mi Equipo</Title2XL>
          </div>
          <TeamSection currentUserId={user.id} />
        </div>
      </div>
    </div>
  );
}
