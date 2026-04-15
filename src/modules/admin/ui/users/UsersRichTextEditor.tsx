'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeRichTextHtml } from '@shared/lib/richText';

type Props = {
  id: string;
  textName: string;
  htmlName: string;
  defaultValue: string;
  defaultHtml?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  resetKey?: string | number;
  onChange?: (content: SerializedContent) => void;
};

type SerializedContent = {
  html: string;
  text: string;
};

const URL_PATTERN = /((?:https?:\/\/|mailto:)[^\s<]+|www\.[^\s<]+)/gi;
const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'P',
  'PRE',
  'SECTION',
]);

function normalizeText(value: string) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u2028|\u2029/g, '\n')
    .replace(/\u200b/g, '');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: unknown) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function preserveSpaces(value: string) {
  return escapeHtml(value).replace(/ {2,}/g, (spaces) => '\u00a0'.repeat(Math.max(spaces.length - 1, 1)) + ' ');
}

function normalizeHref(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const candidate = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeImageSrc(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeAltText(value: string) {
  return normalizeText(value).replace(/\s+/g, ' ').trim();
}

function splitTrailingPunctuation(value: string) {
  let url = value;
  let trailing = '';

  while (/[),.;:!?]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }

  return { url, trailing };
}

function serializeTextNodeValue(value: string, allowAutoLink = true): SerializedContent {
  const text = normalizeText(value);
  if (!text) return { html: '', text: '' };

  if (!allowAutoLink) {
    return {
      html: preserveSpaces(text),
      text,
    };
  }

  let html = '';
  let lastIndex = 0;

  const matcher = new RegExp(URL_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text))) {
    const start = match.index ?? 0;
    const rawMatch = match[0] || '';
    html += preserveSpaces(text.slice(lastIndex, start));

    const { url, trailing } = splitTrailingPunctuation(rawMatch);
    const href = normalizeHref(url);

    if (href) {
      html += `<a href="${escapeAttribute(href)}">${escapeHtml(url)}</a>`;
    } else {
      html += preserveSpaces(rawMatch);
    }

    html += preserveSpaces(trailing);
    lastIndex = start + rawMatch.length;
  }

  html += preserveSpaces(text.slice(lastIndex));

  return {
    html,
    text,
  };
}

function sanitizeLengthStyle(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (!/^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(normalized)) return '';
  return normalized;
}

function sanitizeTextAlign(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!['left', 'center', 'right', 'justify'].includes(normalized)) return '';
  return normalized;
}

function getBlockStyle(element: HTMLElement) {
  const styles: string[] = [];

  const marginLeft = sanitizeLengthStyle(element.style.marginLeft);
  const paddingLeft = sanitizeLengthStyle(element.style.paddingLeft);
  const textIndent = sanitizeLengthStyle(element.style.textIndent);
  const textAlign = sanitizeTextAlign(element.style.textAlign);

  if (marginLeft) styles.push(`margin-left:${marginLeft}`);
  if (paddingLeft) styles.push(`padding-left:${paddingLeft}`);
  if (textIndent) styles.push(`text-indent:${textIndent}`);
  if (textAlign) styles.push(`text-align:${textAlign}`);

  if (element.tagName.toUpperCase() === 'BLOCKQUOTE' && !marginLeft) {
    styles.push('margin-left:24px');
    styles.push('padding-left:16px');
  }

  return styles.join(';');
}

function getInlineFormatting(element: HTMLElement) {
  const tagName = element.tagName.toUpperCase();
  const fontWeight = String(element.style.fontWeight || '').trim().toLowerCase();
  const textDecoration = String(element.style.textDecoration || element.style.textDecorationLine || '')
    .trim()
    .toLowerCase();

  return {
    strong:
      tagName === 'B' ||
      tagName === 'STRONG' ||
      /^h[1-6]$/i.test(tagName) ||
      fontWeight === 'bold' ||
      Number(fontWeight) >= 600,
    em: tagName === 'I' || tagName === 'EM' || element.style.fontStyle === 'italic',
    underline: tagName === 'U' || textDecoration.includes('underline'),
  };
}

