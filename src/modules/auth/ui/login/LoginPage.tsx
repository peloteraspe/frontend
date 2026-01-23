'use client';

import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center w-full gap-8 min-h-[calc(100vh-6rem)] px-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mulberry" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
