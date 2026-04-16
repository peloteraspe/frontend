'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ButtonWrapper } from '@core/ui/Button';
import Badge from '@core/ui/Badge';
import toast from 'react-hot-toast';
import CreateCouponForm, { type CouponEventOption } from './CreateCouponForm';

type Coupon = {
  id: number;
  code: string;
  discount_amount: number;
  event_id: number | null;
  type: 'company' | 'individual';
  company_name: string | null;
  assigned_email: string | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export default function CouponsAdminPage({ eventOptions }: { eventOptions: CouponEventOption[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(true);

  const eventOptionById = useMemo(
    () => new Map(eventOptions.map((event) => [event.id, event])),
    [eventOptions]
  );

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = body?.error || 'Error al cargar cupones.';
        toast.error(message);
        setCoupons([]);
        return;
      }

      if (Array.isArray(body?.coupons)) {
        setCoupons(body.coupons);
      }
    } catch {
      toast.error('Error al cargar cupones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleToggleActive = async (couponId: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error || 'Error al actualizar cupón.');
        return;
      }
      toast.success(currentActive ? 'Cupón desactivado.' : 'Cupón activado.');
      fetchCoupons();
    } catch {
      toast.error('Error al actualizar cupón.');
    }
  };

  const handleDelete = async (couponId: number) => {
    if (!confirm('¿Eliminar este cupón? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/coupons/${couponId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error || 'Error al eliminar cupón.');
        return;
      }
      toast.success('Cupón eliminado.');
      fetchCoupons();
    } catch {
      toast.error('Error al eliminar cupón.');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((coupon) => coupon.is_active).length;
  const eventSpecificCoupons = coupons.filter((coupon) => coupon.event_id !== null).length;

  return (
    <div className="rounded-md bg-white shadow">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cupones de descuento</h2>
            <p className="mt-1 text-sm text-slate-600">
              Administra cupones generales o ligados a un evento sin trabajar con IDs manuales.
            </p>
          </div>

          <ButtonWrapper width="fit-content" onClick={() => setShowCreateForm((current) => !current)}>
            {showCreateForm ? 'Ocultar formulario' : 'Crear cupón'}
          </ButtonWrapper>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalCoupons}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{activeCoupons}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Con evento</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{eventSpecificCoupons}</p>
          </div>
        </div>

        {showCreateForm ? (
          <CreateCouponForm
            eventOptions={eventOptions}
            onCancel={() => setShowCreateForm(false)}
            onCreated={() => {
              fetchCoupons();
            }}
          />
        ) : null}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Cargando cupones...</p>
      ) : coupons.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No hay cupones creados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Empresa / Email</th>
                <th className="px-4 py-2 text-right">Descuento</th>
                <th className="px-4 py-2 text-center">Usos</th>
                <th className="px-4 py-2 text-left">Evento</th>
                <th className="px-4 py-2 text-left">Expira</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-2">
                    {c.type === 'company' ? (
                      <Badge badgeType="Primary" text="Empresa" icon={false} />
                    ) : (
                      <Badge badgeType="Third" text="Individual" icon={false} />
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.type === 'company' ? c.company_name : c.assigned_email}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">S/. {Number(c.discount_amount).toFixed(2)}</td>
                  <td className="px-4 py-2 text-center">
                    {c.current_uses} / {c.max_uses}
                  </td>
                  <td className="px-4 py-2">
                    {c.event_id ? (
                      (() => {
                        const event = eventOptionById.get(String(c.event_id));
                        const eventLabel = event?.title || `Evento #${c.event_id}`;
                        return (
                          <div className="flex flex-col">
                            <Link
                              href={`/events/${c.event_id}`}
                              target="_blank"
                              className="font-medium text-mulberry hover:underline"
                            >
                              {eventLabel}
                            </Link>
                            <span className="text-xs text-slate-500">Cupón ligado a un evento específico</span>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-slate-600">General</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(c.expires_at)}</td>
                  <td className="px-4 py-2 text-center">
                    {c.is_active ? (
                      <Badge badgeType="Third" text="Activo" icon={false} />
                    ) : (
                      <Badge badgeType="Secondary" text="Inactivo" icon={false} />
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c.id, c.is_active)}
                        className="text-xs font-semibold text-mulberry hover:underline"
                      >
                        {c.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      {c.current_uses === 0 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