function applyInlineFormatting(html: string, formatting: ReturnType<typeof getInlineFormatting>) {
  let result = html;
  if (!result) return result;
  if (formatting.strong) result = `<strong>${result}</strong>`;
  if (formatting.em) result = `<em>${result}</em>`;
  if (formatting.underline) result = `<u>${result}</u>`;
  return result;
}

function hasVisibleContent(content: SerializedContent) {
  return (
    Boolean(content.text.replace(/\s+/g, '').trim()) ||
    /<br\s*\/?>/i.test(content.html) ||
    /<img\b/i.test(content.html)
  );
}

function serializeInlineNodes(nodes: ChildNode[], options?: { insideLink?: boolean }): SerializedContent {
  let html = '';
  let text = '';

  nodes.forEach((node) => {
    const serialized = serializeInlineNode(node, options);
    html += serialized.html;
    text += serialized.text;
  });

  return { html, text };
}

function serializeInlineNode(node: ChildNode, options?: { insideLink?: boolean }): SerializedContent {
  if (node.nodeType === Node.TEXT_NODE) {
    return serializeTextNodeValue(node.textContent || '', !(options?.insideLink ?? false));
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return { html: '', text: '' };
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

  if (tagName === 'BR') {
    return { html: '<br />', text: '\n' };
  }

  if (tagName === 'UL' || tagName === 'OL') {
    return serializeListElement(element);
  }

  const children = serializeInlineNodes(Array.from(element.childNodes), {
    insideLink: options?.insideLink ?? false,
  });

  if (tagName === 'A') {
    const href = normalizeHref(element.getAttribute('href') || '');
    const labelHtml = children.html || escapeHtml(element.textContent || href);
    return {
      html: href ? `<a href="${escapeAttribute(href)}">${labelHtml}</a>` : labelHtml,
      text: children.text || element.textContent || href,
    };
  }

  if (tagName === 'IMG') {
    const src = normalizeImageSrc(element.getAttribute('src') || '');
    if (!src) return { html: '', text: '' };

    const alt = normalizeAltText(element.getAttribute('alt') || '');
    return {
      html: `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" />`,
      text: alt ? `[Imagen: ${alt}]` : '',
    };
  }

  return {
    html: applyInlineFormatting(children.html, getInlineFormatting(element)),
    text: children.text,
  };
}

function serializeListItem(element: HTMLElement) {
  let html = '';
  let text = '';

  Array.from(element.childNodes).forEach((childNode) => {
    if (childNode.nodeType === Node.ELEMENT_NODE) {
      const childElement = childNode as HTMLElement;
      const tagName = childElement.tagName.toUpperCase();
      if (tagName === 'UL' || tagName === 'OL') {
        const nested = serializeListElement(childElement);
        html += nested.html;
        text += nested.text ? `${text ? '\n' : ''}${nested.text}` : '';
        return;
      }
    }

    const serialized = serializeInlineNode(childNode);
    html += serialized.html;
    text += serialized.text;
  });

  const style = getBlockStyle(element);
  return {
    html: `<li${style ? ` style="${escapeAttribute(style)}"` : ''}>${html || '<br />'}</li>`,
    text: normalizeText(text).trim(),
  };
}

function serializeListElement(element: HTMLElement): SerializedContent {
  const tagName = element.tagName.toUpperCase() === 'OL' ? 'ol' : 'ul';
  const items = Array.from(element.children)
    .map((child) => {
      if ((child as HTMLElement).tagName?.toUpperCase() === 'LI') {
        return serializeListItem(child as HTMLElement);
      }

      return serializeListItem(child as HTMLElement);
    })
    .filter((item) => item.html);

  if (!items.length) return { html: '', text: '' };

  const style = getBlockStyle(element);
  return {
    html: `<${tagName}${style ? ` style="${escapeAttribute(style)}"` : ''}>${items
      .map((item) => item.html)
      .join('')}</${tagName}>`,
    text: items
      .map((item, index) => `${tagName === 'ol' ? `${index + 1}.` : '•'} ${item.text}`.trim())
      .join('\n'),
  };
}

function serializeParagraph(nodes: ChildNode[], styleSource?: HTMLElement) {
  const content = serializeInlineNodes(nodes);
  if (!hasVisibleContent(content)) return null;

  const baseStyle = styleSource ? getBlockStyle(styleSource) : '';
  const html = applyInlineFormatting(content.html, styleSource ? getInlineFormatting(styleSource) : {
    strong: false,
    em: false,
    underline: false,
  });
  const text = normalizeText(content.text).replace(/\n{3,}/g, '\n\n').trim();

  return {
    html: `<p${baseStyle ? ` style="${escapeAttribute(baseStyle)}"` : ''}>${html || '<br />'}</p>`,
    text,
  };
}

function isRootInlineNode(node: ChildNode) {
  if (node.nodeType === Node.TEXT_NODE) {
    return Boolean(normalizeText(node.textContent || '').trim());
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const tagName = (node as HTMLElement).tagName.toUpperCase();
  return tagName === 'BR' || (!BLOCK_TAGS.has(tagName) && tagName !== 'UL' && tagName !== 'OL');
}

function serializeBlockElement(element: HTMLElement) {
  const tagName = element.tagName.toUpperCase();

  if (tagName === 'UL' || tagName === 'OL') {
    const list = serializeListElement(element);
    return list.html ? [list] : [];
  }

  if (tagName === 'LI') {
    const item = serializeListItem(element);
    if (!item.html) return [];

    return [
      {
        html: `<ul>${item.html}</ul>`,
        text: item.text ? `• ${item.text}` : '',
      },
    ];
  }

  const paragraph = serializeParagraph(Array.from(element.childNodes), element);
  return paragraph ? [paragraph] : [];
}

function serializeEditorContent(root: HTMLElement) {
  const blocks: Array<{ html: string; text: string }> = [];
  let inlineBuffer: ChildNode[] = [];

  const flushInlineBuffer = () => {
    if (!inlineBuffer.length) return;
    const paragraph = serializeParagraph(inlineBuffer);
    if (paragraph) blocks.push(paragraph);
    inlineBuffer = [];
  };

  Array.from(root.childNodes).forEach((node) => {
    if (isRootInlineNode(node)) {
      inlineBuffer.push(node);
      return;
    }

    flushInlineBuffer();

    if (node.nodeType === Node.ELEMENT_NODE) {
      blocks.push(...serializeBlockElement(node as HTMLElement));
    }
  });

  flushInlineBuffer();

  return {
    html: blocks.map((block) => block.html).join(''),
    text: blocks
      .map((block) => block.text)
      .filter(Boolean)
      .join('\n\n')
      .trim(),
  };
}

function renderInitialHtml(value: string) {
  const normalized = normalizeText(value).trim();
  if (!normalized) return '<p><br /></p>';

  return normalized
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.replace(/\s+$/g, ''))
        .filter((line) => line.trim().length > 0);

      const isList = lines.length > 0 && lines.every((line) => /^(⚽|•|-)\s+/.test(line));
      if (isList) {
        return `<ul>${lines
          .map((line) => line.replace(/^(⚽|•|-)\s+/, '').trim())
          .map((line) => `<li>${serializeTextNodeValue(line).html}</li>`)
          .join('')}</ul>`;
      }

      const html = lines.map((line) => serializeTextNodeValue(line).html).join('<br />');
      return `<p>${html || '<br />'}</p>`;
    })
    .join('');
}

