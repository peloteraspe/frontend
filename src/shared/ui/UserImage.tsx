import { useEffect, useMemo, useState } from 'react';

interface UserImageProps {
  src: string | null | undefined;
  name?: string | null | undefined;
  size?: number;
}

function getInitials(name: string | null | undefined) {
  const cleanName = String(name || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!cleanName) return 'US';

  const words = cleanName.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  return cleanName.slice(0, 2).toUpperCase();
}

function isRenderableImage(rawSrc: string | null | undefined) {
  const src = String(rawSrc || '').trim();
  if (!src) return false;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:image/')) return true;
  if (src.startsWith('/')) return src.length > 1;
  return false;
}

const UserImage: React.FC<UserImageProps> = ({ src, name, size = 40 }) => {
  const safeSrc = useMemo(() => String(src || '').trim(), [src]);
  const [hasImageError, setHasImageError] = useState(false);
  const initials = getInitials(name);
  const textSizeClass = size >= 40 ? 'text-sm' : 'text-xs';

  useEffect(() => {
    setHasImageError(false);
  }, [safeSrc]);

  const canRenderImage = isRenderableImage(safeSrc) && !hasImageError;

  if (canRenderImage) {
    return (
      <span
        className="inline-flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img
          className="h-full w-full object-cover"
          alt={name ? `Avatar de ${name}` : 'Avatar de usuario'}
          src={safeSrc}
          onError={() => setHasImageError(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#54086F]/20 bg-[#54086F]/10 font-semibold uppercase text-[#54086F] ${textSizeClass}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-label={name ? `Iniciales de ${name}` : 'Iniciales de usuario'}
    >
      {initials}
    </span>
  );
};

export default UserImage;
