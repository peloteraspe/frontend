'use client';
import { useEffect, useState } from 'react';
import { ButtonM, ParagraphM } from '@src/core/ui/Typography';
import SelectComponent from '@core/ui/SelectComponent';
import { UserProfileUpdate } from '@modules/users/model/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Input from '@core/ui/Input';

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
  level_id: number | null;
  positions: number[];
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
    setError,
    clearErrors,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      username: userProfile ?? '',
      level_id: levelsData?.value ?? null,
      positions: positionsData.map((position) => position.value) ?? [],
    },
  });

  // Si los props iniciales cambian (p.ej. al refetchear), reseteamos el form
  useEffect(() => {
    reset({
      username: userProfile ?? '',
      level_id: levelsData?.value ?? null,
      positions: positionsData.map((position) => position.value) ?? [],
    });
  }, [userProfile, positionsData, levelsData, reset]);

  const levelValue = watch('level_id');
  const positionsValue = watch('positions');

  const submit = async (data: FormValues) => {
    if (!data.level_id) {
      setError('level_id', {
        type: 'manual',
        message: 'Selecciona tu nivel para guardar el perfil.',
      });
      return;
    }

    if (!Array.isArray(data.positions) || data.positions.length === 0) {
      setError('positions', {
        type: 'manual',
        message: 'Selecciona al menos una posición.',
      });
      return;
    }

    setIsLoading(true);
    try {
      clearErrors();
      const updateData: UserProfileUpdate = {
        username: data.username,
        level_id: data.level_id as number,
        player_position: data.positions,
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
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Datos personales</h2>
          <p className="mt-1 text-sm text-slate-600">
            Completa tu información para mejorar la búsqueda de partidos y equipos.
          </p>
        </div>
        <button
          type="submit"
          className="px-4 py-[0.60rem] bg-btnBg-light hover:bg-btnBg-dark hover:shadow text-white rounded-xl my-0 mx-2 flex justify-center items-center relative box-border"
          style={{ minWidth: '160px' }}
          disabled={isLoading}
        >
          {isLoading ? (
            <p>Guardando...</p>
          ) : (
            <ButtonM color="text-white">Guardar Cambios</ButtonM>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-1">
          <Input
            label="Nombre de usuario"
            type="text"
            required
            placeholder="Tu usuario"
            {...register('username', {
              required: 'Este campo es requerido',
              maxLength: {
                value: 50,
                message: 'Máximo 50 caracteres.',
              },
            })}
            errorText={errors.username?.message as string | undefined}
            bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
          />
          <p className="text-xs text-slate-500">Se mostrará en eventos, equipos y entradas.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="level_id">
            <ParagraphM fontWeight="semibold">¿Cuál es tu nivel?</ParagraphM>
          </label>
          <div className="relative mt-2">
            <SelectComponent
              options={levelsOptions ?? []}
              control={control}
              name="level_id"
              isSearchable={false}
              errorText={errors.level_id?.message as string | undefined}
            />
          </div>
          <p className="text-xs text-slate-500">
            {levelValue ? 'Puedes cambiarlo cuando quieras.' : 'Selecciona tu nivel actual.'}
          </p>
        </div>

        <div className="space-y-1 lg:col-span-2">
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
              errorText={errors.positions?.message as string | undefined}
            />
          </div>
          <p className="text-xs text-slate-500">
            {Array.isArray(positionsValue) && positionsValue.length > 0
              ? `${positionsValue.length} posición(es) seleccionada(s).`
              : 'Selecciona una o más posiciones para que te encuentren más rápido.'}
          </p>
        </div>
      </div>
    </form>
  );
}
