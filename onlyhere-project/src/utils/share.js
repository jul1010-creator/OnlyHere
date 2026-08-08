// ── SENDING A TRIP TO SOMEBODY ──────────────────────────────────────
// Oliver, 8 Aug 2026, on the competitor research: "So there is no competitor
// where we need to 'steal' ideas?" There are four, and this is the first of
// them. Wanderlog's single most praised feature is real-time collaboration.
// G8Trip won its own comparison for being "the only AI that fully coordinated 4
// travellers from different continents." Almost nobody plans a trip alone, and
// Gemlyx had no answer to "send this to the person you are going with" beyond a
// Copy link button that gave no feedback and nobody would trust.
//
// EVERY LINE OF COPY HERE IS COUNTED, NOT WRITTEN. A model asked to describe a
// trip in one line produces something that reads like insight and is not
// checkable, which is the exact failure this project exists to avoid. So the
// share text is built from the same three things the page already counts: how
// many days, how many stops, and which towns in what order.
//
// AND IT IS ALL-OR-NOTHING, same rule as tripShape in GuidePage. A summary
// assembled from the parts that happened to be present ("5 days" on a guide
// whose stops did not load) is worse than no summary: it goes out to a stranger
// in a WhatsApp message and cannot be corrected afterwards. Every function here
// returns null rather than a partial truth.
//
// Shared with api/guide-preview.js, which builds the link-preview card from the
// same functions. One source of truth, read twice — the same reason geo.js's
// kindFromName is built on arrivalRow instead of its own regexes.

// The towns of a trip, in the order you reach them, each named once. Falls back
// to the stop's own name where a stop carries no town, because a guide of
// islands often has stops that ARE the place.
export const routeTowns = (guide) => {
  const days = (guide && guide.days) || [];
  const out = [];
  days.forEach((d) => {
    ((d && d.stops) || []).forEach((s) => {
      if (!s || !s.name) return;   // same bar countStops uses: no name, no stop
      const t = String(s.town || s.name).trim();
      if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    });
  });
  return out;
};

export const countStops = (guide) => {
  const days = (guide && guide.days) || [];
  return days.reduce((n, d) => n + ((d && d.stops) || []).filter((s) => s && s.name).length, 0);
};

// Every stop of every day, flattened in the order you reach them. The legs of
// the trip are the gaps between consecutive entries of this list, which is the
// same thing tripShape walks in GuidePage.
export const orderedStops = (guide) =>
  ((guide && guide.days) || []).flatMap((d) => ((d && d.stops) || []).filter((s) => s && s.name));

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ── WHERE THE TRIP STARTS AND WHERE IT ACTUALLY ENDS ────────────────
// The first version read the last entry of routeTowns, which is deduped, so it
// was the last town FIRST REACHED and not the last town of the trip. Almost
// every Denmark trip flies in and out of Copenhagen, so almost every share
// message said "Copenhagen to Odense" about a trip that starts and ends in
// Copenhagen. That is not a shortened truth like dropping the middle towns, it
// names the wrong place. The endpoint comes from the last stop.
const endpoints = (guide) => {
  const towns = routeTowns(guide);
  if (!towns.length) return null;
  const stops = orderedStops(guide);
  const last = stops.length ? String(stops[stops.length - 1].town || stops[stops.length - 1].name).trim() : "";
  const first = towns[0];
  if (last && last.toLowerCase() !== first.toLowerCase()) return `${first} to ${last}`;
  // Back where you started. Worth saying out loud rather than papering over:
  // it is the difference between packing once and packing every morning.
  return towns.length > 1 ? `a loop from ${first}` : first;
};

// "5 days, 11 stops, Ærøskøbing to Odense" — or null. Days alone is not a
// summary of a trip, it is a number, so nothing goes out until there is at
// least one real stop to stand behind it.
export const shareSummary = (guide) => {
  const days = ((guide && guide.days) || []).length;
  const stops = countStops(guide);
  if (!days || !stops) return null;
  const parts = [plural(days, "day"), plural(stops, "stop")];
  // The two ends, not the nine towns between them: a share message listing nine
  // place names in a language the reader cannot pronounce is one they skim
  // past. The full route is on the page they are about to open.
  const ends = endpoints(guide);
  if (ends) parts.push(ends);
  return parts.join(", ");
};

