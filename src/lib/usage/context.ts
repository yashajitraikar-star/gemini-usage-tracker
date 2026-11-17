import { AsyncLocalStorage } from 'node:async_hooks';

export type UsageContext = { uid: string; refId: string | null; route: string; step: string };
const store = new AsyncLocalStorage<UsageContext>();

/** Runs fn with this user/ref/route attached to every Gemini call made inside it. step defaults to route. */
export function withUsage<T>(ctx: { uid: string; refId?: string | null; route: string }, fn: () => T): T {
  return store.run({ uid: ctx.uid, refId: ctx.refId ?? null, route: ctx.route, step: ctx.route }, fn);
}

/** Inside withUsage: labels the Gemini calls made in fn with a finer step (e.g. 'ocr'). */
export function withUsageStep<T>(step: string, fn: () => T): T {
  const cur = store.getStore();
  return cur ? store.run({ ...cur, step }, fn) : fn();
}

export function currentUsage(): UsageContext | undefined {
  return store.getStore();
}
