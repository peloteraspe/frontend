'use client';

import { useEffect, useState } from 'react';
import UsersBroadcastPanel from '@modules/admin/ui/users/UsersBroadcastPanel';

type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

type Props = {
  users: AdminUserListItem[];
  canManageAdmins: boolean;
  defaultSubject: string;
  defaultBody: string;
  onToggleAdmin: (formData: FormData) => void | Promise<void>;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function UsersAdminManager({
  users,
  canManageAdmins,
  defaultSubject,
  defaultBody,
  onToggleAdmin,
}: Props) {
  const selectableUserIds = users.filter((user) => isValidEmail(user.email)).map((user) => user.id);
  const selectableUserIdSet = new Set(selectableUserIds);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedUserIds((current) => current.filter((userId) => selectableUserIdSet.has(userId)));
  }, [users]);

  const selectedUserIdSet = new Set(selectedUserIds);
  const selectedCount = selectedUserIds.length;
  const totalSelectableCount = selectableUserIds.length;
  const allSelectableSelected =
    totalSelectableCount > 0 && selectableUserIds.every((userId) => selectedUserIdSet.has(userId));

  return (
    <div className="space-y-5">
      {canManageAdmins ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Selección para correo</p>
              <p className="mt-1 text-sm text-slate-600">
                Marca 1 o más usuarias y el correo solo se enviará a esa selección.
              </p>
            </div>

            <UsersBroadcastPanel
              defaultSubject={defaultSubject}
              defaultBody={defaultBody}
              selectedUserIds={selectedUserIds}
              selectedCount={selectedCount}
              totalSelectableCount={totalSelectableCount}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">
              Seleccionadas: {selectedCount}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-slate-700">
              Con correo válido: {totalSelectableCount}
            </span>
            <button
              type="button"
              onClick={() => setSelectedUserIds(allSelectableSelected ? [] : selectableUserIds)}
              disabled={totalSelectableCount === 0}
              className={[
                'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition',
                totalSelectableCount > 0
                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              {allSelectableSelected ? 'Limpiar selección' : 'Seleccionar todas'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-16 px-4 py-3 text-left font-semibold text-slate-700">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas las usuarias con correo válido"
                  checked={allSelectableSelected}
                  disabled={totalSelectableCount === 0}
                  onChange={(event) => {
                    setSelectedUserIds(event.target.checked ? selectableUserIds : []);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Correo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No hay usuarias para mostrar.
                </td>
              </tr>
            ) : (
              users.map((row) => {
                const nextAdminValue = row.isAdmin ? 'false' : 'true';
                const isDisabled = !canManageAdmins || row.isSuperAdmin;
                const canReceiveEmail = isValidEmail(row.email);

                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar a ${row.name}`}
                        checked={selectedUserIdSet.has(row.id)}
                        disabled={!canReceiveEmail}
                        onChange={(event) => {
                          setSelectedUserIds((current) => {
                            if (event.target.checked) {
                              if (current.includes(row.id)) return current;
                              return [...current, row.id];
                            }

                            return current.filter((userId) => userId !== row.id);
                          });
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-mulberry focus:ring-mulberry/30 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
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
                    <td className="px-4 py-3 text-slate-700">
                      <div>{row.email}</div>
                      {!canReceiveEmail ? (
                        <p className="mt-1 text-xs text-amber-700">Correo inválido para envío.</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <form action={onToggleAdmin}>
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
