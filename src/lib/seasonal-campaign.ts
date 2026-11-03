// The visual edition ends automatically in Colombia. The 15-day trial remains
// available year-round; this window changes presentation only, never pricing.
const HALLOWEEN_START = Date.parse('2026-10-30T00:00:00-05:00');
const HALLOWEEN_END = Date.parse('2026-11-03T00:00:00-05:00');

export function isHalloweenEditionActive(now = Date.now()) {
  return now >= HALLOWEEN_START && now < HALLOWEEN_END;
}

// Commercial Christmas edition in Colombia: visual merchandising only.
// The free trial, prices, payment rules and trial expiry do not change.
const CHRISTMAS_START = Date.parse('2026-11-03T00:00:00-05:00');
const CHRISTMAS_END = Date.parse('2027-01-07T00:00:00-05:00');
export function isChristmasEditionActive(now=Date.now()){
  return now >= CHRISTMAS_START && now < CHRISTMAS_END;
}
