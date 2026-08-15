import { useEffect, useState } from "react";
import { C } from "../utils/theme";
import { testTravelerLine, getEventDate } from "../utils/helpers";
import { matchedPlaces, previewPools, mentionsPlace, wantedCategories, groupKeyOf } from "../utils/previewMatch";
import { tripWindow, tripEvents, describePicks } from "../utils/tripEvents";
import { AskGemlyx } from "./AskGemlyx";

// ── "Here's what's coming up" preview screen ────────────────────────
// PASS 27 EXTRACTION (App.jsx file-split, per Oliver: "you gotta start
// splitting files, I'm scared you end up removing all our progress again").
// This is a mechanical, behavior-preserving extraction of the exact JSX
// block that used to live inline in GemlyxApp's render (guideModal ===
// "preview"), moved out verbatim into its own file with everything it
// touched from the parent's scope now passed in as props instead of read
// from closure. Nothing about what it does changed — same matching logic,
// same random-guide-test handling, same close behavior. If something here
// ever looks wrong, the fix belongs in THIS file now, not App.jsx.
//
// Built PASS 26, per Oliver: "before this page pops up, have another page
// before that, which shows the towns and attractions... including being
// able to click 'read more'." Shown the instant "Turn this into a guide" is
// tapped (or, as of PASS 27, the instant the Studio "Random guide" test
// button is used) — scans the conversation text against everything Gemlyx
// already knows (towns, free attractions, food, nightlife, events) for real
// name matches, client-side only, so it's instant, not another wait.
//
// pendingRandomGuideMode (set by App.jsx's generateRandomGuide, PASS 27):
// when present, this screen knows it's the random-guide test path, which
// already picked its own map/plain mode — "continue" skips the real
// map/plain choice screen and builds immediately instead. Unset (real chat
// flow) behaves exactly as before this pass: "continue" hands off to
// setGuideModal("choosing").
// PASS 27, per Oliver ("I want it to show the towns in its own section and
// attractions in its own section"): matched real places used to render as
// one flat mixed list — a town, a restaurant, and an event with no visual
// distinction between them. Grouped into labeled sections instead, one per
// real category, shown in this order whenever that category has at least
// one match. Craft/workshop spots are now matched too (they weren't before
// — a genuine gap, not by design: the random-guide test brief can name a
// craft spot as one of its "extras," but the old flat pool never included
// craftItemsFallback at all, so a mentioned craft spot silently had nothing
// to match against and just never showed up, quietly shrinking the count
// below what was actually mentioned).
// PASS 27 ROUND 2, per Oliver ("remove craft and workshop. Make those
// attractions"): craft/workshop spots no longer get their own section here —
// they display under "Attractions" instead. Note this is a DISPLAY grouping
// only: each place's real _src stays "craft" (see the pools array below),
// because openStopDetail routes "Read more" clicks by _src to the correct
// detail-page setter (setCraftDetail vs setFreeDetail) — renaming _src itself
// would silently break that routing. groupKey() below is the one place that
// decides which section header a place lands under, kept separate from _src.
// PASS 27 ROUND 5, per Oliver ("Copenhagen is technically a major city..
// I suppose we can make it its own... Major City / Town / Attractions"):
// Copenhagen/Aarhus/Aalborg (see src/data/towns.js, isMajorCity: true) now
// get their own section here too, ahead of the curated hidden-gem Towns
// section — same real `_src: "town"` classification underneath (so
// openStopDetail's routing is untouched), just split into two labeled
// groups by the isMajorCity flag instead of one. `match` is an optional
// extra predicate applied on top of the _src/groupKey match below.
// ── EVENTS LEFT THIS LIST ON PURPOSE ────────────────────────────────
// Oliver, 14 Aug 2026: "every single event is for some reason shown in the
// preview instead of just the one that the visitor will explore".
//
// The cause is the second matching pass below, which adds every row whose own
// town field points at a town the traveller named. For a standing place that
// is the entire reason this screen exists. For an event it is a category
// error, because an event is a place plus a date and this pass only ever read
// the place half. Measured on the real matcher: "Four days in Copenhagen in
// March, we want the Copenhagen Light Festival" returned six events, five of
// them never mentioned, four in the wrong season and one already finished,
// every one presented exactly like the festival he had asked for.
//
// Events are now built by utils/tripEvents.js and rendered by their own block
// further down, because they need three things a generic card cannot do: a
// date test against the real trip, a tick so the traveller chooses, and a
// limit that comes from how long they are here.
const CATEGORY_SECTIONS = [
  { src: "town", label: "Major Cities", match: p => p.isMajorCity },
  { src: "town", label: "Towns", match: p => !p.isMajorCity },
  { src: "free", label: "Attractions" },
  { src: "food", label: "Food & Drink" },
  { src: "nightlife", label: "Nightlife" },
];
// groupKeyOf lives in utils/previewMatch.js now, because the MATCHER has to
// reason about categories too (see wantedCategories) and two copies of "craft
// shows under Attractions" would drift the first time one of them moved.
const groupKey = groupKeyOf;
// What an empty section is called when the brief did not ask for it. The label
// is a category name; this is the invitation.
const ADD_LABEL = { free: "Add attractions", food: "Add places to eat", nightlife: "Add nightlife" };
// Per-section cap, not one shared cap across everything — a real conversation
// covering several towns and several attractions should be able to show all
// of them without one category silently crowding another out of the shared
// slice(0, 8) this used to have.
const MAX_PER_SECTION = 6;

