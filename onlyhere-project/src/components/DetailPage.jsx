import { C } from "../utils/theme";
import { getEventDate, travelLabel, isUpcoming, isCurrentlyLive, arrivalRow } from "../utils/helpers";
import { relationLine, kindLabel, areasInside, dayTripsFrom } from "../utils/placeKind";
import { AtAGlanceCard } from "./AtAGlanceCard";
import { GemlyxFindCard } from "./GemlyxFindCard";
import { InstagramEmbed } from "./InstagramEmbed";
import { ReviewsSection } from "./ReviewsSection";
import { PhotoCredit } from "./PhotoCredit";
import { PlaceMiniMap } from "./PlaceMiniMap";
import { bookingUrl, airbnbUrl, STAY_DISCLOSURE } from "../utils/affiliates";
import { HowWeKnow } from "./HowWeKnow";
import { events, majorEvents, vikingEvents } from "../data/events";
import { freeEntrance } from "../data/freeEntrance";
import { foodSpots } from "../data/food";
import { nightlifeSpots } from "../data/nightlife";
import { towns } from "../data/towns";
import { TOWN_COORDS } from "../data/towns";

// ── WHERE THE PICTURES GO (Oliver, 7 Aug: "I would appreciate if the
// pictures were put at the sides.. it looks odd") ────────────────────
//
// The side-float already existed. It just never had anything to float against,
// for two separate reasons, both visible in the Copenhagen payload he pasted:
//
// 1. EVERY IMAGE SITS AT THE END. The Studio media panel appends to blogBody,
//    so uploads and Wikimedia finds all land after the last paragraph. Four
//    images floated with no prose left to wrap them just stack up against each
//    other in a block, which is exactly the "odd" he is describing.
// 2. THE ALTERNATION NEVER WORKED. The CSS used .gx-fig:nth-of-type(even), and
//    nth-of-type counts siblings by TAG, not by class. Paragraphs and headings
//    are divs too, so the "even" rule was landing on whichever figures happened
//    to fall on an even div index. Left and right were effectively arbitrary.
//
// So the order is decided here instead of being trusted. Images that the author
// placed inside the prose stay exactly where they are. Images stranded at the
// end get dealt back in after the paragraphs, spaced out, and every figure is
// told which side it is on rather than inferring it from its tag position.
export const layoutBody = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  const isImage = (b) => b && (b.type === "image" || b.type === "video");
  // The trailing run of images, i.e. everything after the last real content.
  let cut = blocks.length;
  while (cut > 0 && isImage(blocks[cut - 1])) cut--;
  const body = blocks.slice(0, cut);
  const stranded = blocks.slice(cut);
  // Anchor after paragraphs, never straight after a heading: a photo wedged
  // between a heading and its first line reads as a mistake.
  let anchors = [];
  body.forEach((b, i) => { if (b && (b.type === "paragraph" || b.type === undefined || b.type === "bullets")) anchors.push(i); });
  // Skip anchors that already have a picture next to them, or an entry whose
  // author placed photos inline gets a second one dealt on top of the first.
  const free = anchors.filter(i => !isImage(body[i + 1]));
  if (free.length) anchors = free;
  const out = body.map(b => b);
  if (stranded.length) {
    if (anchors.length === 0) {
      out.push(...stranded); // nothing to wrap around, leave them where they were
    } else {
      // Spread them across the available anchors, last first so the earlier
      // insertion indices stay valid as we splice.
      // Round-robin across the anchors rather than proportional spacing: with
      // four images and three paragraphs, proportional put two at the end and
      // left the first paragraph bare. If two do land together they alternate
      // sides, so they sit one left one right rather than stacking.
      //
      // Splice from the HIGHEST anchor down, not in image order. Inserting at a
      // low index shifts every later index by one, so walking the images in
      // order silently drops the rest a slot early, which is how the first
      // version put a photo above the paragraph it was meant to sit beside.
      const drops = stranded.map((b, n) => ({ at: anchors[n % anchors.length], b, n }));
      drops.sort((x, y) => y.at - x.at || y.n - x.n);
      for (const d of drops) out.splice(d.at + 1, 0, d.b);
    }
  }
  // Alternate sides counting FIGURES only, which is what nth-of-type could not do.
  let fig = 0;
  return out.map(b => (isImage(b) ? { ...b, _side: (fig++ % 2 === 0) ? "right" : "left" } : b));
};

