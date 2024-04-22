"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ButtonM, ParagraphM } from "@/components/atoms/Typography";
import SelectComponent, { OptionSelect } from "@/components/SelectComponent";
import { updateProfile } from "../_actions/profile";
import { UserProfileUpdate } from "@/utils/interfaces";
import toast from "react-hot-toast";

interface ProfileUpdateFormProps {
  userProfile: string;
  positionsData: any[];
  levelsData: any;
  levelsOptions: any[];
  playerPositionOptions: any[];
  updateProfile(userId: string, updates: UserProfileUpdate): Promise<void>;
  userId: string;
}

const validate = (values: any) => {
  const errors: any = {};
};

const ProfileUpdateForm = ({
  userProfile,
  positionsData,
  levelsData,
  levelsOptions,
  playerPositionOptions,
  updateProfile,
  userId,
}: ProfileUpdateFormProps) => {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    username: userProfile,
    level_id: levelsData,
  });

  const [positions, setPositions] = useState<OptionSelect[] | null>(
    positionsData
  );

  const [levels, setLevels] = useState<OptionSelect | null>(levelsData);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getKey = (name: string) => {
    const result = levelsOptions.find((level) => level.label === name);
    return result ? result.value : undefined;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsLoading(true);

    try {
      const updateData: UserProfileUpdate = {
        username: formData.username,
        level_id: getKey(levels.label),
        player_position: positions.map((pos) => pos.value as number),
      };

      await updateProfile(userId, updateData);
      toast.success("¡Se actualizó tu perfil con éxito!");
    } catch (error) {
      toast.error("Hubo un error al actualizar tu perfil: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="flex flex-col space-y-8" onSubmit={handleSubmit}>
      <div className="flex flex-1 items-center justify-center space-x-4 md:justify-end">
        <button
          className="px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl my-0 mx-2 flex justify-center items-center relative box-border"
          style={{ minWidth: "120px" }}
          disabled={isLoading}
        >
          {isLoading ? (
            <p className="">Cargando...</p>
          ) : (
            <ButtonM color="text-white">Guardar Cambios</ButtonM>
          )}
        </button>
      </div>
      <div className="sm:col-span-1 lg:col-span-6">
        <div className="flex justify-center items-center">
          <div className="md:p-6 rounded-md shadow-lg bg-white w-full xl:w-full mb-6">
            <div className="max-w-sm mt-2">
              <div className="p-6">
                <div className="mb-8">
                  <label htmlFor="username">
                    <ParagraphM fontWeight="semibold">
                      Crea un nombre
                    </ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="p-2 rounded-xl w-full text-black leading-tight hover:outline-none placeholder:text-lightGray border border-[#54086F] focus:border-[#54086F] hover:border-[#54086F]"
                      placeholder="Ej. pelotera123"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <label htmlFor="positions">
                    <ParagraphM fontWeight="semibold">
                      ¿En qué posición prefieres jugar?
                    </ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <SelectComponent
                      options={playerPositionOptions.map((position: any) => ({
                        value: position.value,
                        label: position.label,
                      }))}
                      value={positions}
                      isMulti={true}
                      onChange={(selected: any) => setPositions(selected)}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="level_id">
                    <ParagraphM fontWeight="semibold">
                      ¿Cuál es tu nivel?
                    </ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <SelectComponent
                      options={levelsOptions.map((level: any) => ({
                        value: level.value,
                        label: level.label,
                      }))}
                      value={levels}
                      onChange={(selected: any) => setLevels(selected)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
export default ProfileUpdateForm;
