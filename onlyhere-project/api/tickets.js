// /api/tickets.js
// Ticketmaster Discovery API, server side, so TICKETMASTER_API_KEY never
// reaches a browser. All of the judgement lives in src/utils/tickets.js, which
// is pure and tested: this file is the network and nothing else.
//
// VERIFIED AGAINST THEIR LIVE REFERENCE ON 11 AUG 2026, not from memory:
//   host    https://app.ticketmaster.com/discovery/v2/events.json
//   auth    ?apikey=  (query parameter, not a header, not Bearer)
//   limits  5 requests per second, 5000 calls per day
//   status  dates.status.code is one of onsale, offsale, canceled, postponed,
//           rescheduled. There is NO sold-out code. See utils/tickets.js for
//           why that single fact decides the shape of the whole feature.
//
// ── THE PROBE, WHICH IS THE POINT OF HALF THIS FILE ─────────────────
// Ticketmaster's docs put Denmark under the INTERNATIONAL Discovery API
// (app.ticketmaster.eu), which "no longer accepts new API key requests" and
// sends new integrations to this one. This one's country parameter documents
// US, CA, AU, NZ and MX by name and claims "other European countries" without
// listing them. So whether a key issued today sees Danish events could not be
// settled from documentation, and assuming it is exactly the mistake that got
// made twice with DMI this week.
//
// /api/tickets?probe=1 asks for Danish events with NO keyword. It is the
// broadest query the API accepts for this country, so a zero there means the
// key has no Danish data at all. Without it, no coverage and this festival is
// not listed look identical, and every festival in the library would quietly be
// marked unverifiable with nobody able to tell why.
//
// ── QUOTA ───────────────────────────────────────────────────────────
// 5000 a day is generous for one lookup per draft and thin for a sweep of the
// whole published library at five per second. Responses carry an s-maxage so
// repeated lookups for the same festival within the window are served by the
// CDN and cost nothing. Requiring a name (or probe=1) is NOT security, it just
// stops the endpoint being an open proxy to a keyless events search.

const HOST = "https://app.ticketmaster.com/discovery/v2/events.json";

// Their documented format is YYYY-MM-DDTHH:mm:ssZ. toISOString() appends
// milliseconds, which this format does not carry, so they are cut rather than
// sent and hoped for.
const tmTime = (d) => `${d.toISOString().slice(0, 19)}Z`;

export default async function handler(req, res) {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "TICKETMASTER_API_KEY not set on the server" });
  }

  const probe = req.query.probe === "1" || req.query.probe === "true";
  const name = String(req.query.name || "").trim();
  if (!probe && !name) {
    return res.status(400).json({ error: "name required, or probe=1 to test Danish coverage" });
  }

  const country = String(req.query.country || "DK").toUpperCase().slice(0, 2);
  const params = new URLSearchParams({ apikey: key, countryCode: country, sort: "date,asc" });

  if (probe) {
    params.set("size", "5");
  } else {
    params.set("keyword", name);
    params.set("size", String(Math.min(Math.max(parseInt(req.query.size, 10) || 20, 1), 50)));
    // A window rather than a point. Filtering to the date on file would hide the
    // two answers most worth having: a postponed event, and a listing that is a
    // different edition. Both are only visible if the search is allowed to
    // return them, so the date work happens in matchEvent instead.
    const from = req.query.from ? new Date(String(req.query.from)) : new Date();
    if (!Number.isNaN(from.getTime())) params.set("startDateTime", tmTime(from));
    if (req.query.city) params.set("city", String(req.query.city).slice(0, 60));
  }

  try {
    const r = await fetch(`${HOST}?${params.toString()}`);
    if (r.status === 429) {
      // Named separately so the run log can say "we hit the rate limit" rather
      // than "this festival is not listed", which is a different fact entirely.
      return res.status(200).json({ error: "rate-limited", detail: "Ticketmaster's rate limit was hit (5 requests per second, 5000 a day). This is not an answer about the event." });
    }
    if (r.status === 401 || r.status === 403) {
      return res.status(200).json({ error: "key-rejected", detail: `Ticketmaster rejected the key (${r.status}). Check TICKETMASTER_API_KEY in Vercel.` });
    }
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) {
      const msg = data?.fault?.faultstring || data?.errors?.[0]?.detail || `Request failed (${r.status})`;
      return res.status(200).json({ error: "failed", detail: msg });
    }

    const events = data._embedded?.events || [];
    const total = data.page?.totalElements ?? events.length;

    if (probe) {
      // The honest answer to "does this key see Denmark", in the words a person
      // reading the Studio panel needs, with the evidence attached.
      return res.status(200).json({
        probe: true, country, total,
        covered: total > 0,
        sample: events.slice(0, 5).map(e => ({ name: e.name, date: e.dates?.start?.localDate || "", city: e._embedded?.venues?.[0]?.city?.name || "" })),
        detail: total > 0
          ? `Ticketmaster returns ${total} events for ${country}, so the key has coverage here.`
          : `Ticketmaster returns NO events at all for ${country} on this key. Every per-event lookup will come back empty, and that is a coverage answer rather than an answer about any one festival. Denmark is documented under Ticketmaster's International Discovery API, which no longer issues new keys.`,
      });
    }

    // 15 minutes. Ticket status does move, and it does not move minute to
    // minute, so this trades a quarter hour of staleness for not spending the
    // daily quota re-asking the same question during one drafting session.
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    // Returned RAW. Every field this project reads is pulled out by
    // readTicketmasterEvent in utils/tickets.js, and a second shaping step here
    // would be the same two-copies-of-one-thing that keeps biting this codebase.
    return res.status(200).json({ query: name, country, total, events });
  } catch (err) {
    return res.status(200).json({ error: "failed", detail: String(err) });
  }
}
