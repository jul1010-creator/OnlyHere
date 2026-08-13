// ── One request per key, even when two components ask in the same commit ──
//
// Found 12 Aug 2026 while auditing the live site: /api/weather was called
// EXACTLY TWICE for each of the four cities on every single homepage load.
// Eight requests where four were wanted, on the first paint, on every visit.
//
// The cause is worth writing down, because the guard that was already there
// looks like it should have worked:
//
//     WeatherHeaderStrip:  if (!weather[c.key] && weatherLoading !== c.key) checkWeather(...)
//     WeatherStrip:        if (!data && weatherLoading !== weatherKey) checkWeather(...)
//
// Both of those consumers are mounted at once on the homepage, and both effects
// run in the SAME commit. React state does not update between two effects in
// one commit, so when the second one reads `weather` and `weatherLoading` it
// sees exactly what the first one saw: nothing fetched, nothing loading. Each
// guard is correct about the world as it was told about it, and each is wrong.
//
// A ref is the only thing in React that is true DURING a commit. So the guard
// cannot live in the caller at all, it has to live in the one function every
// caller goes through, holding a Set that updates synchronously.
//
// runOnce returns null when it skipped, so a caller can tell the difference
// between "I started this" and "somebody else already did" if it ever needs to.
// The key is released whether the work resolves OR throws: a failed request
// must be retryable, or a single network blip would leave that city dead for
// the life of the page.
export const runOnce = (inFlight, key, work) => {
  if (!inFlight || inFlight.has(key)) return null;
  inFlight.add(key);
  const done = () => inFlight.delete(key);
  let started;
  try {
    started = work();
  } catch (e) {
    done();
    throw e;
  }
  return Promise.resolve(started).then(
    v => { done(); return v; },
    e => { done(); throw e; }
  );
};
