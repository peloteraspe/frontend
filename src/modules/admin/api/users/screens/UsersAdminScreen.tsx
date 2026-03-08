import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@core/api/supabase.server';
import { isSuperAdmin } from '@shared/lib/auth/isAdmin';
import { getAdminUsersList, setAdminRoleByUserId } from '@modules/admin/api/users/services/adminUsers.service';

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
          Lista de jugadoras con correo y estado admin.
        </p>
      </div>

      {!canManageAdmins ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Solo superadmin puede activar o desactivar permisos admin.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Correo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No hay usuarias para mostrar.
                </td>
              </tr>
            ) : (
              users.map((row) => {
                const nextAdminValue = row.isAdmin ? 'false' : 'true';
                const isDisabled = !canManageAdmins || row.isSuperAdmin;

                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{row.name}</span>
                        {row.isSuperAdmin ? (
                          <span className="rounded-full bg-mulberry/10 px-2 py-0.5 text-xs font-semibold text-mulberry">
                            Superadmin
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.email}</td>
                    <td className="px-4 py-3">
                      <form action={handleToggleAdmin}>
                        <input type="hidden" name="userId" value={row.id} />
                        <input type="hidden" name="enableAdmin" value={nextAdminValue} />
                        <button
                          type="submit"
                          role="switch"
                          aria-checked={row.isAdmin}
                          disabled={isDisabled}
                          className={[
                            'relative inline-flex h-7 w-14 items-center rounded-full transition',
                            row.isAdmin ? 'bg-emerald-500' : 'bg-slate-300',
                            isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'inline-block h-5 w-5 transform rounded-full bg-white transition',
                              row.isAdmin ? 'translate-x-8' : 'translate-x-1',
                            ].join(' ')}
                          />
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
