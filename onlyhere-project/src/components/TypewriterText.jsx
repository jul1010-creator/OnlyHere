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
const MIN_TOTAL_MS = 700;
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

export const TypewriterText = ({ text, active, onDone }) => {
  // Split into word + whitespace tokens (whitespace kept as its own tokens so
  // the original spacing/newlines survive exactly — bubbles use pre-wrap).
  const tokens = useMemo(() => (text || "").split(/(\s+)/), [text]);
  const wordCount = useMemo(() => tokens.filter(t => /\S/.test(t)).length, [tokens]);
  const [shownWords, setShownWords] = useState(active ? 0 : wordCount);
  const doneFiredRef = useRef(false);
  const prevTextRef = useRef(text || "");
  const shownWordsRef = useRef(active ? 0 : wordCount);

  useEffect(() => {
    if (!active) {
      // Not the message actively streaming (an old message re-rendering, or
      // streaming already finished) — show it in full, instantly, no animation.
      prevTextRef.current = text || "";
      shownWordsRef.current = wordCount;
      setShownWords(wordCount);
      return;
    }
    // STUTTER FIX (Oliver: "it starts and stops and starts and stops, and then
    // when the box is big, it starts writing fully"): the main chat's
    // web-search flow UPDATES the same message's text repeatedly as results
    // stream in — and this effect used to reset the reveal to word zero on
    // EVERY text change, so the animation kept restarting from the top: start,
    // stop, start, stop, until the text finally stopped changing and one full
    // run played on the finished ("big") box. When the new text simply EXTENDS
    // the old one (the overwhelmingly common streaming case), continue the
    // reveal from where it already was instead of restarting; only a genuinely
    // different text (a different message reusing this component) resets.
    const prev = prevTextRef.current;
    const grew = prev && (text || "").startsWith(prev);
    prevTextRef.current = text || "";
    doneFiredRef.current = false;
    const startAt = grew ? Math.min(shownWordsRef.current, wordCount) : 0;
    shownWordsRef.current = startAt;
    setShownWords(startAt);
    if (wordCount === 0) { onDone?.(); return; }
    if (startAt >= wordCount) { if (!doneFiredRef.current) { doneFiredRef.current = true; onDone?.(); } return; }
    const remaining = wordCount - startAt;
    const totalMs = Math.min(MAX_TOTAL_MS, Math.max(MIN_TOTAL_MS, remaining * MS_PER_WORD));
    const ticks = Math.max(1, Math.round(totalMs / TICK_MS));
    const perTick = remaining / ticks;
    let progress = startAt;
    const id = setInterval(() => {
      progress = Math.min(wordCount, progress + perTick);
      const n = Math.ceil(progress);
      shownWordsRef.current = n;
      setShownWords(n);
      if (n >= wordCount) {
        clearInterval(id);
        if (!doneFiredRef.current) { doneFiredRef.current = true; onDone?.(); }
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

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
