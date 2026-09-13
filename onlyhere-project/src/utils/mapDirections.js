// ── THE REPLY DRIVES THE CAMERA ─────────────────────────────────────
//
// Oliver, 12 Sep 2026, in a document titled "how I want the map to function":
//
//   User: "Bla bla bla… and I'm heading to Copenhagen." [Copenhagen appears on map]
//   Gemlyx: "Arh, [zoom in] Copenhagen has alot to offer such as bla bla bla.."
//   User: "…I also want to go to another City.. but can't decide"
//   Gemlyx: "Interesting! [zoom out], well for your specific taste, I can
//            recommend Aarhus [zoom in] because bla bla bla"
//
// Note where he put the brackets. They are INSIDE the sentences, not at the
// end of the reply, and that is the whole feature: the map moves WHILE Gemlyx
// is talking, on the word where the subject changes. A reply that named its
// places and left the map to work it out afterwards is what the app already
// did, and what he is asking to replace.
//
// ── WHY A MARKER AND NOT A SECOND API FIELD ─────────────────────────
//
// Because the position in the sentence is the payload. A separate field would
// carry which places, and would have to invent some way of saying "after the
// ninth word", which is a worse version of writing it where it goes.
//
// The precedent is already in the app and already survives translation:
// READY_MARKER, "[[GEMLYX_READY_TO_BUILD]]" in utils/helpers.js, with a rule in
// the system prompt reading "WRITE THE MARKER EXACTLY AS PRINTED, NEVER
// TRANSLATED. It is a machine string, not a sentence." That rule is repeated in
// Danish in readerLanguage.js, because a model answering in Danish will
// otherwise translate anything that looks like a word. These markers get the
// same treatment for the same reason.
//
// ── AND THE READER MUST NEVER SEE ONE ───────────────────────────────
//
// A marker that reaches the bubble is worse than no feature. So the parse
// returns the CLEAN text as its first value, and the caller renders that. There
// is no path in this file that returns the original string.

// IN takes a place, OUT takes nothing. Two markers rather than one with a
// magic value, because "[[MAP:WIDE]]" makes a place called Wide unnameable and
// the ambiguity would sit there forever waiting for somebody to hit it.
//
// The place is capped at 60 characters and may not contain a newline or a
// closing bracket, so a model that forgets to close one cannot swallow the rest
// of the reply into a place name.
//
// {0,60} AND NOT {1,60}, which the suite caught. At {1,60} an empty
// "[[MAP_IN:]]" did not match the pattern at all, so it was never recognised
// and never removed, and its brackets went straight into the bubble. A marker
// reaching the reader is worse than no feature, and the half-written one is
// exactly the case a model produces when it knows the syntax and has nothing to
// put in it. Matching it here means it is stripped; the filter further down
// then drops it as a direction, which is what that filter is for.
const MARKER = /\[\[MAP_IN:([^\]\n]{0,60})\]\]|\[\[MAP_OUT\]\]/g;

// A reply is a chat bubble, not a title sequence. Six is already more camera
// moves than any sentence he wrote in his example, and a model that emits forty
// of them must not be able to shake the map for ten seconds.
export const MAP_BEAT_CAP = 6;

// The same definition TypewriterText uses, and that is load-bearing rather than
// incidental: it reveals `text.split(/(\s+)/)` counting the tokens that contain
// a non-space, and a beat fires when the reveal reaches its word. Two different
// ideas of what a word is would fire every beat at the wrong moment, and the
// error would grow with the length of the reply.
const wordsIn = (s) => String(s || "").split(/(\s+)/).filter(t => /\S/.test(t)).length;

