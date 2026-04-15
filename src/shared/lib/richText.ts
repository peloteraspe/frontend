function normalizeRichTextInput(value: string) {
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

function normalizeRichHref(value: string) {
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

function normalizeRichImageSrc(value: string) {
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

function normalizeRichAlt(value: string) {
  return normalizeRichTextInput(value).replace(/\s+/g, ' ').trim();
}

function getRichTextAttribute(attributes: string, attributeName: string) {
  const escapedAttributeName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `${escapedAttributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`,
    'i'
  );
  const match = regex.exec(attributes);
  return String(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
}

function sanitizeRichTextStyle(rawStyle: string, tagName: string) {
  const allowIndentation = new Set(['p', 'ul', 'ol', 'li']);
  if (!allowIndentation.has(tagName)) return '';

  const rules = String(rawStyle || '')
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean);

  const sanitizedRules: string[] = [];

  rules.forEach((rule) => {
    const separatorIndex = rule.indexOf(':');
    if (separatorIndex <= 0) return;

    const property = rule.slice(0, separatorIndex).trim().toLowerCase();
    const value = rule
      .slice(separatorIndex + 1)
      .trim()
      .toLowerCase();

    if (['margin-left', 'padding-left', 'text-indent'].includes(property)) {
      if (/^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(value)) {
        sanitizedRules.push(`${property}:${value}`);
      }
      return;
    }

    if (property === 'text-align' && ['left', 'center', 'right', 'justify'].includes(value)) {
      sanitizedRules.push(`${property}:${value}`);
    }
  });

  return sanitizedRules.join(';');
}

export function sanitizeRichTextHtml(value: string | undefined | null) {
  const normalized = normalizeRichTextInput(String(value || '')).trim();
  if (!normalized) return '';

  const strippedUnsafeTags = normalized
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*\/?\s*>/gi, '');

  const tagPattern = /<\/?([a-z0-9]+)\b([^>]*)>/gi;
  const tagNameMap: Record<string, string> = {
    a: 'a',
    b: 'strong',
    blockquote: 'p',
    br: 'br',
    div: 'p',
    em: 'em',
    img: 'img',
    i: 'em',
    li: 'li',
    ol: 'ol',
    p: 'p',
    strong: 'strong',
    u: 'u',
    ul: 'ul',
  };

  let lastIndex = 0;
  let output = '';
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(strippedUnsafeTags))) {
    output += escapeHtml(strippedUnsafeTags.slice(lastIndex, match.index));
    lastIndex = tagPattern.lastIndex;

    const isClosingTag = match[0].startsWith('</');
    const rawTagName = String(match[1] || '').toLowerCase();
    const tagName = tagNameMap[rawTagName];
    if (!tagName) continue;

    if (isClosingTag) {
      if (tagName === 'br' || tagName === 'img') continue;
      output += `</${tagName}>`;
      continue;
    }

    if (tagName === 'br') {
      output += '<br />';
      continue;
    }

    if (tagName === 'img') {
      const src = normalizeRichImageSrc(getRichTextAttribute(match[2] || '', 'src'));
      if (!src) continue;

      const alt = normalizeRichAlt(getRichTextAttribute(match[2] || '', 'alt'));
      output += `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" />`;
      continue;
    }

    if (tagName === 'a') {
      const href = normalizeRichHref(getRichTextAttribute(match[2] || '', 'href'));
      output += href
        ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">`
        : '<a>';
      continue;
    }

    const customStyle = sanitizeRichTextStyle(getRichTextAttribute(match[2] || '', 'style'), tagName);
    output += customStyle
      ? `<${tagName} style="${escapeAttribute(customStyle)}">`
      : `<${tagName}>`;
  }

  output += escapeHtml(strippedUnsafeTags.slice(lastIndex));
  return output.trim();
}
