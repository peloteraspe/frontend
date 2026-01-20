'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/provider/AuthProvider';
import { useRouter } from 'next/navigation';
import { Title2XL } from '@/components/atoms/Typography';
import ProfileUpdateForm from '@modules/users/ui/ProfileUpdateForm';
import { PlusIcon } from '@heroicons/react/24/outline';
import {
  fetchProfile,
  fetchLevels,
  fetchPlayersPosition,
  updateProfile,
} from '@modules/users/api/profile.client';
import TeamSection from '@modules/teams/ui/TeamSection';

export type OptionSelectNumber = { value: number; label: string };

function findCurrentOptionByLabel(
  options: OptionSelectNumber[],
  label: string | null | undefined
): OptionSelectNumber | null {
  if (!label) return null;
  const found = options.find((o) => o.label === label);
  return found ?? null;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false); // Prevent concurrent loads
  const [hasLoaded, setHasLoaded] = useState(false); // Track if initial load completed

  const loadProfileData = async () => {
    if (!user || isLoadingData) return;

    try {
      setIsLoadingData(true);
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [profileResult, positionsResult, levelsResult] = await Promise.all([
        fetchProfile(user!.id).catch((err) => {
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
      setPositions(positionsResult || []);
      setLevels(levelsResult || []);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && !hasLoaded && !isLoadingData && !loading) {
      loadProfileData();
    }
  }, [user?.id, loading, hasLoaded, isLoadingData]);

  if (loading || isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading ? 'Verificando autenticación...' : 'Cargando perfil...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

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

  // API already returns correct format: { value: number, label: string }
  const positionOptions = positions || [];
  const levelOptions = levels || [];

  const currentLevelOption = findCurrentOptionByLabel(levelOptions, profileData?.level);
  const currentPositionOption = profileData?.player_position?.[0]?.name
    ? findCurrentOptionByLabel(positionOptions, profileData.player_position[0].name)
    : null;

  return (
    <div className="container mx-auto">
      <div className="p-6 md:p-10 bg-white min-h-screen">
        <div className="text-stone-900 mb-12">
          <Title2XL fontWeight="extrabold">Mi Perfil</Title2XL>
        </div>

        {/* Profile Form */}
        <div className="space-y-8 max-w-lg">
          <ProfileUpdateForm
            userProfile={profileData?.username || ''}
            updateProfile={updateProfile}
            userId={user.id}
            levelsData={currentLevelOption}
            levelsOptions={levelOptions}
            playerPositionOptions={positionOptions}
            positionsData={currentPositionOption ? [currentPositionOption] : []}
          />
        </div>

        {/* Team Section */}
        <div className="mt-12 space-y-6">
          <div className="text-stone-900">
            <Title2XL fontWeight="extrabold">Mi Equipo</Title2XL>
          </div>
          <TeamSection currentUserId={user.id} />
          {/* <div className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                <span className="text-gray-500 text-sm">👥</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">Aún no cuentas con un equipo.</p>
              </div>
            </div>
            <button className="flex items-center px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl uppercase">
              <PlusIcon className="h-4 mr-1" />
              <span className="text-sm font-semibold">Crear equipo</span>
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
