import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { listAdmins, setAdmin } from '@/lib/admins';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const who = await requireAdmin(request);
  if (who instanceof Response) return who;
  try {
    return NextResponse.json({ admins: await listAdmins(), you: who.uid });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not list admins.' }, { status: 500 });
  }
}

/** Body: { email, admin: true | false }. Grants or removes admin rights. */
export async function POST(request: Request) {
  const who = await requireAdmin(request);
  if (who instanceof Response) return who;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof body?.admin !== 'boolean') {
    return NextResponse.json({ error: 'Send { email, admin: true | false } with a valid email.' }, { status: 400 });
  }

  try {
    if (!body.admin) {
      const target = await adminAuth.getUserByEmail(email);
      if (target.uid === who.uid) {
        return NextResponse.json({ error: 'You cannot remove your own admin rights.' }, { status: 400 });
      }
    }
    return NextResponse.json(await setAdmin(email, body.admin));
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'No account with that email. They must sign up in the app first.' }, { status: 404 });
    }
    return NextResponse.json({ error: err?.message || 'Could not update admin rights.' }, { status: 500 });
  }
}
