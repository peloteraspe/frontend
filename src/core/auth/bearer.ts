export function getBearer(request: Request): string | null {
  const h = request.headers.get('Authorization');
  return h && h.startsWith('Bearer ') ? h.slice(7) : null;
}
