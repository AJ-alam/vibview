// RPM in USD per 1000 views (TikTok Creator Rewards Program, ~$20-$40 per 1M views)
export const RPM = { low: 0.02, high: 0.04 } as const;

// Profile valuation: followers × tier multiplier + engagement bonus
// Formula is a heuristic — always label as non-authoritative estimate
export const VALUATION = {
  tiers: [
    { maxFollowers: 10_000,    usdPerFollower: 0.005 }, // nano-influencer
    { maxFollowers: 100_000,   usdPerFollower: 0.010 }, // micro-influencer
    { maxFollowers: 1_000_000, usdPerFollower: 0.020 }, // small creator
    { maxFollowers: Infinity,  usdPerFollower: 0.050 }, // macro / mega
  ],
  // Additional dollars per 1% of average engagement rate
  engagementBonusPerPercent: 1_000,
} as const;
