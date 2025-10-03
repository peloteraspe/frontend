'use client';

import React, { useEffect, useState } from 'react';
import SelectComponent, { OptionSelect } from '@/components/SelectComponent';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { ParagraphM, Title2XL } from '@/components/atoms/Typography';
import Input from '@/components/Input';
import { ButtonWrapper } from '@/components/Button';
import { ProfileRequestBody } from '@/utils/interfaces';
import { createProfile } from '../_actions/profile';
import { useForm } from 'react-hook-form';

type FormValues = {
  username: string;
  player_position: OptionSelect[]; // SelectComponent (multi) guarda array de opciones
  level_id: OptionSelect | null; // SelectComponent (single) guarda opción o null
};

const UpdateProfile = ({ user }: { user: { id: string } }) => {
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      username: '',
      player_position: [],
      level_id: null,
    },
  });

  const [positions, setPositions] = useState<OptionSelect[]>([]);
  const [levels, setLevels] = useState<OptionSelect[]>([]);
  const [buttonText, setButtonText] = useState('Crear cuenta');
  const [loading, setLoading] = useState(false);

  // Cargar opciones desde Supabase
  useEffect(() => {
    const fetchPosiciones = async () => {
      const { data, error } = await supabase.from('player_position').select('id, name');
      if (error) {
        console.error('Error fetching positions:', error);
        return;
      }
      const options = (data ?? []).map((p) => ({
        key: p.id,
        value: p.id,
        label: p.name,
      }));
      setPositions(options);
    };

    const fetchLevels = async () => {
      const { data, error } = await supabase.from('level').select('id, name');
      if (error) {
        console.error('Error fetching levels:', error);
        return;
      }
      const options = (data ?? []).map((l) => ({
        key: l.id,
        value: l.id,
        label: l.name,
      }));
      setLevels(options);
    };

    fetchPosiciones();
    fetchLevels();
  }, [supabase]);

  // Helper de conversión segura a number
  const toNumber = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const payload: ProfileRequestBody = {
        user: user?.id,
        username: data.username,
        level_id: toNumber(data.level_id?.value) ?? -1, // si es obligatorio, valida antes
        player_position: (data.player_position ?? [])
          .map((opt) => toNumber(opt.value))
          .filter((n): n is number => typeof n === 'number'),
      };

      await createProfile(payload);
      toast.success('Perfil actualizado exitosamente');
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (String(error).includes('profile_username_key')) {
        toast.error('El nombre de usuario ya está en uso, por favor elige otro.');
      } else {
        toast.error('No se pudo actualizar el perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 h-[calc(100vh-6rem)]">
      <div className="flex flex-col items-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>

      <div className="flex flex-col items-center">
        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Username */}
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

          {/* Positions (multi) - SelectComponent maneja Controller internamente usando 'control' y 'name' */}
          <label className="w-full">
            <div className="mb-1">
              <ParagraphM fontWeight="semibold">
                ¿En qué posición prefieres jugar?
                <span className="text-red-500"> *</span>
              </ParagraphM>
            </div>
            <SelectComponent options={positions} isMulti control={control} name="player_position" />
          </label>

          {/* Level (single) */}
          <label className="w-full">
            <div className="mb-1">
              <ParagraphM fontWeight="semibold">
                Nivel de juego
                <span className="text-red-500"> *</span>
              </ParagraphM>
            </div>
            <SelectComponent options={levels} control={control} name="level_id" />
          </label>

          <div className="flex flex-col items-center w-80">
            <ButtonWrapper width="full" disabled={loading || isSubmitting} className="h-11">
              {loading || isSubmitting ? 'Actualizando...' : buttonText}
            </ButtonWrapper>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
