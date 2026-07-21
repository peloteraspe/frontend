'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { getBrowserSupabase } from '@core/api/supabase.browser';
import { useAuth } from '@core/auth/AuthProvider';
import Input from '@core/ui/Input';
import InternationalPhoneField from '@core/ui/InternationalPhoneField';
import { normalizePhoneMetadata, validateInternationalPhone } from '@shared/lib/phone';
import {
  type EventProfileIntent,
  getMissingEventProfileFields,
  getTodayDateInputValue,
  validateBirthDate,
} from '@modules/users/lib/eventProfileRequirements';

type Props = {
  intent: EventProfileIntent;
  nextPath: string;
  cancelPath: string;
  initialPhone?: string;
  initialBirthDate?: string;
};

const copyByIntent: Record<
  EventProfileIntent,
  { eyebrow: string; title: string; description: string; submit: string }
> = {
  join_event: {
    eyebrow: 'Inscripción al evento',
    title: 'Completa tus datos para inscribirte',
    description:
      'Necesitamos estos datos antes de registrar tu inscripción. Al guardarlos, continuarás automáticamente.',
    submit: 'Guardar y continuar',
  },
  create_event: {
    eyebrow: 'Crear evento',
    title: 'Completa tus datos para crear un evento',
    description:
      'Necesitamos estos datos antes de abrir el formulario del evento. Al guardarlos, continuarás automáticamente.',
    submit: 'Guardar y crear evento',
  },
};

export default function EventProfileCompletionGateway({
  intent,
  nextPath,
  cancelPath,
  initialPhone = '',
  initialBirthDate = '',
}: Props) {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [phoneError, setPhoneError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [pending, setPending] = useState(false);
  const copy = copyByIntent[intent];
  const maxBirthDate = useMemo(() => getTodayDateInputValue(), []);
  const initiallyMissing = useMemo(
    () =>
      getMissingEventProfileFields({
        user_metadata: {
          phone: initialPhone,
          birth_date: initialBirthDate,
        },
      }),
    [initialBirthDate, initialPhone]
  );
  const requirementExplanation = initiallyMissing.phone
    ? initiallyMissing.birthDate
      ? 'Tu celular se usa para coordinación del evento y tu fecha de nacimiento para mantener tus datos de participación completos.'
      : 'Tu celular se usa para la coordinación relacionada con tus eventos.'
    : 'Tu fecha de nacimiento mantiene completos tus datos de participación.';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) {
        router.replace(cancelPath);
      }
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [cancelPath, pending, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phoneValidation = validateInternationalPhone(phone);
    const birthDateValidation = validateBirthDate(birthDate, maxBirthDate);
    const nextPhoneError = phoneValidation.isValid ? '' : 'Ingresa un celular válido.';
    const nextBirthDateError =
      birthDateValidation.ok === true ? '' : birthDateValidation.message;
    setPhoneError(nextPhoneError);
    setBirthDateError(nextBirthDateError);

    if (nextPhoneError || nextBirthDateError || birthDateValidation.ok === false) return;

    setPending(true);
    try {
      const supabase = getBrowserSupabase();
      const currentMetadata = normalizePhoneMetadata(user?.user_metadata);
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          phone: phoneValidation.e164,
          birth_date: birthDateValidation.value,
        },
      });

      if (error) throw error;

      await refreshProfile().catch(() => undefined);
      toast.success('Datos guardados. Ya puedes continuar.');
      router.replace(nextPath);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || 'No pudimos guardar tus datos. Intenta nuevamente.');
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    if (pending) return;
    router.replace(cancelPath);
  }

  return (
    <main className="min-h-[70vh] bg-slate-50/70" aria-label="Completar datos personales">
      <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-900/70 px-4 py-8 backdrop-blur-[2px]">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-profile-completion-title"
          className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)] sm:p-7"
        >
          <button
            type="button"
            aria-label="Cerrar"
            disabled={pending}
            onClick={handleCancel}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="pr-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mulberry">
              {copy.eyebrow}
            </p>
            <h1
              id="event-profile-completion-title"
              className="mt-2 text-2xl font-eastman-extrabold leading-tight text-slate-900"
            >
              {copy.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.description}</p>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
            {initiallyMissing.phone ? (
              <InternationalPhoneField
                label="Número de celular"
                name="phone"
                placeholder="999 999 999"
                value={phone}
                onChange={(nextPhone) => {
                  setPhone(nextPhone);
                  if (phoneError) setPhoneError('');
                }}
                onBlur={() => {
                  const validation = validateInternationalPhone(phone);
                  setPhoneError(validation.isValid ? '' : 'Ingresa un celular válido.');
                }}
                errorText={phoneError}
                size="lg"
                required
              />
            ) : null}

            {initiallyMissing.birthDate ? (
              <Input
                label="Fecha de nacimiento"
                name="birth_date"
                type="date"
                value={birthDate}
                min="1900-01-01"
                max={maxBirthDate}
                required
                autoComplete="bday"
                onChange={(event) => {
                  setBirthDate(event.currentTarget.value);
                  if (birthDateError) setBirthDateError('');
                }}
                onBlur={() => {
                  const validation = validateBirthDate(birthDate, maxBirthDate);
                  setBirthDateError(validation.ok === true ? '' : validation.message);
                }}
                errorText={birthDateError}
              />
            ) : null}

            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              {requirementExplanation}
            </p>

            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-12 items-center justify-center rounded-full bg-mulberry px-6 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? 'Guardando...' : copy.submit}
            </button>

            <button
              type="button"
              disabled={pending}
              onClick={handleCancel}
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
            >
              Ahora no
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
