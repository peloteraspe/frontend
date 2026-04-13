'use client';

import Image from 'next/image';

import soccerBall from '@core/assets/soccer-ball.svg';

type AuthRedirectLoaderProps = {
  visible: boolean;
  message?: string | null;
};

export default function AuthRedirectLoader({
  visible,
  message = 'Redirigiendo...',
}: AuthRedirectLoaderProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-white/70 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={message || 'Redirigiendo'}
    >
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-6 py-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
          <Image
            src={soccerBall}
            alt="Redirigiendo"
            width={56}
            height={56}
            priority
            className="animate-spin"
          />
        </div>
        <p className="text-sm font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
}
