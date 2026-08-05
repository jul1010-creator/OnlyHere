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
// someone writing. The whole reply is rendered invisibly up front (every word
// at opacity 0), so the bubble takes its final size immediately — no layout
// jumping while words appear — and each word then fades in in place.
//
// Pacing: ~105ms per word (≈9-10 words/second — a flowing writing pace, not a
// wall of text and not one-finger typing), with a floor so short replies still
// feel written and a much higher ceiling than before (9s, was 3.2s) so long
// replies genuinely stay slow instead of secretly speeding up to meet a cap.
//
// Shared between the main Detour/planning chat (App.jsx), the preview screen's
// corner chat (App.jsx, PREVIEW CHAT), and the persistent post-build guide
// chat (pages/GuidePage.jsx) — one place to tune the pacing for all three.
const TICK_MS = 64;
const MS_PER_WORD = 105;
const MIN_TOTAL_MS = 1400;
const MAX_TOTAL_MS = 9000;

export const TypewriterText = ({ text, active, onDone }) => {
  // Split into word + whitespace tokens (whitespace kept as its own tokens so
  // the original spacing/newlines survive exactly — bubbles use pre-wrap).
  const tokens = useMemo(() => (text || "").split(/(\s+)/), [text]);
  const wordCount = useMemo(() => tokens.filter(t => /\S/.test(t)).length, [tokens]);
  const [shownWords, setShownWords] = useState(active ? 0 : wordCount);
  const doneFiredRef = useRef(false);

  useEffect(() => {
    if (!active) {
      // Not the message actively streaming (an old message re-rendering, or
      // streaming already finished) — show it in full, instantly, no animation.
      setShownWords(wordCount);
      return;
    }
    doneFiredRef.current = false;
    setShownWords(0);
    if (wordCount === 0) { onDone?.(); return; }
    const totalMs = Math.min(MAX_TOTAL_MS, Math.max(MIN_TOTAL_MS, wordCount * MS_PER_WORD));
    const ticks = Math.max(1, Math.round(totalMs / TICK_MS));
    const perTick = wordCount / ticks;
    let progress = 0;
    const id = setInterval(() => {
      progress = Math.min(wordCount, progress + perTick);
      const n = Math.ceil(progress);
      setShownWords(n);
      if (n >= wordCount) {
        clearInterval(id);
        if (!doneFiredRef.current) { doneFiredRef.current = true; onDone?.(); }
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  let w = 0;
  return tokens.map((t, i) => {
    if (!/\S/.test(t)) return t;
    const visible = w++ < shownWords;
    return (
      <span key={i} style={{ opacity: visible ? 1 : 0, transition: active ? "opacity 0.45s ease" : "none" }}>
        {t}
      </span>
    );
  });
};
