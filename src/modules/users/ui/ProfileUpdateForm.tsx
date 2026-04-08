'use client';
import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@core/api/supabase.browser';
import { useAuth } from '@core/auth/AuthProvider';
import InternationalPhoneField from '@core/ui/InternationalPhoneField';
import { ButtonM } from '@src/core/ui/Typography';
import SelectComponent from '@core/ui/SelectComponent';
import { UserProfileUpdate } from '@modules/users/model/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import Input from '@core/ui/Input';
import {
  normalizeInternationalPhone,
  normalizePhoneMetadata,
  resolveStoredPhone,
  validateInternationalPhone,
} from '@shared/lib/phone';

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
  const supabase = getBrowserSupabase();
  const { user, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const initialPhone = resolveStoredPhone(user);

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

  useEffect(() => {
    setPhone(initialPhone);
    setPhoneError('');
  }, [initialPhone]);

  const levelValue = watch('level_id');
  const positionsValue = watch('positions');
  const helperTextClassName = 'mt-2 min-h-[2.5rem] text-xs leading-5 text-slate-500';

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

    const normalizedPhone = phone.trim() ? normalizeInternationalPhone(phone) : '';
    if (phone.trim() && !normalizedPhone) {
      setPhoneError('Ingresa un celular válido.');
      return;
    }

    setIsLoading(true);
    try {
      clearErrors();
      setPhoneError('');
      const updateData: UserProfileUpdate = {
        username: data.username,
        level_id: data.level_id as number,
        player_position: data.positions,
        phone: normalizedPhone || null,
      };

      await updateProfile(userId, updateData);
      const currentMetadata = normalizePhoneMetadata(user?.user_metadata);
      const nextMetadata: Record<string, unknown> = {
        ...currentMetadata,
        username: data.username.trim(),
        phone: normalizedPhone || null,
      };

      const { error: metadataError } = await supabase.auth.updateUser({
        data: nextMetadata,
      });

      if (metadataError) {
        throw new Error(metadataError.message);
      }

      setPhone(normalizedPhone || '');
      await refreshProfile().catch(() => undefined);
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
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Datos personales</h2>
          <p className="mt-1 text-sm text-slate-600">
            Completa tu información para mejorar la búsqueda de partidos y equipos.
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 w-full min-w-[180px] items-center justify-center rounded-xl bg-btnBg-light px-5 text-white transition-colors hover:bg-btnBg-dark hover:shadow sm:w-auto"
          disabled={isLoading}
        >
          {isLoading ? (
            <p>Guardando...</p>
          ) : (
            <ButtonM color="text-white">Guardar Cambios</ButtonM>
          )}
        </button>
      </div>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <div className="flex h-full flex-col">
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
            bgColor="bg-white"
          />
          <p className={helperTextClassName}>Se mostrará en eventos, equipos y entradas.</p>
        </div>

        <div className="flex h-full flex-col">
          <InternationalPhoneField
            label="Celular"
            value={phone}
            onChange={(nextPhone) => {
              setPhone(nextPhone);
              if (phoneError) setPhoneError('');
            }}
            onBlur={() => {
              if (!phone.trim()) {
                setPhoneError('');
                return;
              }

              const validation = validateInternationalPhone(phone);
              setPhoneError(validation.isValid ? '' : 'Ingresa un celular válido.');
            }}
            placeholder="999 999 999"
            errorText={phoneError}
          />
          <p className={helperTextClassName}>
            Lo usaremos para prellenar tus flujos y mantener tu contacto actualizado.
          </p>
        </div>

        <div className="flex h-full flex-col">
          <SelectComponent
            labelText="¿Cuál es tu nivel?"
            options={levelsOptions ?? []}
            control={control}
            name="level_id"
            isSearchable={false}
            errorText={errors.level_id?.message as string | undefined}
          />
          <p className={helperTextClassName}>
            {levelValue ? 'Puedes cambiarlo cuando quieras.' : 'Selecciona tu nivel actual.'}
          </p>
        </div>

        <div className="flex h-full flex-col">
          <SelectComponent
            labelText="¿En qué posición prefieres jugar?"
            options={playerPositionOptions ?? []}
            control={control}
            isSearchable={false}
            name="positions"
            isMulti
            errorText={errors.positions?.message as string | undefined}
          />
          <p className={helperTextClassName}>
            {Array.isArray(positionsValue) && positionsValue.length > 0
              ? `${positionsValue.length} posición(es) seleccionada(s).`
              : 'Selecciona una o más posiciones para que te encuentren más rápido.'}
          </p>
        </div>
      </div>
    </form>
  );
}