// ── WHAT COMES BACK ─────────────────────────────────────────────────
//
// { clean, beats: [{ kind: "in" | "out", place, atWord }] }
//
// `atWord` is a count of the words in `clean` that come BEFORE the marker, so
// the caller fires the beat when the reveal has shown at least that many. Zero
// means the marker opened the reply and the move happens as it starts.
//
// Offsets are measured against the clean string as it is built and converted to
// word counts at the end, rather than counted piece by piece as the walk goes.
// A word split across a marker ("Copen[[MAP_OUT]]hagen") is one word in the
// clean text and would be counted as two by the cheaper method, and the drift
// from one such accident would push every later beat out of step.
export const readMapBeats = (text) => {
  const raw = String(text == null ? "" : text);
  if (!raw) return { clean: "", beats: [] };
  MARKER.lastIndex = 0;
  let clean = "";
  let last = 0;
  const found = [];
  let m = MARKER.exec(raw);
  while (m) {
    let segment = raw.slice(last, m.index);
    // A marker sits between two spaces in ordinary writing, and removing it
    // would leave a double space that a pre-wrap bubble renders as one. It is
    // dropped here instead, so the clean text reads exactly as it would have
    // been written without the marker at all.
    if (/[^\S\n]$/.test(clean) && /^[^\S\n]/.test(segment)) segment = segment.slice(1);
    clean += segment;
    found.push({ kind: m[1] === undefined ? "out" : "in", place: String(m[1] || "").trim(), at: clean.length });
    last = m.index + m[0].length;
    m = MARKER.exec(raw);
  }
  if (!found.length) return { clean: raw, beats: [] };
  let tail = raw.slice(last);
  if (/[^\S\n]$/.test(clean) && /^[^\S\n]/.test(tail)) tail = tail.slice(1);
  clean += tail;
  const beats = found
    // An IN with nothing to fly to is a marker the model half wrote. Dropping it
    // is the only safe reading: the alternative is a camera move to a place
    // nobody named, and this file would rather do nothing than guess.
    .filter(b => b.kind === "out" || b.place)
    .slice(0, MAP_BEAT_CAP)
    .map(b => ({ kind: b.kind, place: b.place, atWord: wordsIn(clean.slice(0, b.at)) }));
  return { clean, beats };
};

// ── WHICH BEATS HAVE BECOME DUE ─────────────────────────────────────
//
// Given the reveal position and how many have already been played, the ones now
// owed. Returns the LAST of them rather than all, because they are camera moves
// and playing three in one tick would be a flicker rather than three moves. The
// count still advances past all of them, so none is replayed later.
//
// A pure function so the component holds a number and nothing else, and so the
// timing rule is testable without a DOM, a map or a clock.
export const beatsDue = (beats, shownWords, playedCount) => {
  const list = Array.isArray(beats) ? beats : [];
  const from = Math.max(0, Number(playedCount) || 0);
  const upTo = Number(shownWords);
  if (!Number.isFinite(upTo)) return { beat: null, played: from };
  let played = from;
  let beat = null;
  while (played < list.length && list[played].atWord <= upTo) {
    beat = list[played];
    played += 1;
  }
  return { beat, played };
};

// ── AND WHERE A BEAT POINTS ─────────────────────────────────────────
//
// A place name out of a reply is not a coordinate. The caller has the pins,
// which already carry one, and matching against those rather than geocoding is
// the rule chatRail.js states for the pins themselves: the map shows places the
// conversation has established, and a beat naming something the conversation
// never pinned is a beat with nowhere to go.
//
// NO MATCH MEANS NO MOVE, deliberately. The alternative is flying to a guess,
// and a map that confidently centres on the wrong town is worse than one that
// stayed where it was. Same one-sided discipline ticketUrlSaysElsewhere states:
// this can only ever decline.
// ── AND IT READS THE PIN'S OWN KEY, NOT A NAME IT HOPED FOR ────────
//
// The first version of this read `pin.name`, and a pin has no such field. A pin
// is what mapPlaces builds, `{ key, place, lat, lon, latest }`, with the name
// inside `place` and `key` already holding it lowercased and trimmed, because
// that is what mapPlaces keys its own map on.
//
// So every IN beat resolved to null and the zoom-in half of this feature did
// nothing at all, while the OUT half worked, because OUT touches no pins. It
// shipped that way.
//
// THE TESTS PASSED, and that is the part worth writing down. They built their
// own pins as `{ name, lat, lon }`, so the assertion and the code agreed with
// each other and both disagreed with the app. A mutation run cannot catch that
// either: mutate the code and the matching test still fails, exactly as it
// should, on a shape neither of them shares with reality. The test below is
// built by CALLING mapPlaces rather than by writing a pin out by hand, which is
// the only version of this that can go stale and say so.
export const beatTarget = (beat, pins) => {
  if (!beat) return null;
  if (beat.kind === "out") return { kind: "out" };
  const list = Array.isArray(pins) ? pins : [];
  const want = String(beat.place || "").trim().toLowerCase();
  if (!want) return null;
  const nameOf = (p) => String(p?.key || p?.place?.name || "").trim().toLowerCase();
  const hit = list.find(p => nameOf(p) === want)
    || list.find(p => {
      const n = nameOf(p);
      return n && (n.includes(want) || want.includes(n));
    });
  if (!hit || !Number.isFinite(Number(hit.lat)) || !Number.isFinite(Number(hit.lon))) return null;
  return { kind: "in", name: String(hit.place?.name || hit.key || ""), lat: Number(hit.lat), lon: Number(hit.lon) };
};

