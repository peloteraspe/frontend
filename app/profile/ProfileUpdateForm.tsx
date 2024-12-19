'use client';
import { useEffect, useState } from 'react';
import { ButtonM, ParagraphM } from '@/components/atoms/Typography';
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';
import { UserProfileUpdate } from '@/utils/interfaces';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Input from '@/components/Input';

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
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    control,
    setValue
  } = useForm({
    defaultValues: {
      username: userProfile,
      level_id: levelsData.value,
      positions: positionsData,
    },
  });
  const [positions, setPositions] = useState<OptionSelect[] | null>(
    positionsData
  );

  const [levels, setLevels] = useState<OptionSelect | null>(levelsData);
  const [isLoading, setIsLoading] = useState(false);

  const getKey = (name: string) => {
    const result = levelsOptions.find((level) => level.label === name);
    return result ? result.value : undefined;
  };

  const submit = async (data: any) => {
    setIsLoading(true);
    try {
      const updateData: UserProfileUpdate = {
        username: data.username,
        level_id: getKey(data.level_id),
        player_position: positions.map((pos) => pos.value as number),
      };

      await updateProfile(userId, updateData);
      toast.success('¡Se actualizó tu perfil con éxito!');
    } catch (error) {
      toast.error('Hubo un error al actualizar tu perfil: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setValue('positions', positionsData);
  }, [positionsData]);

  useEffect(() => {
    setValue('level_id', levelsData ? levelsData[0].value : '');
  }, [levelsData]);

  return (
    <form className="flex flex-col space-y-8" onSubmit={handleSubmit(submit)}>
      <div className="flex flex-1 items-center justify-center space-x-4 md:justify-end">
        <button
          className="px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl my-0 mx-2 flex justify-center items-center relative box-border"
          style={{ minWidth: '120px' }}
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
                  <Input
                    label="Nombre de usuario"
                    type="text"
                    required
                    register={register}
                    errors={errors}
                    error={errors.username}
                    name="username"
                    bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
                  />
                </div>

                <div className="mb-8">
                  <label htmlFor="positions">
                    <ParagraphM fontWeight="semibold">
                      ¿En qué posición prefieres jugar?
                    </ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <SelectComponent
                      options={
                        playerPositionOptions?.map((pos) => ({
                          value: pos.value,
                          label: pos.label,
                        })) || []
                      }
                      control={control}
                      name="positions"
                      isMulti={true}
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
                      options={levelsOptions || []}
                      control={control}
                      name="level_id"
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
