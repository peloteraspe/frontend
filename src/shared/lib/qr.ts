export function buildQrImageUrl(value: string, size = 260) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';

  const normalizedSize = Number.isFinite(size) && size > 0 ? Math.round(size) : 260;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${normalizedSize}x${normalizedSize}&qzone=2&data=${encodeURIComponent(normalizedValue)}`;
}