export const shareTitle = (guide) => {
  const t = String((guide && guide.title) || "").trim();
  return t || "A Denmark guide";
};

// What lands in the message box when the share sheet opens. One line: most
// share targets concatenate this with the URL, and a paragraph pushes the link
// out of the preview.
export const shareMessage = (guide) => {
  const summary = shareSummary(guide);
  const title = shareTitle(guide);
  return summary ? `${title} — ${summary}.` : title;
};

// ── DID THE DIRECTIONS API MEASURE THIS TRIP, ALL OF IT ─────────────
// A "simple guide" (the lightMode path on GuidePage — "Simple guide, no maps or
// transport times") has no measured legs at all, and the card must not claim
// otherwise.
//
// AND "SOME" IS NOT "EVERY". The first version of this asked whether
// _exactDurations had any keys at all. It is keyed per leg, so one resolved road
// leg out of nine made the card announce that every travel time was measured —
// on a South Funen guide where the ferry crossings had all failed to resolve and
// the page itself, which withholds a total unless every leg is known, showed no
// travel figure whatsoever. The card would have contradicted the page it linked
// to. This walks the same legs tripShape does and requires all of them.
export const hasMeasuredTravel = (guide) => {
  const d = guide && guide._exactDurations;
  if (!d || typeof d !== "object") return false;
  const stops = orderedStops(guide);
  if (stops.length < 2) return false;
  const keys = Object.keys(d);
  if (!keys.length) return false;
  for (let i = 0; i < stops.length - 1; i++) {
    const pair = `${stops[i].name}|${stops[i + 1].name}|`;
    const hit = keys.find((k) => k.startsWith(pair));
    // A leg present in the map but with no minutes on it is not a measured leg.
    if (!hit || typeof d[hit]?.durationMinutes !== "number" || d[hit].durationMinutes < 1) return false;
  }
  return true;
};

// The line under the title in a WhatsApp/Slack/iMessage preview card. Facebook
// truncates around 300 characters and WhatsApp shows about two lines, so this
// leads with the countable facts and only then says who made it.
//
// THE SECOND SENTENCE IS EARNED, NOT BOILERPLATE. The first version of this
// said "with real travel times and opening hours checked against the places
// themselves" on every guide, including the simple ones that have no travel
// times in them at all — a claim about the product pasted onto a trip that does
// not support it, which is the same overclaiming this whole codebase is built
// to refuse. Now the strong sentence only goes out when the legs were really
// measured, and everything else gets the positioning line, which is true of
// every guide because it is about what Gemlyx chooses to recommend.
export const metaDescription = (guide) => {
  const summary = shareSummary(guide);
  const made = hasMeasuredTravel(guide)
    ? "Planned by Gemlyx, with every travel time measured rather than guessed."
    : "Planned by Gemlyx: Denmark past the three days everybody spends in Copenhagen.";
  return summary ? `${summary}. ${made}` : made;
};

// For the meta tags, which are HTML attributes: a Danish place name is safe, an
// apostrophe in a guide title is not, and a title is user-influenced text going
// into a document. Ampersand first or it double-escapes the others.
export const escapeHtml = (s) =>
  String(s == null ? "" : s)
    // WHITESPACE COLLAPSES FIRST. linkPreview.js builds the tag block by
    // splitting on newlines and keeping the lines that look like meta tags, so a
    // title containing a line break put one INSIDE an attribute: the tag was cut
    // in half, the remainder did not match the filter and was dropped, and the
    // following <meta> was swallowed into the broken attribute. Titles come out
    // of model JSON, so a stray newline is entirely reachable. Nothing on a
    // preview card wants a line break anyway.
    .replace(/\s+/g, " ")
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
