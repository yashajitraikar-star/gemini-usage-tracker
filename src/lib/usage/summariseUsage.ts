export type UsageRecord = { at: string; uid: string; refId: string | null; route: string; step: string; model: string;
  inputTokens: number; outputTokens: number; thinkingTokens: number; totalTokens: number };
export type UsageRow = { key: string; calls: number; inputTokens: number; outputTokens: number; thinkingTokens: number;
  costUsd: number | null /* null when any record in the row has an unpriced model */ };
type Prices = Record<string, { input: number; output: number }>;

function group(records: UsageRecord[], keyOf: (r: UsageRecord) => string | null, prices: Prices): UsageRow[] {
  const rows = new Map<string, UsageRow>();
  for (const r of records) {
    const key = keyOf(r);
    if (key === null) continue;
    const row = rows.get(key) ?? { key, calls: 0, inputTokens: 0, outputTokens: 0, thinkingTokens: 0, costUsd: 0 };
    row.calls += 1;
    row.inputTokens += r.inputTokens;
    row.outputTokens += r.outputTokens;
    row.thinkingTokens += r.thinkingTokens;
    const p = prices[r.model];
    row.costUsd = p && row.costUsd !== null
      ? row.costUsd + (r.inputTokens * p.input + (r.outputTokens + r.thinkingTokens) * p.output) / 1_000_000
      : null;
    rows.set(key, row);
  }
  const tokens = (x: UsageRow) => x.inputTokens + x.outputTokens + x.thinkingTokens;
  return [...rows.values()].sort((a, b) =>
    (a.costUsd === null ? 1 : 0) - (b.costUsd === null ? 1 : 0) || (b.costUsd ?? 0) - (a.costUsd ?? 0) || tokens(b) - tokens(a));
}

export function summariseUsage(records: UsageRecord[], prices: Prices): {
  byUser: UsageRow[]; byRef: UsageRow[]; byStep: UsageRow[]; byModel: UsageRow[]; unpricedModels: string[]; totalCostUsd: number | null;
} {
  const total = group(records, () => 'all', prices)[0];
  return {
    byUser: group(records, (r) => r.uid, prices),
    byRef: group(records, (r) => r.refId, prices),
    byStep: group(records, (r) => `${r.route}/${r.step}`, prices),
    byModel: group(records, (r) => r.model, prices),
    unpricedModels: [...new Set(records.map((r) => r.model).filter((m) => !prices[m]))].sort(),
    totalCostUsd: total ? total.costUsd : 0,
  };
}
