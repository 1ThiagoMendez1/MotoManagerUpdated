// The visual edition ends automatically in Colombia. The 15-day trial remains
// available year-round; this window changes presentation only, never pricing.
const HALLOWEEN_START = Date.parse('2026-10-30T00:00:00-05:00');
const HALLOWEEN_END = Date.parse('2026-11-03T00:00:00-05:00');

export function isHalloweenEditionActive(now = Date.now()) {
  return now >= HALLOWEEN_START && now < HALLOWEEN_END;
}
