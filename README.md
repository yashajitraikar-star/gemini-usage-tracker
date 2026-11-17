# gemini-usage-tracker

Logs the tokens of every Gemini call (input, output, thinking) to Firestore, tagged with the user, the route and a step, and shows the totals and cost on an admin page.

Built for a **Next.js (App Router) + Firebase + `@google/genai`** app. Files use the `@/` import alias.

## What's in here

| File | What it does |
|---|---|
| `src/lib/gemini.ts` | `GeminiClient`: wraps `@google/genai`; every `generateContent` call logs its usage |
| `src/lib/usage/context.ts` | `withUsage` / `withUsageStep`: attach uid, route, step (and an optional `refId`) to the calls inside |
| `src/lib/usage/recordUsage.ts` | Writes one `geminiUsage` doc per call. Never throws |
| `src/lib/usage/summariseUsage.ts` | Groups records by user / ref / step / model and prices them |
| `src/lib/usage/prices.ts` | USD per 1M tokens per model. **Fill this in** from https://ai.google.dev/gemini-api/docs/pricing |
| `src/app/api/admin/usage/route.ts` | `GET ?from=YYYY-MM-DD&to=YYYY-MM-DD` (max 92 days), admins only |
| `src/app/api/admin/admins/route.ts` | List / add / remove admins by email |
| `src/app/(main)/admin/usage/page.tsx` | The admin page |
| `src/lib/apiAuth.ts`, `src/lib/admins.ts`, `src/lib/apiFetch.ts` | Firebase ID-token auth, `admin: true` custom claim |
| `scripts/set-admin.ts` | Makes the first admin |

## Your app must already have

- `@/lib/firebase-admin` exporting `adminDb` (Firestore) and `adminAuth` (firebase-admin)
- `@/lib/firebase` exporting the client `auth`
- shadcn/ui `card`, `input`, `label`, `button`, `table` in `@/components/ui/`
- `npm i @google/genai firebase-admin`

## Use it

```ts
import { GeminiClient } from '@/lib/gemini';
import { withUsage, withUsageStep } from '@/lib/usage/context';

const gemini = new GeminiClient(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const uid = /* the signed-in user's uid */;
  return withUsage({ uid, route: 'summarise' }, async () => {
    const model = gemini.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const r = await withUsageStep('draft', () => model.generateContent('Hello'));
    return Response.json({ text: r.response.text() });
  });
}
```

Calls made outside `withUsage` are logged as `unattributed`. For background work (`after()`), call `withUsage` inside the `after()` callback.

## Make the first admin

```bash
npx tsx --env-file=.env.local scripts/set-admin.ts you@example.com
```

Then open `/admin/usage`. Admins can add others by email there.

## Firestore

Collection `geminiUsage`. The usage route queries a range on `at`, which needs no extra index. Keep the collection server-only in your security rules (the admin SDK bypasses them).

## Test

```bash
npx tsx src/lib/usage/summariseUsage.test.ts
```

Notes: costs are estimates from `prices.ts` (thinking tokens billed at the output rate); a model with no price shows "Price not set". The usage route reads every doc in the range, fine up to tens of thousands of calls.
