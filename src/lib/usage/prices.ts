/** USD per 1M tokens. Fill from https://ai.google.dev/gemini-api/docs/pricing (paid tier). Thinking tokens are billed at the output rate.
 *  A model with no row shows "Price not set" on the admin page; never guess a price. */
export const GEMINI_PRICES_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  // 'gemini-3.8-flash': { input: ?, output: ? },
  // 'gemini-3.5-flash-lite': { input: ?, output: ? },
};
