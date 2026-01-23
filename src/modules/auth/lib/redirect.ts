export function oauthRedirectTo(nextPath = '/profile') {
  const next = encodeURIComponent(nextPath);
  return `${window.location.origin}/auth/callback?next=${next}`;
}
