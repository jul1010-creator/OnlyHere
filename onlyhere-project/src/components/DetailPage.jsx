import { C } from "../utils/theme";
import { getEventDate, travelLabel, isUpcoming, isCurrentlyLive, arrivalRow, externalHref, hasFinished } from "../utils/helpers";
import { byEventDate } from "../utils/eventDates";
import { relationLine, kindLabel, areasInside } from "../utils/placeKind";
import { ticketBadge } from "../utils/tickets";
// ── "ATTRACTIONS ALL SAY FREE" ────────────────────────────────────
// Oliver, 27 Aug 2026. The badge below appended a literal "· FREE" to every
// attraction in the pool, because the pool's Studio type is called `free` and
// it used to mean it. It holds Legoland now. See utils/entryPrice.js.
import { AttractionBadge } from "./AttractionBadge";
// ── "HIGH-END" AND "CASUAL" ───────────────────────────────────────
// Oliver, 27 Aug 2026, relaying his friend. See utils/venueStyle.js.
import { VenueStyleChip } from "./VenueStyleChip";
import { AtAGlanceCard } from "./AtAGlanceCard";
import { GemlyxFindCard } from "./GemlyxFindCard";
import { InstagramEmbed } from "./InstagramEmbed";
import { ReviewsSection } from "./ReviewsSection";
import { PhotoCredit } from "./PhotoCredit";
import { PlaceMiniMap } from "./PlaceMiniMap";
import { bookingUrl, airbnbUrl, STAY_DISCLOSURE, ticketmasterUrl, ticketDisclosure, tiqetsUrl, tiqetsDisclosure, affiliateHref, affiliateNote } from "../utils/affiliates";
import { isTiqetsProductUrl, ticketAgentOf, isBookableTicketUrl } from "../utils/ticketLink";
import { offerView, OFFER_LOCKED_LABEL, OFFER_LOCKED_NOTE, OFFER_NOTE } from "../utils/offer";
import { saveLabel, saveHint, planFromSavedLabel } from "../utils/savedTrip";
import { HowWeKnow } from "./HowWeKnow";
import { JourneyCard } from "./JourneyCard";
import { events, majorEvents, vikingEvents } from "../data/events";
import { freeEntrance } from "../data/freeEntrance";
import { foodSpots } from "../data/food";
import { nightlifeSpots } from "../data/nightlife";
import { towns, TOWN_COORDS } from "../data/towns";
import { haversineKm } from "../utils/helpers";
import { placeCoords, townPointFor } from "../utils/guideEnrichment";
import { placedLibrary, nearbyPublished, SAME_VISIT_KM, SAME_VISIT_LIMIT } from "../utils/nearbyPlaces";
import { layoutBody, trimCaption } from "../utils/articleLayout";

// layoutBody moved to utils/articleLayout.js on 21 Aug 2026 so the suite can
// actually run it. See the comment there: living in this .jsx file is the
// reason a bug that switched the whole feature off went unnoticed.

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
//
// haversineKm, not a fourth hand-rolled flat-earth formula. This one carried
// `* 62.06` for a longitude degree with "shorter at Denmark's latitude" beside
// it, which is cos(56.1 N) worked out once and then frozen — right in the middle
// of the country and wrong at both ends of it. haversineKm is exact everywhere,
// is already imported by four other files, and is tested.
const kmBetweenTowns = (a, b) => {
  const A = TOWN_COORDS[a], B = TOWN_COORDS[b];
  if (!Array.isArray(A) || !Array.isArray(B)) return null;
  const km = haversineKm({ lat: A[0], lon: A[1] }, { lat: B[0], lon: B[1] });
  return Number.isFinite(km) ? km : null;
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
      // byEventDate, not a second comparator. Same reasoning as the copy in
      // LiveEventsHeaderStrip: the order this produced was right, and it was
      // right by accident of both sides being parsed the same wrong way.
      return byEventDate(a, b);
    });
};

// ── WHAT ELSE IS NEAR THIS ─────────────────────────────────────────
// There used to be a `nearbyEntries` here: thirty lines answering the same
// question nearbyPlaces.js already answered, with its own flat-earth distance
// formula, its own radius, its own limit, and no tests. It read `__lat` alone,
// so every row carrying a plain `lat` was invisible to it — the same fault that
// reported no content in South Jutland — and it resolved the place differently
// from the pin beside it. The reasoning is written out at placedLibrary.
//
// One resolution now feeds both the pin and the dots, computed once below.

