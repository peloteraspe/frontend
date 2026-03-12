'use client';

import { useEffect, useRef } from 'react';

type Props = {
  id: string;
  textName: string;
  htmlName: string;
  defaultValue: string;
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
  return Boolean(content.text.replace(/\s+/g, '').trim()) || /<br\s*\/?>/i.test(content.html);
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

export default function UsersRichTextEditor({ id, textName, htmlName, defaultValue }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const plainInputRef = useRef<HTMLInputElement | null>(null);
  const htmlInputRef = useRef<HTMLInputElement | null>(null);

  const syncHiddenFields = () => {
    if (!editorRef.current || !plainInputRef.current || !htmlInputRef.current) return;

    const serialized = serializeEditorContent(editorRef.current);
    plainInputRef.current.value = serialized.text;
    htmlInputRef.current.value = serialized.html;
  };

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncHiddenFields();
  };

  useEffect(() => {
    if (!editorRef.current) return;

    editorRef.current.innerHTML = renderInitialHtml(defaultValue);
    syncHiddenFields();
  }, [defaultValue]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <ToolbarButton label="Negrita" onClick={() => runCommand('bold')} />
        <ToolbarButton label="Cursiva" onClick={() => runCommand('italic')} />
        <ToolbarButton label="Subrayado" onClick={() => runCommand('underline')} />
        <ToolbarButton label="Lista" onClick={() => runCommand('insertUnorderedList')} />
        <ToolbarButton label="Numerada" onClick={() => runCommand('insertOrderedList')} />
        <ToolbarButton label="Sangría" onClick={() => runCommand('indent')} />
        <ToolbarButton label="Quitar sangría" onClick={() => runCommand('outdent')} />
        <ToolbarButton label="Limpiar formato" onClick={() => runCommand('removeFormat')} />
      </div>

      <div
        id={id}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncHiddenFields}
        onBlur={syncHiddenFields}
        onPaste={() => {
          requestAnimationFrame(syncHiddenFields);
        }}
        onKeyUp={syncHiddenFields}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault();
            runCommand(event.shiftKey ? 'outdent' : 'indent');
          }
        }}
        className="min-h-[360px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-mulberry focus:ring-2 focus:ring-mulberry/20"
      />

      <input ref={plainInputRef} type="hidden" name={textName} />
      <input ref={htmlInputRef} type="hidden" name={htmlName} />

      <p className="mt-2 text-xs text-slate-500">
        Puedes pegar contenido con formato desde Docs o Word. Se respetan negritas, listas, enlaces y sangrías
        básicas en el correo.
      </p>
    </div>
  );
}
