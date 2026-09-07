/** 1★–5★ review counts used by rating histogram bars */
export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export function emptyRatingDistribution(): RatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export function normalizeRatingDistribution(raw: unknown): RatingDistribution {
  const out = emptyRatingDistribution();
  if (!raw || typeof raw !== 'object') return out;
  const obj = raw as Record<string | number, unknown>;
  for (const star of [1, 2, 3, 4, 5] as const) {
    const v = obj[star] ?? obj[String(star)];
    const n = typeof v === 'number' ? v : Number(v);
    out[star] = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
  return out;
}

export function ratingDistributionTotal(dist: RatingDistribution): number {
  return dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
}

export function ratingChartRows(
  raw: unknown,
  totalHint = 0,
): Array<{ star: 1 | 2 | 3 | 4 | 5; count: number; pct: number }> {
  const dist = normalizeRatingDistribution(raw);
  const sum = ratingDistributionTotal(dist);
  const total = sum > 0 ? sum : Math.max(0, totalHint);
  return ([5, 4, 3, 2, 1] as const).map((star) => {
    const count = dist[star];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { star, count, pct };
  });
}
