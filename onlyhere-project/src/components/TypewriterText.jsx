import { useState, useEffect, useMemo, useRef } from "react";

// ── Word-by-word fade-in for Gemlyx's chat replies ──────────────────
// Per Oliver, twice now: "Gemlyx chat gotta be slower. I don't like all of it
// popping in" and then, after the first character-chunk version shipped,
// "MAKE SURE THAT AI GEMLYX NEVER THROWS ALL THE WORDS IN. Let it flow slowly
// as if it is someone writing or words fading in. Gemlyx has to act like a
// person." The first version revealed character CHUNKS with the total time
// hard-capped at 3.2 seconds — on any long reply that cap made the chunks so
// big it still read as the text being dumped in, just with a fast wipe over
// it. Exactly the complaint.
//
// This version does what he actually described: WORDS fading in, one after
// another, each with its own short opacity fade, at a pace that reads as
// someone writing.
//
// ── THE EMPTY BOX, AND WHY IT WAS THERE ─────────────────────────────
// Oliver, 10 Aug 2026: "that box getting big before writing is annoying.. and
// perhaps write a little faster."
//
// The box was deliberate and the reasoning was sound: every word was rendered
// up front at opacity 0, so the bubble took its final size immediately and
// nothing below it moved while the words appeared. The cost is what he saw. A
// hidden word still occupies its space, so a long reply painted a tall empty
// bordered box first and then dribbled text into the top of it. On a six line
// answer that is a lot of nothing to look at, and it reads as broken rather
// than as thinking.
//
// A word that has not been written yet is not invisible, it does not exist. So
// unrevealed tokens are no longer rendered at all and the bubble grows line by
// line, the way every chat a person has ever used behaves. That is not the
// layout jumping the old comment worried about: growing downward from a fixed
// top edge is the one direction that does not move anything already read.
//
// ── AND FASTER ──────────────────────────────────────────────────────
// He has asked twice before for this to be SLOW ("MAKE SURE THAT AI GEMLYX
// NEVER THROWS ALL THE WORDS IN"), so this speeds it up rather than removing
// it: ~62ms per word, about 16 words a second, which still reads as written
// rather than pasted. The ceiling drops from 9s to 5s, so a long reply is done
// in five seconds instead of nine, and the tick is finer so the growth is
// smooth rather than stepped.
//
// Shared between the main Detour/planning chat (App.jsx), the preview screen's
// corner chat (App.jsx, PREVIEW CHAT), and the persistent post-build guide
// chat (pages/GuidePage.jsx) — one place to tune the pacing for all three.
const TICK_MS = 40;
const MS_PER_WORD = 62;
// MIN_TOTAL_MS is gone. It set a floor on how long a REVEAL could take, and
// once the reveal was rebuilt per stream chunk that floor applied to each
// chunk's couple of words rather than to the message, which is what capped the
// whole thing at under three words a second. A floor on the message is no
// longer a thing this component needs: the rate below is steady per word, so a
// short message is short because it is short.
const MAX_TOTAL_MS = 5000;

// One stylesheet for every instance, inserted once. A per-word opacity
// transition cannot work now that words mount as they appear: a transition
// needs a previous value and a freshly mounted element has none, so it would
// snap in at full opacity. An animation runs on mount, which is what this is.
const FADE_CSS = "@keyframes gxWordIn { from { opacity: 0 } to { opacity: 1 } }";
let fadeInjected = false;
const injectFade = () => {
  if (fadeInjected || typeof document === "undefined") return;
  fadeInjected = true;
  const el = document.createElement("style");
  el.setAttribute("data-gemlyx", "typewriter");
  el.textContent = FADE_CSS;
  document.head.appendChild(el);
};

