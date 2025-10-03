// app/signUp/page.tsx
import { Suspense } from 'react';
import SignupClient from './SignupClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Cargando…</div>}>
      <SignupClient />
    </Suspense>
  );
}
