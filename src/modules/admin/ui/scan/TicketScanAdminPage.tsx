'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type CameraOption = {
  id: string;
  label: string;
};

type ResolvePayload = {
  path?: string;
  error?: string;
};

type QrScannerModule = typeof import('qr-scanner');
type QrScannerInstance = InstanceType<QrScannerModule['default']>;

const DEFAULT_CAMERA = 'environment';

function detectMobileDevice() {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent || '';
  const isMobileUa = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const isNarrowViewport = window.matchMedia?.('(max-width: 900px)').matches ?? false;

  return isMobileUa || (isCoarsePointer && isNarrowViewport);
}

export default function TicketScanAdminPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<QrScannerInstance | null>(null);
  const scannerModuleRef = useRef<QrScannerModule | null>(null);
  const resolvingRef = useRef(false);

  const [manualValue, setManualValue] = useState('');
  const [cameraState, setCameraState] = useState<
    'idle' | 'starting' | 'ready' | 'resolving' | 'blocked'
  >('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraOptions, setCameraOptions] = useState<CameraOption[]>([]);
  const [selectedCamera, setSelectedCamera] = useState(DEFAULT_CAMERA);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [canUseLiveVideoScanner, setCanUseLiveVideoScanner] = useState(false);

  async function loadScannerModule() {
    if (!scannerModuleRef.current) {
      scannerModuleRef.current = await import('qr-scanner');
    }

    return scannerModuleRef.current;
  }

  async function refreshCameraOptions(requestLabels = false) {
    try {
      const module = await loadScannerModule();
      const cameras = await module.default.listCameras(requestLabels);
      setCameraOptions(cameras);
    } catch {
      // Ignore camera list failures; scanner can still work with the preferred facing mode.
    }
  }

  function teardownScanner() {
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }

  async function resolveScannedValue(rawValue: string) {
    const trimmed = String(rawValue || '').trim();
    if (!trimmed) throw new Error('No se pudo leer el QR.');

    const response = await fetch('/api/tickets/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: trimmed }),
    });

    const payload = (await response.json().catch(() => ({}))) as ResolvePayload;
    if (!response.ok || !payload.path) {
      throw new Error(payload.error || 'No se pudo resolver el QR.');
    }

    return payload.path;
  }

  async function handleResolvedValue(rawValue: string, source: 'scanner' | 'manual' | 'upload') {
    if (resolvingRef.current) return;

    const fromLiveScanner = source === 'scanner';
    resolvingRef.current = true;
    setCameraState('resolving');
    setCameraError(null);

    if (fromLiveScanner) {
      teardownScanner();
    }

    try {
      const path = await resolveScannedValue(rawValue);
      teardownScanner();
      router.push(path);
    } catch (error: any) {
      const message = error?.message || 'No se pudo resolver el QR.';
      setCameraError(message);
      resolvingRef.current = false;
      if (fromLiveScanner) {
        setCameraState('blocked');
        return;
      }

      toast.error(message);
      setCameraState(scannerRef.current ? 'ready' : 'idle');
    }
  }

  async function startScanner(preferredCamera = selectedCamera) {
    if (!canUseLiveVideoScanner) {
      const message =
        typeof window !== 'undefined' && !window.isSecureContext
          ? isMobileDevice
            ? 'En celular, la cámara en vivo desde la web requiere HTTPS o localhost. La app nativa Cámara no puede abrirse ni controlarse desde esta pantalla.'
            : 'La cámara en vivo desde la web requiere un contexto seguro (HTTPS o localhost).'
          : 'No se pudo acceder a la cámara en vivo desde este navegador.';
      setCameraError(message);
      toast.error(message);
      return;
    }

    if (!videoRef.current) return;

    resolvingRef.current = false;
    setCameraError(null);
    setCameraState('starting');

    try {
      const module = await loadScannerModule();
      teardownScanner();

      const scanner = new module.default(
        videoRef.current,
        (result) => {
          void handleResolvedValue(result.data, 'scanner');
        },
        {
          preferredCamera: preferredCamera as any,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          overlay: overlayRef.current ?? undefined,
          returnDetailedScanResult: true,
          maxScansPerSecond: 10,
          onDecodeError: (error) => {
            if (String(error) === module.default.NO_QR_CODE_FOUND) return;
            setCameraError('No se pudo leer el QR todavía. Intenta estabilizar la cámara.');
          },
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setCameraState('ready');
      setHasCamera(true);
      await refreshCameraOptions(true);
    } catch (error: any) {
      teardownScanner();
      setCameraState('idle');
      setCameraError(
        error?.message ||
          'No se pudo abrir la cámara. Revisa permisos del navegador o prueba con otra cámara.'
      );
    }
  }

  function stopScanner() {
    resolvingRef.current = false;
    teardownScanner();
    setCameraError(null);
    setCameraState('idle');
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCameraError(null);
    setCameraState('resolving');

    try {
      const module = await loadScannerModule();
      const result = await module.default.scanImage(file, {
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true,
      });
      await handleResolvedValue(result.data, 'upload');
    } catch (error: any) {
      const message = error?.message || 'No se pudo leer el QR desde la imagen.';
      setCameraError(message);
      setCameraState(scannerRef.current ? 'ready' : 'idle');
      toast.error(message);
    } finally {
      resolvingRef.current = false;
    }
  }

  async function handleManualSubmit() {
    if (!manualValue.trim()) return;
    await handleResolvedValue(manualValue, 'manual');
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setManualValue(text || '');
    } catch {
      toast.error('No se pudo leer el portapapeles.');
    }
  }

  useEffect(() => {
    let active = true;
    const mobileDevice = detectMobileDevice();
    setIsMobileDevice(mobileDevice);
    const liveVideoSupported =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia);
    setCanUseLiveVideoScanner(liveVideoSupported);

    void (async () => {
      if (!liveVideoSupported) {
        if (!active) return;
        setHasCamera(false);
        return;
      }

      try {
        const module = await loadScannerModule();
        const available = await module.default.hasCamera();
        if (!active) return;
        setHasCamera(available);
        if (available) {
          await refreshCameraOptions(false);
        }
      } catch {
        if (!active) return;
        setHasCamera(false);
      }
    })();

    return () => {
      active = false;
      teardownScanner();
    };
  }, []);

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-mulberry">Verificar QR</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Escanea el QR o carga una imagen para verificar a la jugadora y confirmar su
              asistencia.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,380px)]">
        <section className="min-w-0 w-full rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Cámara
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                Escáner de ingreso
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void startScanner()}
                disabled={
                  cameraState === 'starting' ||
                  cameraState === 'resolving' ||
                  (canUseLiveVideoScanner && hasCamera === false)
                }
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-mulberry px-5 text-sm font-semibold text-white transition hover:bg-[#6a1286] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isMobileDevice
                  ? cameraState === 'resolving'
                    ? 'Resolviendo QR...'
                    : cameraState === 'starting'
                      ? 'Abriendo cámara...'
                      : cameraState === 'blocked'
                        ? 'Reintentar escáner'
                        : cameraState === 'ready'
                          ? 'Reiniciar escáner'
                          : 'Escanear QR'
                  : cameraState === 'starting'
                    ? 'Abriendo cámara...'
                    : cameraState === 'blocked'
                      ? 'Reintentar cámara'
                      : cameraState === 'ready'
                        ? 'Reiniciar cámara'
                        : 'Abrir cámara'}
              </button>

              <button
                type="button"
                onClick={stopScanner}
                disabled={cameraState === 'idle' || cameraState === 'blocked'}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Detener cámara
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-slate-950">
            <div className="relative aspect-[4/3] min-h-[260px] w-full sm:min-h-[320px]">
              <>
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                <div
                  ref={overlayRef}
                  className="pointer-events-none absolute inset-0 [&_*]:border-[#10b981] [&_*]:shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
                />
              </>

              {cameraState === 'idle' || cameraState === 'blocked' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(84,8,111,0.28),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(15,23,42,0.84))] px-6 text-center">
                  <div className="max-w-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/85">
                      Modo escaneo
                    </p>
                    <p className="mt-4 text-2xl font-black tracking-tight text-white">
                      {cameraState === 'blocked'
                        ? 'Escaneo pausado'
                        : isMobileDevice
                          ? 'Escáner QR listo para móvil'
                          : 'Cámara lista para escanear en laptop'}
                    </p>
                    <p className="mt-3 text-sm text-slate-200">
                      {cameraState === 'blocked'
                        ? 'El último intento devolvió un error y el escáner quedó en pausa. Reintenta cuando quieras volver a leer un QR.'
                        : isMobileDevice
                          ? 'Usa el botón para abrir el escáner en vivo del navegador. Si prefieres, también puedes subir una imagen o pegar el valor del QR.'
                          : 'Usa el botón para abrir la webcam. Si prefieres, también puedes subir una imagen del QR o pegar el valor manualmente.'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {!canUseLiveVideoScanner
                ? isMobileDevice
                  ? 'Este navegador móvil no nos está dando acceso a la cámara en vivo desde esta URL. Si estás entrando por HTTP o IP local, prueba con un dominio HTTPS.'
                  : 'Este navegador no nos está dando acceso a la cámara en vivo desde esta URL.'
                : isMobileDevice
                  ? cameraState === 'ready'
                    ? 'Escaneando en vivo desde el celular. Cuando detectemos un QR válido, abriremos la ficha.'
                    : cameraState === 'resolving'
                      ? 'Resolviendo el QR detectado...'
                      : cameraState === 'blocked'
                        ? 'El escaneo quedó en pausa tras el último error. Reintenta cuando quieras volver a leer el QR.'
                        : 'Abre la cámara del celular para escanear el QR en vivo.'
                  : cameraState === 'ready'
                    ? 'Escaneando en tiempo real. Cuando detectemos un QR válido, te llevaremos directo a la ficha.'
                    : cameraState === 'resolving'
                      ? 'Resolviendo el QR detectado...'
                      : cameraState === 'blocked'
                        ? 'La cámara quedó en pausa tras el último error. Pulsa Reintentar para volver a escanear.'
                        : hasCamera === false
                          ? 'No detectamos cámara disponible en esta laptop. Usa la carga de imagen o pega el valor del QR.'
                          : 'La cámara todavía no está abierta.'}
            </div>

            {!isMobileDevice && cameraOptions.length > 1 ? (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">Cámara</span>
                <select
                  value={selectedCamera}
                  onChange={(event) => {
                    const nextCamera = event.target.value;
                    setSelectedCamera(nextCamera);
                    if (scannerRef.current) {
                      void scannerRef.current
                        .setCamera(nextCamera)
                        .catch(() => startScanner(nextCamera));
                    }
                  }}
                  className="peloteras-form-control peloteras-form-control--select h-10 px-3"
                >
                  {cameraOptions.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || 'Cámara'}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {cameraError ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{cameraError}</span>
              {cameraState === 'blocked' ? (
                <button
                  type="button"
                  onClick={() => void startScanner()}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Reintentar
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="min-w-0 w-full space-y-5">
          <section className="min-w-0 w-full rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Si no puedes escanear
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  Sube una imagen o pega el código del QR
                </h2>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Si la cámara no lee el QR, puedes validar a la jugadora desde una imagen o
                  pegando el código.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
              >
                Subir imagen
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />

            <div className="mt-4">
              <label
                className="mb-2 block text-sm font-semibold text-slate-800"
                htmlFor="qr-manual-value"
              >
                Código o enlace del QR
              </label>
              <textarea
                id="qr-manual-value"
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder="Pega aquí el código o enlace del QR de la jugadora."
                rows={5}
                className="peloteras-form-control peloteras-form-control--textarea"
              />
              <p className="mt-2 text-xs text-slate-500">
                Úsalo si tienes el QR en otra app, en un mensaje o en un archivo.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Pegar código
                </button>
                <button
                  type="button"
                  onClick={() => void handleManualSubmit()}
                  disabled={!manualValue.trim() || cameraState === 'resolving'}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Ver ficha
                </button>
              </div>
            </div>
          </section>

          <section className="min-w-0 w-full rounded-[30px] border border-[#54086F]/15 bg-[linear-gradient(135deg,rgba(84,8,111,0.08),rgba(15,118,110,0.08))] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Flujo
            </p>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              <li>1. Escanea el QR o carga una imagen.</li>
              <li>2. El sistema reconoce el código.</li>
              <li>3. Revisa la información de la jugadora.</li>
              <li>4. Confirma su asistencia.</li>
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}
