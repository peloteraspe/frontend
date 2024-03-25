'use client';

import { Title2XL } from '@/components/atoms/Typography';
import { ButtonWrapper } from '@/components/Button';
import Input from '@/components/Input';
import { useState, useEffect } from 'react';
import { signIn } from './auth';
import toast from 'react-hot-toast';

export default function Login({
  searchParams,
}: {
  searchParams: { message: string };
}) {
  const [buttonText, setButtonText] = useState('Obtener enlace mágico');
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission
    setButtonText('Cargando...'); 

    if (!emailValue) {
      // Verifica si el campo de correo electrónico está vacío
      setEmailError(true); // Establece el estado de error en true
      setButtonText('Obtener enlace mágico'); // Restablece el texto del botón
      return; // Detiene la función si hay un error
    }

    try {
      console.log(emailValue, 'email');
      const response = await signIn(emailValue);
      console.log(response, 'response');
      toast.success(
        '¡Enlace enviado! Revisa tu correo para ingresar a tu cuenta'
      );
      setButtonText('Enlace mágico enviado');
    } catch (error) {
      console.error('Error during sign in:', error);
      toast.error(
        'Hubo un error al enviar el enlace. Por favor, inténtalo de nuevo.'
      ); // Display error toast
      setButtonText('Obtener enlace mágico'); // Reset button text on error
    }
  };

  const handleEmailErrorChange = (error: boolean) => {
    setEmailError(error);
    console.log(error);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValue(e.target.value);
    setEmailError(false);
  };

  return (
    <div className="flex flex-col justify-center items-center w-full gap-8 h-[calc(100vh-6rem)]">
      <div className="flex flex-col items-center">
        <Title2XL>Bienvenida a</Title2XL>
        <Title2XL color="text-mulberry">Peloteras</Title2XL>
      </div>
      <div className="flex flex-col items-center">
        <form
          className="flex flex-col gap-4 w-full"
          onSubmit={handleSignIn} // Use onSubmit instead of action and method
        >
          <Input
            className="form-input w-full ring-secondary focus:ring-secondary-dark"
            labelText="Correo electrónico"
            type="email"
            name="email"
            placeholderText="Ingresa tu correo"
            value={emailValue}
            setFormValue={setEmailValue}
            onErrorChange={handleEmailErrorChange}
            errorText="Debes ingresar un correo "
            error={emailError}
            onChange={handleEmailChange}
            required
          />
          <div className="flex flex-col items-center w-80">
            <ButtonWrapper width={'full'} disabled={emailError}>
              {buttonText}
            </ButtonWrapper>{' '}
            {/* Use buttonText state for button text */}
          </div>
        </form>
      </div>

      {searchParams?.message && (
        <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center">
          {searchParams.message}
        </p>
      )}
    </div>
  );
}
