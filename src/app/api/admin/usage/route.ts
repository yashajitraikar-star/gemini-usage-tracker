import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { GEMINI_PRICES_USD_PER_MILLION } from '@/lib/usage/prices';
import { summariseUsage, type UsageRecord } from '@/lib/usage/summariseUsage';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export async function GET(request: Request) {
  const who = await requireAdmin(request);
  if (who instanceof Response) return who;

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') ?? '';
    const to = searchParams.get('to') ?? '';
    if (!DATE.test(from) || !DATE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)) || from > to) {
      return NextResponse.json({ error: 'from and to must be YYYY-MM-DD dates with from <= to.' }, { status: 400 });
    }
    if ((Date.parse(to) - Date.parse(from)) / DAY_MS > 92) {
      return NextResponse.json({ error: 'The range may not exceed 92 days.' }, { status: 400 });
    }
    const dayAfterTo = new Date(Date.parse(to) + DAY_MS).toISOString().slice(0, 10);

    // shortcut: reads every usage doc in the range; switch to monthly per-user rollups (FieldValue.increment) if a 92-day range passes ~50k docs.
    const snap = await adminDb.collection('geminiUsage').where('at', '>=', from).where('at', '<', dayAfterTo).get();
    const records = snap.docs.map((d) => d.data() as UsageRecord);
    const summary = summariseUsage(records, GEMINI_PRICES_USD_PER_MILLION);

    const emails: Record<string, string> = {};
    try {
      const uids = summary.byUser.map((r) => r.key).filter((u) => u !== 'unattributed').slice(0, 100);
      if (uids.length) {
        const res = await adminAuth.getUsers(uids.map((uid) => ({ uid })));
        for (const u of res.users) if (u.email) emails[u.uid] = u.email;
      }
    } catch { /* emails are optional */ }

    return NextResponse.json({
      from, to, ...summary, emails,
      recordCount: records.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Usage lookup failed.' }, { status: 500 });
  }
}