// ── AND SOMETHING ELSE WANTS TO KNOW HOW FAR IT HAS GOT ─────────────
//
// Oliver, 12 Sep 2026, on the map beside the chat: the reply moves the camera
// from inside its own sentences, so a camera move belongs to a WORD rather than
// to a reply. See utils/mapDirections.js. This component is the only thing that
// knows which word is on screen, so it reports, and it decides nothing.
//
// `onWord` and not a ref handed in, because the caller needs this at the moment
// it changes and a ref would make it poll. Optional, so every other caller of
// this component behaves exactly as it did.
export const TypewriterText = ({ text, active, onDone, onWord }) => {
  // Split into word + whitespace tokens (whitespace kept as its own tokens so
  // the original spacing/newlines survive exactly — bubbles use pre-wrap).
  const tokens = useMemo(() => (text || "").split(/(\s+)/), [text]);
  const wordCount = useMemo(() => tokens.filter(t => /\S/.test(t)).length, [tokens]);
  const [shownWords, setShownWords] = useState(active ? 0 : wordCount);
  const doneFiredRef = useRef(false);
  const prevTextRef = useRef(text || "");
  const onWordRef = useRef(onWord);
  onWordRef.current = onWord;
  const shownWordsRef = useRef(active ? 0 : wordCount);
  // ── AND THE COUNT THE TICK READS IS THE CURRENT ONE ───────────────
  // Held in a ref so a growing reply extends the target the running reveal is
  // walking towards, rather than restarting it. See the block below.
  const wordCountRef = useRef(wordCount);
  wordCountRef.current = wordCount;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // ── THE REVEAL COULD NEVER OUTRUN THE STREAM ──────────────────────
  //
  // Found 26 Sep 2026, testing a live reply that crawled: six characters in
  // forty seconds on a reply the model had already finished sending.
  //
  // The stutter fix above solved restarting from word zero. It left a second
  // restart in place: EVERY text change tore the interval down and built a new
  // one, and the new one budgeted its time from the words that had just
  // arrived rather than from the whole backlog.
  //
  //   const remaining = wordCount - startAt;                    // 2 new words
  //   const totalMs = max(MIN_TOTAL_MS, remaining * MS_PER_WORD); // 700 ms
  //   const perTick = remaining / (totalMs / TICK_MS);            // 0.11/tick
  //
  // Two words spread over 700 ms is 2.8 words a second. The model sends faster
  // than that, so the next chunk landed mid-reveal, restarted the clock, and
  // budgeted ANOTHER 700 ms for the slightly larger remainder. Modelled over
  // twenty seconds at one word every 40 ms: 500 words sent, 380 shown, 119
  // words behind and the gap still growing. The reveal had a ceiling of about
  // sixteen words a second built into it, and a fast reply could never be
  // caught up with, only finished late.
  //
  // ── ONE INTERVAL, FOR THE LIFE OF THE REVEAL ──────────────────────
  //
  // So the timer belongs to the MESSAGE rather than to the text. It reads the
  // current word count from a ref on every tick, which makes a chunk arriving
  // a change of target rather than an event: nothing is torn down, no clock is
  // rebudgeted, and the rate below is free to close the gap.
  const tickRef = useRef(null);
  tickRef.current = () => {
    const target = wordCountRef.current;
    const at = shownWordsRef.current;
    if (at >= target) {
      // Caught up. The reveal is DONE only when the text has stopped growing,
      // which the caller says by turning `active` off; until then this is just
      // an idle tick waiting for the next chunk.
      if (target > 0 && !doneFiredRef.current && !activeRef.current) {
        doneFiredRef.current = true;
        onDoneRef.current?.();
      }
      return;
    }
    // ── THE RATE, COMPUTED FROM THE WHOLE BACKLOG EVERY TICK ────────
    // A steady reading pace normally, and faster when there is more waiting
    // than MAX_TOTAL_MS would allow. That second half is what makes a burst
    // recoverable: the further behind it falls, the faster it goes, so the gap
    // closes instead of compounding.
    const steady = TICK_MS / MS_PER_WORD;
    const catchUp = (target - at) / Math.max(1, MAX_TOTAL_MS / TICK_MS);
    const n = Math.min(target, Math.ceil(at + Math.max(steady, catchUp)));
    shownWordsRef.current = n;
    setShownWords(n);
    onWordRef.current?.(n);
    if (n >= target && !activeRef.current && !doneFiredRef.current) {
      doneFiredRef.current = true;
      onDoneRef.current?.();
    }
  };

  const activeRef = useRef(active);
  activeRef.current = active;

  // ── WHERE THE REVEAL STARTS, WHICH IS THE ONLY THING TEXT DECIDES ─
  //
  // The stutter fix's rule, unchanged and now the whole of what a text change
  // does: a text that EXTENDS the last one carries on from where the reveal
  // had got to, and a genuinely different text is a different message and
  // starts at zero. What is gone is the timer restart that used to come with
  // it.
  useEffect(() => {
    const prev = prevTextRef.current;
    const grew = prev && (text || "").startsWith(prev);
    prevTextRef.current = text || "";
    if (!active) {
      // Not the message actively streaming (an old message re-rendering, or
      // streaming already finished) — show it in full, instantly, no animation.
      shownWordsRef.current = wordCount;
      setShownWords(wordCount);
      onWordRef.current?.(wordCount);
      return;
    }
    if (!grew) {
      doneFiredRef.current = false;
      shownWordsRef.current = 0;
      setShownWords(0);
    }
    if (wordCount === 0) { onDoneRef.current?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  // ── AND THE TIMER, WHICH TEXT DOES NOT TOUCH ──────────────────────
  // Keyed on `active` alone, so it is built when a message starts streaming
  // and torn down when it stops. Everything it needs is in a ref.
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => tickRef.current?.(), TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  injectFade();
  // Render only as far as the reveal has reached. Anything past it is left out
  // of the DOM entirely, so it takes no space and the bubble is exactly as tall
  // as the words written so far. Trailing whitespace is dropped with it, or a
  // pre-wrap bubble would carry a run of blank space on the last line.
  const out = [];
  let w = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!/\S/.test(t)) { out.push(t); continue; }
    if (w >= shownWords) break;
    w++;
    out.push(active
      ? <span key={i} style={{ animation: "gxWordIn 0.34s ease both" }}>{t}</span>
      : t);
  }
  while (out.length && typeof out[out.length - 1] === "string" && !/\S/.test(out[out.length - 1])) out.pop();
  return out;
};
