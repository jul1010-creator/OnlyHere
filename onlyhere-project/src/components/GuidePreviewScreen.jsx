import { useEffect, useState } from "react";
import { previewReportRow, travellerTurns, feedbackProblem } from "../utils/articleFeedback";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { C } from "../utils/theme";
import { testTravelerLine, getEventDate } from "../utils/helpers";
import { matchedPlaces, previewPools, mentionsPlace, wantedCategories, groupKeyOf, parentTownOf, tripAnchorFor, eventReachBand, tripPoints } from "../utils/previewMatch";
import { tripWindow, tripEvents, describePicks } from "../utils/tripEvents";
import { briefThemes, rankOffers, offerReason, OFFER_LIMIT } from "../utils/interestFit";
import { cardLine } from "../utils/cardLine";
import { buildPreviewReport, downloadReport, reportFilename } from "../utils/previewReport";
import { readBrief } from "../utils/tripBrief";
import { withoutTestBrief } from "../utils/chatThread";
import { travellerBudget } from "../utils/accommodation";
import { previewCoverage, describeCoverage, COVERAGE_THIN, COVERAGE_MATCHER, COVERAGE_UNANSWERED, COVERAGE_UNCOUNTED } from "../utils/previewCoverage";
import { AskGemlyx } from "./AskGemlyx";

// ── THE HEADER ON THE FINDING, FROM THE CONSTANTS ───────────────────
// This read `coverage.verdict === "no-content-there" ? ... : ...`, with the
// verdict strings retyped here as literals beside the module that exports them.
// A fourth verdict was added to previewCoverage.js and this chain silently
// labelled it "Nothing to match on", which is the one thing it is not: sixteen
// rows matched. A map off the exported constants cannot drift that way, and a
// verdict with no entry falls through to the same default on purpose.
const COVERAGE_TITLE = {
  [COVERAGE_THIN]: "Content gap",
  [COVERAGE_MATCHER]: "Matcher gap",
  [COVERAGE_UNANSWERED]: "Full screen, nothing they asked for",
  // Not a gap of any kind. Nothing has been counted, so nothing is claimed.
  [COVERAGE_UNCOUNTED]: "Cannot tell yet",
};

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
// ── AND THE OTHER DOOR, WHICH IS THE ONE HE ASKED FOR ───────────────
// Oliver, 15 Aug 2026: "Make them able to 'ask Gemlyx'." A door that opens
// onto an empty composer hands the traveller the job of working out the
// question, which is the same overwhelm wearing a different shape. This types
// the question for them, into the real Detour conversation the preview was
// built from, so the answer already knows the trip.
const ASK_SEED = {
  free: "What is worth seeing on this trip that I have not asked about?",
  food: "Where should I eat on this trip?",
  nightlife: "What nightlife would suit this trip?",
};
const askSeed = (cat) => ASK_SEED[cat?.src] || `What ${String(cat?.label || "").toLowerCase()} would suit this trip?`;
// Per-section cap, not one shared cap across everything — a real conversation
// covering several towns and several attractions should be able to show all
// of them without one category silently crowding another out of the shared
// slice(0, 8) this used to have.
const MAX_PER_SECTION = 6;

