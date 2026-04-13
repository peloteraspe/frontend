export type PaymentMethodCatalogLite = {
  id: number;
  isActive: boolean;
};

export type PaymentMethodSelectionResult = {
  selectedIds: number[];
  selectedVisibleIds: number[];
  selectedActiveIds: number[];
  selectedInactiveIds: number[];
};

export function normalizePaymentMethodIds(ids: unknown[]) {
  return Array.from(
    new Set(
      ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
}

export function partitionPaymentMethodSelection(
  selectedIds: unknown[],
  catalog: PaymentMethodCatalogLite[]
): PaymentMethodSelectionResult {
  const normalizedSelectedIds = normalizePaymentMethodIds(selectedIds);
  const catalogIds = new Set(normalizePaymentMethodIds(catalog.map((method) => method.id)));
  const activeCatalogIds = new Set(
    normalizePaymentMethodIds(
      catalog.filter((method) => method.isActive).map((method) => method.id)
    )
  );

  const selectedVisibleIds = normalizedSelectedIds.filter((id) => catalogIds.has(id));
  const selectedActiveIds = selectedVisibleIds.filter((id) => activeCatalogIds.has(id));
  const selectedInactiveIds = selectedVisibleIds.filter((id) => !activeCatalogIds.has(id));

  return {
    selectedIds: normalizedSelectedIds,
    selectedVisibleIds,
    selectedActiveIds,
    selectedInactiveIds,
  };
}

export function getPublishablePaymentMethodIds(
  selectedIds: unknown[],
  catalog: PaymentMethodCatalogLite[]
) {
  return partitionPaymentMethodSelection(selectedIds, catalog).selectedActiveIds;
}

export function hasPublishablePaymentMethods(
  selectedIds: unknown[],
  catalog: PaymentMethodCatalogLite[]
) {
  return getPublishablePaymentMethodIds(selectedIds, catalog).length > 0;
}
