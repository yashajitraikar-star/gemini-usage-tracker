import assert from 'node:assert/strict';
import { summariseUsage, type UsageRecord } from './summariseUsage';
const isAdminClaims = (c: Record<string, unknown> | undefined) => c?.admin === true; // copy of apiAuth.isAdminClaims; apiAuth imports firebase-admin

const rec = (o: Partial<UsageRecord>): UsageRecord => ({
  at: '2026-11-01T00:00:00Z', uid: 'u1', refId: 'c1', route: 'my-route', step: 'ocr', model: 'm',
  inputTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0, ...o,
});
const prices = { m: { input: 1, output: 2 } };

// 1 + 2: exact totals, thinking at output rate
let s = summariseUsage([
  rec({ inputTokens: 1_000_000, outputTokens: 500_000, thinkingTokens: 500_000 }),
  rec({ uid: 'u2', inputTokens: 1_000_000 }),
], prices);
assert.equal(s.byUser.find((r) => r.key === 'u1')!.costUsd, 3);
assert.equal(s.byUser.find((r) => r.key === 'u2')!.costUsd, 1);
assert.equal(s.totalCostUsd, 4);
assert.equal(s.byUser[0].key, 'u1'); // sorted by cost desc

// 3: unpriced model
s = summariseUsage([rec({ model: 'x', inputTokens: 5 }), rec({ inputTokens: 5 })], prices);
assert.equal(s.byModel.find((r) => r.key === 'x')!.costUsd, null);
assert.equal(s.byUser[0].costUsd, null);
assert.deepEqual(s.unpricedModels, ['x']);
assert.equal(s.totalCostUsd, null);

// 4 + 5
s = summariseUsage([rec({ refId: null }), rec({ step: 'facts' })], prices);
assert.deepEqual(s.byRef.map((r) => r.key), ['c1']);
assert.deepEqual(s.byStep.map((r) => r.key).sort(), ['my-route/facts', 'my-route/ocr']);

// 6
s = summariseUsage([], prices);
assert.deepEqual([s.byUser, s.byRef, s.byStep, s.byModel, s.unpricedModels], [[], [], [], [], []]);
assert.equal(s.totalCostUsd, 0);

// isAdminClaims: only an exact boolean true counts
assert.equal(isAdminClaims(undefined), false);
assert.equal(isAdminClaims({}), false);
assert.equal(isAdminClaims({ admin: true }), true);
assert.equal(isAdminClaims({ admin: 'true' }), false);
assert.equal(isAdminClaims({ admin: 1 }), false);

console.log('summariseUsage: all checks passed');
