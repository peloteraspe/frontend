'use client';

import { CheckIcon, ShareIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

type Props = {
  title: string;
  text: string;
  compactOnMobile?: boolean;
};

export default function PublicProfileShareButton({
  title,
  text,
  compactOnMobile = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function shareProfile() {
    const url = window.location.href;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia este enlace', url);
    }
  }

  return (
    <button
      type="button"
      onClick={shareProfile}
      className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/70 bg-white px-4 text-sm font-semibold text-mulberry shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
    >
      {copied ? (
        <CheckIcon aria-hidden="true" className="h-4 w-4" />
      ) : (
        <ShareIcon aria-hidden="true" className="h-4 w-4" />
      )}
      <span aria-live="polite">
        {compactOnMobile ? (
          <>
            <span className="sm:hidden">{copied ? 'Copiado' : 'Compartir'}</span>
            <span className="hidden sm:inline">
              {copied ? 'Enlace copiado' : 'Compartir perfil'}
            </span>
          </>
        ) : copied ? (
          'Enlace copiado'
        ) : (
          'Compartir perfil'
        )}
      </span>
    </button>
  );
}
