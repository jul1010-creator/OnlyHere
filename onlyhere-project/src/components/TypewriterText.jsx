import { useState, useEffect, useRef } from "react";

// ── Typewriter reveal for Gemlyx's chat replies ─────────────────────
// Per Oliver: "Gemlyx chat gotta be slower. I don't like all of it popping
// in. That gives too much robot. Let the letter flow in slower as if the AI
// is communicating." Before this, an assistant reply's bubble faded/slid in
// (via the .gemlyx-msg-in CSS class, kept as-is) but the TEXT inside it was
// just static JSX — the whole paragraph appeared instantly the moment the
// bubble did, which read as a wall of text dropped in at once, not something
// being said.
//
// Shared between the main Detour/planning chat (App.jsx) and the persistent
// post-build guide chat (pages/GuidePage.jsx) so both read the same way and
// there's exactly one place to tune the pacing — this is also a small step
// toward the "code is getting very long" concern Oliver raised: new chat UI
// behavior lives in its own file instead of growing App.jsx further inline.
//
// Reveals in small CHUNKS per tick rather than one character at a time —
// true one-letter-per-tick would take 30+ seconds for a long AI reply, which
// reads as broken, not deliberate. Chunk size scales with the text's own
// length so a short reply still feels like real typing (many small chunks)
// while a long reply's total reveal time stays capped at a few seconds
// instead of dragging on.
const TICK_MS = 16;
const MIN_TOTAL_MS = 500;
const MAX_TOTAL_MS = 3200;

export const TypewriterText = ({ text, active, onDone }) => {
  const [shownLen, setShownLen] = useState(active ? 0 : (text || "").length);
  const doneFiredRef = useRef(false);

  useEffect(() => {
    if (!active) {
      // Not the message actively streaming (either an old message being
      // re-rendered, or streaming already finished) — show it in full,
      // instantly, no animation.
      setShownLen((text || "").length);
      return;
    }
    doneFiredRef.current = false;
    setShownLen(0);
    const full = text || "";
    if (!full) { onDone?.(); return; }
    const totalMs = Math.min(MAX_TOTAL_MS, Math.max(MIN_TOTAL_MS, full.length * 14));
    const totalTicks = Math.max(1, Math.round(totalMs / TICK_MS));
    const chunkSize = Math.max(1, Math.ceil(full.length / totalTicks));
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(full.length, i + chunkSize);
      setShownLen(i);
      if (i >= full.length) {
        clearInterval(id);
        if (!doneFiredRef.current) { doneFiredRef.current = true; onDone?.(); }
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  return (text || "").slice(0, shownLen);
};
