import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Title2XL } from '@/components/atoms/Typography';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getProfile } from '../_actions/profile';
import { fetchLevels, fetchPlayersPosition } from './fetchData';

export type OptionSelectNumber = { value: number; label: string };

function toOptionSelectNumberArray(
  items: Array<any>,
  valueKey: string = 'id',
  labelKey: string = 'name'
): OptionSelectNumber[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      const v = Number(it?.[valueKey]);
      const lbl = String(it?.[labelKey] ?? '');
      if (!Number.isFinite(v) || !lbl) return null;
      return { value: v, label: lbl };
    })
    .filter(Boolean) as OptionSelectNumber[];
}

function findCurrentOptionByLabel(
  options: OptionSelectNumber[],
  label: string | null | undefined
): OptionSelectNumber | null {
  if (!label) return null;
  const found = options.find((o) => o.label === label);
  return found ?? null;
}

interface ProfileContentProps {
  userId: string;
}

export async function ProfileContent({ userId }: ProfileContentProps) {
  console.log('🔍 ProfileContent: Fetching data for user:', userId);

  try {
    // Fetch all data in parallel
    const [profileResult, positionsResult, levelsResult] = await Promise.all([
      getProfile(userId).catch(err => {
        console.error('Error fetching profile:', err);
        return null;
      }),
      fetchPlayersPosition().catch(err => {
        console.error('Error fetching positions:', err);
        return [];
      }),
      fetchLevels().catch(err => {
        console.error('Error fetching levels:', err);
        return [];
      })
    ]);

    console.log('📊 ProfileContent: Profile result:', profileResult ? 'Found' : 'Not found');
    console.log('📊 ProfileContent: Positions:', positionsResult?.length || 0);
    console.log('📊 ProfileContent: Levels:', levelsResult?.length || 0);

    const profile = profileResult;
    const positions = positionsResult || [];
    const levels = levelsResult || [];

    const positionOptions = toOptionSelectNumberArray(positions);
    const levelOptions = toOptionSelectNumberArray(levels);

    const currentPositionOption = findCurrentOptionByLabel(positionOptions, profile?.position?.name);
    const currentLevelOption = findCurrentOptionByLabel(levelOptions, profile?.level?.name);

    return (
      <div className="container mx-auto">
        <div className="p-6 md:p-10 bg-white min-h-screen">
          <div className="mb-12">
            <Title2XL color="text-stone-900">Mi Perfil</Title2XL>
          </div>

          {/* Profile Form */}
          <div className="space-y-8 max-w-lg">
            {/* TODO: Fix ProfileUpdateForm props mismatch */}
            <div className="p-4 border rounded-lg bg-gray-50">
              <p className="text-gray-600">Profile form temporarily disabled due to props mismatch.</p>
              <p className="text-sm text-gray-500 mt-2">
                ProfileUpdateForm expects: userProfile, updateProfile, userId, levelsData, etc.
                <br />
                But receiving: profile, positionOptions, levelOptions, etc.
              </p>
            </div>
          </div>

          {/* Team Section */}
          <div className="mt-12 space-y-6">
            <div className="mb-6">
              <Title2XL color="text-stone-900">Mi Equipo</Title2XL>
            </div>
            <div className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-gray-500 text-sm">👥</span>
                </div>
                <p className="text-sm text-gray-700">Aún no cuentas con un equipo.</p>
              </div>
              <button className="flex items-center px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl uppercase">
                <PlusIcon className="h-4 mr-1" />
                <span className="text-sm font-semibold">Crear equipo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ ProfileContent: Error:', error);
    
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error loading profile</h1>
          <p className="text-gray-600">
            There was an error loading your profile data. Please try refreshing the page.
          </p>
          <pre className="bg-red-100 p-4 mt-4 text-sm text-left overflow-x-auto">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      </div>
    );
  }
}
