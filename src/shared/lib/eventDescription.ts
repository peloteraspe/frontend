function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function extractEventDescriptionText(value: unknown) {
  if (value && typeof value === 'object') {
    const maybe = value as { description?: string };
    return asString(maybe.description, '');
  }

  return asString(value, '');
}

export function extractEventDescriptionHtml(value: unknown) {
  if (value && typeof value === 'object') {
    const maybe = value as {
      description_html?: string;
      descriptionHtml?: string;
    };

    return asString(maybe.description_html ?? maybe.descriptionHtml, '');
  }

  return '';
}
