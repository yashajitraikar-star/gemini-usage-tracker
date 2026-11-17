import { adminAuth } from '@/lib/firebase-admin';
import { isAdminClaims } from '@/lib/apiAuth';

/** Server-only. Admin rights are the `admin: true` custom claim on a Firebase Auth account. */

export async function setAdmin(email: string, on: boolean): Promise<{ uid: string; email: string }> {
  const user = await adminAuth.getUserByEmail(email.trim()); // throws auth/user-not-found if they never signed up
  const claims = { ...(user.customClaims ?? {}) };
  if (on) claims.admin = true;
  else delete claims.admin;
  await adminAuth.setCustomUserClaims(user.uid, claims);
  return { uid: user.uid, email: user.email ?? email };
}

export async function listAdmins(): Promise<{ uid: string; email: string | null }[]> {
  const out: { uid: string; email: string | null }[] = [];
  let pageToken: string | undefined;
  // shortcut: scans every account; keep a separate admins index if the user count reaches the tens of thousands.
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const u of page.users) if (isAdminClaims(u.customClaims)) out.push({ uid: u.uid, email: u.email ?? null });
    pageToken = page.pageToken;
  } while (pageToken);
  return out;
}
