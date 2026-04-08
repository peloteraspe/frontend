'use client';

import { type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import InternationalPhoneField from '@core/ui/InternationalPhoneField';
import Input from '@core/ui/Input';
import { trackEvent } from '@shared/lib/analytics';
import {
  normalizePaymentMethodPhone,
  validatePaymentMethodPhone,
} from './paymentMethodPhone';

export type InlinePaymentMethodSummary = {
  id: number;
  created_at: string;
  updated_at: string;
  name: string | null;
  QR: string | null;
  number: number | null;
  type: string | null;
  is_active: boolean | null;
};

type PaymentMethodSeed = {
  id: number;
  name: string;
  type: string;
  number: number | null;
  isActive: boolean;
};

type PaymentMethodResponse = {
  ok?: boolean;
  error?: string;
  mode?: 'created' | 'updated';
  paymentMethods?: InlinePaymentMethodSummary[];
};

type Props = {
  initialMethods?: PaymentMethodSeed[];
  onMethodsChange?: (methods: InlinePaymentMethodSummary[]) => void;
  onMethodSaved?: (
    savedMethod: InlinePaymentMethodSummary | null,
    methods: InlinePaymentMethodSummary[]
  ) => void;
};

const MAX_QR_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function formatError(error: unknown) {
  if (!error) return 'Ocurrió un error.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error.';
}

function normalizePaymentType(rawType: string | null | undefined) {
  const normalized = String(rawType || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('/', '_');

  if (normalized.includes('yape') && normalized.includes('plin')) return 'yape_plin';
  if (normalized.includes('plin')) return 'plin';
  if (normalized.includes('yape')) return 'yape';
  return '';
}

function paymentTypeToFlags(rawType: string | null | undefined) {
  const normalized = normalizePaymentType(rawType);
  return {
    allowYape: normalized === 'yape' || normalized === 'yape_plin',
    allowPlin: normalized === 'plin' || normalized === 'yape_plin',
  };
}

function paymentTypeLabel(rawType: string | null | undefined) {
  const normalized = normalizePaymentType(rawType);
  if (normalized === 'yape_plin') return 'Yape / Plin';
  if (normalized === 'plin') return 'Plin';
  if (normalized === 'yape') return 'Yape';
  return 'Sin definir';
}

function paymentTypeLabelFromFlags(allowYape: boolean, allowPlin: boolean) {
  if (allowYape && allowPlin) return 'Yape / Plin';
  if (allowYape) return 'Yape';
  if (allowPlin) return 'Plin';
  return 'Ninguno';
}

function isOpenableQr(value: string) {
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
}

function normalizeInitialMethods(initialMethods: PaymentMethodSeed[]) {
  return initialMethods.map((method) => ({
    id: method.id,
    created_at: '',
    updated_at: '',
    name: method.name,
    QR: null,
    number: method.number,
    type: method.type,
    is_active: method.isActive,
  }));
}

function SwitchControl({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[14px] bg-white px-3 py-2 ring-1 ring-slate-200/70">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? 'bg-mulberry' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function InlinePaymentMethodSetup({
  initialMethods = [],
  onMethodsChange,
  onMethodSaved,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(initialMethods.length === 0);
  const [hasLoadedRemoteMethods, setHasLoadedRemoteMethods] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<InlinePaymentMethodSummary[]>(() =>
    normalizeInitialMethods(initialMethods)
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [numberError, setNumberError] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [storedQrUrl, setStoredQrUrl] = useState('');
  const [qrPreview, setQrPreview] = useState('');
  const [allowYape, setAllowYape] = useState(true);
  const [allowPlin, setAllowPlin] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const activePaymentMethods = paymentMethods.filter((method) => method.is_active !== false);

  useEffect(() => {
    if (hasLoadedRemoteMethods) return;
    if (initialMethods.length === 0) return;
    setPaymentMethods(normalizeInitialMethods(initialMethods));
  }, [hasLoadedRemoteMethods, initialMethods]);

  useEffect(() => {
    return () => {
      if (qrPreview.startsWith('blob:')) {
        URL.revokeObjectURL(qrPreview);
      }
    };
  }, [qrPreview]);

  useEffect(() => {
    if (!isOpen || hasLoadedRemoteMethods) return;
    void loadData();
  }, [hasLoadedRemoteMethods, isOpen]);

  function setQrPreviewValue(nextPreview: string) {
    setQrPreview((current) => {
      if (current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return nextPreview;
    });
  }

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setNumber('');
    setNumberError('');
    setQrFile(null);
    setStoredQrUrl('');
    setQrPreviewValue('');
    clearFileInput();
    setAllowYape(true);
    setAllowPlin(false);
    setIsActive(true);
    setMessage('');
    setError('');
  }

  function hydrateForm(method: InlinePaymentMethodSummary) {
    setEditingId(method.id);
    setName(String(method.name || ''));
    setNumber(String(method.number ?? ''));
    setNumberError('');
    const nextQrUrl = String(method.QR || '');
    setQrFile(null);
    setStoredQrUrl(nextQrUrl);
    setQrPreviewValue(nextQrUrl);
    clearFileInput();
    const flags = paymentTypeToFlags(method.type);
    setAllowYape(flags.allowYape);
    setAllowPlin(flags.allowPlin);
    setIsActive(method.is_active !== false);
    setError('');
    setMessage('');
    if (!isOpen) {
      setIsOpen(true);
    }
  }

  function applyNextMethods(nextMethods: InlinePaymentMethodSummary[]) {
    setPaymentMethods(nextMethods);
    onMethodsChange?.(nextMethods);
  }

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/payment-methods', { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as PaymentMethodResponse;

      if (!response.ok) {
        throw new Error(body?.error || 'No se pudieron cargar los métodos de pago.');
      }

      const nextMethods = body.paymentMethods || [];
      applyNextMethods(nextMethods);
      setHasLoadedRemoteMethods(true);
    } catch (nextError) {
      setError(formatError(nextError));
    } finally {
      setLoading(false);
    }
  }

  function handleQrFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setQrFile(null);
      setQrPreviewValue(storedQrUrl);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes para el QR.');
      setQrFile(null);
      setQrPreviewValue(storedQrUrl);
      clearFileInput();
      return;
    }

    if (file.size > MAX_QR_IMAGE_SIZE_BYTES) {
      setError('La imagen QR no puede superar 5MB.');
      setQrFile(null);
      setQrPreviewValue(storedQrUrl);
      clearFileInput();
      return;
    }

    setError('');
    setMessage('');
    setQrFile(file);
    setQrPreviewValue(URL.createObjectURL(file));
  }

  function clearSelectedQrImage() {
    setQrFile(null);
    setQrPreviewValue(storedQrUrl);
    clearFileInput();
  }

  async function handleSave() {
    setError('');
    setMessage('');

    const nextNumberError = validatePaymentMethodPhone(number);
    if (nextNumberError) {
      setNumberError(nextNumberError);
      return;
    }

    const normalizedNumber = normalizePaymentMethodPhone(number);
    setNumberError('');

    if (!allowYape && !allowPlin) {
      setError('Activa Yape, Plin o ambos para definir el tipo.');
      return;
    }

    if (!qrFile && !storedQrUrl.trim()) {
      setError('Debes subir una imagen QR.');
      return;
    }

    setSaving(true);
    const previousIds = new Set(paymentMethods.map((method) => method.id));
    const currentEditingId = editingId;

    try {
      const formData = new FormData();
      if (currentEditingId) formData.append('id', String(currentEditingId));
      if (name.trim()) formData.append('name', name.trim());
      formData.append('number', normalizedNumber);
      formData.append('allowYape', String(allowYape));
      formData.append('allowPlin', String(allowPlin));
      formData.append('isActive', String(isActive));
      if (qrFile) formData.append('qrFile', qrFile);

      const response = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        body: formData,
      });

      const body = (await response.json().catch(() => ({}))) as PaymentMethodResponse;

      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo guardar el método de pago.');
      }

      const nextMethods = body.paymentMethods || [];
      const savedMethod =
        body.mode === 'updated'
          ? nextMethods.find((method) => method.id === currentEditingId) || null
          : nextMethods.find((method) => !previousIds.has(method.id)) || nextMethods[0] || null;

      applyNextMethods(nextMethods);
      setHasLoadedRemoteMethods(true);
      setMessage(body.mode === 'updated' ? 'Método actualizado.' : 'Método creado.');
      trackEvent('create_event_payment_method_saved', {
        channel: 'web',
        source: 'wizard_inline',
        mode: body.mode || (currentEditingId ? 'updated' : 'created'),
      });
      onMethodSaved?.(savedMethod, nextMethods);

      if (currentEditingId && savedMethod) {
        hydrateForm(savedMethod);
      } else {
        resetForm();
      }
    } catch (nextError) {
      setError(formatError(nextError));
    } finally {
      setSaving(false);
    }
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (loading || saving) return;

    const target = event.target;
    if (
      target instanceof HTMLButtonElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement && target.type === 'file')
    ) {
      return;
    }

    event.preventDefault();
    void handleSave();
  }

  return (
    <section className="rounded-[18px] bg-slate-50/80 px-4 py-4 ring-1 ring-slate-200/70">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Configura cobro sin salir del borrador</p>
          <p className="mt-1 text-sm text-slate-600">
            Crea o edita Yape y Plin aquí mismo. Cuando guardes, el método queda disponible al instante para este evento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              return;
            }
            setIsOpen(true);
            trackEvent('create_event_inline_payment_opened', {
              channel: 'web',
              source: 'wizard_inline',
            });
          }}
          className="inline-flex h-11 items-center rounded-xl border border-slate-300/90 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isOpen ? 'Ocultar editor' : 'Agregar o editar aquí'}
        </button>
      </div>

      {activePaymentMethods.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activePaymentMethods.map((method) => (
            <span
              key={method.id}
              className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
            >
              {method.name || `Método #${method.id}`} · {paymentTypeLabel(method.type)}
            </span>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div className="mt-4 grid gap-4 rounded-[18px] bg-white/90 p-4 ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {editingId ? 'Editar método' : 'Nuevo método de pago'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Un método activo nuevo puede quedar seleccionado automáticamente para este evento.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  void loadData();
                }}
                disabled={loading || saving}
                className="rounded-xl border border-slate-300/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                {loading ? 'Recargando...' : 'Recargar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-slate-300/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                Nuevo método
              </button>
            </div>
          </div>

          <div className="grid gap-4" onKeyDown={handleEditorKeyDown}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nombre (opcional)"
                name="paymentMethodInlineName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Yape principal"
                className="h-11"
                bgColor="bg-white"
                tone="soft"
              />

              <InternationalPhoneField
                label="Número de pago"
                name="paymentMethodInlineNumber"
                required
                value={number}
                defaultCountry="pe"
                preferredCountries={['pe']}
                lockCountryToDefault
                onChange={(nextPhone) => {
                  setNumber(nextPhone);
                  if (numberError) setNumberError('');
                }}
                onBlur={() => {
                  if (!number.trim()) {
                    setNumberError('');
                    return;
                  }

                  setNumberError(validatePaymentMethodPhone(number));
                }}
                placeholder="999 999 999"
                autoComplete="tel-national"
                errorText={numberError}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Tipo habilitado</span>
                <SwitchControl label="Aceptar Yape" enabled={allowYape} onToggle={() => setAllowYape((value) => !value)} />
                <SwitchControl label="Aceptar Plin" enabled={allowPlin} onToggle={() => setAllowPlin((value) => !value)} />
                <p className="text-xs text-slate-500">
                  Configuración actual: <strong>{paymentTypeLabelFromFlags(allowYape, allowPlin)}</strong>
                </p>
              </div>

              <div className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Estado</span>
                <SwitchControl label="Método activo" enabled={isActive} onToggle={() => setIsActive((value) => !value)} />
                <p className="text-xs text-slate-500">
                  Los métodos activos aparecen listos para usarse en eventos nuevos.
                </p>
              </div>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-slate-700">Imagen QR</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrFileChange}
                className="peloteras-form-control peloteras-form-control--file h-11"
              />
              <p className="text-xs text-slate-500">Sube una imagen PNG, JPG o WEBP con máximo 5MB.</p>

              {qrPreview ? (
                <div className="mt-1 flex flex-col gap-2 rounded-[14px] p-2 ring-1 ring-slate-200/70">
                  <img
                    src={qrPreview}
                    alt="Vista previa del QR"
                    className="h-32 w-32 rounded-[12px] object-contain ring-1 ring-slate-200/70"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {qrFile ? (
                      <span className="text-xs text-slate-600">{qrFile.name}</span>
                    ) : (
                      <span className="text-xs text-slate-600">QR guardado actualmente</span>
                    )}
                    {storedQrUrl && !qrFile && isOpenableQr(storedQrUrl) ? (
                      <a
                        href={storedQrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-sky-600 underline underline-offset-2"
                      >
                        Abrir imagen
                      </a>
                    ) : null}
                    {qrFile ? (
                      <button
                        type="button"
                        onClick={clearSelectedQrImage}
                        className="rounded-lg border border-slate-300/90 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        Quitar selección
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={loading || saving}
                className="rounded-xl bg-mulberry px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Guardando...' : editingId ? 'Actualizar método' : 'Crear método'}
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-[14px] bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200/80">{error}</p>
          ) : null}
          {message ? (
            <p className="rounded-[14px] bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200/80">
              {message}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-[16px] bg-white/85 ring-1 ring-slate-200/70">
            <div className="bg-slate-50/80 px-3 py-2 text-sm font-semibold text-slate-700">
              Métodos disponibles
            </div>
            {!paymentMethods.length ? (
              <p className="p-3 text-sm text-slate-500">
                {loading ? 'Cargando métodos de pago...' : 'Todavía no tienes métodos de pago guardados.'}
              </p>
            ) : (
              <div className="grid gap-3 p-3">
                {paymentMethods.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-[14px] bg-slate-50/80 px-4 py-4 ring-1 ring-slate-200/70 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.name || `Método #${item.id}`} · {paymentTypeLabel(item.type)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.number ? `Número: ${item.number}` : 'Sin número visible'} ·{' '}
                        {item.is_active !== false ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.QR && isOpenableQr(String(item.QR || '')) ? (
                        <a
                          href={String(item.QR)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-sky-600 underline underline-offset-2"
                        >
                          Ver QR
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => hydrateForm(item)}
                        className="rounded-xl border border-mulberry/20 bg-white px-3 py-2 text-xs font-semibold text-mulberry"
                      >
                        Editar aquí
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
