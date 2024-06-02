'use client';
import { useForm } from 'react-hook-form';
import { Title2XL } from '@/components/atoms/Typography';
import { ButtonWrapper } from '@/components/Button';
import Input from '@/components/Input';
import { useEffect, useState } from 'react';
import { signIn } from './auth';
import toast from 'react-hot-toast';

export default function Login() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();
  const emailValue = watch('email');
  const [buttonText, setButtonText] = useState('Obtener enlace mágico');

  const handleSignIn = async (data) => {
    setButtonText('Cargando...');

    if (!data.email) {
      toast.error('Debes ingresar un correo válido.');
      setButtonText('Obtener enlace mágico');
      return;
    }

    try {
      await signIn(data.email);
      toast.success('¡Enlace enviado! Revisa tu correo para ingresar a tu cuenta');
      setButtonText('Enlace mágico enviado');
    } catch (error) {
      console.error('Error during sign in:', error);
      toast.error('Hubo un error al enviar el enlace. Por favor, inténtalo de nuevo.');
      setButtonText('Obtener enlace mágico');
    }
  };

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 h-[calc(100vh-6rem)]">
      <div className="flex flex-col items-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>
      <div className="flex flex-col items-center">
        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(handleSignIn)}>
          <Input
            register={register}
            errors={errors}
            name="email"
            label="Correo electrónico"
            type="email"
            placeholder="Ingresa tu correo"
            required
            error={errors.email}
          />
          <div className="flex flex-col items-center w-80">
            <ButtonWrapper width={'full'} disabled={!emailValue}>
              {buttonText}
            </ButtonWrapper>
          </div>
        </form>
      </div>
    </div>
  );
}
