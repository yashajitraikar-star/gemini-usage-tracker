// One-time bootstrap for the first admin; after that, admins manage each other on /admin/usage.
// Usage: npx tsx --env-file=.env.local scripts/set-admin.ts someone@example.com [--remove]
import { setAdmin } from '../src/lib/admins';

const [email, flag] = process.argv.slice(2);
if (!email) throw new Error('Usage: scripts/set-admin.ts <email> [--remove]');

setAdmin(email, flag !== '--remove')
  .then((u) => console.log(`${flag === '--remove' ? 'Removed admin from' : 'Made admin:'} ${u.email} (${u.uid})`))
  .catch((e) => {
    console.error(e?.code === 'auth/user-not-found' ? `No account for ${email}: sign up in the app first.` : e);
    process.exit(1);
  });
