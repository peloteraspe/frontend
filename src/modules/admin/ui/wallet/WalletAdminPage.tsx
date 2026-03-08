'use client';

import { useEffect, useState } from 'react';

type WalletSettings = {
  issuerId: string;
  activeClassId: string | null;
  serviceAccountEmail: string;
  origins: string[];
  hasCredentials: boolean;
  source: 'db';
};

type WalletClass = {
  id: string;
  reviewStatus: string | null;
  state: string | null;
  eventName: string | null;
};

function formatError(error: unknown) {
  if (!error) return 'Ocurrió un error.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error.';
}

export default function WalletAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [issuerId, setIssuerId] = useState('');
  const [activeClassId, setActiveClassId] = useState('');
  const [originsText, setOriginsText] = useState('http://localhost:3000');
  const [serviceAccountJson, setServiceAccountJson] = useState('');

  const [settings, setSettings] = useState<WalletSettings | null>(null);
  const [classes, setClasses] = useState<WalletClass[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadSettings() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/wallet/settings', { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        settings?: WalletSettings | null;
      };

      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo cargar configuración Wallet.');
      }

      setSettings(body.settings ?? null);

      if (body.settings) {
        setIssuerId(body.settings.issuerId || '');
        setActiveClassId(body.settings.activeClassId || '');
        setOriginsText((body.settings.origins || []).join(','));
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadClasses() {
    setLoadingClasses(true);
    setError('');

    try {
      const response = await fetch('/api/admin/wallet/classes', { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        classes?: WalletClass[];
      };

      if (!response.ok) {
        throw new Error(body?.error || 'No se pudieron listar clases.');
      }

      setClasses(body.classes ?? []);
      if (!body.classes?.length) {
        setMessage('No se encontraron clases para este issuer.');
      } else {
        setMessage(`Se cargaron ${body.classes.length} clase(s).`);
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoadingClasses(false);
    }
  }

  async function saveSettings(validateConnection = false) {
    if (!issuerId.trim()) {
      setError('Issuer ID es obligatorio.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/wallet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuerId: issuerId.trim(),
          activeClassId: activeClassId.trim() || null,
          origins: originsText
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          serviceAccountJson: serviceAccountJson.trim() || undefined,
          validateConnection,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        settings?: WalletSettings | null;
        classes?: WalletClass[];
      };

      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo guardar configuración Wallet.');
      }

      setSettings(body.settings ?? null);
      if (body.settings) {
        setIssuerId(body.settings.issuerId || '');
        setActiveClassId(body.settings.activeClassId || '');
        setOriginsText((body.settings.origins || []).join(','));
      }

      if (Array.isArray(body.classes) && body.classes.length) {
        setClasses(body.classes);
      }

      setServiceAccountJson('');
      setMessage(validateConnection ? 'Configuración guardada y conexión validada.' : 'Configuración guardada.');
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function useClass(classId: string) {
    setActiveClassId(classId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/wallet/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuerId: issuerId.trim(),
          activeClassId: classId,
          origins: originsText
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        settings?: WalletSettings | null;
      };

      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo activar la clase.');
      }

      setSettings(body.settings ?? null);
      setMessage(`Clase activa actualizada: ${classId}`);
    } catch (err) {
      setError(formatError(err));
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-mulberry">Google Wallet (Superadmin)</h2>
        <p className="text-sm text-slate-600">
          Configura issuer, credenciales y clase activa para emitir enlaces de Wallet desde base de datos.
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Issuer ID</span>
          <input
            value={issuerId}
            onChange={(event) => setIssuerId(event.target.value)}
            placeholder="3388000000023091895"
            className="h-10 rounded-md border border-slate-300 px-3 focus:border-mulberry focus:outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Clase activa (classId)</span>
          <input
            value={activeClassId}
            onChange={(event) => setActiveClassId(event.target.value)}
            placeholder="3388....peloteras_event_16"
            className="h-10 rounded-md border border-slate-300 px-3 focus:border-mulberry focus:outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Origins (separados por coma)</span>
          <input
            value={originsText}
            onChange={(event) => setOriginsText(event.target.value)}
            placeholder="http://localhost:3000,https://peloteras.com"
            className="h-10 rounded-md border border-slate-300 px-3 focus:border-mulberry focus:outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Service Account JSON (opcional)</span>
          <textarea
            value={serviceAccountJson}
            onChange={(event) => setServiceAccountJson(event.target.value)}
            placeholder='{"type":"service_account", ... }'
            className="min-h-[150px] rounded-md border border-slate-300 p-3 font-mono text-xs focus:border-mulberry focus:outline-none"
          />
          <span className="text-xs text-slate-500">
            Pégalo solo cuando quieras actualizar credenciales. Si no, se conserva lo guardado.
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => saveSettings(false)}
          disabled={saving || loading}
          className="rounded-md bg-mulberry px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
        <button
          type="button"
          onClick={() => saveSettings(true)}
          disabled={saving || loading}
          className="rounded-md border border-mulberry px-3 py-2 text-sm font-semibold text-mulberry disabled:opacity-60"
        >
          Guardar y validar conexión
        </button>
        <button
          type="button"
          onClick={loadClasses}
          disabled={loadingClasses || loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          {loadingClasses ? 'Consultando clases...' : 'Listar clases'}
        </button>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        {loading ? (
          <p>Cargando configuración...</p>
        ) : settings ? (
          <div className="space-y-1">
            <p>
              <strong>Fuente:</strong> Base de datos
            </p>
            <p>
              <strong>Email service account:</strong> {settings.serviceAccountEmail}
            </p>
            <p>
              <strong>Clase activa:</strong> {settings.activeClassId || 'No definida'}
            </p>
            <p>
              <strong>Credenciales guardadas:</strong> {settings.hasCredentials ? 'Sí' : 'No'}
            </p>
          </div>
        ) : (
          <p>No hay configuración guardada aún.</p>
        )}
      </div>

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
          Clases Event Ticket del issuer
        </div>

        {!classes.length ? (
          <p className="p-3 text-sm text-slate-500">Sin clases cargadas. Usa “Listar clases”.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {classes.map((item) => {
              const isActive = item.id === activeClassId;
              return (
                <li key={item.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-mono text-xs text-slate-800">{item.id}</p>
                    <p className="text-xs text-slate-500">
                      {item.eventName || 'Sin nombre'} | review: {item.reviewStatus || '-'} | state:{' '}
                      {item.state || '-'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => useClass(item.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      isActive
                        ? 'border border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border border-mulberry text-mulberry'
                    }`}
                  >
                    {isActive ? 'Clase activa' : 'Usar esta clase'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
