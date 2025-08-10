"use client";
import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`px-2 py-1 text-xs rounded border ${copied ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-mulberry border-mulberry'}`}
    >
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}