function resolveInitialEditorHtml(defaultValue: string, defaultHtml?: string) {
  const sanitizedHtml = sanitizeRichTextHtml(defaultHtml);
  if (sanitizedHtml) return sanitizedHtml;
  return renderInitialHtml(defaultValue);
}

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

export default function UsersRichTextEditor({
  id,
  textName,
  htmlName,
  defaultValue,
  defaultHtml,
  ariaLabel,
  ariaLabelledBy,
  resetKey,
  onChange,
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const plainInputRef = useRef<HTMLInputElement | null>(null);
  const htmlInputRef = useRef<HTMLInputElement | null>(null);
  const initialContentRef = useRef({
    defaultValue,
    defaultHtml,
  });
  const savedSelectionRef = useRef<Range | null>(null);
  const imageUrlInputRef = useRef<HTMLInputElement | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [hasTouchedImageUrl, setHasTouchedImageUrl] = useState(false);
  const [hasAttemptedImageInsert, setHasAttemptedImageInsert] = useState(false);

  const normalizedImageUrl = normalizeImageSrc(imageUrl);
  const normalizedImageAlt = normalizeAltText(imageAlt);
  const showImageUrlError = !normalizedImageUrl && (hasTouchedImageUrl || hasAttemptedImageInsert);
  const imageUrlFieldId = `${id}-image-url`;
  const imageAltFieldId = `${id}-image-alt`;
  const imageDialogTitleId = `${id}-image-modal-title`;

  initialContentRef.current = {
    defaultValue,
    defaultHtml,
  };

  const syncHiddenFields = () => {
    if (!editorRef.current || !plainInputRef.current || !htmlInputRef.current) return;

    const serialized = serializeEditorContent(editorRef.current);
    plainInputRef.current.value = serialized.text;
    htmlInputRef.current.value = serialized.html;
    onChange?.(serialized);
  };

  const storeCurrentSelection = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    savedSelectionRef.current = range.cloneRange();
  };

  const restoreEditorSelection = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();

    if (savedSelectionRef.current) {
      selection.addRange(savedSelectionRef.current);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.addRange(range);
  };

  const resetImageModalState = () => {
    setImageUrl('');
    setImageAlt('');
    setHasTouchedImageUrl(false);
    setHasAttemptedImageInsert(false);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    resetImageModalState();
    requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  };

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncHiddenFields();
  };

  const openImageModal = () => {
    storeCurrentSelection();
    resetImageModalState();
    setIsImageModalOpen(true);
  };

  const insertLink = () => {
    storeCurrentSelection();

    const rawUrl = window.prompt('Pega la URL del enlace');
    if (rawUrl === null) return;

    const href = normalizeHref(rawUrl);
    if (!href) {
      window.alert('El enlace debe tener una URL valida que empiece con http, https o mailto.');
      return;
    }

    editorRef.current?.focus();
    restoreEditorSelection();

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    if (selectedText) {
      document.execCommand('createLink', false, href);
    } else {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${escapeAttribute(href)}">${escapeHtml(rawUrl.trim())}</a>`
      );
    }

    syncHiddenFields();
    storeCurrentSelection();
  };

  const insertImage = () => {
    if (!normalizedImageUrl) {
      setHasAttemptedImageInsert(true);
      imageUrlInputRef.current?.focus();
      return;
    }

    editorRef.current?.focus();
    restoreEditorSelection();
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${escapeAttribute(normalizedImageUrl)}" alt="${escapeAttribute(normalizedImageAlt)}" />`
    );
    syncHiddenFields();
    closeImageModal();
  };

  useEffect(() => {
    if (!editorRef.current) return;

    editorRef.current.innerHTML = resolveInitialEditorHtml(
      initialContentRef.current.defaultValue,
      initialContentRef.current.defaultHtml
    );
    syncHiddenFields();
  }, [resetKey]);

  useEffect(() => {
    if (!isImageModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusTimeout = window.setTimeout(() => {
      imageUrlInputRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsImageModalOpen(false);
      resetImageModalState();
      requestAnimationFrame(() => {
        editorRef.current?.focus();
      });
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimeout);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isImageModalOpen]);

  const imageModal =
    isImageModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 px-4 py-4 backdrop-blur-[3px] sm:py-6"
            onClick={closeImageModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={imageDialogTitleId}
              className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-left shadow-[0_32px_90px_-28px_rgba(15,23,42,0.58)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Cerrar modal de imagen"
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                onClick={closeImageModal}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="border-b border-slate-200 bg-gradient-to-br from-mulberry/7 via-white to-primary/10 px-5 py-5 sm:px-6">
                <h4 id={imageDialogTitleId} className="pr-12 text-lg font-semibold text-slate-900">
                  Insertar imagen
                </h4>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor={imageUrlFieldId} className="mb-2 block text-sm font-semibold text-slate-800">
                      URL de la imagen
                    </label>
                    <input
                      ref={imageUrlInputRef}
                      id={imageUrlFieldId}
                      type="url"
                      inputMode="url"
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      onBlur={() => setHasTouchedImageUrl(true)}
                      placeholder="https://ejemplo.com/banner-del-correo.jpg"
                      className={[
                        'peloteras-form-control h-11',
                        showImageUrlError ? 'peloteras-form-control--error' : '',
                      ].join(' ')}
                    />
                    {showImageUrlError ? (
                      <p className="mt-2 text-xs text-rose-700">
                        Pega una URL publica valida que empiece con `http://` o `https://`.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor={imageAltFieldId} className="mb-2 block text-sm font-semibold text-slate-800">
                      Texto alternativo
                    </label>
                    <input
                      id={imageAltFieldId}
                      type="text"
                      value={imageAlt}
                      onChange={(event) => setImageAlt(event.target.value)}
                      className="peloteras-form-control h-11"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeImageModal}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!normalizedImageUrl}
                      onClick={insertImage}
                      className={[
                        'inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition',
                        normalizedImageUrl
                          ? 'bg-mulberry hover:bg-mulberry/90'
                          : 'cursor-not-allowed bg-slate-400',
                      ].join(' ')}
                    >
                      Insertar imagen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <ToolbarButton label="Negrita" onClick={() => runCommand('bold')} />
        <ToolbarButton label="Cursiva" onClick={() => runCommand('italic')} />
        <ToolbarButton label="Subrayado" onClick={() => runCommand('underline')} />
        <ToolbarButton label="Enlace" onClick={insertLink} />
        <ToolbarButton label="Imagen" onClick={openImageModal} />
        <ToolbarButton label="Lista" onClick={() => runCommand('insertUnorderedList')} />
        <ToolbarButton label="Numerada" onClick={() => runCommand('insertOrderedList')} />
        <ToolbarButton label="Sangría" onClick={() => runCommand('indent')} />
        <ToolbarButton label="Quitar sangría" onClick={() => runCommand('outdent')} />
        <ToolbarButton label="Limpiar formato" onClick={() => runCommand('removeFormat')} />
      </div>

      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          syncHiddenFields();
          storeCurrentSelection();
        }}
        onMouseUp={storeCurrentSelection}
        onBlur={syncHiddenFields}
        onPaste={() => {
          requestAnimationFrame(() => {
            syncHiddenFields();
            storeCurrentSelection();
          });
        }}
        onFocus={storeCurrentSelection}
        onKeyUp={() => {
          syncHiddenFields();
          storeCurrentSelection();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault();
            runCommand(event.shiftKey ? 'outdent' : 'indent');
          }
        }}
        className="peloteras-form-control peloteras-form-control--textarea min-h-[360px]"
      />

      <input ref={plainInputRef} type="hidden" name={textName} />
      <input ref={htmlInputRef} type="hidden" name={htmlName} />

      <p className="mt-2 text-xs text-slate-500">
        Puedes pegar contenido con formato desde Docs o Word. Se respetan negritas, listas, enlaces, imágenes por
        URL y sangrías básicas en el correo.
      </p>

      {imageModal}
    </div>
  );
}
