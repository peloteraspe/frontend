'use client';

import { useState, useTransition } from 'react';
import {
  ADMIN_FEATURE_FLAG_KEYS,
  ORGANIZER_STATUSES,
  type OrganizerListItem,
  type PartnerLeadListItem,
} from '@modules/admin/model/organizers';

type ActionResult = {
  ok: boolean;
  message: string;
};

type Props = {
  organizers: OrganizerListItem[];
  partnerLeads: PartnerLeadListItem[];
  onCreateOrganizer: (formData: FormData) => Promise<ActionResult>;
  onUpdateOrganizer: (formData: FormData) => Promise<ActionResult>;
  onToggleFlag: (formData: FormData) => Promise<ActionResult>;
};

const flagLabels: Record<string, string> = {
  can_create_events: 'Crear eventos',
  can_manage_own_events: 'Gestionar propios',
  can_view_participants: 'Ver participantes',
  can_manage_payments: 'Gestionar pagos',
  can_scan_tickets: 'Escanear tickets',
  can_manage_finances: 'Ver finanzas',
  can_view_reports: 'Ver reportes',
  can_manage_organizers: 'Gestionar organizadoras',
};

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
}

function Message({ result }: { result: ActionResult | null }) {
  if (!result) return null;

  return (
    <div
      className={[
        'rounded-xl border px-3 py-2 text-sm',
        result.ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-amber-200 bg-amber-50 text-amber-900',
      ].join(' ')}
    >
      {result.message}
    </div>
  );
}

export default function OrganizersAdminManager({
  organizers,
  partnerLeads,
  onCreateOrganizer,
  onUpdateOrganizer,
  onToggleFlag,
}: Props) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<ActionResult>) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await action();
      setResult(nextResult);
    });
  }

  return (
    <div className="space-y-6">
      <Message result={result} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-mulberry">Organizadoras</h2>
          <p className="text-sm text-slate-600">
            Estado de negocio y funciones operativas habilitadas por superadmin.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Organizadora</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Datos</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Notas</th>
                <th className="min-w-[320px] px-4 py-3 text-left font-semibold text-slate-700">Flags</th>
              </tr>
            </thead>
            <tbody>
              {organizers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Todavia no hay organizadoras creadas.
                  </td>
                </tr>
              ) : (
                organizers.map((organizer) => (
                  <tr key={organizer.id} className="border-t border-slate-100">
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-900">{organizer.displayName}</div>
                      <div className="mt-1 text-xs text-slate-500">Creada: {formatDate(organizer.createdAt)}</div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        {organizer.contactEmail ? <div>{organizer.contactEmail}</div> : null}
                        {organizer.contactPhone ? <div>{organizer.contactPhone}</div> : null}
                        {organizer.userId ? (
                          <div className="font-mono text-[11px] text-slate-500">{organizer.userId}</div>
                        ) : (
                          <div className="text-amber-700">Sin usuaria vinculada</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <form
                        className="space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          runAction(() => onUpdateOrganizer(new FormData(event.currentTarget)));
                        }}
                      >
                        <input type="hidden" name="organizerId" value={organizer.id} />
                        <input type="hidden" name="internalNotes" value={organizer.internalNotes || ''} />
                        <select
                          name="status"
                          defaultValue={organizer.status}
                          disabled={isPending}
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-mulberry focus:outline-none focus:ring-2 focus:ring-mulberry/20"
                        >
                          {ORGANIZER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="inline-flex h-9 items-center justify-center rounded-md bg-mulberry px-3 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Guardar
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      <div>Source: {organizer.source}</div>
                      <div>Zona: {organizer.zone || 'Sin dato'}</div>
                      <div>Experiencia: {organizer.experienceLevel || 'Sin dato'}</div>
                      <div>Lead: {organizer.partnerLeadId || 'Sin lead'}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <form
                        className="space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          runAction(() => onUpdateOrganizer(new FormData(event.currentTarget)));
                        }}
                      >
                        <input type="hidden" name="organizerId" value={organizer.id} />
                        <input type="hidden" name="status" value={organizer.status} />
                        <textarea
                          name="internalNotes"
                          defaultValue={organizer.internalNotes || ''}
                          rows={4}
                          disabled={isPending}
                          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-mulberry focus:outline-none focus:ring-2 focus:ring-mulberry/20"
                          placeholder="Notas internas"
                        />
                        <button
                          type="submit"
                          disabled={isPending}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Guardar notas
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {!organizer.userId ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          Vincula una usuaria antes de asignar funciones.
                        </div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {ADMIN_FEATURE_FLAG_KEYS.map((flagKey) => {
                            const enabled = Boolean(organizer.flags?.[flagKey]);
                            return (
                              <form
                                key={flagKey}
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  runAction(() => onToggleFlag(new FormData(event.currentTarget)));
                                }}
                              >
                                <input type="hidden" name="userId" value={organizer.userId || ''} />
                                <input type="hidden" name="flagKey" value={flagKey} />
                                <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
                                <button
                                  type="submit"
                                  role="switch"
                                  aria-checked={enabled}
                                  disabled={isPending}
                                  className={[
                                    'flex min-h-[42px] w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
                                    enabled
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
                                  ].join(' ')}
                                >
                                  <span>{flagLabels[flagKey]}</span>
                                  <span
                                    className={[
                                      'h-2.5 w-2.5 shrink-0 rounded-full',
                                      enabled ? 'bg-emerald-500' : 'bg-slate-300',
                                    ].join(' ')}
                                  />
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-mulberry">Postulantes</h2>
          <p className="text-sm text-slate-600">
            Postulaciones admin desde partner_leads disponibles para crear una organizadora piloto.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Postulante</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Datos</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Accion</th>
              </tr>
            </thead>
            <tbody>
              {partnerLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No hay postulaciones admin para mostrar.
                  </td>
                </tr>
              ) : (
                partnerLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-slate-100">
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-900">{lead.displayName}</div>
                      <div className="mt-1 text-xs text-slate-500">Recibida: {formatDate(lead.createdAt)}</div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        {lead.contactEmail ? <div>{lead.contactEmail}</div> : null}
                        {lead.contactPhone ? <div>{lead.contactPhone}</div> : null}
                        {lead.userId ? <div className="font-mono text-[11px]">{lead.userId}</div> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      <div>Source: {lead.source}</div>
                      <div>Zona: {lead.zone || 'Sin dato'}</div>
                      <div>Experiencia: {lead.experienceLevel || 'Sin dato'}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {lead.status}
                      </span>
                      {lead.linkedOrganizerId ? (
                        <div className="mt-2 text-xs text-emerald-700">Ya vinculada a organizadora.</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          runAction(() => onCreateOrganizer(new FormData(event.currentTarget)));
                        }}
                      >
                        <input type="hidden" name="leadId" value={lead.id} />
                        <button
                          type="submit"
                          disabled={isPending || Boolean(lead.linkedOrganizerId)}
                          className="inline-flex h-9 items-center justify-center rounded-md bg-mulberry px-3 text-sm font-semibold text-white transition hover:bg-[#470760] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Crear piloto
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