// ── THE REPORT CONTROL ──────────────────────────────────────────────
//
// Posts the same { name, type, note } shape to the same gemlyx_suggestions
// table the article feedback already uses, so there is no migration and no
// second inbox. previewReportRow is what builds it, and it is in
// utils/articleFeedback.js rather than here for the reason that file gives
// about its own rules: a component needs a browser, a fetch and a key, and
// cannot be asked anything by a test.
const StudioPickReport = ({ aiMessages, C }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);
  const [problem, setProblem] = useState("");

  const send = async () => {
    if (status === "sending") return;
    const why = feedbackProblem("pick", text);
    if (why) { setProblem(why); return; }
    setProblem("");
    setStatus("sending");
    try {
      // What the screen is showing, read off the rendered DOM rather than
      // rebuilt from the props: the report has to describe what he was LOOKING
      // AT, and a second derivation of the same list is a second thing that can
      // be wrong in a different way from the first.
      // Read off the SCREEN rather than rebuilt from the props. The report has
      // to describe what he was looking at, and a second derivation of the same
      // list is a second thing that can be wrong, in a different way from the
      // first, which is the failure this whole report exists to catch.
      const onScreen = (() => {
        try { return document.querySelector("[data-preview-screen]")?.innerText || ""; }
        catch { return ""; }
      })();
      const row = previewReportRow({
        text,
        said: travellerTurns(aiMessages),
        onScreen,
        url: typeof window !== "undefined" ? window.location.href : "",
      });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_suggestions`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(row),
      });
      // ── AND IT GOES IN THE CLIPBOARD TOO ──────────────────────
      //
      // Oliver, 5 Sep 2026: "what does the 'sent in studio suggestions' mean?
      // Am I not supposed to send it to you? Or can I, in studio, improve on
      // the AI? Shouldn't it be the coding itself."
      //
      // He is right, and the button was half a feature. For the bug he built it
      // for, a 21+ bar in a trip with ten six-year-olds, there is nothing to fix
      // in Studio: no age gate exists and the family signal never leaves the
      // conversation. The fix is CODE. What the report is worth is the evidence,
      // the brief and the screen at the moment it went wrong, which cannot be
      // reconstructed an hour later.
      //
      // So the row is still written, because it is a record, and the same text
      // goes to the clipboard so it can be pasted straight into a conversation
      // with whoever is fixing it. Non-fatal and non-blocking: a browser that
      // refuses clipboard access must not turn a saved report into a failed one.
      let copied = false;
      try {
        await navigator.clipboard.writeText(`${row.type}: ${row.name}\n\n${row.note}`);
        copied = true;
      } catch { /* no clipboard permission, the row is still saved */ }
      setStatus(res.ok ? (copied ? "copied" : "sent") : "error");
      if (res.ok) setText("");
    } catch { setStatus("error"); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}>
        ⚑ Report these picks
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <textarea value={text} onChange={e => { setText(e.target.value); setProblem(""); }}
        placeholder="What is wrong with these picks?"
        rows={3}
        style={{ width: "100%", boxSizing: "border-box", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: 12.5, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif", resize: "vertical" }} />
      {/* The brief and the screen travel with it and he does not have to retype
          either, so this line is a statement about what is being sent rather
          than an instruction. */}
      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>
        The conversation and what this screen is showing are sent with it.
      </div>
      {problem && <div style={{ fontSize: 11.5, color: C.gold, marginTop: 6 }}>{problem}</div>}
      {/* "Sent. It is in Studio suggestions." was true and useless: it named a
          destination rather than saying what was kept. This says what it saved
          and, when the clipboard allowed it, that it is ready to paste. */}
      {status === "copied" && <div style={{ fontSize: 11.5, color: C.gold, marginTop: 6 }}>Saved with the conversation and the screen, and copied ready to paste.</div>}
      {status === "sent" && <div style={{ fontSize: 11.5, color: C.gold, marginTop: 6 }}>Saved with the conversation and the screen. It is in Studio suggestions.</div>}
      {status === "error" && <div style={{ fontSize: 11.5, color: C.gold, marginTop: 6 }}>That did not send. Try again in a moment.</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
        <button onClick={send} disabled={status === "sending"}
          style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: status === "sending" ? "wait" : "pointer", fontFamily: "'Inter', sans-serif" }}>
          {status === "sending" ? "Sending" : "Send report"}
        </button>
        <button onClick={() => { setOpen(false); setStatus(null); setProblem(""); }}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

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
  // The transport chips, for the same reason the dates and interests are here:
  // this screen decides which towns get offered, and until tonight it decided
  // that without knowing whether the traveller had a car or a bicycle.
  intakeTransport = [],
  intakeBudgetText = "",
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
  // Everything the Studio has published, so an empty preview can say whether
  // that is a content gap or a matcher that could not reach the content. Only
  // ever passed on the pipeline test path; a real traveller never sees this.
  // NULL until Manage Published has been opened, and it must stay null: an
  // uncounted library defaulted to [] is what made the content gap panel fire on
  // every run. See previewCoverage.js.
  library = null,
  // Sends the founder straight from a gap to a discovery run aimed at it.
  // Oliver, 15 Aug 2026: "I would also like a button for studio, that can click
  // 'search for content in this area'. Because apparently here there was
  // NOTHING." Null on any path that has no Studio behind it.
  onSearchArea = null,
  // What the traveller typed about themselves, if they have an account. Read
  // ONLY to order what is offered behind a door, never to filter and never to
  // put a word on screen about the person. See profilePull in interestFit.js.
  userProfile = null,
  // Opens the floating Detour panel App.jsx already renders on top of this
  // overlay, optionally with a question typed in. This is the "or ask Gemlyx"
  // half of every door on this screen, and it is the REAL conversation the
  // preview was built from rather than a second one.
  askGemlyx = null,
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
  // ── THE TRAVELLER'S OWN TURNS, HOISTED ABOVE THE WINDOW ─────────
  // This used to be declared thirteen lines further down, next to the reads
  // that needed it. The window needs it now too, and it needs it FIRST, so it
  // moved up rather than being computed twice. Everything below reads the same
  // constant it always did.
  const travellerTurns = aiMessages.slice(1).filter(m => m.role === "user").map(m => m.text || "");
  const saidByTraveller = travellerTurns.join("\n");
  // The trip's own length reaches the matcher, because how many towns to offer
  // for a named region is a question about the trip, not about the region.
  // Computed here rather than inside, so the events and the towns read the same
  // window and cannot disagree about how long somebody is here.
  //
  // ── AND convoTurns, WHICH IS WHY HIS FATHER'S TRIP HAD NO DATES ──
  // He answered "i dag" and "7 dage". The BRIEF learned to read that on 22
  // August; this window did not, so it came back `dated: false` and the event
  // filter had nothing to rule a February festival out with. An ARRAY of the
  // traveller's turns, never convoText: that string carries Gemlyx's replies
  // with a role prefix on every line, and reading a date out of the app's own
  // words is the exact mistake the comment below this one is about.
  const win = tripWindow({ arrival: intakeArrival, departure: intakeDeparture, convoText, convoTurns: travellerTurns });
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
  // saidByTraveller and travellerTurns are declared together above the window.
  const wanted = wantedCategories(saidByTraveller, intakeInterest);
  // ── AND WHICH ATTRACTIONS, WHICH IS A SECOND QUESTION ─────────────
  // Oliver, 15 Aug 2026, on a brief that said markets and modern design and
  // came back holding a palace, a city museum and a classical sculpture
  // gallery: "Don't put up a bunch of random attractions just to have
  // something."
  //
  // `wanted` answers whether they asked for attractions AT ALL. It cannot
  // answer which ones, because it is a gate on the content type: "design" put
  // `free` in the set and then every `free` row in the town qualified. `themes`
  // is the row level question, read off the same closed vocabulary the sweep
  // already stamps on every entry. Read from the traveller's own turns for the
  // same reason `wanted` is, and never from Gemlyx's replies: the app
  // suggesting a museum must not become evidence that they asked for one.
  const themes = briefThemes(saidByTraveller, intakeInterest);
  // ── AND HOW THEY ARE GETTING AROUND ───────────────────────────────
  // Oliver, 17 Aug 2026, after a two day bicycle trip out of a ferry into
  // Aalborg came back offering Billund and Copenhagen: "It gives me a random
  // route." Copenhagen is about 400 km from Aalborg. Nothing on this screen had
  // any idea he was on a bicycle, so nothing could object.
  //
  // Read from the traveller's OWN turns and the intake chips, exactly like
  // `wanted` and `themes` above and for the identical reason: Gemlyx mentioning
  // a train must never become evidence that they are taking one. Null when they
  // have not said, and null leaves this screen exactly as it was.
  // Through readBrief, not travelModeKey over the whole transcript. An adversarial
  // review on 18 Aug found the difference: travelModeKey tests the modes in speed
  // order across ALL the text, so "we are renting a car and we love hiking" came
  // back "walk" and capped the offered towns at fifteen kilometres a day for a
  // driving trip — while the brief slot, which reads the mode off the SENTENCE that
  // stated it, correctly said car. Two parts of one screen disagreeing about the
  // same trip, which is the failure this file's own comments keep naming.
  const mode = readBrief({
    travellerText: saidByTraveller,
    intake: { transport: intakeTransport },
  }).known.transport?.mode || null;
  // ── AND WHAT THEY SAID ABOUT MONEY ────────────────────────────────
  // Oliver, 17 Aug 2026: "geranium is NOT mid-range.. so remember to make food
  // places include in budget." Read from their own turns and the budget box, same
  // rule as everything else on this screen. Null when they have not said, and null
  // rules nothing out.
  const budget = travellerBudget([intakeBudgetText, saidByTraveller].filter(Boolean).join("\n"));
  // `saidByTraveller` goes in beside the rest, and it is what stops the region
  // pass opening on a region GEMLYX named. See matchedPlaces: his Aalborg brief
  // named no region at all, and Ribe arrived through the word "Jutland" in the
  // app's own reply.
  const matched = matchedPlaces(convoText, previewPools({ towns, freeEntrance, foodSpots, nightlifeSpots, craftItemsFallback, events, majorEvents }), { days: win?.days ?? null, wanted, themes, mode, budget, saidByTraveller });
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
      // ── THE OFFERED ROWS ARE RANKED NOW, AND CUT TO THREE ─────
      // Oliver, 15 Aug 2026, on the door opening onto six tickable cards:
      // "having a list of things you can click is overwhelming. AI is there to
      // help for a reason. You can have 'recommendations' to add. But not a
      // massive overwhelming list." And then the shape he wanted: "3 shown that
      // 'most likely' fits the person."
      //
      // `offered` stays whole because the count in the door's own sentence has
      // to be honest about how many Gemlyx is holding. `picks` is the three
      // that render. Nothing is hidden that the line above it does not admit
      // to.
      const offered = mine.filter(p => p._notAsked);
      // ── THE CAP HAS TO ADMIT TO ITSELF ────────────────────────────
      // Oliver, 19 Aug 2026: "for some reason there are far more things in the
      // actual guide, than in the review."
      //
      // Here is the reason. MAX_PER_SECTION is 6 and `items` was sliced to it
      // with nothing saying so — so a section holding eleven matching rows showed
      // six, silently, and then the guide was written from the whole conversation
      // and contained all eleven. The review is the screen he APPROVES from, and
      // it was under-reporting the thing he was approving.
      //
      // The section below already says how many non-matching rows are being held
      // back. It never said how many MATCHING ones were cut, which is the worse
      // of the two omissions: those are rows the traveller asked for.
      // A detour is not one of the items. It is a separate answer to a
      // separate question, rendered under its own heading below. See the
      // consider block in utils/previewMatch.js for why it exists at all.
      const matching = mine.filter(p => !p._notAsked && !p._consider);
      const consider = mine.filter(p => p._consider);
      return {
        ...cat,
        items: matching.slice(0, MAX_PER_SECTION),
        consider,
        // The real number, so the line under the section can be honest about the
        // difference rather than the reader discovering it in the finished guide.
        itemsTotal: matching.length,
        offered,
        picks: rankOffers(offered, { want: themes, profile: userProfile, limit: OFFER_LIMIT })
          .map(entry => ({ ...entry, reason: offerReason(entry) })),
      };
    })
    .filter(cat => cat.items.length > 0 || cat.offered.length > 0 || cat.consider.length > 0);
  const toggleExtra = (name) =>
    setPickedExtras(prev => (prev || []).includes(name) ? (prev || []).filter(n => n !== name) : [...(prev || []), name]);
  // ── THE EVENTS, DATE TESTED AND TICKABLE ──────────────────────────
  // `named` is the first pass's own answer rather than a second guess at it:
  // an event is named exactly when the traveller wrote it, which is the same
  // question mentions() already answered above.
  // ── AND HOW FAR EACH EVENT IS FROM WHERE THIS TRIP IS ─────────────
  // Oliver, 21 Aug 2026, on a Copenhagen convention badged RECOMMENDED for a
  // seven day trip to Aalborg: "And Comic Con? Really?"
  //
  // The anchor comes from previewMatch rather than being read again here, so
  // the towns section and the events section cannot end up measuring from two
  // different places. Null when the traveller has said neither where they land
  // nor where they are going, and null leaves this exactly as it was.
  const anchor = tripAnchorFor(convoText, saidByTraveller);
  // Measured from everywhere this trip actually is: where they land or are
  // going, plus every town they named themselves. See tripPoints.
  const where = tripPoints(anchor, matched);
  const eventPlan = tripEvents(matched.filter(p => p._src === "event"), {
    window: win,
    interests: intakeInterest,
    named: e => mentions(e.name),
    reachOf: where.length ? (e) => eventReachBand(e, where, mode) : null,
  });
  // ── NOTHING IS TICKED FOR THEM ────────────────────────────────────
  //
  // Oliver, 21 Aug 2026: "why did it add the event automatically? Have it in the
  // preview, but people should be able to click it themselves." And again, so
  // there is no reading of it as a preference: "It shouldn't be auto-clicked."
  //
  // This used to seed the ticks from `eventPlan.picks`, on the reasoning that
  // somebody who taps straight through should still get the event running that
  // week. What that actually did is put a fixed point into his itinerary that he
  // never agreed to: a ticked event is passed to the planner as EVENTS THE
  // TRAVELER HAS ALREADY CHOSEN, "fixed points and not suggestions", and every
  // other stop that day is then arranged around it. Culture Night on 9 October
  // shaped his trip because a checkbox arrived pre-ticked.
  //
  // Gemlyx still says what it thinks: `row.recommended` is computed from
  // eventPlan.picks and renders as the RECOMMENDED badge, untouched by this. The
  // difference is that a recommendation is now something he acts on rather than
  // something he has to notice and undo.
  const picked = pickedEvents === null ? [] : pickedEvents;
  const atLimit = picked.length >= eventPlan.limit;
  const toggleEvent = (name) => {
    setPickedEvents(prev => {
      const list = prev === null ? [] : prev;
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
  // ── "LET THE STUDIO TELL ME THAT THIS AREA LACKS CONTENT" ────
  // Oliver, 15 Aug 2026, on a test run that returned nothing at all. Computed
  // only on the test path, because it is a finding for the founder and not a
  // message for a traveller. Null whenever the preview found something.
  const coverage = testProfile ? previewCoverage({ matched, library, convoText, themes, days: win?.days ?? null, wanted }) : null;

  // ── AND CLOSING HAS TO BE IDEMPOTENT ──────────────────────────────
  // One click on ✕ runs this TWICE: the button is a DOM child of the backdrop
  // and both carry onClick={closePreview}, and the button did not stop the
  // event bubbling. Both calls read the same stale pendingRandomGuideMode from
  // their closure, so both passed the guard, and `slice(0, -1)` ran twice —
  // taking the fabricated brief AND the opening greeting. The thread was then
  // empty, and the next click on the pipeline test button wrote
  // `[undefined, brief]` into it and crashed the page.
  //
  // Two changes, and both are needed. The ✕ stops propagating (below), so this
  // runs once. And the removal is by IDENTITY rather than by position, so
  // running it twice is harmless and a real message that arrived in between is
  // never the thing eaten. See utils/chatThread.js.
  const closePreview = () => {
    if (pendingRandomGuideMode) {
      setPendingRandomGuideMode(null);
      setAiMessages(withoutTestBrief);
    }
    setGuideModal(null);
  };
  return (
    <div data-preview-screen style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(5,8,16,0.92)", overflowY: "auto", padding: "60px 16px 40px" }} onClick={closePreview}>
      <button onClick={e => { e.stopPropagation(); closePreview(); }} aria-label="Close"
        style={{ position: "fixed", top: 20, right: 20, background: "rgba(255,255,255,0.06)", border: "none", color: C.light, width: 40, height: 40, borderRadius: "50%", fontSize: 16, cursor: "pointer", zIndex: 951 }}>✕</button>
      <div style={{ maxWidth: 560, margin: "0 auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.text, marginBottom: 8, textAlign: "center" }}>Here's what's coming up</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, textAlign: "center" }}>
          {totalShown > 0
            ? (matched.some(p => p._viaRegion)
                ? "Places you named, and what Gemlyx holds in the part of Denmark you asked about. The route itself comes next."
                : matched.some(p => p._viaReach)
                ? "You said you wanted out of the city, so these are the places within reach of where you are. The route itself comes next."
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
            {/* ── THE REPORT ─────────────────────────────────────
                Oliver, 15 Aug 2026: "If you want, you can make 'preview' able
                to have a link as a report for you. If reports make things
                better for you.."

                Every fault found on this screen so far arrived as a
                screenshot, and a screenshot shows the output while the
                question is always about the reason: which pass put that row
                there, whether the category gate opened, what the row is
                tagged, where its line was cut. That has been reconstructed by
                reading the matcher, which is a guess, and the misses ship a
                fix for a bug that was not there.

                A file rather than a link, because a link needs an endpoint and
                an endpoint needs a deploy. See utils/previewReport.js for what
                is on it and for the two fields deliberately kept off it.

                ONLY ON THE PIPELINE TEST PATH. testProfile is null for every
                real traveller, so nobody's own brief can be written to disk by
                a button they did not know was there. */}
            {/* ── THE GAP, NAMED ─────────────────────────────
                A test run that returns nothing has told him something, and
                until now it told him by looking broken. The two causes need
                opposite responses and look identical on screen, so the finding
                says which one this is: go and research, or go and fix the
                matcher. See utils/previewCoverage.js. */}
            {coverage && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "#E5737314", border: "1px solid #E5737355", color: C.light, fontSize: 11.5, lineHeight: 1.6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#E57373", letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 4 }}>
                  {COVERAGE_TITLE[coverage.verdict] || "Nothing to match on"}
                </div>
                {describeCoverage(coverage)}
                {/* ── FROM THE FINDING STRAIGHT TO THE SEARCH ────
                    A finding that names a gap and then leaves him to work out
                    what to type is half a tool. This carries the region AND
                    the content type the brief asked for, so a brief about
                    castles and festivals goes looking for those rather than
                    for whatever the dropdown was last set to. */}
                {/* No search button on an uncounted library: there is nothing
                    to send him looking for yet, and a button offering to
                    research a region he may already cover is the wrong action
                    attached to the right worry. */}
                {onSearchArea && coverage.verdict !== COVERAGE_UNCOUNTED && (
                  <button onClick={() => onSearchArea(coverage)}
                    style={{ marginTop: 9, background: "none", border: "1px solid #E5737388", color: "#E57373", borderRadius: 100, padding: "6px 13px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    🔭 Search for content {coverage.target ? `in ${coverage.target.label}` : "where it is thinnest"}
                  </button>
                )}
              </div>
            )}
            <button onClick={() => {
                const at = new Date().toISOString();
                const report = buildPreviewReport({
                  at, convoText, saidByTraveller, testProfile,
                  intake: { arrival: intakeArrival, departure: intakeDeparture, interest: intakeInterest },
                  wanted, themes, window: win, sections, eventPlan, picked,
                  pickedExtras: pickedExtras || [],
                  matched,
                  namedNames: matched.filter(p => mentions(p.name)).map(p => p.name),
                  profile: userProfile,
                  coverage,
                });
                downloadReport(report, reportFilename(at));
              }}
              style={{ marginTop: 8, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "5px 12px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              ⬇ Download run report
            </button>
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1.2, textTransform: "uppercase" }}>{cat.label}</span>
              {/* Only when it actually cut something. A count on every section
                  would be noise; a count on the sections that hid a row is the
                  difference between a review and a sample. */}
              {cat.itemsTotal > cat.items.length && (
                <span style={{ fontSize: 10.5, color: C.muted }}>
                  {/* No em dash: tests/run.mjs bans them in reader-facing strings,
                      and it caught this one on the first run. */}
                  showing {cat.items.length} of {cat.itemsTotal}, and the guide can use all of them
                </span>
              )}
            </div>
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
                    {/* ── WHERE THIS ONE IS ────────────────────────────
                        Oliver, 21 Aug 2026, with a red line drawn over four
                        attraction names on his own screenshot: "every attraction
                        should have the area it is located in above it".

                        He is right, and the card had no way to answer it. Four
                        rows read Rundetaarn, Amalienborg Slot, Kobenhavns Museum
                        and Ny Carlsberg Glyptotek, one under the other, and
                        nothing on any of them said Copenhagen. The town is
                        already on the row, under five different field names
                        depending on the content type, which is why nothing had
                        ever printed it: parentTownOf is the function that knows
                        all five (see utils/previewMatch.js).

                        Towns are excluded because a town card naming its own
                        town is a card that says Aalborg twice. */}
                    {place._src !== "town" && parentTownOf(place) && (
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>
                        {parentTownOf(place)}
                      </div>
                    )}
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
                      {/* A town nobody named, on a screen for somebody who said
                          they wanted out of the one they are in. It has to say
                          so: "in Jutland, which you asked about" and "within
                          reach of where you are" are different claims, and only
                          one of them was ever asked for. See the second door on
                          the region pass in previewMatch.js. */}
                      {place._viaReach && !place._viaRegion && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 0.8, textTransform: "uppercase", border: `1px solid ${C.gold}55`, borderRadius: 100, padding: "2px 7px" }}>Within reach</span>
                      )}
                      {/* WHAT IS UNDER IT. "All it does now is show towns" was
                          six bare town cards, and a card that says what Gemlyx
                          holds inside it is the difference between a name and
                          an answer. Absent when there is nothing, because a
                          badge reading "0 places" is worse than no badge. */}
                      {/* ── THE LEG, SO THE ORDER IS LEGIBLE ────────
                          Oliver, 15 Aug 2026: "the important thing is that the
                          route doesn't become silly. That they follow a pattern
                          that makes sense." A reordering nobody can see is a
                          change nobody can check, so each town says how far it
                          is from the one before it, starting at the airport
                          they land at. See utils/routeOrder.js. */}
                      {place._legKm != null && place._legFrom && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>{place._legKm} km from {place._legFrom}</span>
                      )}
                      {place._holds > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>{place._holds} {place._holds === 1 ? "place" : "places"} inside</span>
                      )}
                    </div>
                  {/* ── NOT desc.slice(0, 100) ──────────────────────
                      Oliver, 15 Aug 2026, on four town cards that each opened
                      with a founding date: "where is the description of
                      history? I don't see the person wrote that?"
                      The town prompt asks for that anchor first and the
                      hundred character cut never reached the half of the
                      paragraph that says who the town suits. cardLine asks the
                      entry for that sentence instead. utils/cardLine.js has
                      the whole story and falls back to this exact clip. */}
                  <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginTop: 3 }}>{cardLine(place)}</div>
                  </div>
                  <button onClick={() => openStopDetail(place)}
                    style={{ flexShrink: 0, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    Read more
                  </button>
                </div>
              ))}
            </div>
            {/* ── "IF THEY REALLY LOVE VIKINGS, THEN PUT IT INTO A
                    CONSIDER SECTION" ──────────────────────────────────
                Oliver, 21 Aug 2026, deciding what should happen to a town that
                answers exactly what somebody said they love and is too far to
                honestly plan around. Not deleted, not mixed into the list, and
                not quietly ranked last, which is what put Ribe on a screen for
                a trip to Aalborg with nothing saying what it would cost.

                The distance is the whole point of the block, so it is in the
                sentence rather than in a badge underneath. */}
            {cat.consider.length > 0 && (
              <div style={{ marginTop: 12, borderTop: `1px dashed ${C.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  Worth considering, but a long way
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cat.consider.map(place => (
                    <div key={`consider-${place._src}-${place.id}`} style={{ display: "flex", gap: 10, alignItems: "center", background: "none", border: `1px dashed ${C.border}`, borderRadius: 12, padding: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>{place.name}</div>
                        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>
                          About {place._considerKm} km from {place._considerFrom}, so it is most of a day each way.
                          {(place._considerWhy || []).length > 0 && ` Here because you said ${(place._considerWhy || []).join(" and ")}.`}
                        </div>
                      </div>
                      <button onClick={() => openStopDetail(place)}
                        style={{ flexShrink: 0, background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 100, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                        Read more
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  {cat.items.length > 0
                    ? `Gemlyx holds ${cat.offered.length} more here that ${cat.offered.length === 1 ? "does" : "do"} not match what you asked for.`
                    : `You did not ask for these, so Gemlyx left them out. It holds ${cat.offered.length} ${cat.offered.length === 1 ? "place" : "places"} here if you want ${cat.offered.length === 1 ? "it" : "some"}.`}
                </div>
                <button onClick={() => setOpenedExtras(prev => [...prev, cat.label])}
                  style={{ flexShrink: 0, background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "8px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  {ADD_LABEL[cat.src] || `Add ${cat.label.toLowerCase()}`}
                </button>
                {askGemlyx && (
                  <button onClick={() => askGemlyx(askSeed(cat))}
                    style={{ flexShrink: 0, background: "none", border: "none", padding: "8px 2px", color: C.muted, fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontFamily: "'Inter', sans-serif" }}>
                    or ask Gemlyx
                  </button>
                )}
              </div>
            )}
            {cat.offered.length > 0 && openedExtras.includes(cat.label) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* ── THREE, CHOSEN, WITH THE REASON ON EACH ────────
                    This block used to render cat.offered, which was every row
                    the second pass had collected in the town, in database
                    order, capped at six for no reason beyond where the cap
                    sat. Oliver, 15 Aug 2026: "having a list of things you can
                    click is overwhelming. AI is there to help for a reason.
                    You can have 'recommendations' to add. But not a massive
                    overwhelming list."

                    So it renders cat.picks: three, ranked on what they said
                    they were into, then on their own profile if they have an
                    account, then on Gemlyx's editorial tier. The count it is
                    holding back is stated rather than quietly dropped, because
                    a silent cap reads as "this is everything" when it is not.
                    See rankOffers in utils/interestFit.js. */}
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  {cat.picks.length === 1
                    ? "The one Gemlyx thinks fits this trip best."
                    : `The ${cat.picks.length} Gemlyx thinks fit this trip best.`}
                  {cat.offered.length > cat.picks.length
                    ? ` ${cat.offered.length - cat.picks.length} more are not shown. Ask Gemlyx if none of these are right.`
                    : ""}
                </div>
                {cat.picks.map(({ place, reason }) => {
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
                        {/* WHY THIS ONE AND NOT THE OTHER SIX. The reason is
                            always about the PLACE. profile.js promises the
                            stored fields are never repeated back at somebody
                            as a discovery, so a profile that changed the order
                            never puts a word about the person on screen. */}
                        {reason && (
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: 0.3, marginTop: 3 }}>{reason}</div>
                        )}
                        <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginTop: 3 }}>{cardLine(place)}</div>
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
                {askGemlyx && (
                  <button onClick={() => askGemlyx(askSeed(cat))}
                    style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "2px 0 0", color: C.gold, fontSize: 11.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontFamily: "'Inter', sans-serif" }}>
                    Ask Gemlyx for something else
                  </button>
                )}
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
                // The third argument is what stops "room for 2" being said when
                // only one event is running. See describePicks.
                ? describePicks(eventPlan.limit, picked.length, eventPlan.rows.filter(r => r.tickable).length)
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
          {/* THE ONE RULE HE HAS RAISED MORE THAN ANY OTHER, BROKEN ON THE
              BIGGEST BUTTON ON THE SCREEN. Every path from a model to a reader
              in this codebase runs stripDashes; this string was typed by hand
              into JSX, so it never went near one. Nothing catches a hand
              written dash in a component, which is why the suite now does. */}
          Looks good, continue →
        </button>
        {/* ── REPORT THE PICKS, 4 SEP 2026 ────────────────────────────
            Oliver, on a preview built after he had said he was travelling with
            seven kids: "yet it puts me on a bar/club for 21+ .. Make a studio
            report button on the preview. So you can start fixing that."

            ONE CONTROL FOR THE SCREEN rather than one per card, because the
            defect he described is the SET given the brief. A per-card flag on
            Heidi's Bier Bar would have lost the other half of the report, which
            is that the brief said seven kids and nothing on this screen knew it.

            Under the continue button and quiet: this is a founder tool sitting
            on a traveller's screen, so it must not compete with the decision
            the screen exists to ask for. */}
        <StudioPickReport aiMessages={aiMessages} C={C} />
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
