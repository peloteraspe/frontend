'use client';
import { useEffect, useState } from 'react';
import { ButtonM, ParagraphM } from '@/components/atoms/Typography';
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';
import { UserProfileUpdate } from '@modules/users/model/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Input from '@/components/Input';

export type OptionSelectNumber = { value: number; label: string };

interface ProfileUpdateFormProps {
  userProfile: string;

  updateProfile(userId: string, updates: UserProfileUpdate): Promise<void>;
  userId: string;

  levelsData: OptionSelectNumber | null;
  levelsOptions: OptionSelectNumber[];
  playerPositionOptions: OptionSelectNumber[];
  positionsData: OptionSelectNumber[];
}

type FormValues = {
  username: string;
  level_id: OptionSelectNumber | null;
  positions: OptionSelectNumber[];
};

export default function ProfileUpdateForm({
  userProfile,
  positionsData,
  levelsData,
  levelsOptions,
  playerPositionOptions,
  updateProfile,
  userId,
}: ProfileUpdateFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      username: userProfile ?? '',
      level_id: levelsData ?? null,
      positions: positionsData ?? [],
    },
  });

  // Si los props iniciales cambian (p.ej. al refetchear), reseteamos el form
  useEffect(() => {
    reset({
      username: userProfile ?? '',
      level_id: levelsData ?? null,
      positions: positionsData ?? [],
    });
  }, [userProfile, positionsData, levelsData, reset]);

  const submit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const updateData: UserProfileUpdate = {
        username: data.username,
        level_id: data.level_id?.value,
        player_position: data.positions.map((p) => p.value),
      };

      await updateProfile(userId, updateData);
      toast.success('¡Se actualizó tu perfil con éxito!');
    } catch (error: any) {
      toast.error('Hubo un error al actualizar tu perfil: ' + (error?.message ?? String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="flex flex-col space-y-8" onSubmit={handleSubmit(submit)} noValidate>
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
                {/* Username */}
                <div className="mb-8">
                  <Input
                    label="Nombre de usuario"
                    type="text"
                    required
                    placeholder="Tu usuario"
                    // RHF inyecta handlers/ref aquí
                    {...register('username', {
                      required: 'Este campo es requerido',
                      maxLength: 50,
                    })}
                    // Error visual
                    errorText={errors.username?.message as string | undefined}
                    bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
                  />
                </div>

                {/* Positions (multi) */}
                <div className="mb-8">
                  <label htmlFor="positions">
                    <ParagraphM fontWeight="semibold">¿En qué posición prefieres jugar?</ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <SelectComponent
                      options={playerPositionOptions ?? []}
                      control={control}
                      isSearchable={false}
                      name="positions"
                      isMulti
                    />
                  </div>
                </div>

                {/* Level (single) */}
                <div className="mb-4">
                  <label htmlFor="level_id">
                    <ParagraphM fontWeight="semibold">¿Cuál es tu nivel?</ParagraphM>
                  </label>
                  <div className="relative mt-2">
                    <SelectComponent
                      options={levelsOptions ?? []}
                      control={control}
                      name="level_id"
                      isSearchable={false}
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
}