// ── AND IT IS A SLIDESHOW, NOT A SUMMARY ────────────────────────────
//
// Oliver, 12 Sep 2026: "I want you to prompt the AI as if the map is a diashow
// directed by the AI."
//
// The rule below already had the mechanics and the wrong STANCE. It read
// "most replies need none, some need one", which describes a map that catches
// up with the conversation. What he is asking for is a map that is being
// presented: the picture changes because Gemlyx changed it, on the word it
// meant to, and the reply ends on the thing it wants them looking at.
//
// Nothing about the markers, the ceiling or the translation rule changes. What
// changes is what the model thinks the map is for.
//
// ── AND A SLIDESHOW IS NOT A TOUR OF EVERY NAME SAID ─────────
//
// Same evening, on a transcript where the reply zoomed to Aalborg the moment he
// typed the word: "it shouldn't zoom into Aalborg instantly here. Zoom in if
// Gemlyx wants to explain/show something (which it still doesn't do..)."
//
// Both halves are right and the second explains the first. Flying down to a
// town on its first mention shows one pin on an empty city view, which is less
// than the country map it replaced. A zoom has to be earned by having something
// to show at that zoom, and today there usually is not: the chat map draws towns
// and free-entry attractions, and everything else Gemlyx names, a paid museum,
// an event, a restaurant, has no pin to arrive at. So the rule tells it to stay
// wide until it is walking somebody through the inside of a place.
//
// ── MEASURED BEFORE THE RULE WAS REWRITTEN AGAIN, 13 Sep 2026 ────────
//
// Six exported chats from 12 Sep, five distinct conversations, 54 replies. Ten
// carried a marker: 7 [[MAP_IN]] and 4 [[MAP_OUT]]. Every one of the seven INs
// named a town that was already in the conversation, four of them Aalborg in one
// chat with no OUT between them, so the camera dived to Aalborg on the fourth
// turn and sat there for the remaining twelve, including the reply summing up
// a route from Skagen to Germany. Not one reply zoomed to show anything inside
// a town. That is the OLD rule's output, and the slideshow brief that replaced
// it had four faults of its own, found by reading it as the model would:
//
//   "the place your reply is really about"    "really" is on the prompt's own
//                                             banned list, six paragraphs up.
//   "Arh, [[MAP_IN:Copenhagen]] Copenhagen    the example zooms on a first
//    has a lot going on."                     mention with one line about the
//                                             town, which is the exact move the
//                                             paragraph above it forbids.
//   "at most one move per paragraph"          and the example two sentences
//                                             earlier has an OUT and an IN in
//                                             one paragraph. Two rules for one
//                                             question, and the model picks one.
//   "a place Gemlyx publishes and holds a     the model has no coordinates. It
//    checked coordinate for"                  has the TOWNS and FREE ENTRANCE
//                                             lists, so the rule names those.
//
// The rule also never said what a close view SHOWS, which is the information
// the zoom decision needs: close up, the map draws the free-entry attractions
// the conversation has named inside that town. A model told that can earn a
// zoom by naming them; a model told "show them something" cannot.
//
// ── THE RULE, WRITTEN ONCE, FOR THE PROMPT THAT HAS TO TEACH IT ─────
//
// Said in one place because the system prompt and this parser have to agree
// about what the markers are, and a prompt that describes a syntax the parser
// does not read is the failure this codebase calls a field that goes nowhere.
// App.jsx interpolates this rather than restating it.
export const MAP_DIRECTION_RULE = `DIRECTING THE MAP. A map sits beside this conversation and YOU ARE RUNNING IT, the way somebody talking over a slideshow runs the slides. It is not a summary that catches up afterwards and it is not the app's job to work out: the picture shows what you are talking about because you put it there, on the word you started talking about it.

You move it by writing a marker INSIDE your reply, at the exact word the picture should change:

  [[MAP_IN:Copenhagen]]   fly down to that place and hold there
  [[MAP_OUT]]             pull back to the whole of Denmark

WHAT THE MAP HOLDS, SO YOU KNOW WHAT A MOVE WILL SHOW. Pulled back, it is a map of Denmark with a pin on the towns this conversation has named, yours and theirs, so wide is the trip taking shape. Flown down to a town, it shows that town and, inside it, a pin for every place from the FREE ENTRANCE ATTRACTIONS list below that has come up in this conversation, and nothing else: a paid museum, a restaurant, a bar or an event has no pin, however good it is. It can fly to the towns in the TOWNS and HIDDEN GEM TOWNS lists below and to those free attractions, and nowhere else. A marker naming anything else does nothing at all, so a move is for SHOWING a place the map knows, never for introducing one it does not.

A NAME IS NOT A REASON TO ZOOM. The first time a place comes up, leave the map wide: its pin appears on the country, which already says where it is. Flying down to a town the moment somebody says its name shows one pin on an empty street plan, which is less than they had a second earlier. Fly down when you are about to walk them through the INSIDE of that town, naming two or three of its free attractions from the list as you go, because those are what a close view has to show. One line about a town and then your question is not that, and the map stays wide.

THE SHAPE OF A GOOD RUN. Wide is the normal state and not a failure. Close for the town you are walking them through; wide again the moment the subject leaves it, whether you are weighing one town against another, summing up the whole route, or answering something about the trip rather than the town. "Here is how I would spend a day inside Aarhus: [[MAP_IN:Aarhus]] start at ..." lands the camera as you start showing the inside. "Interesting! [[MAP_OUT]] For your taste I would go north instead. [[MAP_IN:Aalborg]] Inside Aalborg, start at ..." pulls back while you think and closes in as you answer. Each marker goes INSIDE its sentence, on the word where the picture should change, and never collected at the end of the reply.

PACE IT LIKE SLIDES, NOT LIKE A TRAILER. Never two markers with nothing between them, and never more than two moves in one paragraph: a picture nobody had time to look at is worse than one that did not move. Most early replies need no move at all, since nothing inside a town has been decided yet. Two moves in a reply is a good reply, three is a lot, and six is a hard ceiling that exists to stop the map shaking rather than as a target. A reply about nowhere in particular leaves the map where it is, and that is a decision rather than a missed cue.

END ON WHAT MATTERS. The last move is the one they sit looking at while they type their answer, so it belongs to whatever the reply settled on: a town you walked them through stays close, and a reply that compared places or summed up the route ends wide. The picture your question is asked over is the last one, so make the move before the question and never after it. And when the map is close on a town that has just left the conversation, because they turned it down or the plan moved on, pull back with [[MAP_OUT]]: a close view of a place nobody is going to is a picture of the wrong trip.

NEVER MENTION THE MAP. You are running the slideshow, not narrating it. No "as you can see on the map", no "the map shows", no "look to the right". They can see it. Say the thing about the place and let the picture carry its half of the sentence.

WRITE THE MARKER EXACTLY AS PRINTED, NEVER TRANSLATED. It is a machine string, not a sentence. When the rest of your reply is in Danish, German or any other language, the markers stay [[MAP_IN:...]] and [[MAP_OUT]] in ASCII with their brackets, and the place name inside stays as the lists below spell it. Do not translate them, do not add spaces inside the brackets, and never mention them or explain them to the traveller: they are removed before anyone reads your reply.`;

