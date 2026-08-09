import { C } from "../utils/theme";
import { testTravelerLine } from "../utils/helpers";
import { fold, variantsOf, samePlaceName } from "../utils/danishNames";

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
const CATEGORY_SECTIONS = [
  { src: "town", label: "Major Cities", match: p => p.isMajorCity },
  { src: "town", label: "Towns", match: p => !p.isMajorCity },
  { src: "free", label: "Attractions" },
  { src: "food", label: "Food & Drink" },
  { src: "nightlife", label: "Nightlife" },
  { src: "event", label: "Events" },
];
const groupKey = (p) => (p._src === "craft" ? "free" : p._src);
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
}) => {
  const convoText = aiMessages.slice(1).map(m => `${m.role}: ${m.text}`).join("\n");
  // ── "WHY DOES IT ONLY SHOW COPENHAGEN" ────────────────────────────
  // Oliver, 9 Aug 2026, looking at a preview with one city on it.
  //
  // The matcher was `convoText.toLowerCase().includes(place.name.toLowerCase())`,
  // and it has two holes that both hit Denmark specifically.
  //
  // 1. IT IS A RAW SUBSTRING TEST, SO SPELLING IS THE MATCH. He raised this
  //    himself a few hours earlier about a different screen: "I type
  //    copenhagen, but Copenhagen on Danish is Kobenhavn." Same problem here,
  //    and worse, because the Danish letters break it even when the traveler is
  //    writing the Danish name correctly: "Aeroskobing" never matches
  //    "Ærøskøbing", "Odense" is fine but "Møn" is three characters and was
  //    being skipped by the length guard anyway.
  //
  //    utils/danishNames.js exists for exactly this and was not being used
  //    here. That is the same failure as the last several: a helper that
  //    exists, and a site that matters where it was never called.
  //
  // 2. IT ONLY EVER SHOWS PLACES HE TYPED. Somebody who writes "four days in
  //    Copenhagen" has named one place, so this screen showed one card, and
  //    the screen's whole job is to prove Gemlyx knows the ground. Gemlyx knows
  //    dozens of things IN Copenhagen. Those are not a guess, they are rows
  //    with a `city`/`town` field pointing at a town he did name.
  const norm = fold(convoText);
  const mentions = (name) => {
    const hay = ` ${norm} `;
    return variantsOf(name, { includeSights: true }).some(v => {
      const f = fold(v);
      return f.length >= 3 && hay.includes(f);
    });
  };
  const parentOf = (p) => String(p.city || p.town || "").trim();
  const pools = [
    ...towns.map(p => ({ ...p, _src: "town" })),
    ...freeEntrance.map(p => ({ ...p, _src: "free" })),
    ...foodSpots.map(p => ({ ...p, _src: "food" })),
    ...nightlifeSpots.map(p => ({ ...p, _src: "nightlife" })),
    ...craftItemsFallback.map(p => ({ ...p, _src: "craft" })),
    ...events.map(p => ({ ...p, _src: "event" })),
    ...majorEvents.map(p => ({ ...p, _src: "event" })),
  ];
  const seen = new Set();
  const matched = [];
  // The length guard is now on the FOLDED variant inside mentions(), not on the
  // raw name, because it was throwing away real Danish towns: "Mon" and "Aro"
  // are three characters and are places, while the thing the guard was actually
  // protecting against is a two-letter fragment matching inside a longer word.
  pools.forEach(p => {
    if (!p.name) return;
    const key = fold(p.name);
    if (!key || seen.has(key)) return;
    if (mentions(p.name)) { seen.add(key); matched.push(p); }
  });
  // ── AND WHAT IS INSIDE THE PLACES HE DID NAME ─────────────────────
  // Second pass, and deliberately second: anything whose own city/town field
  // points at a town already matched above. Not a guess and not a search, just
  // the rows that say where they are. This is the difference between "you said
  // Copenhagen" and "here is what we hold on Copenhagen", which is the only
  // reason this screen exists.
  const matchedTowns = new Set(matched.filter(p => p._src === "town").map(p => fold(p.name)));
  if (matchedTowns.size) {
    pools.forEach(p => {
      if (!p.name || p._src === "town") return;
      const key = fold(p.name);
      if (!key || seen.has(key)) return;
      const parent = parentOf(p);
      if (!parent) return;
      // samePlaceName, not equality: a row can store "Kobenhavn" while the town
      // row is called "Copenhagen", and they are one place.
      if ([...matchedTowns].some(t => samePlaceName(parent, t))) { seen.add(key); matched.push(p); }
    });
  }
  // Group into the fixed category order above, each capped independently.
  // Two sections ("Major Cities"/"Towns") now share src:"town" and are
  // told apart by their own `match` predicate — apply it on top of the
  // groupKey match, not instead of it.
  const sections = CATEGORY_SECTIONS
    .map(cat => ({ ...cat, items: matched.filter(p => groupKey(p) === cat.src && (!cat.match || cat.match(p))).slice(0, MAX_PER_SECTION) }))
    .filter(cat => cat.items.length > 0);
  const totalShown = sections.reduce((n, cat) => n + cat.items.length, 0);
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
            ? "Places you have already mentioned that Gemlyx has its own page for. The route itself comes next."
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
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>◈ Pipeline test — the traveler that was picked</div>
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
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>{place.name}</div>
                    <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginTop: 3 }}>{(place.desc || "").slice(0, 100)}{(place.desc || "").length > 100 ? "…" : ""}</div>
                  </div>
                  <button onClick={() => openStopDetail(place)}
                    style={{ flexShrink: 0, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    Read more
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
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
    </div>
  );
};
