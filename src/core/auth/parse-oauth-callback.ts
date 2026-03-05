//  OAuth/Magic Link
export function parseOauthCallbackParams(url: string) {
  const parsedUrl = new URL(url);
  const searchParams = parsedUrl.searchParams;
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  const getParam = (key: string) =>
    searchParams.get(key) || hashParams.get(key) || null;

  const error = getParam('error');
  const error_code = getParam('error_code');
  const error_description = getParam('error_description');
  const next = getParam('next');

  return { error, error_code, error_description, next };
}