// ── ONE MOVE AT A TIME, AND THE REPLY'S MOVE OUTRANKS THE APP'S ─────
//
// Leaflet's flyTo begins by cancelling whatever flight is running, and it fires
// no moveend for the one it cancelled. So two markers eight words apart, which
// is the spacing in Oliver's own example ("Interesting! [zoom out], well for
// your specific taste, I can recommend Aarhus [zoom in]"), played as a quarter
// of a second of pulling back and then the dive: the reveal runs at sixteen to
// forty words a second and the pull-back he asked to be slower takes 1.9. A
// slideshow whose slides are cancelled by the next slide is a single jump with
// a twitch in front of it, and that is what "the map animation" looked like.
//
// So a move that arrives while one is playing WAITS, and the one playing runs
// to its end and holds there for SLIDE_HOLD_MS before the next begins. ONE
// waiting slot rather than a queue: a newer move replaces the one waiting,
// which is the rule beatsDue already applies inside a single tick, and it keeps
// the camera at most one slide behind the words instead of fifteen seconds
// behind a six-marker reply.
//
// "fit" is the app's own move, made when the pins ask for a frame (see frameFor
// below). It yields both ways: a reply's move interrupts a fit that is playing
// and replaces one that is waiting, and a fit arriving while a reply's move is
// playing or waiting is dropped. The reply is what the traveller is reading,
// and it is the thing he asked to have running the slides.
//
// Pure, so the timing rule is testable without a map or a clock: the component
// keeps the state and calls play on whatever comes back.
export const SLIDE_HOLD_MS = 800;
const isBeat = (m) => !!m && m.kind !== "fit";

