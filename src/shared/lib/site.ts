export const SITE_NAME = 'Peloteras';
export const SITE_URL = 'https://peloteras.com';

export function getAbsoluteUrl(path = '/') {
  return new URL(path, `${SITE_URL}/`).toString();
}