// ── WHERE THIS ENTRY IS ────────────────────────────────────────────
// placeCoords is the resolver the rest of the app uses: `__lat ?? lat`, and
// Number.isFinite rather than truthiness, so a missing coordinate is missing
// instead of becoming a point in the Gulf of Guinea.
//
// THE TOWN FALLBACK ONLY APPLIES TO A TOWN. A town's stored coordinate IS its
// centre, so falling back to TOWN_COORDS costs nothing there. Doing it for an
// attraction would plot it at the middle of whatever town its name contains —
// "Ribe VikingeCenter" lands on Ribe, three kilometres out — which is a guess
// printed as a pin. townPointFor rather than a raw TOWN_COORDS lookup because it
// tries the Danish spelling too, so a town filed as København still resolves.
export const detailPoint = (item, kind) =>
  placeCoords(item) || (kind === "town" ? townPointFor(item?.name) : null);

export const DetailPage = ({ item, onClose, kind, liveInfo, liveInfoLoading, checkLiveInfo, userCoords, isSaved, onToggleSave, savedCount = 0, onPlanFromSaved, onOpenEvent, onOpenNearby, paid = false }) => {
  if (!item) return null;
  const color = item.color || C.accent;
  // ── ONE POINT, TWO USES ───────────────────────────────────────────
  // The pin and the dots come from the same resolution, so the map cannot show a
  // pin with no neighbours because the two halves disagreed about where it is.
  // The pools are keyed by the same strings openStopDetail dispatches on.
  const here = detailPoint(item, kind);
  const near = here ? nearbyPublished(here, placedLibrary({
    town: towns,
    event: [...events, ...majorEvents, ...vikingEvents],
    free: freeEntrance,
    food: foodSpots,
    nightlife: nightlifeSpots,
  }, { includeTowns: true }), { maxKm: SAME_VISIT_KM, limit: SAME_VISIT_LIMIT, exclude: item.name }) : [];
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

        {/* ── THE ADD-TO-TRIP ROW ─────────────────────────────────────
            The heart in the top corner already did this and had done for
            months. It sits on a photograph, it is 32 pixels across, and it
            carries no label, so the only people who ever pressed it were the
            ones who guessed. See utils/savedTrip.js for the whole argument;
            the short version is that the save loop was finished, wired and
            invisible, which is the exact failure this codebase keeps finding.

            Under the title rather than over the photo: this is a decision about
            the place, so it belongs where the place is being read about, at a
            size a thumb can hit.

            The second button only exists once something is saved, because an
            offer to plan a trip around nothing is the empty-checklist tone
            Oliver objected to. */}
        {onToggleSave && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={onToggleSave}
                style={{ background: isSaved ? `${C.gold}1e` : "none", border: `1px solid ${isSaved ? C.gold + "66" : C.border}`, color: isSaved ? C.gold : C.text, borderRadius: 100, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {saveLabel(isSaved)}
              </button>
              {isSaved && onPlanFromSaved && planFromSavedLabel(savedCount) && (
                <button onClick={onPlanFromSaved}
                  style={{ background: "none", border: "none", color: C.accent, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "9px 4px", fontFamily: "'Inter', sans-serif" }}>
                  {planFromSavedLabel(savedCount)}
                </button>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
              {saveHint(isSaved, savedCount)}
            </div>
          </div>
        )}

        {kind === "nightlife" && (item.crowd || true) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
            {item.crowd && (
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "5px 12px", borderRadius: 100 }}>
                👥 {item.crowd}
              </span>
            )}
            {/* Beside the crowd, because they are the two halves of one
                question: who is in there, and how dressed up are they. Draws
                nothing at all when the row has not said. */}
            <VenueStyleChip item={item} C={C} />
          </div>
        )}
        {kind === "free" && <AttractionBadge item={item} C={C} />}
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
              {/* A finished edition still has a real page, because the link
                  can be shared or bookmarked and the entry is genuinely about
                  a real festival. What it must not do is wear the same live
                  gold as one happening next week. Skanderborg Festival ended
                  on 9 Aug and this line was gold on 12 Aug. */}
              <span style={{ fontSize: 13, color: hasFinished(item) ? C.muted : C.gold, fontWeight: 700 }}>{getEventDate(item.date, item.dateEnd)}</span>
              {hasFinished(item) && (
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 100, padding: "3px 9px" }}>
                  This edition has finished
                </span>
              )}
              {/* GUARDED, like the other two rating sites (App.jsx 7026 and
                  9561). shapeForLive's festival branch has no `rating` field,
                  and it is the only insert path into gemlyx_content, so
                  item.rating is undefined on EVERY published event and this
                  rendered a lone gold star with nothing after it. React prints
                  undefined as nothing, so there was no error to notice. */}
              {item.rating ? <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>★ {item.rating}</span> : null}
              <span style={{ fontSize: 12, color: C.muted }}>{travelLabel(userCoords, item.town, item.travelTime)}</span>
            </div>
          </div>
        )}
        {kind === "event" && (
          <AtAGlanceCard rows={[
            arrivalRow(item.nearestStation),
            { icon: "🎟️", label: "Tickets", value: item.ticketInfo },
            // ── "MAKE PEOPLE AWARE" ──────────────────────────────────
            // Oliver, 15 Aug 2026, off a draft with Danish in a reader field:
            // "I wonder if we should make people aware that an event might have
            // a great language barrier."
            //
            // Gemlyx writing Danish at a reader is a defect and is fixed in the
            // pipeline. The EVENT running in Danish is a fact about the event,
            // and smoothing it over would be the dishonest fix. It sits in At a
            // Glance rather than in prose because it is measured, off the
            // organiser's own pages, and because it is what somebody scans for
            // before booking a flight.
            //
            // Absent unless it was measured: no operator page read means no
            // row, not a reassuring one.
            ...(item.__language?.level === "danish-only" && item.__language?.note
              ? [{ icon: "🗣", label: "Language", value: item.__language.note }]
              : []),
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
              // ── THE DAY TRIP LIST IS GONE, AND THE FIELD IS NOT ──
              // Oliver, 9 Aug 2026, after Rudkobing appeared here as a day
              // trip from Copenhagen. It is on Langeland, about two and a half
              // hours each way, and it appeared because its stored
              // dayTripFrom says "Copenhagen".
              //
              // My first answer was three checks on that field: route it at
              // draft time, sweep the published rows, guard the render. All
              // correct, and all of it machinery to babysit a field a human
              // has to keep true forever. His was better: "I'm not even sure
              // if we need to have it."
              //
              // A CURATED RELATIONSHIP FIELD ALWAYS DRIFTS. Somebody decides,
              // per town, what it is a day trip from, and that is right until
              // the day it is not. Deleting the reader-facing list deletes the
              // whole failure mode rather than watching for it, which is the
              // only kind of fix that cannot regress.
              //
              // WHAT STAYS, DELIBERATELY: dayTripFrom itself, as a PLANNER
              // input. It encodes what coordinates cannot, which is whether a
              // place counts as its own stop on a route and whether it has
              // beds. Dragor being close to Copenhagen does not answer that.
              // The field keeps feeding the planner and stops reaching readers.
              //
              // "Inside" survives because it is a different kind of claim.
              // Hellerup being part of Copenhagen is containment, which does
              // not depend on travel time and does not go stale. If the other
              // list is ever missed, bring it back COMPUTED from lat/lon
              // rather than curated: sorted by real distance, Rudkobing at
              // 144 km could never appear in it.
              const inside = areasInside(item.name, towns);
              // Guard narrowed with the cut. Left as it was, a town with no
              // areas inside it but a stale dayTripFrom would render the card
              // border and padding around nothing.
              if (!inside.length) return null;
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
                  {group(`Inside ${item.name}`, inside, "Part of the city itself, so you are already there.")}
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
            {/* Hands travelLabel the WHOLE ENTRY, so partOf is visible and
                anywhere inside Copenhagen is not a journey from Copenhagen, and
                renders nothing at all when there is no figure. Dragør's page
                carried a line reading only "from CPH" until this changed. */}
            {travelLabel(userCoords, item, item.travelTime) && (
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>{travelLabel(userCoords, item, item.travelTime)}</div>
            )}

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
                  // Was a bare comparison against one string, so "cancelled"
                  // and "off_sale" both fell through to showing ticketInfo as
                  // though nothing were wrong. The badge table decides what a
                  // status is allowed to say, in one place. See utils/tickets.js.
                  const ticket = ticketBadge(e.ticketStatus);
                  const ticketWarn = ticket.tone === "bad" || ticket.tone === "warn";
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
                        {ticketWarn ? (
                          <div style={{ fontSize: 11, color: ticket.tone === "bad" ? "#FF8A80" : "#FFB347", fontWeight: 600, marginTop: 3 }}>{ticket.label}</div>
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
            /* ── AND NOW NOT ON ATTRACTIONS EITHER ────────────────────
               Oliver, 19 Aug 2026: "I think we should get rid of
               'time-needed'."

               This is the food decision of 17 August finishing its job. The
               reason given there applied to every type and was only acted on
               for one: the number never came from research. Whatever the writer
               estimated was overwritten at publish by stayDurationForCategory,
               which returned ONE OF THREE CONSTANTS chosen by a regex over a
               category word — "2 to 3 hours" for anything matching museum or
               castle, "30 to 45 mins" for anything matching park or square,
               "1 to 2 hours" for everything else. So a deer park the size of a
               suburb and a bandstand both read 30 to 45 mins, and neither figure
               was measured, sourced or checked by anybody.

               On a product whose entire claim is that nothing is printed that
               nobody checked, a row wearing a clock icon and stating a duration
               is the most confident-looking unsourced thing on the card.
               It is gone at the reader, at the writer and at the schema. */
            { icon: "💰", label: "Extra Costs", value: item.extraCosts },
            { icon: "♿", label: "Accessibility", value: item.accessibility },
            arrivalRow(item.nearestStation),
          ]} />
        )}
        {/* ── NO TIME NEEDED ON FOOD ────────────────────────────────
            Oliver, 17 Aug 2026: "At food, let's get rid of the 'time needed'
            section.. it's stupid tbh."

            The row read item.timeNeeded, and that value never came from research:
            stayDurationForCategory overwrote the writer's own estimate with one of
            four constants keyed off a word in the category, and every food street
            in the country received the same one. Removed HERE as well as at the
            three write sites, because a published row keeps whatever it was
            published with. The field stays harmlessly in old payloads and stops
            reaching a reader today, rather than after a re-draft of every entry.

            Restaurants and markets both, since for a market the figure was a
            single nationwide constant and said even less than the guess. */}
        {kind === "food" && (
          <AtAGlanceCard rows={[
            { icon: "🍽️", label: "Serves", value: item.category },
            { icon: "💰", label: "Price", value: item.price },
            { icon: "📍", label: "Neighbourhood", value: item.location },
          ]} />
        )}
        {/* ── "WHERE ARE THE PRICES?" ──────────────────────────────
            Oliver, 15 Aug 2026, reading a finished draft for a concert hall.
            Every other place type had a price row on this card and nightlife
            had none, because the night schema had no price field at all: not
            what a beer costs in a bar, not what a ticket costs at a venue that
            sells them. AtAGlanceCard drops a row whose value is empty, so a
            venue whose research genuinely had no figure looks exactly as it
            did before, and the ones that did stop hiding it. */}
        {kind === "nightlife" && (
          <AtAGlanceCard rows={[
            { icon: "👥", label: "Crowd", value: item.crowd },
            { icon: "🍺", label: "Type", value: item.category },
            { icon: "💰", label: "What it costs", value: item.priceNote },
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
        {/* ── THE FIGURE HAS TO OWN A HEIGHT BEFORE THE PICTURE ARRIVES ──
            Oliver, 21 Aug 2026, screenshotting the Christmas-fair page: "jeesus".
            Three photographs, one tall and two collapsed into overlapping
            slivers of caption text at odd offsets down the left edge.

            Nothing was overlapping. Two of the three images had simply never
            loaded: they carry loading="lazy", they were below the fold, and an
            <img> that has not loaded, has no width or height attribute and no
            CSS aspect ratio reports a height of ZERO. So each unloaded figure
            was a 42px box containing nothing but its own caption, and the floats
            packed themselves around a 383px-tall neighbour exactly as the spec
            says they must. Scrolling down then loaded the pictures and reflowed
            the lot, which is why it looked like it was falling apart live.

            aspect-ratio fixes it before the network is involved: the box is the
            right size from the first paint, the images load into space already
            reserved, and nothing moves. The width and height of the file are not
            stored on the block (studioContent writes src, credit and caption and
            nothing else), so the ratio cannot be the picture's own and has to be
            a house one, with object-fit doing the fitting. That is the same
            bargain PhotoPlate already takes everywhere else in the app.

            Set here rather than inline because these are the only figure rules
            in the file and they belong together. The inline style on the img is
            careful not to name width, aspect-ratio or object-fit, or it would
            win and this would silently do nothing. */}
        <style>{`
          /* CONTAIN, NOT COVER. The first version cropped every figure into a
             landscape box, which loses roughly 44% of a 2:3 event poster, top
             and bottom. Oliver has already made exactly that complaint once, on
             the guide's own stop photos: "avoid the horizontal pictures, you
             can't see the whole castle." Recreating it on the article side would
             have been the same mistake in a new file, and the video in this same
             layout was already using contain, so the two disagreed as well.

             The box is still reserved, which is the whole point of the ratio:
             the height exists before the network answers, nothing collapses, and
             nothing reflows. Contain only changes what happens INSIDE the box,
             and a letterboxed picture on a themed background is a smaller cost
             than a cropped one. */
          .gx-fig img {
            width: 100%;
            aspect-ratio: 4 / 3;
            object-fit: contain;
            background: ${C.surface};
          }
          /* clear: a figure starts below the last figure on ITS OWN side, so the
             two sides read as two columns. Without it a float only has to clear
             the line it lands on, so a figure one caption-line shorter than its
             neighbour lets the next one wedge in at an offset partway across the
             page. That is the stair-step in the screenshot, and it survived
             fixing the heights: measured in a browser, three consecutive figures
             still stepped in to x=258 in a 620px column. */
          @media (min-width: 760px) {
            .gx-fig-right { float: right; clear: right; width: 44%; margin: 4px 0 16px 22px; }
            .gx-fig-left  { float: left;  clear: left;  width: 44%; margin: 4px 22px 16px 0; }
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
                <div key={i} className={`gx-fig gx-fig-${block._side || "right"}`} style={{ marginBottom: 16 }}>
                  <video src={block.src} controls playsInline preload="metadata" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "contain", borderRadius: 14, display: "block", background: "#000" }} />
                  {/* SAME RULES AS AN IMAGE. layoutBody counts a video as a
                      figure and shares one `seen` set across both, so a video
                      was being given a _showCaption it then ignored, and a video
                      carrying the "- Flickr - <name>" tail printed the credit
                      twice. Found by an adversarial review on 22 Aug: the two
                      branches of one ternary disagreeing about what a caption
                      is. */}
                  {block._showCaption !== false && trimCaption(block.caption) && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{trimCaption(block.caption)}</div>
                  )}
                </div>
              ) : block.type === "image" ? (
                <div key={i} className={`gx-fig gx-fig-${block._side || "right"}`} style={{ marginBottom: 16 }}>
                  {/* referrerPolicy matters for Wikimedia-hosted images: some
                      CDNs refuse a hotlink based on the Referer header, and a
                      refused image is invisible because of the onError below.
                      Sending no referrer is what Wikimedia's own guidance says. */}
                  {/* THE WHOLE FIGURE GOES, not just the picture. Hiding the img
                      alone left its caption and its credit behind, floating in a
                      box with nothing above them, which is half of what the
                      broken screenshot was showing. A credit is attribution FOR A
                      DISPLAYED WORK; with nothing displayed there is nothing to
                      attribute, so removing it with the picture is also the
                      correct reading of the licence and not a shortcut. */}
                  <img src={block.src} alt={trimCaption(block.caption) || item.name} referrerPolicy="no-referrer" loading="lazy"
                    onError={e => { const fig = e.target.closest(".gx-fig"); if (fig) fig.style.display = "none"; else e.target.style.display = "none"; }}
                    style={{ borderRadius: 14, display: "block" }} />
                  {/* _showCaption is false on the second file that carries an
                      identical caption. The credit below is NOT conditional on
                      it: two different photographs need two attributions however
                      alike their titles. See utils/articleLayout.js. */}
                  {block._showCaption !== false && trimCaption(block.caption) && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{trimCaption(block.caption)}</div>
                  )}
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

        {/* ── AND HOW YOU GET THERE, WHICH WAS MEASURED AND NEVER SHOWN ──
            Oliver, 16 Aug 2026, asking what the page needs. Every entry drafted
            since 13 August carries a full measured itinerary from Copenhagen and
            nothing has ever rendered it. See JourneyCard for what was sitting in
            the database, and utils/journey.js for why every figure in it names
            what it measures.

            Placed between the provenance block and the map: what it is, where
            the claims came from, how to reach it, then where it sits. It renders
            nothing at all on an entry with no measured journey or no date on
            one, which today is every row published before 13 August. */}
        <JourneyCard item={item} />

        {/* Where this actually is, and what else is around it. Renders only
            when the entry carries real coordinates; TOWN_COORDS is the fallback
            for towns published before __lat/__lon was stored. Coordinates are
            now written for every content type, so entries drafted from PASS 73
            onward get a map too, and older ones once the Studio backfill has
            been run. */}
        <PlaceMiniMap
          lat={here?.lat}
          lon={here?.lon}
          name={item.name}
          color={color}
          neighbours={near}
          // openStopDetail dispatches on _src, so the neighbour is handed
          // over carrying the pool it came from. `row` is the original entry;
          // the rest of the neighbour object is the flattened copy the map draws.
          onOpenNeighbour={(n) => onOpenNearby?.({ ...n.row, _src: n.kind })}
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

        {/* externalHref, not item.website: seven live festivals store a bare
            domain, which a browser resolves against THIS page and turns into a
            link back to Gemlyx. It returns null for anything that is not a
            plausible http(s) target, so a junk value now renders no button at
            all rather than a button that goes nowhere. */}
        {/* ── AND IF IT IS A TICKETMASTER LINK, IT IS TRACKED ────────
            Oliver, 13 Aug 2026: "let's finish the ticketmaster affiliate."

            ticketmasterUrl returns the ORIGINAL url untouched for every other
            host, which is most of them: Gemlyx links out to madbillet,
            billetto, billetexpressen, kultunaut and whichever agent an operator
            uses, and wrapping one of those in a Ticketmaster tracking URL would
            send a reader somewhere they did not choose and bill a network for a
            click it did not earn.

            The disclosure is empty for those same links rather than being a
            blanket sentence, because "this may earn us a commission" printed
            over a link that earns nothing is a false statement about money.

            rel gains sponsored and nofollow when it IS tracked. That is what
            Google asks for on a paid link, and it is the difference between an
            affiliate programme and something that reads as an undisclosed ad. */}
        {/* ── THE GEMLYX OFFER ────────────────────────────────────
            Oliver, 24 Aug 2026, on who sees what: "it will only be visible to
            paid users. So Gemlyx offer will say 'Only for paying users'. But
            only paying users will know what the offer is."

            Three states, and offerView owns which one this is rather than the
            ternaries below, so the rule can be asserted without a browser and
            cannot quietly become two states the next time this JSX is edited.
            Same argument that moved layoutBody and the food facets out of their
            render sites.

            AN ENDED OFFER RENDERS NOTHING AT ALL, not even the locked badge,
            which is why this asks offerView rather than asking whether __offer
            exists. A badge advertising an offer that has finished would be
            shown to exactly the people being asked to pay for access to it.

            OFFER_NOTE is not decoration. affiliates.js holds the invariant that
            nothing comes out tracked without a sentence under it; this is the
            same question with the money running the other way, since Gemlyx may
            have paid the shop to put the offer there. */}
        {(() => {
          const view = offerView(item.__offer, { paid });
          if (!view.show) return null;
          return (
            <div style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.4, marginBottom: view.locked ? 3 : 5 }}>
                ◈ {OFFER_LOCKED_LABEL}
              </div>
              <div style={{ fontSize: view.locked ? 12 : 13, color: view.locked ? C.muted : C.text, lineHeight: 1.55 }}>
                {view.locked ? OFFER_LOCKED_NOTE : view.text}
              </div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5, marginTop: 7 }}>
                {OFFER_NOTE}{view.until ? ` Until ${view.until}.` : ""}
              </div>
            </div>
          );
        })()}

        {(kind === "free" || kind === "event") && externalHref(item.website) && (() => {
          const dest = externalHref(item.website);
          // affiliateHref rather than ticketmasterUrl: one door, so the day a
          // programme is approved every entry ever published starts earning
          // through it with no republish, and a website that happens to be a
          // Tiqets page is covered too. See utils/affiliates.js.
          const href = affiliateHref(dest) || dest;
          const paid = href !== dest;
          const note = affiliateNote(dest);
          return (
            <div style={{ marginBottom: 10 }}>
              <a href={href} target="_blank" rel={paid ? "noreferrer sponsored nofollow" : "noreferrer"}
                style={{ display: "block", textAlign: "center", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                🌐 Visit website
              </a>
              {note && (
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 5, textAlign: "center" }}>{note}</div>
              )}
            </div>
          );
        })()}

        {/* ── AND A TICKET, WHERE ONE ACTUALLY EXISTS ────────────────
            Oliver, 15 Aug 2026: "if I add on a Copenhagen attraction, then
            it'll automatically put in the affiliate."

            EVERY CONTENT TYPE, not just free and event above. A workshop, a
            town's own attraction pass and a festival can all have a Tiqets
            page, and restricting this the way the website button is restricted
            would mean the field silently does nothing on the types nobody
            thought about.

            ABSENT, NOT DEGRADED, when there is no ticketUrl. A Tickets button
            falling back to a Tiqets search is the failure Oliver named on the
            preview screen the same morning, "don't put up a bunch of random
            attractions just to have something", except this one asks a reader
            for money. shapeForLive refuses to store anything that is not a
            bookable Tiqets page, so an empty field means there genuinely is
            not one.

            The stored value is the PLAIN Tiqets URL and the tracking is added
            here, at render, from the template in config.js. That is what lets
            the marker change without a database migration. */}
        {(() => {
          // ── AND THE ONE ALREADY ON THE ROW ───────────────────────
          //
          // Oliver, 23 Aug 2026: "I have Koge festuge and Copenhell without
          // affiliate links.. is it possible to put in affiliate links on
          // these?"
          //
          // Without republishing either of them, yes. stampTicketSource has
          // written __ticket.url onto the payload since 13 August whenever the
          // Ticketmaster match was STRONG, and shapeForLive keeps it on the
          // live row. So the listing for an event drafted weeks ago is already
          // in Supabase, and nothing had ever read it here.
          //
          // ticketUrl still wins, because that is the field a person can
          // correct by hand. This is the fallback under it, and it goes through
          // the same refusals: a front page or a search never becomes a button.
          const dest = String(item.ticketUrl || "").trim()
            || (isBookableTicketUrl(item?.__ticket?.url) ? String(item.__ticket.url).trim() : "");
          // ── EITHER AGENT, EACH THROUGH ITS OWN TEMPLATE ──────────
          // This read isTiqetsProductUrl and tiqetsUrl only, so a stored
          // Ticketmaster event page would have rendered nothing at all. The
          // agent decides which template wraps it, and an unrecognised value
          // still renders no button rather than a bare link asking for money.
          const agent = ticketAgentOf(dest);
          if (!agent) return null;
          const href = affiliateHref(dest) || dest;
          const note = affiliateNote(dest);
          return (
            <div style={{ marginBottom: 10 }}>
              <a href={href} target="_blank" rel={note ? "noreferrer sponsored nofollow" : "noreferrer"}
                style={{ display: "block", textAlign: "center", background: C.surface, border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                🎫 Book tickets
              </a>
              {note && (
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 5, textAlign: "center" }}>{note}</div>
              )}
            </div>
          );
        })()}

        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.mapHint || `${item.name} ${item.city || item.location || ""} Denmark`)}`} target="_blank" rel="noreferrer"
          style={{ display: "block", textAlign: "center", background: color, color: "#fff", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          ↗ Get Directions
        </a>

        <ReviewsSection itemType={kind} itemName={item.name} />
      </div>
    </div>
  );
};


