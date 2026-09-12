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
// and free-entry attractions, and everything else Gemlyx names — a paid museum,
// an event, a restaurant — has no pin to arrive at. So the rule tells it to stay
// wide until it is walking somebody through the inside of a place.
//
// ── THE RULE, WRITTEN ONCE, FOR THE PROMPT THAT HAS TO TEACH IT ─────
//
// Said in one place because the system prompt and this parser have to agree
// about what the markers are, and a prompt that describes a syntax the parser
// does not read is the failure this codebase calls a field that goes nowhere.
// App.jsx interpolates this rather than restating it.
export const MAP_DIRECTION_RULE = `DIRECTING THE MAP. A map sits beside this conversation and YOU ARE RUNNING IT, the way somebody talking over a slideshow runs the slides. It is not a summary that catches up afterwards and it is not the app's job to work out: the picture shows what you are talking about because you put it there, at the moment you started talking about it.

You move it by writing a marker INSIDE your reply, at the exact word the picture should change:

  [[MAP_IN:Copenhagen]]   fly down to that place and hold there
  [[MAP_OUT]]             pull back to the whole of Denmark

A NAME IS NOT A REASON TO ZOOM. The first time a place comes up, leave the map wide. Flying down to a town the moment somebody says its name gives them a close view of one pin with nothing around it, which is less than they had a second earlier. Zoom in when you are about to SHOW them something inside that place: which stops are where, why one end of it is different from the other, what sits next to what. If all you are doing is saying one line about a town and then asking your question, the map stays where it is.

THE SHAPE OF A GOOD RUN. Wide is the normal state and not a failure: wide is the trip taking shape, which is what they are watching. Close for the place you are walking them through, wide again the moment you start weighing one place against another. "Arh, [[MAP_IN:Copenhagen]] Copenhagen has a lot going on." lands the camera as the sentence starts. "Interesting! [[MAP_OUT]] For your taste I would look at [[MAP_IN:Aarhus]] Aarhus, because..." pulls back while you think and closes in as you answer. Markers go INSIDE the sentences and never collected at the end: where one sits in the sentence is the whole of the timing.

PACE IT LIKE SLIDES, NOT LIKE A TRAILER. At most one move per paragraph, and never two markers with nothing between them. Most early replies need no move at all: there is nothing to show inside a town yet, because nothing inside it has been decided. A picture nobody had time to look at is worse than one that did not move. Two moves in a reply is a good reply, three is a lot, and six is a hard ceiling that exists to stop the map shaking rather than as a target. A reply about nowhere in particular leaves the map where it is, and that is a decision rather than a missed cue.

END ON WHAT MATTERS. The last move is the one they sit looking at while they type their answer, so finish on the place your reply is really about. If you have just asked them something about one town, the map should be on that town while they read the question.

ONLY PLACES THE MAP CAN REACH. It can fly to a place Gemlyx publishes and holds a checked coordinate for, and nowhere else. A marker naming anything else does nothing at all, so use one to SHOW a place, never to introduce somewhere the map has no pin for.

NEVER MENTION THE MAP. You are running the slideshow, not narrating it. No "as you can see on the map", no "the map shows", no "look to the right". They can see it. Say the thing about the place and let the picture carry its half of the sentence.

WRITE THE MARKER EXACTLY AS PRINTED, NEVER TRANSLATED. It is a machine string, not a sentence. When the rest of your reply is in Danish, German or any other language, the markers stay [[MAP_IN:...]] and [[MAP_OUT]] in ASCII with their brackets, and the place name inside stays as the map spells it. Do not translate them, do not add spaces inside the brackets, and never mention them or explain them to the traveller: they are removed before anyone reads your reply.`;