export const cameraArrive = (state, move) => {
  const s = { playing: state?.playing || null, waiting: state?.waiting || null };
  if (!move) return { state: s, play: null };
  if (!s.playing) return { state: { playing: move, waiting: null }, play: move };
  if (isBeat(move) && !isBeat(s.playing)) return { state: { playing: move, waiting: null }, play: move };
  if (!isBeat(move) && (isBeat(s.playing) || isBeat(s.waiting))) return { state: s, play: null };
  return { state: { playing: s.playing, waiting: move }, play: null };
};

export const cameraLanded = (state) => {
  const next = state?.waiting || null;
  return { state: { playing: next, waiting: null }, play: next };
};

// ── THE PINS ASK FOR A FRAME ONLY WHEN THE PICTURE HAS LOST ONE ─────
//
// Oliver, 12 Sep 2026, on a transcript where the map dived into Aalborg the
// moment he typed the word: "it shouldn't zoom into Aalborg instantly here.
// Zoom in if Gemlyx wants to explain/show something (which it still doesn't
// do..)."
//
// The zoom he saw was not the reply's. ChatMiniMap flew to any lone pin at
// FOCUS_ZOOM the instant the pin existed, so his own message put the camera on
// a street plan of Aalborg before Gemlyx had said a word, and the reply's
// [[MAP_IN:Aalborg]] then moved nothing. And on every pin change after that it
// refitted the whole set, which cancelled whatever the reply had just flown to.
// Two readers of "how close should the map be": the pins had one answer, the
// reply had another, and the pins always got there first.
//
// So the pins no longer choose a closeness. They ask for a frame in exactly two
// cases, and both are the picture having LOST something rather than gained it:
//
//   a place just added is off the picture    the map opens up to include it
//   no pin is left on the picture            the camera is sitting on nothing,
//                                            which is what a refusal leaves
//                                            behind when it takes the pin the
//                                            reply had zoomed to
//
// "country" for one pin or none, because a lone town on the whole of Denmark is
// the frame he asked for the same day ("Have the map default as a map of
// Denmark from start") and the reply's own [[MAP_IN]] is the zoom that follows
// it. "cluster" for two or more, framed together. A view already holding the
// whole country needs nothing, whatever the pins do.
//
// Pure, on numbers. `view` is the box the map shows and `inset` is how far
// inside its edge a pin has to sit to count as shown: a pin under the zoom
// buttons or half off the bottom is not shown.
export const frameFor = ({ pins = [], added = [], view = null, country = null, inset = 0.08 } = {}) => {
  const list = (Array.isArray(pins) ? pins : [])
    .filter(p => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lon)));
  const box = view && [view.south, view.west, view.north, view.east].every(n => Number.isFinite(Number(n))) ? view : null;
  const holds = (b) => !!box && !!b && box.south <= b.south && box.north >= b.north && box.west <= b.west && box.east >= b.east;
  if (holds(country)) return null;
  const shows = (p) => {
    if (!box) return false;
    const dy = (box.north - box.south) * inset, dx = (box.east - box.west) * inset;
    const lat = Number(p.lat), lon = Number(p.lon);
    return lat >= box.south + dy && lat <= box.north - dy && lon >= box.west + dx && lon <= box.east - dx;
  };
  if (!list.length) return "country";
  const fresh = new Set((Array.isArray(added) ? added : []).map(k => String(k || "").trim().toLowerCase()));
  const newOff = list.some(p => fresh.has(String(p.key || "").trim().toLowerCase()) && !shows(p));
  const noneOn = !list.some(shows);
  if (!newOff && !noneOn) return null;
  return list.length === 1 ? "country" : "cluster";
};

