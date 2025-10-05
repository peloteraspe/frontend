"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6">
      <div>
        <h2 className="text-2xl font-semibold">Algo salió mal</h2>
        <p className="mt-2 text-gray-600 break-all">{error?.message}</p>
        <button onClick={() => reset()} className="mt-6 inline-block text-white bg-primary px-4 py-2 rounded-md">
          Reintentar
        </button>
      </div>
    </div>
  );
}
