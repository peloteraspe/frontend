'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatusBadge } from '@core/ui/Badge';
import toast from 'react-hot-toast';
import {
  getCouponReimbursementStatusLabel,
  getCouponReimbursementStatusVariant,
  type CouponReimbursementStatus,
} from '@modules/payments/lib/couponReimbursement';

type Redemption = {
  id: number;
  coupon_id: number;
  user_id: string;
  event_id: number;
  assistant_id: number;
  discount_applied: number;
  organizer_user_id: string;
  reimbursement_status: CouponReimbursementStatus;
  reimbursed_at: string | null;
  redeemed_at: string;
  // Joined fields
  coupon_code?: string;
  player_name?: string;
  player_email?: string;
  event_title?: string;
  organizer_name?: string;
  organizer_email?: string;
};

export default function ReimbursementsTab({ eventId }: { eventId: string }) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'requested' | 'sent' | 'confirmed' | 'all'>('requested');
  const [confirming, setConfirming] = useState<number | null>(null);

  const fetchRedemptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventId) params.set('eventId', eventId);
      if (filter !== 'all') params.set('status', filter);

      const res = await fetch(`/api/coupons/reimburse?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body?.redemptions)) {
        setRedemptions(body.redemptions);
      }
    } catch {
      toast.error('Error al cargar reembolsos.');
    } finally {
      setLoading(false);
    }
  }, [eventId, filter]);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  const handleMarkSent = async (redemptionId: number) => {
    setConfirming(redemptionId);
    try {
      const res = await fetch('/api/coupons/reimburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId, action: 'mark_sent' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error || 'Error al marcar el abono como enviado.');
        return;
      }

      toast.success('Abono marcado como enviado.');
      fetchRedemptions();
    } catch {
      toast.error('Error de conexión.');
    } finally {
      setConfirming(null);
    }
  };

  const requestedTotal = redemptions
    .filter((r) => r.reimbursement_status === 'requested')
    .reduce((sum, r) => sum + Number(r.discount_applied), 0);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          {(['requested', 'sent', 'confirmed', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                filter === f
                  ? 'bg-mulberry text-white border-mulberry'
                  : 'bg-white text-mulberry border-mulberry/40'
              }`}
            >
              {f === 'requested'
                ? 'Solicitados'
                : f === 'sent'
                  ? 'Enviados'
                  : f === 'confirmed'
                    ? 'Confirmados'
                    : 'Todos'}
            </button>
          ))}
        </div>
        {requestedTotal > 0 && (
          <div className="text-sm font-semibold text-amber-700">
            Total por enviar: S/. {requestedTotal.toFixed(2)}
          </div>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Cargando reembolsos...</p>
      ) : redemptions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No hay reembolsos{' '}
          {filter === 'requested'
            ? 'solicitados'
            : filter === 'sent'
              ? 'enviados'
              : filter === 'confirmed'
                ? 'confirmados'
                : ''}{' '}
          para este evento.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Evento</th>
                <th className="px-4 py-2 text-left">Jugadora</th>
                <th className="px-4 py-2 text-left">Organizadora</th>
                <th className="px-4 py-2 text-left">Cupón</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-left">Fecha uso</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    <span className="font-medium">{r.event_title || `Evento #${r.event_id}`}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.player_name || r.user_id}</span>
                      {r.player_email && (
                        <span className="text-xs text-slate-500">{r.player_email}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.organizer_name || r.organizer_user_id}</span>
                      {r.organizer_email && (
                        <span className="text-xs text-slate-500">{r.organizer_email}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.coupon_code || `#${r.coupon_id}`}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    S/. {Number(r.discount_applied).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(r.redeemed_at)}</td>
                  <td className="px-4 py-2 text-center">
                    <StatusBadge
                      variant={getCouponReimbursementStatusVariant(r.reimbursement_status)}
                      size="sm"
                    >
                      {getCouponReimbursementStatusLabel(r.reimbursement_status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.reimbursement_status === 'requested' ? (
                      <button
                        type="button"
                        onClick={() => handleMarkSent(r.id)}
                        disabled={confirming === r.id}
                        className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                      >
                        {confirming === r.id ? 'Actualizando...' : 'Marcar como enviado'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {r.reimbursement_status === 'sent' || r.reimbursement_status === 'confirmed'
                          ? formatDate(r.reimbursed_at)
                          : 'Sin acción'}
                      </span>
                    )}
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
