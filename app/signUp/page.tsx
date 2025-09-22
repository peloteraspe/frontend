'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

import { Title2XL, ParagraphM } from '@/components/atoms/Typography';
import Input from '@/components/Input';
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';
import { ButtonWrapper } from '@/components/Button';

import { createProfile } from '../_actions/profile';
import { levelFormatted, playerPositionsFormatted } from '@/utils/data';
import { useAuth } from '../provider/AuthProvider';

type Step = 1 | 2;

export default function SignupPage() {
  const sp = useSearchParams();
  const prefilledEmail = (sp.get('email') || '').trim();
  const supabase = createClient();
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // ---------- STEP 1 ----------
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{ username: string; password: string }>({
    defaultValues: { username: '', password: '' },
  });

  const username = watch('username');
  const password = watch('password');

  const isValidEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefilledEmail),
    [prefilledEmail]
  );
  const canSubmitStep1 =
    isValidEmail && (username?.trim().length ?? 0) >= 3 && (password?.length ?? 0) >= 6;

  // ---------- STEP 2 ----------
  const [positions, setPositions] = useState<OptionSelect[]>([]);
  const [levels, setLevels] = useState<OptionSelect[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<OptionSelect[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<OptionSelect | undefined>(undefined);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: posData }, { data: lvlData }] = await Promise.all([
        supabase.from('player_position').select('id, name'),
        supabase.from('level').select('id, name'),
      ]);

      setPositions((posData ?? []).map((p) => ({ key: p.id, value: p.id, label: p.name })));
      setLevels((lvlData ?? []).map((l) => ({ key: l.id, value: l.id, label: l.name })));
    };
    load();
  }, [supabase]);

  const handleStep1 = async (data: { username: string; password: string }) => {
    if (!canSubmitStep1) return;
    setLoading(true);
    try {
      const { data: sign, error } = await supabase.auth.signUp({
        email: prefilledEmail,
        password: data.password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          data: { username: data.username },
        },
      });

      if (error) {
        toast.error(error.message || 'No se pudo crear la cuenta');
        return;
      }

      const uid = sign.user?.id ?? null;
      setUserId(uid);
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error('Error creando la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return toast.error('No se encontró el usuario recién creado.');
    if (!selectedLevel) return toast.error('Selecciona un nivel.');

    setLoading(true);
    try {
      await createProfile({
        user: userId,
        username, // viene del paso 1
        level_id: levelFormatted(selectedLevel),
        player_position: playerPositionsFormatted(selectedPositions),
      });
      toast.success('Cuenta creada 🎉');
      await refreshProfile();
      window.location.href = '/login';
    } catch (err: any) {
      console.error(err);
      if (String(err).includes('profile_username_key')) {
        toast.error('El nombre de usuario ya está en uso, elige otro.');
      } else {
        toast.error('No se pudo crear el perfil.');
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

      {step === 1 ? (
        <div className="w-full max-w-[420px]">
          <p className="text-center text-slate-700 mb-6">
            Completa tus datos por primera vez para que tengas una experiencia personalizada
          </p>

          <form onSubmit={handleSubmit(handleStep1)} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold">Correo</label>
              <input
                value={prefilledEmail}
                readOnly
                className="mt-1 h-11 w-full rounded-xl border px-4 text-[15px] bg-slate-50 border-slate-300"
              />
            </div>

            <Input
              label="Crea un nombre"
              type="text"
              required
              name="username"
              register={register}
              errors={errors}
              error={errors.username}
              placeholder="Ej: Pelotera123"
              bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
            />

            <Input
              label="Contraseña"
              type="password"
              required
              name="password"
              register={register}
              errors={errors}
              error={errors.password}
              placeholder="••••••••"
              bgColor="bg-white ring-secondary focus:ring-secondary-dark border-mulberry"
            />

            <ButtonWrapper
              type="submit"
              width="full"
              className="h-11"
              disabled={loading || !canSubmitStep1}
            >
              {loading ? 'Creando...' : 'Continuar'}
            </ButtonWrapper>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-[420px]">
          <p className="text-center text-slate-700 mb-6">
            Completa tus datos por primera vez para que tengas una experiencia personalizada
          </p>

          <form onSubmit={handleStep2} className="flex flex-col gap-4">
            <label className="w-full">
              <div className="mb-1">
                <ParagraphM fontWeight="semibold">
                  ¿En qué posición prefieres jugar? <span className="text-red-500">*</span>
                </ParagraphM>
              </div>
              <SelectComponent
                options={positions}
                isMulti
                name="player_position"
                // @ts-ignore
                onChange={(opts: OptionSelect[]) => setSelectedPositions(opts)}
              />
            </label>

            <label className="w-full">
              <div className="mb-1">
                <ParagraphM fontWeight="semibold">
                  ¿Cuál es tu nivel? <span className="text-red-500">*</span>
                </ParagraphM>
              </div>
              <SelectComponent
                options={levels}
                name="level_id"
                // @ts-ignore
                onChange={(opt: OptionSelect) => setSelectedLevel(opt)}
              />
            </label>

            <ButtonWrapper type="submit" width="full" className="h-11" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear cuenta'}
            </ButtonWrapper>
          </form>
        </div>
      )}
    </div>
  );
}
