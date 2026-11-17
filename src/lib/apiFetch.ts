import { auth } from '@/lib/firebase';

/** fetch() for our own /api routes: adds the signed-in user's Firebase ID token. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  await auth.authStateReady(); // on page load currentUser is null until Firebase restores the session
  const token = await auth.currentUser?.getIdToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
