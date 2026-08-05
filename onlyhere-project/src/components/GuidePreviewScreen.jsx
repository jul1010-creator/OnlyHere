import { C } from "../utils/theme";

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
  const norm = convoText.toLowerCase();
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
  pools.forEach(p => {
    // Skip anything shorter than 4 characters — too generic a string to
    // trust as a real substring match (would false-positive constantly).
    if (!p.name || p.name.length < 4) return;
    const key = p.name.toLowerCase();
    if (seen.has(key)) return;
    if (norm.includes(key)) { seen.add(key); matched.push(p); }
  });
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
          {totalShown > 0 ? "A quick look at the real places on this route before Gemlyx builds your full guide." : "Gemlyx will build your full guide next — real places, checked and mapped out."}
        </div>
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
