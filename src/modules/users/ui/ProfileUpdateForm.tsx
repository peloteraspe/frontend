'use client';

import { useEffect, useState } from 'react';
import {
  IdentificationIcon,
  LockClosedIcon,
  PhoneIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { getBrowserSupabase } from '@core/api/supabase.browser';
import { useAuth } from '@core/auth/AuthProvider';
import InternationalPhoneField from '@core/ui/InternationalPhoneField';
import SelectComponent from '@core/ui/SelectComponent';
import { UserProfileData, UserProfileUpdate } from '@modules/users/model/types';
import toast from 'react-hot-toast';
import { type FieldErrors, useForm } from 'react-hook-form';
import Input from '@core/ui/Input';
import BirthDatePicker from '@core/ui/BirthDatePicker';
import {
  normalizeInternationalPhone,
  normalizePhoneMetadata,
  resolveStoredPhone,
  validateInternationalPhone,
} from '@shared/lib/phone';
import {
  getLatestAdultBirthDate,
  resolveStoredBirthDate,
  validateBirthDate,
} from '@modules/users/lib/eventProfileRequirements';
import {
  USERNAME_MAX_LENGTH,
  validateUsername,
  validateUsernameForForm,
} from '@modules/users/lib/username';

export type OptionSelectNumber = { value: number; label: string };

interface ProfileUpdateFormProps {
  userProfile: string;

  updateProfile(userId: string, updates: UserProfileUpdate): Promise<UserProfileData | null>;
  onProfileUpdated?(profile: UserProfileData): void;
  userId: string;

  levelsData: OptionSelectNumber | null;
  levelsOptions: OptionSelectNumber[];
  playerPositionOptions: OptionSelectNumber[];
  positionsData: OptionSelectNumber[];
  isCatalogReady?: boolean;
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
  onProfileUpdated,
  userId,
  isCatalogReady = true,
}: ProfileUpdateFormProps) {
  const supabase = getBrowserSupabase();
  const { user, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [savedBirthDate, setSavedBirthDate] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const initialPhone = resolveStoredPhone(user);
  const initialBirthDate = resolveStoredBirthDate(user);
  const maxBirthDate = getLatestAdultBirthDate();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
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

  const levelIdFromProps = levelsData?.value ?? null;
  const positionIdsFromProps = positionsData.map((position) => position.value).join(',');

  // Si los props iniciales cambian (p.ej. al refetchear), reseteamos el form
  useEffect(() => {
    reset({
      username: userProfile ?? '',
      level_id: levelIdFromProps,
      positions: positionIdsFromProps
        ? positionIdsFromProps.split(',').map((positionId) => Number(positionId))
        : [],
    });
  }, [userProfile, levelIdFromProps, positionIdsFromProps, reset]);

  useEffect(() => {
    setPhone(initialPhone);
    setSavedPhone(initialPhone);
    setPhoneError('');
    setBirthDate(initialBirthDate);
    setSavedBirthDate(initialBirthDate);
    setBirthDateError('');
  }, [initialBirthDate, initialPhone]);

  const levelValue = watch('level_id');
  const positionsValue = watch('positions');
  const helperTextClassName = 'mt-2 text-xs leading-5 text-slate-500';
  const hasUnsavedChanges =
    isDirty || phone !== savedPhone || birthDate !== savedBirthDate;
  const hasValidationErrors =
    Object.keys(errors).length > 0 || Boolean(phoneError) || Boolean(birthDateError);

  useEffect(() => {
    if (hasUnsavedChanges) setSaveStatus('idle');
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  function focusField(fieldId: string) {
    window.requestAnimationFrame(() => document.getElementById(fieldId)?.focus());
  }

  function handleInvalid(formErrors: FieldErrors<FormValues>) {
    const firstInvalidField = (['username', 'level_id', 'positions'] as const).find(
      (fieldName) => Boolean(formErrors[fieldName])
    );

    if (!firstInvalidField) return;
    const fieldIds: Record<keyof FormValues, string> = {
      username: 'profile-username',
      level_id: 'profile-level',
      positions: 'profile-positions',
    };
    focusField(fieldIds[firstInvalidField]);
  }

  const submit = async (data: FormValues) => {
    if (!hasUnsavedChanges || !isCatalogReady) return;

    const usernameValidation = validateUsername(data.username);
    if (usernameValidation.ok === false) {
      setError(
        'username',
        {
          type: 'manual',
          message: usernameValidation.message,
        },
        { shouldFocus: true }
      );
      focusField('profile-username');
      return;
    }
    const normalizedUsername = usernameValidation.value;

    const normalizedPhone = normalizeInternationalPhone(phone);
    if (!normalizedPhone) {
      setPhoneError('Ingresa un celular válido.');
      focusField('profile-phone');
      return;
    }

    const birthDateValidation = validateBirthDate(birthDate, maxBirthDate);
    if (birthDateValidation.ok === false) {
      setBirthDateError(birthDateValidation.message);
      focusField('profile-birth-date');
      return;
    }

    if (!data.level_id) {
      setError(
        'level_id',
        {
          type: 'manual',
          message: 'Selecciona tu nivel para guardar el perfil.',
        },
        { shouldFocus: true }
      );
      focusField('profile-level');
      return;
    }

    if (!Array.isArray(data.positions) || data.positions.length === 0) {
      setError(
        'positions',
        {
          type: 'manual',
          message: 'Selecciona al menos una posición.',
        },
        { shouldFocus: true }
      );
      focusField('profile-positions');
      return;
    }

    setIsLoading(true);
    try {
      clearErrors();
      setPhoneError('');
      setBirthDateError('');
      const updateData: UserProfileUpdate = {
        username: normalizedUsername,
        level_id: data.level_id as number,
        player_position: data.positions,
        phone: normalizedPhone || null,
      };

      const updatedProfile = await updateProfile(userId, updateData);
      const currentMetadata = normalizePhoneMetadata(user?.user_metadata);
      const nextMetadata: Record<string, unknown> = {
        ...currentMetadata,
        username: normalizedUsername,
        phone: normalizedPhone,
        birth_date: birthDateValidation.value,
      };

      const { error: metadataError } = await supabase.auth.updateUser({
        data: nextMetadata,
      });

      if (metadataError) {
        throw new Error('No pudimos guardar el celular y la fecha de nacimiento. Intenta nuevamente.');
      }

      const nextProfileData: UserProfileData = {
        ...(updatedProfile ?? {}),
        username: normalizedUsername,
        level_id: data.level_id as number,
        level:
          levelsOptions.find((option) => option.value === data.level_id)?.label ??
          updatedProfile?.level ??
          null,
        player_position: (playerPositionOptions ?? [])
          .filter((option) => data.positions.includes(option.value))
          .map((option) => ({
            id: option.value,
            name: option.label,
          })),
      };

      onProfileUpdated?.(nextProfileData);
      reset({
        username: nextProfileData.username ?? '',
        level_id: nextProfileData.level_id ?? null,
        positions: [...data.positions],
      });
      setPhone(normalizedPhone || '');
      setSavedPhone(normalizedPhone || '');
      setBirthDate(birthDateValidation.value);
      setSavedBirthDate(birthDateValidation.value);
      await refreshProfile().catch(() => undefined);
      setSaveStatus('saved');
      toast.success('¡Se actualizó tu perfil con éxito!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Hubo un error al actualizar tu perfil: ' + message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      onSubmit={handleSubmit(submit, handleInvalid)}
      noValidate
    >
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mulberry/10 text-mulberry">
            <IdentificationIcon aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Información de jugadora</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Estos datos nos ayudan a conectarte con eventos, equipos y jugadoras afines a ti.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Los campos marcados con <span className="text-red-500">*</span> son obligatorios.
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        <fieldset className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
          <legend className="sr-only">Cuenta pública</legend>
          <div>
            <div className="flex items-center gap-2 text-mulberry">
              <IdentificationIcon aria-hidden="true" className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-slate-900">Cuenta pública</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              La información con la que te reconocerán dentro de Peloteras.
            </p>
          </div>

          <div className="max-w-xl">
            <Input
              id="profile-username"
              label="Nombre de usuario"
              type="text"
              required
              placeholder="Tu usuario"
              {...register('username', {
                required: 'Este campo es requerido',
                minLength: {
                  value: 3,
                  message: 'Mínimo 3 caracteres.',
                },
                maxLength: {
                  value: USERNAME_MAX_LENGTH,
                  message: `Máximo ${USERNAME_MAX_LENGTH} caracteres.`,
                },
                validate: validateUsernameForForm,
              })}
              maxLength={USERNAME_MAX_LENGTH}
              errorText={errors.username?.message as string | undefined}
              bgColor="bg-white"
            />
            <p className={helperTextClassName}>
              Visible en eventos, equipos y entradas. Máximo 15 caracteres, sin espacios.
            </p>
          </div>
        </fieldset>

        <fieldset className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
          <legend className="sr-only">Datos personales</legend>
          <div>
            <div className="flex items-center gap-2 text-mulberry">
              <PhoneIcon aria-hidden="true" className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-slate-900">Datos personales</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Información privada para completar tus inscripciones de forma segura.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
            <div>
              <InternationalPhoneField
                id="profile-phone"
                label="Celular"
                required
                value={phone}
                onChange={(nextPhone) => {
                  setPhone(nextPhone);
                  if (phoneError) setPhoneError('');
                }}
                onBlur={() => {
                  if (!phone.trim()) {
                    setPhoneError('Ingresa un celular válido.');
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

            <div>
              <BirthDatePicker
                id="profile-birth-date"
                label="Fecha de nacimiento"
                name="birth_date"
                value={birthDate}
                minDate="1900-01-01"
                maxDate={maxBirthDate}
                helperText="Debes tener 18 años o más para usar Peloteras."
                required
                onChange={(nextBirthDate) => {
                  setBirthDate(nextBirthDate);
                  if (birthDateError) setBirthDateError('');
                }}
                errorText={birthDateError}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-8">
          <legend className="sr-only">Perfil futbolístico</legend>
          <div>
            <div className="flex items-center gap-2 text-mulberry">
              <TrophyIcon aria-hidden="true" className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-slate-900">Perfil futbolístico</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Tus preferencias para encontrar experiencias que encajen contigo.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
            <div>
              <SelectComponent
                labelText="¿Cuál es tu nivel?"
                options={levelsOptions ?? []}
                control={control}
                name="level_id"
                isSearchable={false}
                required
                errorText={errors.level_id?.message as string | undefined}
                selectProps={{ inputId: 'profile-level', instanceId: 'profile-level' }}
              />
              <p className={helperTextClassName}>
                {levelValue ? 'Puedes cambiarlo cuando quieras.' : 'Selecciona tu nivel actual.'}
              </p>
            </div>

            <div>
              <SelectComponent
                labelText="¿En qué posición prefieres jugar?"
                options={playerPositionOptions ?? []}
                control={control}
                isSearchable={false}
                name="positions"
                isMulti
                required
                errorText={errors.positions?.message as string | undefined}
                selectProps={{ inputId: 'profile-positions', instanceId: 'profile-positions' }}
              />
              <p className={helperTextClassName}>
                {Array.isArray(positionsValue) && positionsValue.length > 0
                  ? `${positionsValue.length} posición(es) seleccionada(s).`
                  : 'Selecciona una o más posiciones para que te encuentren más rápido.'}
              </p>
            </div>
          </div>
        </fieldset>
      </div>

      {hasValidationErrors && (
        <div
          role="alert"
          className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6"
        >
          Revisa los campos señalados antes de guardar tus cambios.
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-700">
            <LockClosedIcon aria-hidden="true" className="h-4 w-4 text-mulberry" />
            <p className="text-sm font-semibold">Privacidad de tus datos</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tu celular y fecha de nacimiento son privados. Tu usuario y perfil futbolístico pueden mostrarse en eventos y equipos.
          </p>
          <p
            role="status"
            aria-live="polite"
            className={`mt-2 text-xs font-semibold ${
              hasUnsavedChanges
                ? 'text-amber-700'
                : saveStatus === 'saved'
                  ? 'text-emerald-700'
                  : 'text-slate-500'
            }`}
          >
            {hasUnsavedChanges
              ? 'Tienes cambios sin guardar.'
              : saveStatus === 'saved'
                ? 'Todos los cambios están guardados.'
                : 'Tu perfil está actualizado.'}
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 w-full min-w-[180px] items-center justify-center gap-2 rounded-xl bg-btnBg-light px-5 text-sm font-semibold text-white transition-colors hover:bg-btnBg-dark hover:shadow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mulberry/15 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
          disabled={isLoading || !hasUnsavedChanges || !isCatalogReady}
        >
          {isLoading && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {isLoading ? 'Guardando cambios…' : 'Guardar cambios'}
        </button>
      </div>

      {hasUnsavedChanges && isCatalogReady && (
        <>
          <div className="h-20 md:hidden" aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-200 bg-white/95 px-5 py-3 shadow-[0_-12px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur md:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
              <p className="text-xs font-semibold text-amber-700">Cambios pendientes</p>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-10 min-w-[132px] items-center justify-center gap-2 rounded-xl bg-btnBg-light px-4 text-sm font-semibold text-white transition-colors hover:bg-btnBg-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                )}
                {isLoading ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}
    </form>
  );
}
