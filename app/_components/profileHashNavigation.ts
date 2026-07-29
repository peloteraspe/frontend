import type { MouseEvent } from 'react';

const PROFILE_PATH = '/profile';

export function handleSameProfileHashNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  href: string
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    typeof window === 'undefined'
  ) {
    return;
  }

  const currentUrl = new URL(window.location.href);
  const destinationUrl = new URL(href, currentUrl);

  if (
    currentUrl.pathname !== PROFILE_PATH ||
    destinationUrl.pathname !== PROFILE_PATH ||
    destinationUrl.search !== currentUrl.search ||
    !destinationUrl.hash
  ) {
    return;
  }

  event.preventDefault();

  if (currentUrl.hash === destinationUrl.hash) {
    window.dispatchEvent(new Event('hashchange'));
    return;
  }

  window.location.hash = destinationUrl.hash;
}
