import { adminAuth } from '@/lib/firebase-admin';

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });

/** Pure: the token from an `Authorization: Bearer <token>` header, or null. */
export function bearerToken(header: string | null): string | null {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header ?? '');
  return m ? m[1] : null;
}
/** 401 Response, or the verified uid. */
export async function requireUser(req: Request): Promise<{ uid: string } | Response> {
  const token = bearerToken(req.headers.get('authorization'));
  if (!token) return json(401, 'Not signed in');
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return json(401, 'Invalid or expired sign-in');
  }
}

/** Pure: do these Firebase custom claims make the user an admin? Only an exact `admin: true` does. */
export function isAdminClaims(claims: Record<string, unknown> | undefined): boolean {
  return claims?.admin === true;
}

/** 401/403 Response, or the admin's uid. */
export async function requireAdmin(req: Request): Promise<{ uid: string } | Response> {
  const who = await requireUser(req);
  if (who instanceof Response) return who;
  try {
    // Read the claim from the account, not the ID token, so adding or removing an admin applies on the next request.
    const user = await adminAuth.getUser(who.uid);
    return isAdminClaims(user.customClaims) ? who : json(403, 'Forbidden');
  } catch {
    return json(403, 'Forbidden');
  }
}