// Which published festivals genuinely belong to this town.
//
// Deliberately strict, because the whole value of this section is that a
// traveler can trust it. A festival is only shown here when its own `town`
// field really names this town, matched case-insensitively on whole words
// after trimming, never as a loose substring. A loose match would happily
// claim "Køge Festuge" for a town called "Køge Bugt", or attach every
// Copenhagen event to a place whose name merely contains "Copenhagen".
//
// Live events come first (they are happening right now, which is the most
// useful thing a traveler can be told), then upcoming ones by date. Anything
// already finished is dropped entirely rather than shown greyed out: a past
// festival on a town page is noise, not information.
const inThisTown = (e, key) => {
  const t = String(e.town || "").trim().toLowerCase();
  if (!t) return false;
  // "Sønderho, Fanø" and "Ribe" both need to work, so split on commas and
  // slashes and compare each part exactly, rather than using includes().
  return t.split(/[,/]/).map(s => s.trim()).includes(key);
};

// Straight-line km between two known towns, or null when either coordinate is
// missing. NULL IS THE POINT: it means "we do not know", and an unknown distance
// must never become a displayed number. Same discipline as legDistanceKm in the
// guide code, for the same reason it had to be added there.
const kmBetweenTowns = (a, b) => {
  const A = TOWN_COORDS[a], B = TOWN_COORDS[b];
  if (!Array.isArray(A) || !Array.isArray(B)) return null;
  const dLat = (A[0] - B[0]) * 111.32;
  const dLon = (A[1] - B[1]) * 62.06; // longitude degrees are shorter at Denmark's latitude
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

// A festival in a DIFFERENT town, close enough to matter, with a real measured
// distance. This exists because of what the published data actually looks like:
// checked against the live database, only 2 of 16 published towns have a
// festival whose town field names them, while 18 published festivals sit in
// towns that have no published town entry (Skanderborg, Jelling, Aarhus and so
// on). Without this, the section would almost never appear.
//
// It stays honest three ways: the distance is computed from real coordinates
// (never estimated, and the row is dropped entirely when either town is missing
// from TOWN_COORDS), the real host town is always named, and it renders under a
// separate "Nearby" heading so it can never be read as "happening here".
const NEARBY_MAX_KM = 45;
const nearbyEvents = (townName, key) => [...events, ...majorEvents]
  .filter(e => e.town && !inThisTown(e, key))
  .map(e => ({ e, km: kmBetweenTowns(townName, String(e.town).split(/[,/]/)[0].trim()) }))
  .filter(x => x.km != null && x.km <= NEARBY_MAX_KM)
  .sort((a, b) => a.km - b.km);

const eventsForTown = (townName) => {
  const key = String(townName || "").trim().toLowerCase();
  if (!key) return [];
  return [...events, ...majorEvents]
    .filter(e => inThisTown(e, key))
    // `e.date &&` matters: isUpcoming() returns TRUE for an empty date (it treats
    // "no date" as "not in the past"), which is right for the browse-everything
    // lists but wrong here. A dateless festival on a town page would render as
    // an event you could plan around when nobody actually knows when it runs.
    .filter(e => e.date && (isCurrentlyLive(e.date, e.dateEnd) || isUpcoming(e.date)))
    .sort((a, b) => {
      const liveA = isCurrentlyLive(a.date, a.dateEnd) ? 0 : 1;
      const liveB = isCurrentlyLive(b.date, b.dateEnd) ? 0 : 1;
      if (liveA !== liveB) return liveA - liveB;
      return new Date(a.date) - new Date(b.date);
    });
};

// ── WHAT ELSE IS NEAR THIS ─────────────────────────────────────────
// Straight-line kilometres, which is honest for orientation and would not be
// for routing: this answers "is there anything else around here", not "how do I
// get there", and Get Directions already owns the second question.
//
// PUBLISHED ENTRIES ONLY, and only ones carrying real coordinates. Both halves
// matter. A dot that opens nothing is a dead end, and a dot placed from a guess
// is a confident wrong answer in the most believable possible format.
const KM_PER_DEG_LAT = 111.32;
const NEAR_RADIUS_KM = 30;   // a realistic same-visit radius, not "in the region"
const NEAR_MAX = 5;          // the map's job is orientation. A dozen pins is a different feature.

export const nearbyEntries = (item, pools) => {
  const lat = Number(item?.__lat), lon = Number(item?.__lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  // Longitude degrees shrink towards the poles. At Danish latitudes that is a
  // factor of about 0.56, and ignoring it would stretch every east-west
  // distance by nearly double.
  const lonScale = Math.cos((lat * Math.PI) / 180) * KM_PER_DEG_LAT;
  const out = [];
  for (const { rows, src } of pools) {
    for (const r of rows || []) {
      if (!r || r.name === item.name) continue;
      const rl = Number(r.__lat), ro = Number(r.__lon);
      if (!Number.isFinite(rl) || !Number.isFinite(ro)) continue;
      const dy = (rl - lat) * KM_PER_DEG_LAT;
      const dx = (ro - lon) * lonScale;
      const km = Math.sqrt(dx * dx + dy * dy);
      if (km > NEAR_RADIUS_KM || km < 0.01) continue;   // 0.01 drops an entry sitting on itself under another name
      out.push({ name: r.name, lat: rl, lon: ro, km, src, item: r });
    }
  }
  return out.sort((a, b) => a.km - b.km).slice(0, NEAR_MAX);
};

export const DetailPage = ({ item, onClose, kind, liveInfo, liveInfoLoading, checkLiveInfo, userCoords, isSaved, onToggleSave, onOpenEvent, onOpenNearby }) => {
  if (!item) return null;
  const color = item.color || C.accent;
  const townEvents = kind === "town" ? eventsForTown(item.name).slice(0, 4) : [];
  const townNearby = kind === "town"
    ? nearbyEvents(item.name, String(item.name || "").trim().toLowerCase())
        .filter(x => x.e.date && (isCurrentlyLive(x.e.date, x.e.dateEnd) || isUpcoming(x.e.date)))
        .slice(0, 3)
    : [];
  return (
    // BUG FIX: z-index was 290, lower than the new pre-build "here's what's
    // coming up" preview screen (guideModal === "preview" in App.jsx, z-index
    // 950) — opening a place's "Read more" from inside that preview would
    // render DetailPage BEHIND it, invisible. Bumped above every modal/overlay
    // z-index used elsewhere in the app (all ≤950) so "drill into a real
    // place's full page" always stacks on top, regardless of what else is open.
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 970, overflowY: "auto" }}>
      <div style={{ height: 190, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <span style={{ fontSize: 64, opacity: item.photo ? 0.25 : 1, position: item.photo ? "absolute" : "static" }}>{item.emoji}</span>
        {item.photo && (
          <img src={item.photo} alt={item.name} referrerPolicy="no-referrer" onError={e => { e.target.style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
        )}
        <button onClick={onClose}
          style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", left: 14, background: "rgba(10,15,30,0.7)", border: "none", color: "#fff", borderRadius: 100, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          ‹ Back
        </button>
        <div style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", right: 14, display: "flex", alignItems: "center", gap: 8 }}>
          {onToggleSave && (
            <button onClick={onToggleSave}
              style={{ background: "rgba(10,15,30,0.75)", backdropFilter: "blur(4px)", border: "none", borderRadius: 100, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, color: isSaved ? "#E91E63" : "#ffffffaa" }}>
              {isSaved ? "♥" : "♡"}
            </button>
          )}
          {item.type && kind !== "food" && <div style={{ background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "5px 11px", borderRadius: 100, textTransform: "uppercase" }}>{item.type}</div>}
        </div>
      </div>
      {/* Credit for the hero image, immediately under the photo it belongs to,
          which is what CC BY and CC BY-SA actually ask for. Renders nothing when
          the image has no credit on file, so it costs nothing on the many photos
          that need none. */}
      {/* __photoCredit is set when the hero came from Wikimedia Commons rather
          than from a file Oliver downloaded, so the attribution travels with the
          entry instead of having to be matched by filename in
          image-credits.json, which only knows about downloaded files. Falls
          back to that lookup when it is absent, which is every older entry. */}
      <PhotoCredit photo={item.photo} credit={item.__photoCredit} style={{ padding: "6px 20px 0", maxWidth: 620, margin: "0 auto" }} />
      <div style={{ padding: "14px 20px 40px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          {kind === "event" ? `${item.town}` : kind === "nightlife" ? item.location : kind === "free" ? item.city : kind === "food" ? item.location : item.region}
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.1, marginBottom: 8 }}>{item.name}</div>

        {kind === "nightlife" && item.crowd && (
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "5px 12px", borderRadius: 100, marginBottom: 18 }}>
            👥 {item.crowd}
          </div>
        )}
        {kind === "free" && item.popularityTag && (
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: item.popularityTag === "Hidden Gem" ? C.gold : C.muted, background: item.popularityTag === "Hidden Gem" ? `${C.gold}22` : C.surface, border: `1px solid ${item.popularityTag === "Hidden Gem" ? C.gold : C.border}`, padding: "5px 12px", borderRadius: 100, marginBottom: 18 }}>
            {item.popularityTag === "Hidden Gem" ? "◆ Hidden Gem" : "○ Common Attraction"} · FREE
          </div>
        )}
        {kind === "food" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "5px 12px", borderRadius: 100 }}>{item.category}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: `${C.gold}18`, padding: "5px 12px", borderRadius: 100 }}>{item.price}</span>
          </div>
        )}

        {(kind === "event" || kind === "town") && item.tier && (
          <div style={{ marginBottom: 12 }}>
            {(() => {
              const t = item.tier.toLowerCase();
              const tierStyle = t.includes("can't miss") || t.includes("cant miss")
                ? { icon: "⭐", label: "Can't Miss Out", color: "#0A0F1E", bg: C.gold }
                : t.includes("highly recommended")
                ? { icon: "👍", label: "Highly Recommended", color: "#4CAF50", bg: "#4CAF5022" }
                : t.includes("worth considering")
                ? { icon: "◷", label: "Worth Considering", color: "#FFB347", bg: "#FFB34722" }
                : t.includes("already nearby")
                ? { icon: "📍", label: "Best If Already Nearby", color: C.muted, bg: `${C.border}44` }
                : { icon: "👍", label: item.tier, color: "#4CAF50", bg: "#4CAF5022" }; // unrecognized value — show it verbatim rather than silently hiding it
              return (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 100, marginRight: 8, display: "inline-block", marginBottom: 8, color: tierStyle.color, background: tierStyle.bg }}>
                  {tierStyle.icon} {tierStyle.label}
                </span>
              );
            })()}
          </div>
        )}
        {kind === "event" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{getEventDate(item.date, item.dateEnd)}</span>
              <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>★ {item.rating}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{travelLabel(userCoords, item.town, item.travelTime)}</span>
            </div>
          </div>
        )}
        {kind === "event" && (
          <AtAGlanceCard rows={[
            arrivalRow(item.nearestStation),
            { icon: "🎟️", label: "Tickets", value: item.ticketInfo },
            { icon: "⛺", label: "Camping", value: item.camping },
            { icon: "🏡", label: "Accommodation", value: item.accommodationTip },
          ]} />
        )}
        {kind === "town" && (
          <>
            {/* NO ARRIVAL ROW ON A TOWN. See ARRIVAL_TYPES in utils/helpers.js
                for the reasoning: a town is the destination, not a point, so
                "nearest stop" answers a question nobody asked with a value
                measured from whatever coordinate the geocoder picked for the
                middle of it. Suppressed at RENDER rather than only in the
                drafting prompt, because 71 entries were already published with
                the field filled in and a prompt change cannot reach those. */}
            {/* ── WHAT THIS PLACE HANGS OFF ──────────────────────────
                Two different facts that were being flattened into one, per
                Oliver on 8 Aug ("Nyhavn is 'technically' a town, but it is
                within Copenhagen" and "there are also villages in the 'towns'
                that are under other towns"). "Inside Copenhagen" and "base
                yourself in Nordby" are not the same sentence, and running them
                together is how somebody ends up looking for a hotel in a canal.
                relationLine picks whichever applies and says nothing when
                neither does, which is almost every town. */}
            <AtAGlanceCard rows={[
              (() => { const r = relationLine(item); return r ? { icon: r.label === "Inside" ? "◇" : "🧭", label: r.label, value: r.value } : null; })(),
              { icon: "🛏️", label: "Recommended Stay", value: item.recommendedStayGlance },
              { icon: "☀️", label: "Best Time", value: item.bestTimeGlance },
              { icon: "🏡", label: "Accommodation", value: item.accommodationGlance },
              { icon: "💰", label: "Typical Costs", value: item.typicalCosts },
            ]} />
            {/* ── WHAT YOU CAN DO FROM HERE WITHOUT MOVING HOTEL ─────
                The other half of the partOf/dayTripFrom pair, seen from the
                parent. This is the piece with actual product value in it: "what
                can I reach from Copenhagen without changing hotel" is one of the
                most common real questions a visitor has, and it is the lever
                that gets somebody who only booked Copenhagen to leave
                Copenhagen — which is the whole anti-concentration argument the
                competitor research landed on, with a UI attached.

                Built by scanning the live towns array for entries that name THIS
                place, so it fills itself in as content is published and shows
                nothing at all until something does. Never a hardcoded list. */}
            {(() => {
              const inside = areasInside(item.name, towns);
              const trips = dayTripsFrom(item.name, towns);
              if (!inside.length && !trips.length) return null;
              const group = (heading, list, note) => (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>{heading}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginBottom: 9 }}>{note}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {/* _src IS REQUIRED BELOW, not decoration. App.jsx's
                        openStopDetail dispatches entirely on real._src, and
                        liveContent only stamps that onto the lookup map
                        guideEnrichment builds, never onto the towns array
                        itself. A raw town from this list matched none of its
                        branches, so every one of these buttons would have
                        looked live and done nothing. */}
                    {list.map(t => (
                      <button key={t.id} onClick={() => onOpenNearby && onOpenNearby({ ...t, _src: "town" })}
                        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: onOpenNearby ? "pointer" : "default", fontFamily: "'Inter', sans-serif" }}>
                        {t.emoji ? `${t.emoji} ` : ""}{t.name}
                        <span style={{ color: C.muted, fontWeight: 600 }}> · {kindLabel(t)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
              return (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 18 }}>
                  {inside.length ? group(`Inside ${item.name}`, inside, "Part of the city itself, so you are already there.") : null}
                  {trips.length ? group(`Without changing hotel`, trips, `Its own place, reached from ${item.name} and back in a day.`) : null}
                </div>
              );
            })()}
            {/* ── WHERE TO STAY (Oliver, 7 Aug: "on accommodation, put
                booking.com and AirBnB as affiliate links for me") ────────
                The guide's day cards already had a Booking link under a
                standing rule never to remove it. A town page had the
                accommodation ADVICE and no way to act on it, which is the
                worse of the two places to be missing it: the town page is
                where someone decides they want to sleep there.
                Searches the specific neighbourhood the entry recommends when
                it names one, and the town itself when it does not, because
                "Indre By or Vesterbro" is a far better search than
                "Copenhagen". Only one of the two links can pay, and the note
                underneath says which. */}
            {(() => {
              const area = (item.accommodationGlance || "").trim() || item.name;
              const b = bookingUrl({ area: `${area}${area === item.name ? "" : `, ${item.name}`}` });
              const a = airbnbUrl({ area: `${area}${area === item.name ? "" : `, ${item.name}`}` });
              if (!b && !a) return null;
              const link = { flex: 1, textAlign: "center", display: "block", borderRadius: 100, padding: "10px 12px", fontSize: 12.5, fontWeight: 700, textDecoration: "none", border: `1px solid ${C.border}` };
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={b} target="_blank" rel="noreferrer sponsored" style={{ ...link, background: `${C.gold}1f`, borderColor: `${C.gold}66`, color: C.gold }}>🏨 Stays on Booking.com ↗</a>
                    <a href={a} target="_blank" rel="noreferrer" style={{ ...link, background: C.surface, color: C.light }}>🏡 Homes on Airbnb ↗</a>
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{STAY_DISCLOSURE}</div>
                </div>
              );
            })()}
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>{travelLabel(userCoords, item.name, item.travelTime)}</div>

            {/* WHAT'S ON IN THIS TOWN (Oliver's ask, Aug 5 2026: "is it possible to
                show the soon coming events in these towns"). Everything here is a
                real published festival row whose own `town` field names this town.
                Nothing is generated, nothing is inferred from the town's text, and
                if no published festival matches, the section does not render at
                all rather than saying something vague like "check back later". */}
            {(townEvents.length > 0 || townNearby.length > 0) && (
              <div style={{ marginBottom: 22 }}>
                {townEvents.length > 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
                  What's on in {item.name}
                </div>
                )}
                {townEvents.map(e => {
                  const live = isCurrentlyLive(e.date, e.dateEnd);
                  const soldOut = e.ticketStatus === "sold_out";
                  return (
                    <button key={e.id ?? e.name} onClick={() => onOpenEvent && onOpenEvent(e)} disabled={!onOpenEvent}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: C.surface, border: `1px solid ${live ? "#4CAF5066" : C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: onOpenEvent ? "pointer" : "default", fontFamily: "'Inter', sans-serif" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                          {live && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700, color: "#4CAF50", textTransform: "uppercase", letterSpacing: 0.5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF50", boxShadow: "0 0 6px #4CAF50" }} />
                              On now
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>
                          {getEventDate(e.date, e.dateEnd)}
                          {e.type ? <span style={{ color: C.muted, fontWeight: 400 }}> · {e.type}</span> : null}
                        </div>
                        {/* Ticket reality carried through verbatim from the published
                            row. A sold-out festival that reads as a plan is the single
                            most expensive way to mislead someone about a trip. */}
                        {soldOut ? (
                          <div style={{ fontSize: 11, color: "#FF8A80", fontWeight: 600, marginTop: 3 }}>Sold out</div>
                        ) : e.ticketInfo ? (
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.ticketInfo}</div>
                        ) : null}
                      </div>
                      {onOpenEvent && <span style={{ fontSize: 14, color: C.muted, flexShrink: 0 }}>›</span>}
                    </button>
                  );
                })}

                {townNearby.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", margin: `${townEvents.length > 0 ? 16 : 0}px 0 10px` }}>
                      Nearby, worth knowing about
                    </div>
                    {townNearby.map(({ e, km }) => (
                      <button key={`near-${e.id ?? e.name}`} onClick={() => onOpenEvent && onOpenEvent(e)} disabled={!onOpenEvent}
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8, cursor: onOpenEvent ? "pointer" : "default", fontFamily: "'Inter', sans-serif" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{e.name}</div>
                          <div style={{ fontSize: 11.5, color: C.muted }}>
                            <span style={{ color: C.gold, fontWeight: 600 }}>{getEventDate(e.date, e.dateEnd)}</span>
                            {" · "}{e.town}, about {km < 10 ? km.toFixed(1) : Math.round(km)} km away
                          </div>
                        </div>
                        {onOpenEvent && <span style={{ fontSize: 14, color: C.muted, flexShrink: 0 }}>›</span>}
                      </button>
                    ))}
                    <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5 }}>
                      Distances are straight line between town centres, not driving time.
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
        {(kind === "free" || kind === "attraction") && (
          <AtAGlanceCard rows={[
            { icon: "🎟️", label: "Tickets", value: item.ticketsGlance },
            { icon: "⏱️", label: "Time Needed", value: item.timeNeeded },
            { icon: "💰", label: "Extra Costs", value: item.extraCosts },
            { icon: "♿", label: "Accessibility", value: item.accessibility },
            arrivalRow(item.nearestStation),
          ]} />
        )}
        {kind === "food" && (
          <AtAGlanceCard rows={[
            { icon: "🍽️", label: "Serves", value: item.category },
            { icon: "💰", label: "Price", value: item.price },
            { icon: "⏱️", label: "Time Needed", value: item.timeNeeded },
            { icon: "📍", label: "Neighbourhood", value: item.location },
          ]} />
        )}
        {kind === "nightlife" && (
          <AtAGlanceCard rows={[
            { icon: "👥", label: "Crowd", value: item.crowd },
            { icon: "🍺", label: "Type", value: item.category },
            { icon: "📍", label: "Neighbourhood", value: item.location },
          ]} />
        )}
        {item.gemlyxFind && <GemlyxFindCard text={item.gemlyxFind} />}

        <div style={{ fontSize: 14, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>{item.desc}</div>

        {/* ARTICLE LAYOUT (Oliver: "Instead of all of them just being flushed to
            the bottom.. Perhaps at the side (on PC atleast)"). Images used to
            stack full width in document order, so on a wide screen every photo
            was a full-bleed interruption. At 760px and up an image now floats to
            an alternating side at 44% and the prose wraps around it, which is
            how an article actually reads. Below that width nothing changes: on a
            phone a floated image would squeeze the text into an unreadable
            column. The float is cleared after the body so the next section
            cannot ride up beside a tall photo. */}
        <style>{`
          @media (min-width: 760px) {
            .gx-fig-right { float: right; width: 44%; margin: 4px 0 16px 22px; }
            .gx-fig-left  { float: left;  width: 44%; margin: 4px 22px 16px 0; }
          }
          .gx-body::after { content: ""; display: block; clear: both; }
        `}</style>
        {item.blogBody && item.blogBody.length > 0 && (
          <div className="gx-body" style={{ marginBottom: 24 }}>
            {layoutBody(item.blogBody).map((block, i) => (
              block.type === "bullets" ? (
                <ul key={i} style={{ margin: "0 0 16px", paddingLeft: 20, color: C.light, fontSize: 14, lineHeight: 1.75 }}>
                  {block.items.map((it, j) => <li key={j} style={{ marginBottom: 4 }}>{it}</li>)}
                </ul>
              ) : block.type === "instagram" ? (
                <InstagramEmbed key={i} url={block.url} />
              ) : block.type === "video" ? (
                <div key={i} className={`gx-fig-${block._side || "right"}`} style={{ marginBottom: 16 }}>
                  <video src={block.src} controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 14, display: "block", background: "#000" }} />
                  {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
                </div>
              ) : block.type === "image" ? (
                <div key={i} className={`gx-fig-${block._side || "right"}`} style={{ marginBottom: 16 }}>
                  {/* referrerPolicy matters for Wikimedia-hosted images: some
                      CDNs refuse a hotlink based on the Referer header, and a
                      refused image is invisible because of the onError below.
                      Sending no referrer is what Wikimedia's own guidance says. */}
                  <img src={block.src} alt={block.caption || item.name} referrerPolicy="no-referrer" loading="lazy"
                    onError={e => { e.target.style.display = "none"; }}
                    style={{ width: "100%", borderRadius: 14, display: "block" }} />
                  {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
                  <PhotoCredit photo={block.src} credit={block.credit} style={{ marginTop: 4 }} />
                </div>
              ) : block.type === "heading" ? (
                <div key={i} style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", marginTop: 20, marginBottom: 10 }}>{block.content}</div>
              ) : (
                <div key={i} style={{ fontSize: 14, color: C.light, lineHeight: 1.8, marginBottom: 14 }}>{block.content}</div>
              )
            ))}
          </div>
        )}

        {/* The provenance block. Renders only where there is real provenance
            to show, so an entry with nothing behind it gets no badge at all.
            Placed directly under the article, where someone who has just read a
            claim is standing when they wonder where it came from. */}
        <HowWeKnow item={item} />

        {/* Where this actually is, and what else is around it. Renders only
            when the entry carries real coordinates; TOWN_COORDS is the fallback
            for towns published before __lat/__lon was stored. Coordinates are
            now written for every content type, so entries drafted from PASS 73
            onward get a map too, and older ones once the Studio backfill has
            been run. */}
        <PlaceMiniMap
          lat={item.__lat ?? TOWN_COORDS[item.name]?.[0]}
          lon={item.__lon ?? TOWN_COORDS[item.name]?.[1]}
          name={item.name}
          color={color}
          neighbours={nearbyEntries(item, [
            { rows: towns, src: "town" },
            { rows: [...events, ...majorEvents, ...vikingEvents], src: "event" },
            { rows: freeEntrance, src: "free" },
            { rows: foodSpots, src: "food" },
            { rows: nightlifeSpots, src: "nightlife" },
          ])}
          // openStopDetail dispatches on _src, so the neighbour is handed
          // over carrying the pool it came from.
          onOpenNeighbour={(n) => onOpenNearby?.({ ...n.item, _src: n.src })}
        />

        {kind === "town" && item.highlight && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>◆ Gemlyx Find</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>{item.highlight}</div>
          </div>
        )}
        {kind === "event" && item.tags && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 26 }}>
            {item.tags.map(t => <span key={t} style={{ fontSize: 12, color: C.text, background: C.surface, border: `1px solid ${C.border}`, padding: "7px 13px", borderRadius: 100 }}>{t}</span>)}
          </div>
        )}
        {(kind === "nightlife" || kind === "food") && item.tip && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 22, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            💡 {item.tip}
          </div>
        )}

        <button onClick={() => checkLiveInfo(item)} disabled={liveInfoLoading === item.name}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: liveInfo?.[item.name] ? 12 : 14 }}>
          {liveInfoLoading === item.name ? "Checking..." : "🔍 Check live info"}
        </button>
        {liveInfo?.[item.name] && (
          <div style={{ background: `${color}18`, border: `1px solid ${color}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            {liveInfo[item.name]}
          </div>
        )}

        {(kind === "free" || kind === "event") && item.website && (
          <a href={item.website} target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 10 }}>
            🌐 Visit website
          </a>
        )}

        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.mapHint || `${item.name} ${item.city || item.location || ""} Denmark`)}`} target="_blank" rel="noreferrer"
          style={{ display: "block", textAlign: "center", background: color, color: "#fff", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          ↗ Get Directions
        </a>

        <ReviewsSection itemType={kind} itemName={item.name} />
      </div>
    </div>
  );
};