// ── THE CAMERA ITSELF, WITH THE MAP HANDED IN ───────────────────────
//
// The two rules above are the decisions; this is the clock and the bookkeeping
// that run them, and it lives here rather than in the component for the reason
// labelSides gives: this is the part with a bug in it if anything has, and it
// has to be answerable with fake timers rather than by opening a browser and
// squinting. The component supplies three things and decides nothing:
//
//   play(move)   makes the move on the map and returns how many seconds it
//                takes, 0 when it was instant (reduced motion)
//   picture()    { pins, view, country } as the map shows them right now
//   setTimer / clearTimer, so the suite can hand in its own clock
//
// A TIMER AND NOT moveend. Leaflet fires moveend for a flight that finishes and
// not for one it cancelled, and it also fires it from invalidateSize when the
// container has grown, which the chat map's does as the conversation beside it
// grows. A landing announced by the wrong event would start the next slide in
// the middle of this one. The durations are ours, so the clock is exact.
//
// `dirty` is a pin change that arrived while a move was playing. It is looked
// at when the camera settles, against the picture as it is THEN, because a view
// read halfway through a flight is a picture nobody will see. `beatSince` is
// whether a reply's move has played since the pins were last looked at: a place
// named after the reply moved the camera may stay off the picture, because the
// reply chose the picture, and only a camera left on nothing is pulled back
// regardless. The claim ends when the camera goes idle, so the traveller naming
// somewhere new a reply later is judged on its own.
export const makeCamera = ({ play, picture, hold = SLIDE_HOLD_MS, setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  const cam = { playing: null, waiting: null, timer: null, dirty: false, beatSince: false, added: [], keys: new Set() };
  const drive = (move) => {
    clearTimer(cam.timer);
    if (isBeat(move)) cam.beatSince = true;
    const seconds = Number(typeof play === "function" ? play(move) : 0) || 0;
    cam.timer = setTimer(drain, seconds > 0 ? seconds * 1000 + hold : 0);
  };
  const arrive = (move) => {
    const { state, play: next } = cameraArrive(cam, move);
    cam.playing = state.playing;
    cam.waiting = state.waiting;
    if (next) drive(next);
  };
  // What the pins want of the picture, asked only while the camera is idle.
  const settle = () => {
    const now = typeof picture === "function" ? picture() : null;
    const added = cam.beatSince ? [] : cam.added;
    cam.added = [];
    cam.beatSince = false;
    cam.dirty = false;
    if (!now) return;
    const frame = frameFor({ pins: now.pins, added, view: now.view, country: now.country });
    if (frame) arrive({ kind: "fit", frame });
  };
  const drain = () => {
    const { state, play: next } = cameraLanded(cam);
    cam.playing = state.playing;
    cam.waiting = state.waiting;
    if (next) { drive(next); return; }
    if (cam.dirty) settle(); else cam.beatSince = false;
  };
  // The pins changed. Which of them are new is worked out here, against what
  // they were last time, so the caller hands in the list and nothing else.
  const pins = (list) => {
    const keys = (Array.isArray(list) ? list : []).map(p => String(p?.key ?? ""));
    cam.added.push(...keys.filter(k => !cam.keys.has(k)));
    cam.keys = new Set(keys);
    if (cam.playing) cam.dirty = true; else settle();
  };
  const stop = () => { clearTimer(cam.timer); cam.timer = null; };
  return { arrive, pins, stop, state: cam };
};
