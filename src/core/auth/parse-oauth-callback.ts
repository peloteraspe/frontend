//  OAuth/Magic Link
export function parseOauthCallbackParams(url: string) {
  const sp = new URL(url).searchParams;
  const error = sp.get('error') || null;
  const error_description = sp.get('error_description') || null;
  const next = sp.get('next') || '/';
  return { error, error_description, next };
}
