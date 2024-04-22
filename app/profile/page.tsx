import React from "react";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { ButtonM, ParagraphS, Title2XL } from "@/components/atoms/Typography";
import ProfileUpdateForm from "./ProfileUpdateForm";
import {
  fetchLevels,
  fetchPlayersPosition,
  formatProfileData,
} from "./fetchData";
import { redirect } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getProfile, updateProfile } from "../_actions/profile";

const loadProfilePosition = async (userId: any) => {
  const res = await fetch(``);
  const data = await res.json();
  return data;
};

const ProfilePage = async () => {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { player_position, username, level } = await getProfile(user.id);

  const playerPositionOptions = await fetchPlayersPosition();

  const levelsOptions = await fetchLevels();
  const playerPositionOptionsFormatted = formatProfileData(
    playerPositionOptions
  );
  const playerPositionFormatted = formatProfileData(player_position);
  const currentLevelFormatted = formatProfileData([{ name: level, id: 1 }]);
  const levelsOptionsFormatted = formatProfileData(levelsOptions);

  return (
    <div className="container max-w-screen-xl grid items-center p-4 space-y-12 mt-8">
      {/* <div className="container max-w-screen-xl grid items-center space-y-12 p-8 gap-8 pb-8 pt-6 md:py-8 mt-12"> */}
      <div className="flex flex-col space-y-12 p-6 md:mx-12">
        <div className="flex flex-col space-y-6">
          <div className="mb-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl text-center sm:text-left font-extrabold">
            <Title2XL fontWeight="extrabold">Mi perfil</Title2XL>
          </div>
          <ProfileUpdateForm
            userProfile={username}
            positionsData={playerPositionFormatted}
            levelsData={currentLevelFormatted}
            playerPositionOptions={playerPositionOptionsFormatted}
            levelsOptions={levelsOptionsFormatted}
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
                <ParagraphS>Aún no cuentas con un equipo.</ParagraphS>
              </div>
              <button className="flex items-center px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl uppercase">
                <PlusIcon className="h-4 mr-1" />
                <ButtonM color="text-white">Crear equipo</ButtonM>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
