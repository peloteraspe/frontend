import {
  normalizePaymentMethodIds,
  partitionPaymentMethodSelection,
} from '@shared/lib/paymentMethodSelection';

type SupabaseLike = {
  from: (table: string) => any;
};

type PaymentMethodRow = {
  id: number;
  isActive: boolean;
};

function mapPaymentMethodRows(rows: Array<{ id?: unknown; is_active?: boolean | null }> | null | undefined) {
  return (rows ?? [])
    .map((row) => ({
      id: Number(row.id),
      isActive: row.is_active !== false,
    }))
    .filter((method): method is PaymentMethodRow => Number.isInteger(method.id) && method.id > 0);
}

export async function resolveOwnedPaymentMethodSelection(
  supabase: SupabaseLike,
  ownerUserId: string,
  selectedIds: unknown[]
) {
  const normalizedSelectedIds = normalizePaymentMethodIds(selectedIds);
  if (normalizedSelectedIds.length === 0) {
    return {
      selectedIds: [],
      ownedIds: [],
      activeOwnedIds: [],
      ownedMethods: [] as PaymentMethodRow[],
    };
  }

  const { data, error } = await supabase
    .from('paymentMethod')
    .select('id,is_active')
    .eq('created_by', ownerUserId)
    .in('id', normalizedSelectedIds);

  if (error) throw new Error(error.message);

  const ownedMethods = mapPaymentMethodRows(data);
  const selection = partitionPaymentMethodSelection(normalizedSelectedIds, ownedMethods);

  return {
    selectedIds: normalizedSelectedIds,
    ownedIds: selection.selectedVisibleIds,
    activeOwnedIds: selection.selectedActiveIds,
    ownedMethods,
  };
}

export async function getOrderedActivePaymentMethodIds(
  supabase: SupabaseLike,
  paymentMethodIds: unknown[]
) {
  const normalizedPaymentMethodIds = normalizePaymentMethodIds(paymentMethodIds);
  if (normalizedPaymentMethodIds.length === 0) return [];

  const { data, error } = await supabase
    .from('paymentMethod')
    .select('id')
    .in('id', normalizedPaymentMethodIds)
    .eq('is_active', true);

  if (error) throw new Error(error.message);

  const activeIds = new Set(
    normalizePaymentMethodIds((data ?? []).map((row: { id?: unknown }) => row.id))
  );

  return normalizedPaymentMethodIds.filter((id) => activeIds.has(id));
}

export async function getActiveLinkedPaymentMethodIdsForEvent(
  supabase: SupabaseLike,
  eventId: string | number
) {
  const { data, error } = await supabase
    .from('eventPaymentMethod')
    .select('paymentMethod')
    .eq('event', eventId);

  if (error) throw new Error(error.message);

  const linkedPaymentMethodIds = normalizePaymentMethodIds(
    (data ?? []).map((row: { paymentMethod?: unknown }) => row.paymentMethod)
  );

  return getOrderedActivePaymentMethodIds(supabase, linkedPaymentMethodIds);
}

export async function getEventIdsWithActivePaymentMethods(
  supabase: SupabaseLike,
  eventIds: Array<string | number>
) {
  const normalizedEventIds = Array.from(
    new Set(
      eventIds
        .map((eventId) => String(eventId || '').trim())
        .filter(Boolean)
    )
  );

  if (normalizedEventIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from('eventPaymentMethod')
    .select('event,paymentMethod')
    .in('event', normalizedEventIds);

  if (error) throw new Error(error.message);

  const linkedPaymentMethodIds = normalizePaymentMethodIds(
    (data ?? []).map((row: { paymentMethod?: unknown }) => row.paymentMethod)
  );
  const activePaymentMethodIds = new Set(
    await getOrderedActivePaymentMethodIds(supabase, linkedPaymentMethodIds)
  );

  return new Set(
    (data ?? [])
      .filter((row: { event?: unknown; paymentMethod?: unknown }) =>
        activePaymentMethodIds.has(Number(row.paymentMethod))
      )
      .map((row: { event?: unknown }) => String(row.event || '').trim())
      .filter(Boolean)
  );
}
