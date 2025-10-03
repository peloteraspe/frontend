import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Title2XL } from '@/components/atoms/Typography';
import ProfileUpdateForm from './ProfileUpdateForm';
import { redirect } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getProfile, updateProfile } from '../_actions/profile';
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

const ProfilePage = async () => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { player_position, username, level } = await getProfile(user.id);

  const rawPlayerPositions = await fetchPlayersPosition();
  const rawLevels = await fetchLevels();

  const playerPositionOptions = toOptionSelectNumberArray(rawPlayerPositions);
  const levelsOptions = toOptionSelectNumberArray(rawLevels);

  const positionsData = toOptionSelectNumberArray(player_position);

  const levelsData = findCurrentOptionByLabel(levelsOptions, level);

  return (
    <div className="container max-w-screen-xl grid items-center p-4 space-y-12 mt-8">
      <div className="flex flex-col space-y-12 p-6 md:mx-12">
        <div className="flex flex-col space-y-6">
          <div className="mb-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl text-center sm:text-left font-extrabold">
            <Title2XL fontWeight="extrabold">Mi perfil</Title2XL>
          </div>

          <ProfileUpdateForm
            userProfile={username}
            positionsData={positionsData}
            levelsData={levelsData}
            playerPositionOptions={playerPositionOptions}
            levelsOptions={levelsOptions}
            updateProfile={updateProfile}
            userId={user.id}
          />
        </div>

        <div className="flex flex-col space-y-6 py-12">
          <div className="mb-10 text-xl sm:text-2xl md:text-3xl lg:text-4xl text-center sm:text-left">
            <Title2XL fontWeight="extrabold">Mi equipo</Title2XL>
          </div>
          <div className="md:p-6 rounded-md shadow-lg bg-white w-full xl:w-full pb-8 md:pb-16 min-h-[300px] flex justify-center items-center relative">
            <div className="flex flex-col items-center gap-2">
              <div className="mb-2">
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
    </div>
  );
};

export default ProfilePage;
