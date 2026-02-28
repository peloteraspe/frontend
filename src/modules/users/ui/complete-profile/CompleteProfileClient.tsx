'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

import { Title2XL, ParagraphM } from '@core/ui/Typography';
import Input from '@core/ui/Input';
import SelectComponent, { OptionSelect } from '@core/ui/SelectComponent';

import { fetchLevelsOptions, fetchPositionsOptions } from '@modules/users/api/lookups.client';
import { createProfile } from '@modules/users/api/profile.server';
import { checkUsernameAvailabilityAction } from '@modules/users/actions/createProfile.actions';
import type { ProfileRequestBody } from '@modules/users/model/types';

type FormValues = {
  username: string;
  player_position: OptionSelect[];
  level_id: OptionSelect | null;
};

type CompleteProfileClientProps = {
  userId: string;
  initialUsername?: string;
};

export default function CompleteProfileClient({
  userId,
  initialUsername = '',
}: CompleteProfileClientProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<FormValues>({
    defaultValues: { username: initialUsername, player_position: [], level_id: null },
  });

  const [positions, setPositions] = useState<OptionSelect[]>([]);
  const [levels, setLevels] = useState<OptionSelect[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [pos, lev] = await Promise.all([fetchPositionsOptions(), fetchLevelsOptions()]);
        setPositions(pos);
        setLevels(lev);
      } catch {
        // fallback mínimo
        setPositions([
          { key: 1, value: 1, label: 'Portera' },
          { key: 2, value: 2, label: 'Defensa' },
          { key: 3, value: 3, label: 'Mediocampo' },
          { key: 4, value: 4, label: 'Delantera' },
        ]);
        setLevels([
          { key: 1, value: 1, label: 'Principiante' },
          { key: 2, value: 2, label: 'Intermedio' },
          { key: 3, value: 3, label: 'Avanzado' },
        ]);
      }
    };
    load();
  }, []);

  const toNumber = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const username = data.username.trim();
      const levelId = toNumber(data.level_id?.value);

      if (!username || username.length < 3) {
        toast.error('El nombre debe tener al menos 3 caracteres.');
        return;
      }
      const usernameCheck = await checkUsernameAvailabilityAction(username);
      if (!usernameCheck.available) {
        toast.error(
          usernameCheck.reason === 'error'
            ? 'No se pudo verificar el nombre de usuario. Intenta de nuevo.'
            : 'El nombre de usuario ya está en uso, elige otro.'
        );
        return;
      }
      if (!levelId) {
        toast.error('Selecciona un nivel.');
        return;
      }

      const payload: ProfileRequestBody = {
        user: userId,
        username,
        level_id: levelId,
        player_position: (data.player_position ?? [])
          .map((opt) => toNumber(opt.value))
          .filter((n): n is number => typeof n === 'number'),
      };

      await createProfile(payload);

      toast.success('Perfil creado exitosamente');
      window.location.reload();
    } catch (error: any) {
      if (String(error).includes('profile_username_key')) {
        toast.error('El nombre de usuario ya está en uso, elige otro.');
      } else {
        toast.error(error?.message ?? 'No se pudo crear el perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 min-h-[calc(100vh-6rem)] px-4">
      <div className="text-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>

      <div className="w-full max-w-[420px] bg-white border rounded-2xl p-6">
        <p className="text-center text-slate-700 mb-6">Completa tu perfil para continuar</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Crea un nombre"
            type="text"
            required
            placeholder="Ej: Pelotera123"
            bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
            {...register('username', {
              required: 'Este campo es requerido',
              minLength: { value: 3, message: 'Mínimo 3 caracteres' },
              maxLength: { value: 50, message: 'Máximo 50 caracteres' },
            })}
            errorText={errors.username?.message as string | undefined}
          />

          <label className="w-full">
            <div className="mb-1">
              <ParagraphM fontWeight="semibold">¿En qué posición prefieres jugar?</ParagraphM>
            </div>
            <SelectComponent options={positions} isMulti control={control} name="player_position" />
          </label>

          <label className="w-full">
            <div className="mb-1">
              <ParagraphM fontWeight="semibold">
                ¿Cuál es tu nivel? <span className="text-red-500">*</span>
              </ParagraphM>
            </div>
            <SelectComponent options={levels} control={control} name="level_id" />
          </label>

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-mulberry text-white disabled:opacity-60"
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}
