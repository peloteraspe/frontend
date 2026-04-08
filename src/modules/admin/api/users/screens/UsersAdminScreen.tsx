import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getAdminUsersList, setAdminRoleByUserId } from '@modules/admin/api/users/services/adminUsers.service';
import UsersAdminManager from '@modules/admin/ui/users/UsersAdminManager';

const USERS_BROADCAST_DEFAULT_SUBJECT = '📣 Novedades de Peloteras';
const USERS_BROADCAST_DEFAULT_BODY = `Hola,

Queremos compartirte una actualización de Peloteras.

[Escribe aquí tu mensaje para las usuarias seleccionadas.]

Gracias por ser parte de esta comunidad 💜⚽

Equipo Peloteras
Más jugadoras, más fútbol`;

export default async function UsersAdminScreen() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canManageAdmins = isSuperAdmin(user as any);
  const users = await getAdminUsersList();

  async function handleToggleAdmin(formData: FormData) {
    'use server';

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!isSuperAdmin(user as any)) {
      throw new Error('Solo superadmin puede cambiar permisos admin.');
    }

    const userId = String(formData.get('userId') || '').trim();
    const enableAdmin = String(formData.get('enableAdmin') || '') === 'true';

    await setAdminRoleByUserId(userId, enableAdmin);
    revalidatePath('/admin/users');
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-mulberry">Usuarios</h2>
        <p className="text-sm text-slate-600">
          Lista de jugadoras con correo, estado admin y última solicitud admin vinculada.
        </p>
      </div>

      {!canManageAdmins ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Solo superadmin puede activar o desactivar permisos admin.
        </div>
      ) : null}

      <UsersAdminManager
        users={users}
        canManageAdmins={canManageAdmins}
        defaultSubject={USERS_BROADCAST_DEFAULT_SUBJECT}
        defaultBody={USERS_BROADCAST_DEFAULT_BODY}
        onToggleAdmin={handleToggleAdmin}
      />
    </div>
  );
}
