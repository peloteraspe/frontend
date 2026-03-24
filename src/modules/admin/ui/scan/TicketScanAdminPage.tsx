'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

type ValidationPayload = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  ticket?: {
    id?: number;
    eventId?: number;
    userId?: string;
    status?: string;
    usedAt?: string;
  };
};

type CameraStatus = 'idle' | 'starting' | 'active' | 'error' | 'unsupported';

const DEFAULT_TIMEZONE = 'America/Lima';

function normalizeToken(raw: string) {
  const clean = raw.trim();
  if (!clean) return '';
  return clean.startsWith('PELOTERAS:TICKET:')
    ? clean.replace('PELOTERAS:TICKET:', '').trim()
    : clean;
}

export default function TicketScanAdminPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responseCode, setResponseCode] = useState<number | null>(null);
  const [payload, setPayload] = useState<ValidationPayload | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);
  const [isSecureContextReady, setIsSecureContextReady] = useState(false);
  const [imageDecoding, setImageDecoding] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const lastScannedTokenRef = useRef('');

  const normalizedToken = useMemo(() => normalizeToken(tokenInput), [tokenInput]);
  const resultTone = useMemo(() => {
    if (!responseCode) return 'border-slate-200 bg-slate-50 text-slate-700';
    if (responseCode >= 200 && responseCode < 300)
      return 'border-emerald-300 bg-emerald-50 text-emerald-800';
    if (responseCode === 409) return 'border-amber-300 bg-amber-50 text-amber-800';
    return 'border-red-300 bg-red-50 text-red-800';
  }, [responseCode]);

  function clearVideoElement() {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function resetScannerReader() {
    try {
      scannerControlsRef.current?.stop();
    } catch {
      // no-op
    }
    scannerControlsRef.current = null;
    scannerRef.current = null;
  }

  function stopCamera(options?: { keepMessage?: boolean }) {
    resetScannerReader();
    clearVideoElement();
    setCameraStatus('idle');
    if (!options?.keepMessage) {
      setCameraMessage(null);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setTokenInput(text || '');
    } catch {
      // no-op
    }
  }

  async function validateTicket(nextToken?: string) {
    const token = normalizeToken(nextToken ?? tokenInput);
    if (!token || submitting) return;

    setSubmitting(true);
    setPayload(null);
    setResponseCode(null);

    try {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const body = (await res.json().catch(() => ({}))) as ValidationPayload;
      setResponseCode(res.status);
      setPayload(body);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDetectedValue(rawValue: string) {
    const token = normalizeToken(rawValue);
    if (!token || token === lastScannedTokenRef.current) return;

    lastScannedTokenRef.current = token;
    setTokenInput(rawValue);
    setCameraMessage('QR detectado. Validando entrada...');
    stopCamera({ keepMessage: true });
    void validateTicket(rawValue);
  }

  async function loadZxingModule() {
    return import('@zxing/browser');
  }

  async function startZxingScan() {
    const { BrowserMultiFormatReader } = await loadZxingModule();
    const reader = new BrowserMultiFormatReader();
    scannerRef.current = reader;

    const onDecode = (result?: { getText(): string }) => {
      const text = result?.getText();
      if (!text) return;
      void handleDetectedValue(text);
    };

    try {
      return await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        },
        videoRef.current,
        (result) => onDecode(result)
      );
    } catch (firstError) {
      try {
        return await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => onDecode(result));
      } catch {
        throw firstError;
      }
    }
  }

  async function openCamera() {
    if (cameraStatus === 'starting' || cameraStatus === 'active') return;

    if (!hasCameraSupport) {
      setCameraStatus('unsupported');
      setCameraMessage(
        isSecureContextReady
          ? 'Este navegador no permite acceder a la cámara. Usa una foto del QR o pega el token.'
          : 'La cámara web requiere HTTPS o localhost. Usa una foto del QR o pega el token.'
      );
      return;
    }

    if (!videoRef.current) {
      setCameraStatus('error');
      setCameraMessage('No se pudo inicializar la vista previa de la cámara.');
      return;
    }

    stopCamera({ keepMessage: true });
    lastScannedTokenRef.current = '';
    setCameraStatus('starting');
    setCameraMessage('Abriendo cámara y preparando lector QR...');

    try {
      const controls = await startZxingScan();
      scannerControlsRef.current = controls;
      setCameraStatus('active');
      setCameraMessage('Apunta la cámara al QR. Si no detecta, prueba con una foto del código.');
    } catch (error) {
      console.error('Could not start QR camera', error);
      stopCamera({ keepMessage: true });
      setCameraStatus('error');
      setCameraMessage('No se pudo abrir o leer la cámara. Prueba con una foto del QR o pega el token.');
    }
  }

  async function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || imageDecoding) return;

    setImageDecoding(true);
    setCameraMessage('Leyendo foto del QR...');

    try {
      stopCamera({ keepMessage: true });
      const { BrowserMultiFormatReader } = await loadZxingModule();
      const reader = new BrowserMultiFormatReader();
      const objectUrl = URL.createObjectURL(file);

      try {
        const result = await reader.decodeFromImageUrl(objectUrl);
        const text = result.getText();
        if (!text) {
          throw new Error('No QR text found');
        }

        await handleDetectedValue(text);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      console.error('Could not decode QR image', error);
      setCameraMessage('No pudimos leer el QR de la foto. Prueba otra imagen o pega el token.');
    } finally {
      setImageDecoding(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  useEffect(() => {
    const secure = typeof window !== 'undefined' ? window.isSecureContext : false;
    setIsSecureContextReady(secure);
    setHasCameraSupport(secure && Boolean(navigator.mediaDevices?.getUserMedia));

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-mulberry">Validar entrada (QR)</h2>
      <p className="mt-1 text-sm text-slate-600">
        Escanea el QR con cámara, sube una foto del código o pega el token manualmente. También acepta
        valores con prefijo
        <code className="ml-1">PELOTERAS:TICKET:</code>.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCamera}
            disabled={cameraStatus === 'starting' || cameraStatus === 'active'}
            className="rounded-md bg-mulberry px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {cameraStatus === 'starting'
              ? 'Abriendo cámara...'
              : cameraStatus === 'active'
              ? 'Cámara activa'
              : 'Escanear con cámara'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageDecoding}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            {imageDecoding ? 'Leyendo foto...' : 'Subir foto del QR'}
          </button>
          <button
            type="button"
            onClick={() => stopCamera()}
            disabled={cameraStatus !== 'active'}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Detener cámara
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          className="hidden"
        />

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full object-cover" />
        </div>

        <p className="mt-3 text-sm text-slate-600">
          {cameraMessage ||
            (hasCameraSupport
              ? 'Usaremos un lector QR compatible con más navegadores. Si falla la cámara, sube una foto del código.'
              : isSecureContextReady
              ? 'Este navegador no ofrece una cámara compatible. Prueba con una foto del QR o pega el token.'
              : 'Abre esta página en HTTPS o localhost para usar la cámara. Mientras tanto puedes subir una foto del QR.')}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-sm font-semibold text-slate-700" htmlFor="ticket-token">
          Token QR
        </label>
        <textarea
          id="ticket-token"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          placeholder="PELOTERAS:TICKET:..."
          className="min-h-[100px] w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-mulberry focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Pegar token
          </button>
          <button
            type="button"
            disabled={!normalizedToken || submitting}
            onClick={() => void validateTicket()}
            className="rounded-md bg-mulberry px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Validando...' : 'Validar entrada'}
          </button>
        </div>
      </div>

      <div className={`mt-5 rounded-lg border p-3 text-sm ${resultTone}`}>
        {!responseCode && <p>Aún no hay validación ejecutada.</p>}
        {responseCode && (
          <div className="space-y-1">
            <p>
              <strong>HTTP:</strong> {responseCode}
            </p>
            {(payload?.message || payload?.error) && (
              <p>
                <strong>Mensaje:</strong> {payload?.message || payload?.error}
              </p>
            )}
            {payload?.ticket?.id ? (
              <p>
                <strong>Ticket:</strong> #{payload.ticket.id} | evento {payload.ticket.eventId} | estado{' '}
                {payload.ticket.status || payload.status || 'N/A'}
              </p>
            ) : null}
            {payload?.ticket?.usedAt ? (
              <p>
                <strong>Usada en:</strong>{' '}
                {new Date(payload.ticket.usedAt).toLocaleString('es-PE', {
                  timeZone: DEFAULT_TIMEZONE,
                })}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