export const GuidePreviewScreen = ({
  previewWhy,
  testProfile,
  aiMessages,
  towns,
  freeEntrance,
  foodSpots,
  nightlifeSpots,
  events,
  majorEvents,
  craftItemsFallback,
  openStopDetail,
  pendingRandomGuideMode,
  setPendingRandomGuideMode,
  setAiMessages,
  setGuideModal,
  generateGuide,
  // The traveller's own dates and interests, straight off the intake form.
  // EventMatchCard has read these since PASS 26 to decide whether ONE event is
  // on while they are there; this screen was making the same decision without
  // them, which is why it could not make it at all.
  intakeArrival = "",
  intakeDeparture = "",
  intakeInterest = [],
  pickedEvents = null,
  setPickedEvents = () => {},
  // The places the traveller added back from a section their brief did not ask
  // for. Same shape and same journey as pickedEvents: names, held by App.jsx,
  // handed to the PLANNER as fixed points rather than to the writer.
  pickedExtras = [],
  setPickedExtras = () => {},
  // Ask Gemlyx, inside this overlay. Oliver, 15 Aug 2026: "So if they want to
  // add that on, then make Gemlyx AI prepared to answer them questions on that
  // INSIDE the preview." Nobody should have to close a screen they are still
  // deciding on to find out what a place is.
  session = null,
  onSignIn = () => {},
}) => {
  // Which offered sections the traveller has opened, and which card they are
  // asking about. Both local: neither survives closing the preview, and neither
  // should.
  const [openedExtras, setOpenedExtras] = useState([]);
  const [askItem, setAskItem] = useState(null);
  const convoText = aiMessages.slice(1).map(m => `${m.role}: ${m.text}`).join("\n");
  // The name matcher and both matching passes live in utils/previewMatch.js
  // now, together with the four bugs they have carried (a raw substring test,
  // an unused padding, a length guard standing in for a boundary check, and a
  // town field read under the wrong name). Every one was found by Oliver on a
  // screenshot, because a matcher inside a render can only be run by rendering
  // it. It can be tested from there.
  const mentions = (name) => mentionsPlace(convoText, name);
  // ── "SAME ATTRACTION AND SAME TOWN THAT ARE ALWAYS SHOWN" ─────────
  // Oliver, 15 Aug 2026, on a preview for a family who said markets, cycling
  // and one or two meals out, which came back as Copenhagen plus a palace, a
  // city museum and an art gallery, with no Food & Drink or Nightlife section
  // at all. Not thin content: food, nightlife and craft rows keep their town
  // in `location` while this screen only read `city` and `town`, so they were
  // permanently ineligible. Both passes now live in utils/previewMatch.js,
  // which carries the full story and, unlike a matcher inside a render, can be
  // tested. App.jsx's previewWhy effect reads the same function, so the italic
  // line at the top of this screen can no longer describe a different trip
  // from the list underneath it.
  // The trip's own length reaches the matcher, because how many towns to offer
  // for a named region is a question about the trip, not about the region.
  // Computed here rather than inside, so the events and the towns read the same
  // window and cannot disagree about how long somebody is here.
  const win = tripWindow({ arrival: intakeArrival, departure: intakeDeparture, convoText });
  // ── "THEY ARE ONLY ASKING FOR EVENTS" ─────────────────────────────
  // What the brief is into, read off the intake form and THE TRAVELLER'S OWN
  // TURNS. null means they named nothing, and then nothing is held back. See
  // wantedCategories in utils/previewMatch.js for the whole story, including
  // why nightlife rides along with events.
  //
  // NOT convoText, which is what every other read on this screen uses. That
  // string carries Gemlyx's replies too, and Gemlyx suggests things: one
  // sentence back from it reading "Copenhagen has excellent museums" would put
  // `free` in the wanted set and quietly undo the whole narrowing, using the
  // app's own suggestion as evidence that the traveller asked for it. Place
  // NAMES are a different question and still read from the whole conversation,
  // because a place Gemlyx named and the traveller kept talking about is a
  // place in this trip. An interest has to be theirs.
  const saidByTraveller = aiMessages.slice(1).filter(m => m.role === "user").map(m => m.text || "").join("\n");
  const wanted = wantedCategories(saidByTraveller, intakeInterest);
  const matched = matchedPlaces(convoText, previewPools({ towns, freeEntrance, foodSpots, nightlifeSpots, craftItemsFallback, events, majorEvents }), { days: win?.days ?? null, wanted });
  // Group into the fixed category order above, each capped independently.
  // Two sections ("Major Cities"/"Towns") now share src:"town" and are
  // told apart by their own `match` predicate — apply it on top of the
  // groupKey match, not instead of it.
  //
  // `offered` is the second half of that: rows Gemlyx holds in these towns that
  // the brief did not ask about. They are not items and they are not gone. The
  // section renders with nothing in it and says what it could put there.
  const sections = CATEGORY_SECTIONS
    .map(cat => {
      const mine = matched.filter(p => groupKey(p) === cat.src && (!cat.match || cat.match(p)));
      return {
        ...cat,
        items: mine.filter(p => !p._notAsked).slice(0, MAX_PER_SECTION),
        offered: mine.filter(p => p._notAsked).slice(0, MAX_PER_SECTION),
      };
    })
    .filter(cat => cat.items.length > 0 || cat.offered.length > 0);
  const toggleExtra = (name) =>
    setPickedExtras(prev => (prev || []).includes(name) ? (prev || []).filter(n => n !== name) : [...(prev || []), name]);
  // ── THE EVENTS, DATE TESTED AND TICKABLE ──────────────────────────
  // `named` is the first pass's own answer rather than a second guess at it:
  // an event is named exactly when the traveller wrote it, which is the same
  // question mentions() already answered above.
  const eventPlan = tripEvents(matched.filter(p => p._src === "event"), {
    window: win,
    interests: intakeInterest,
    named: e => mentions(e.name),
  });
  // Gemlyx's own picks are the starting ticks, so somebody who taps straight
  // through still gets the event that was running that week. Written once,
  // then it is the traveller's list: `pickedEvents` null means untouched.
  useEffect(() => {
    if (pickedEvents === null) setPickedEvents(eventPlan.picks);
    // eventPlan.picks is derived from props that cannot change while this
    // overlay is open, so its identity changing per render is not a signal.
  }, [pickedEvents === null, eventPlan.picks.join("|")]);   // eslint-disable-line react-hooks/exhaustive-deps
  const picked = pickedEvents === null ? eventPlan.picks : pickedEvents;
  const atLimit = picked.length >= eventPlan.limit;
  const toggleEvent = (name) => {
    setPickedEvents(prev => {
      const list = prev === null ? eventPlan.picks : prev;
      if (list.includes(name)) return list.filter(n => n !== name);
      if (list.length >= eventPlan.limit) return list;
      return [...list, name];
    });
  };
  // Offered rows count. A screen with an empty Attractions section and nine
  // attractions behind an Add button has plenty to show; telling that traveller
  // "nothing matched yet" would be false and would hide the button saying so.
  const totalShown = sections.reduce((n, cat) => n + cat.items.length + cat.offered.length, 0) + eventPlan.rows.length;
  // PASS 27: closing without continuing (backdrop tap or ✕) needs to unwind
  // the random-guide test state too, not just the modal — else
  // pendingRandomGuideMode and the fabricated brief pushed into aiMessages
  // would leak into whatever the traveler does next (e.g. a real chat
  // message right after would silently ride along with the test's
  // mode/skip-choosing-screen behavior).
  const closePreview = () => {
    if (pendingRandomGuideMode) {
      setPendingRandomGuideMode(null);
      setAiMessages(prev => prev.slice(0, -1));
    }
    setGuideModal(null);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(5,8,16,0.92)", overflowY: "auto", padding: "60px 16px 40px" }} onClick={closePreview}>
      <button onClick={closePreview} aria-label="Close"
        style={{ position: "fixed", top: 20, right: 20, background: "rgba(255,255,255,0.06)", border: "none", color: C.light, width: 40, height: 40, borderRadius: "50%", fontSize: 16, cursor: "pointer", zIndex: 951 }}>✕</button>
      <div style={{ maxWidth: 560, margin: "0 auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text, marginBottom: 8, textAlign: "center" }}>Here's what's coming up</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, textAlign: "center" }}>
          {totalShown > 0
            ? (matched.some(p => p._viaRegion)
                ? "Places you named, and what Gemlyx holds in the part of Denmark you asked about. The route itself comes next."
                : "Places you have already mentioned that Gemlyx has its own page for. The route itself comes next.")
            : "Gemlyx will pick the stops and build your full guide next."}
        </div>
        {/* TEST-PROFILE CARD (Oliver: "When I click the random guide, I have
            to know what was picked") — shows the fabricated traveler right
            HERE at the preview stage, not just on the finished guide. Only
            ever present on Random-guide test runs (testProfile prop is null
            for real travelers). The planner's full day-by-day breakdown and
            the events-included line follow on the finished guide page. */}
        {testProfile && (
          <div style={{ background: `${C.gold}0D`, border: `1px dashed ${C.gold}66`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 12.5, lineHeight: 1.7 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>◈ Pipeline test: the traveler that was picked</div>
            {/* "based around , into coastal views and local food" is what this
                line used to say, with nothing between "around" and the comma,
                because the brief stopped naming towns and this screen was not
                updated with the other one. Both now read the same helper. */}
            <div style={{ color: C.light }}>{testTravelerLine(testProfile)}</div>
            {testProfile.brief && (
              <div style={{ color: C.muted, fontStyle: "italic", marginTop: 6, paddingLeft: 10, borderLeft: `2px solid ${C.gold}44` }}>{testProfile.brief}</div>
            )}
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>The planner's full day-by-day breakdown and whether events made it in show on the finished guide.</div>
          </div>
        )}
        {/* Personal "why this fits you" line (Oliver's ask) — written by
            Claude from the traveler's own conversation, see App.jsx's
            previewWhy effect. Renders nothing while loading or on failure. */}
        {previewWhy && (
          <div style={{ fontSize: 13, color: C.gold, lineHeight: 1.6, marginBottom: 14, textAlign: "center", fontFamily: "'Fraunces', serif", fontStyle: "italic", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            {previewWhy}
          </div>
        )}
        {/* The "✦ Want to ask something or change it first? Back to chat"
            text button that used to sit here is gone per Oliver ("I don't
            like that... Make the Gemlyx AI instantly able for help. In the
            right corner or something") — replaced by a floating Ask Gemlyx
            launcher App.jsx renders ON TOP of this overlay (zIndex 960,
            search PREVIEW CHAT in App.jsx), which opens the real live Detour
            conversation in a corner panel without ever closing this preview.
            The ✕ / backdrop tap still fully close back to the chat tab. */}
        <div style={{ marginBottom: 18 }} />
        {sections.map(cat => (
          <div key={cat.label} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>{cat.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cat.items.map(place => (
                <div key={`${place._src}-${place.id}`} style={{ display: "flex", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg, #16233F 0%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {place.photo ? (
                      <img src={place.photo} alt={place.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 22, opacity: 0.4 }}>{place.emoji || "◆"}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>{place.name}</div>
                      {/* ── WHY THIS ROW IS HERE ────────────────────────
                          Oliver, 15 Aug 2026, on a preview for somebody whose
                          brief was "we are already in Copenhagen and want to
                          get out of the city": ten Copenhagen rows and nothing
                          from Jutland, which is the one thing they asked for.
                          A row that is on the screen for a reason other than
                          "you typed it" now says which. */}
                      {place._leaving && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 7px" }}>Where you start</span>
                      )}
                      {place._viaRegion && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", border: `1px solid ${C.gold}55`, borderRadius: 100, padding: "2px 7px" }}>In {place._viaRegion}</span>
                      )}
                      {/* WHAT IS UNDER IT. "All it does now is show towns" was
                          six bare town cards, and a card that says what Gemlyx
                          holds inside it is the difference between a name and
                          an answer. Absent when there is nothing, because a
                          badge reading "0 places" is worse than no badge. */}
                      {place._holds > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>{place._holds} {place._holds === 1 ? "place" : "places"} inside</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginTop: 3 }}>{(place.desc || "").slice(0, 100)}{(place.desc || "").length > 100 ? "…" : ""}</div>
                  </div>
                  <button onClick={() => openStopDetail(place)}
                    style={{ flexShrink: 0, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    Read more
                  </button>
                </div>
              ))}
            </div>
            {/* ── THE SECTION NOBODY ASKED FOR ──────────────────────
                Oliver, 15 Aug 2026, on a brief whose only stated interest was
                festivals and live events, which came back holding Københavns
                Museum, the Glyptotek, Amalienborg Slot, Farfar's bodega and
                Hooked: "these people do NOT sound like the people who would
                visit Amalienborg Slot."

                Empty is the answer, and empty with a door is the right empty.
                Deleting the rows would make Gemlyx look like it knows nothing
                in Copenhagen; filling them makes it look like it was not
                listening. So the count is stated, the invitation is there, and
                the traveller decides. */}
            {cat.offered.length > 0 && !openedExtras.includes(cat.label) && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, padding: "14px 14px" }}>
                <div style={{ flex: 1, minWidth: 180, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  You did not ask for these, so Gemlyx left them out. It holds {cat.offered.length} {cat.offered.length === 1 ? "place" : "places"} here if you want {cat.offered.length === 1 ? "it" : "some"}.
                </div>
                <button onClick={() => setOpenedExtras(prev => [...prev, cat.label])}
                  style={{ flexShrink: 0, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "8px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  {ADD_LABEL[cat.src] || `Add ${cat.label.toLowerCase()}`}
                </button>
              </div>
            )}
            {cat.offered.length > 0 && openedExtras.includes(cat.label) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  Tick what you want in the trip. Ask about any of them without leaving this screen.
                </div>
                {cat.offered.map(place => {
                  const on = (pickedExtras || []).includes(place.name);
                  return (
                    <div key={`x-${place._src}-${place.id}`} style={{ display: "flex", gap: 12, background: C.surface, border: `1px solid ${on ? `${C.gold}66` : C.border}`, borderRadius: 14, padding: 12, alignItems: "center" }}>
                      <button onClick={() => toggleExtra(place.name)}
                        aria-label={on ? `Remove ${place.name} from the trip` : `Add ${place.name} to the trip`}
                        style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, cursor: "pointer", background: on ? C.gold : "transparent", border: `1px solid ${on ? C.gold : C.border}`, color: on ? "#0A0F1E" : C.muted, fontSize: 13, fontWeight: 800, lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
                        {on ? "✓" : ""}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>{place.name}</div>
                        <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginTop: 3 }}>{(place.desc || "").slice(0, 100)}{(place.desc || "").length > 100 ? "…" : ""}</div>
                      </div>
                      <button onClick={() => setAskItem(place)}
                        style={{ flexShrink: 0, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "6px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                        Ask
                      </button>
                      <button onClick={() => openStopDetail(place)}
                        style={{ flexShrink: 0, background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                        Read more
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {/* ── EVENTS: THE ONE SECTION THE TRAVELLER DECIDES ────────────
            Every other section on this screen is Gemlyx showing what it holds.
            This one asks a question, because an event costs a day and only the
            person going knows whether they want to spend one. The limit is
            Oliver's: "If the person has chosen like 4 days, then obviously he
            should be limited to only one. If the person is there for 10 on the
            other hand.. then he can easily make 3 or 4."

            A row that cannot be ticked still renders, with its dates and the
            reason. Hiding a festival somebody asked for by name because it
            runs three weeks after they leave is how they find that out at the
            gate instead of here. */}
        {eventPlan.rows.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Events</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
              {eventPlan.dated
                ? describePicks(eventPlan.limit, picked.length)
                : "Add an event and the plan is built around its dates. Tell Gemlyx your travel dates in chat and it can check what else is on that week."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {eventPlan.rows.map(row => {
                const place = row.event;
                const on = picked.includes(place.name);
                const blocked = !row.tickable || (!on && atLimit);
                return (
                  <div key={`event-${place.id}`}
                    style={{ display: "flex", gap: 12, background: C.surface, border: `1px solid ${on ? `${C.gold}88` : C.border}`, borderRadius: 14, padding: 12, alignItems: "center", opacity: row.tickable ? 1 : 0.62 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg, #16233F 0%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {place.photo ? (
                        <img src={place.photo} alt={place.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 22, opacity: 0.4 }}>{place.emoji || "◆"}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>{place.name}</div>
                        {row.recommended && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", border: `1px solid ${C.gold}55`, borderRadius: 100, padding: "2px 7px" }}>Recommended</span>
                        )}
                      </div>
                      {/* THE DATES, WHICH THIS CARD NEVER SHOWED. A card with a
                          name and a description reads as "this is on", and for
                          four of the six events it used to list, it was not. */}
                      <div style={{ fontSize: 12, color: row.tickable ? C.light : C.muted, marginTop: 3 }}>
                        {getEventDate(place.date, place.dateEnd)}{place.town ? ` · ${place.town}` : ""}
                        {row.note ? ` · ${row.note}` : ""}
                      </div>
                      <button onClick={() => openStopDetail(place)}
                        style={{ background: "none", border: "none", padding: 0, marginTop: 5, color: C.gold, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                        Read more
                      </button>
                    </div>
                    <button onClick={() => { if (!blocked || on) toggleEvent(place.name); }}
                      disabled={blocked && !on}
                      aria-pressed={on}
                      aria-label={on ? `Remove ${place.name} from the trip` : `Add ${place.name} to the trip`}
                      title={!row.tickable ? row.note : (blocked ? `You have already added ${eventPlan.limit}` : "")}
                      style={{ flexShrink: 0, background: on ? C.gold : "none", border: `1px solid ${blocked && !on ? `${C.border}` : `${C.gold}55`}`, color: on ? "#1A1206" : blocked ? C.muted : C.gold, borderRadius: 100, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: blocked && !on ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif" }}>
                      {on ? "✓ Added" : row.tickable ? "Add" : "Can't add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ── AN EMPTY LIST IS NOT A BROKEN SCREEN ──────────────────
            Oliver's screenshots: one preview with a single Copenhagen card for
            a five day coastal trip, and one with nothing on it at all.
            Both were correct behaviour badly presented. This list is NOT the
            route: it is published entries whose NAME appears in the chat so
            far, matched by substring. It looked full before only because the
            random brief used to name entries outright, and it is empty for any
            real traveler who says "beaches and museums" rather than naming a
            town. Saying that out loud costs one line and stops an honest empty
            state from reading as a failure.

            The real answer is to plan the route BEFORE this screen and show
            that instead, which is the next piece of work. */}
        {totalShown === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 18, fontSize: 12.5, color: C.light, lineHeight: 1.65 }}>
            Nothing here yet, and that is expected: this list only fills in once you have named a place Gemlyx already covers. Your stops get chosen in the next step.
          </div>
        )}
        <button onClick={() => {
            // PASS 27: the random-guide test button already picked its mode
            // (map/plain) itself and has nothing more to ask — go straight to
            // build instead of showing the real map/plain choice screen,
            // which only makes sense for an actual traveler deciding for
            // themselves. Real chat flow (pendingRandomGuideMode unset)
            // behaves exactly as before.
            if (pendingRandomGuideMode) {
              const mode = pendingRandomGuideMode;
              setPendingRandomGuideMode(null);
              generateGuide(undefined, mode);
            } else {
              setGuideModal("choosing");
            }
          }}
          style={{ width: "100%", background: `linear-gradient(135deg, ${C.gold}, ${C.accent})`, border: "none", borderRadius: 100, padding: "14px", fontSize: 14, fontWeight: 700, color: "#1A1206", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          Looks good — continue →
        </button>
      </div>
      {/* ── ASK GEMLYX, WITHOUT LEAVING THE DECISION ──────────────────
          Oliver, 15 Aug 2026: "So if they want to add that on, then make
          Gemlyx AI prepared to answer them questions on that. INSIDE the
          preview."

          One panel, not one per card: `askItem` is whichever card was tapped,
          and the key remounts it so a question about the Glyptotek never opens
          onto a log about Amalienborg. stopPropagation because this overlay
          closes on a backdrop tap and the panel sits inside it. */}
      {askItem && (
        <div onClick={e => e.stopPropagation()}>
          <AskGemlyx key={askItem.name} item={askItem} session={session} onSignIn={onSignIn}
            startOpen onClose={() => setAskItem(null)} />
        </div>
      )}
    </div>
  );
};
