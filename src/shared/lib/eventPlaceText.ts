function asTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function extractEventPlaceText(source: unknown) {
  if (!source || typeof source !== 'object') return '';

  const event = source as {
    place_text?: unknown;
    placeText?: unknown;
    description?: unknown;
  };

  const directValue = asTrimmedString(event.place_text ?? event.placeText);
  if (directValue) return directValue;

  if (!event.description || typeof event.description !== 'object') return '';

  const description = event.description as {
    place_text?: unknown;
    placeText?: unknown;
  };

  return asTrimmedString(description.place_text ?? description.placeText);
}
