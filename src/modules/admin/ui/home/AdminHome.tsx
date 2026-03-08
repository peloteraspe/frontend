import Link from 'next/link';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';

export default async function AdminHome() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canViewUsersModule = isSuperAdmin(user as any);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/admin/events" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Eventos</h2>
        <p className="text-sm text-gray-600">Crear, editar y administrar eventos.</p>
      </Link>

      {canViewUsersModule ? (
        <Link href="/admin/users" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
          <h2 className="text-lg font-semibold text-mulberry">Usuarios</h2>
          <p className="text-sm text-gray-600">Ver perfiles y asignar roles.</p>
        </Link>
      ) : null}

      <Link href="/admin/payments" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Pagos</h2>
        <p className="text-sm text-gray-600">Aprobar o rechazar pagos pendientes.</p>
      </Link>

      <Link href="/admin/payment-methods" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Formas de pago</h2>
        <p className="text-sm text-gray-600">Configurar Yape y Plin por evento.</p>
      </Link>

      <Link href="/admin/scan" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Validar QR</h2>
        <p className="text-sm text-gray-600">Escanear o pegar token para marcar entradas como usadas.</p>
      </Link>

      <Link href="/admin/wallet" className="block rounded-lg bg-white shadow p-4 hover:shadow-md">
        <h2 className="text-lg font-semibold text-mulberry">Google Wallet</h2>
        <p className="text-sm text-gray-600">Conectar issuer y seleccionar clase activa desde panel.</p>
      </Link>
    </div>
  );
}
