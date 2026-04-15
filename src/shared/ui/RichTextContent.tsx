'use client';

import { sanitizeRichTextHtml } from '@shared/lib/richText';

type Props = {
  html?: string | null;
  text?: string | null;
  emptyText?: string;
  className?: string;
};

const BASE_CLASS_NAME = [
  'break-words',
  '[&_a]:font-medium',
  '[&_a]:text-mulberry',
  '[&_a]:underline',
  '[&_a]:underline-offset-2',
  '[&_em]:italic',
  '[&_img]:my-4',
  '[&_img]:max-w-full',
  '[&_img]:rounded-2xl',
  '[&_li]:mb-1.5',
  '[&_li:last-child]:mb-0',
  '[&_ol]:mb-3',
  '[&_ol]:list-decimal',
  '[&_ol]:pl-5',
  '[&_p]:mb-3',
  '[&_p:last-child]:mb-0',
  '[&_strong]:font-semibold',
  '[&_u]:underline',
  '[&_ul]:mb-3',
  '[&_ul]:list-disc',
  '[&_ul]:pl-5',
].join(' ');

export default function RichTextContent({
  html,
  text,
  emptyText = '',
  className = '',
}: Props) {
  const sanitizedHtml = sanitizeRichTextHtml(html);
  const resolvedClassName = [BASE_CLASS_NAME, className].filter(Boolean).join(' ');

  if (sanitizedHtml) {
    return <div className={resolvedClassName} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
  }

  const resolvedText = String(text || '').trim() || emptyText;

  return (
    <div className={resolvedClassName}>
      <p className="whitespace-pre-line">{resolvedText}</p>
    </div>
  );
}
