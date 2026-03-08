'use client';

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import Input from '@core/ui/Input';

type PaymentMethodSummary = {
  id: number;
  created_at: string;
  updated_at: string;
  name: string | null;
  QR: string | null;
  number: number | null;
  type: string | null;
  is_active: boolean | null;
};

type PaymentMethodResponse = {
  ok?: boolean;
  error?: string;
  mode?: 'created' | 'updated';
  paymentMethods?: PaymentMethodSummary[];
};

const DEFAULT_TIMEZONE = 'America/Lima';
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

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

function isOpenableQr(value: string) {
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
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
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
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

export default function PaymentMethodsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummary[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [storedQrUrl, setStoredQrUrl] = useState('');
  const [qrPreview, setQrPreview] = useState('');
  const [allowYape, setAllowYape] = useState(true);
  const [allowPlin, setAllowPlin] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  function hydrateForm(method: PaymentMethodSummary) {
    setEditingId(method.id);
    setName(String(method.name || ''));
    setNumber(String(method.number ?? ''));
    const nextQrUrl = String(method.QR || '');
    setQrFile(null);
    setStoredQrUrl(nextQrUrl);
    setQrPreviewValue(nextQrUrl);
    clearFileInput();
    const flags = paymentTypeToFlags(method.type);
    setAllowYape(flags.allowYape);
    setAllowPlin(flags.allowPlin);
    setIsActive(method.is_active !== false);
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

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/payment-methods', { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as PaymentMethodResponse;

      if (!response.ok) {
        throw new Error(body?.error || 'No se pudieron cargar los métodos de pago.');
      }

      setPaymentMethods(body.paymentMethods || []);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const normalizedNumber = number.replace(/\D+/g, '');
    if (!normalizedNumber) {
      setError('El número de pago es obligatorio.');
      return;
    }

    if (normalizedNumber.length < 8 || normalizedNumber.length > 15) {
      setError('El número de pago debe tener entre 8 y 15 dígitos.');
      return;
    }

    if (!allowYape && !allowPlin) {
      setError('Activa Yape, Plin o ambos para definir el tipo.');
      return;
    }

    if (!qrFile && !storedQrUrl.trim()) {
      setError('Debes subir una imagen QR.');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      if (editingId) formData.append('id', String(editingId));
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
      setPaymentMethods(nextMethods);
      setMessage(body.mode === 'updated' ? 'Método actualizado.' : 'Método creado.');

      if (editingId) {
        const edited = nextMethods.find((method) => method.id === editingId);
        if (edited) {
          hydrateForm(edited);
        }
      } else {
        resetForm();
        setMessage(body.mode === 'updated' ? 'Método actualizado.' : 'Método creado.');
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (qrPreview.startsWith('blob:')) {
        URL.revokeObjectURL(qrPreview);
      }
    };
  }, [qrPreview]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-mulberry">Métodos de pago</h2>
        <p className="text-sm text-slate-600">
          Crea y administra tus métodos de pago. Luego podrás asignarlos al crear/editar cada evento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nombre (opcional)"
            name="paymentMethodName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Yape principal"
            className="h-11"
            bgColor="bg-white"
          />

          <Input
            label="Número de pago"
            name="paymentMethodNumber"
            required
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="987654321"
            inputMode="numeric"
            className="h-11"
            bgColor="bg-white"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-700">Tipo habilitado</span>
            <SwitchControl label="Aceptar Yape" enabled={allowYape} onToggle={() => setAllowYape((v) => !v)} />
            <SwitchControl label="Aceptar Plin" enabled={allowPlin} onToggle={() => setAllowPlin((v) => !v)} />
            <p className="text-xs text-slate-500">
              Configuración actual: <strong>{paymentTypeLabelFromFlags(allowYape, allowPlin)}</strong>
            </p>
          </div>

          <div className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-700">Estado</span>
            <SwitchControl label="Método activo" enabled={isActive} onToggle={() => setIsActive((v) => !v)} />
            <p className="text-xs text-slate-500">
              Los métodos inactivos no deberían usarse en eventos nuevos.
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
            className="h-11 w-full rounded-lg border-2 border-mulberry bg-white px-3 py-1 text-sm text-slate-700 focus:outline-none focus:border-mulberry file:mr-3 file:rounded-md file:border-0 file:bg-mulberry file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
          <p className="text-xs text-slate-500">Sube una imagen PNG, JPG o WEBP (máximo 5MB).</p>

          {qrPreview ? (
            <div className="mt-1 flex flex-col gap-2 rounded-md border border-slate-200 p-2">
              <img
                src={qrPreview}
                alt="Vista previa del QR"
                className="h-36 w-36 rounded border border-slate-200 object-contain"
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
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
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
            type="submit"
            disabled={loading || saving}
            className="rounded-md bg-mulberry px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Guardando...' : editingId ? 'Actualizar método' : 'Crear método'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Nuevo método
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            {loading ? 'Recargando...' : 'Recargar'}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="mt-5 rounded-md border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          Métodos registrados
        </div>
        {!paymentMethods.length ? (
          <p className="p-3 text-sm text-slate-500">No hay métodos de pago registrados todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Número</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">QR</th>
                  <th className="px-3 py-2 text-left">Actualizado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paymentMethods.map((item) => {
                  const qrValue = item.QR || '';
                  const shortQr = qrValue.length > 50 ? `${qrValue.slice(0, 50)}...` : qrValue || 'Sin QR';

                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{item.name || `Método #${item.id}`}</td>
                      <td className="px-3 py-2">{paymentTypeLabel(item.type)}</td>
                      <td className="px-3 py-2">{item.number || '-'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.is_active !== false
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.is_active !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {qrValue && isOpenableQr(qrValue) ? (
                          <a
                            href={qrValue}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sky-600 underline underline-offset-2"
                          >
                            <img
                              src={qrValue}
                              alt={`QR ${item.name || item.id}`}
                              className="h-8 w-8 rounded border border-slate-200 object-contain"
                            />
                            Ver QR
                          </a>
                        ) : (
                          <span className="text-slate-600">{shortQr}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{formatDate(item.updated_at || item.created_at)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            hydrateForm(item);
                            setMessage('');
                            setError('');
                          }}
                          className="rounded border border-mulberry px-2 py-1 text-xs font-semibold text-mulberry"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
