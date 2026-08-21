import { useState, useRef, useEffect } from "react";
import { C } from "../utils/theme";
import { stripDashes } from "../utils/helpers";
import { readerLanguage } from "../utils/readerLanguage";

// ── THE TRAVELER'S ASSISTANT ─────────────────────────────────────────
// Oliver, 7 Aug 2026: "There is a studio/admin assistant and a paid subscriber
// assistant ready on every page to answer questions."
//
// This is the second one. It is deliberately NOT the Studio assistant with the
// dangerous parts hidden: it cannot correct, cannot audit, cannot save, and has
// no code path that writes anything. A reader asking "can I get there without a
// car" should get an answer, never a verification pass that rewrites the page
// under them.
//
// EVERYTHING THAT MATTERS HAPPENS ON THE SERVER. This component sends a
// question and shows what comes back. It does not hold an API key, it does not
// decide whether someone has questions left, and it does not count anything: a
// limit enforced in the browser is not a limit, it is a suggestion with a
// devtools bypass. See api/ask.js. The number shown here is whatever the server
// last said, for the person's information only.
//
// NO PAYWALL YET, BY HIS DECISION: signed in is the bar, and every signed-in
// traveler gets the same small daily allowance. The paywall drops on top of the
// same counter later without any of this changing.

const bubble = (role) => ({
  alignSelf: role === "you" ? "flex-end" : "flex-start",
  background: role === "you" ? `${C.gold}1f` : C.bg,
  border: `1px solid ${role === "you" ? `${C.gold}55` : C.border}`,
  color: C.text,
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: 12.5,
  lineHeight: 1.6,
  maxWidth: "92%",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

// startOpen / onClose exist for ONE caller: the preview screen, where the
// traveller has already tapped "Ask" on a specific card, so a floating "Ask
// about this place" button asking them to tap again is a step that answers
// nothing. onClose hands the × back to the host, because there the panel's
// lifetime is the host's `askItem` and a panel that hid itself while the host
// still held the item could never be reopened. Both default to the behaviour
// every other caller has always had.
// `founder` means the session in hand is the Studio one rather than a reader
// account. It changes nothing about how the question is asked or metered; it
// puts a line on the panel saying the gate is there, because the whole reason
// he is through it is that he is checking what a reader gets.
export const AskGemlyx = ({ session, item, kind, onSignIn, founder = false, startOpen = false, onClose = null }) => {
  const [open, setOpen] = useState(!!startOpen);
  const [input, setInput] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState(null);   // { used, limit } as last reported by the server
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log, busy]);

  // Only where there is something to be asked ABOUT. A floating button on a
  // page with no entry open has nothing to answer from, and the honest place
  // for a general trip question is Gemlyx Detour, which already exists.
  if (!item) return null;

  // ── THE ONE AI SURFACE THAT SPOKE TO A READER UNSTRIPPED ────────────
  // Found 13 Aug 2026 while scouting. Every other path from a model to a reader
  // runs stripDashes: liveContent strips each published row as it loads, the
  // plan builder strips its own output, the hand editor strips what is typed.
  // This one did not, and it is the only surface where a model talks to a
  // paying visitor live.
  //
  // api/ask.js does say "Never use an em dash or an en dash" in both prompts,
  // and that is the whole problem. App.jsx already wrote the lesson down, one
  // screen away from here: A RULE THE MODEL CAN FORGET IS NOT A FILTER. It was
  // the filter that was missing, not the instruction.
  //
  // On the answer only, and on the way IN rather than at render, so what is
  // held in state is what was shown. The traveler's own question is left
  // exactly as they typed it: this is his rule about generated text, and
  // rewriting somebody's own words back at them is a different thing entirely.
  const say = (role, text, extra = {}) =>
    setLog(l => [...l, { role, text: role === "you" ? text : stripDashes(String(text ?? "")), ...extra }]);

  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    if (!session?.token) { onSignIn?.(); return; }
    setInput("");
    say("you", question);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          question,
          entryName: item.name,
          // ── THE SERVER CANNOT SEE navigator.language ──────────
          // Oliver, 15 Aug 2026: "If someone only knows Mandarin Chinese..
          // then this page will probably be difficult." The Detour prompt
          // reads the browser directly; this one runs in api/ask.js, so the
          // language has to travel with the question. Sent as a tag rather
          // than a sentence, so the server owns the wording and one prompt
          // change reaches both.
          lang: readerLanguage(),
          // The stored entry, minus the internals a reader has no use for.
          entry: Object.fromEntries(Object.entries(item).filter(([k]) => !k.startsWith("_") && k !== "photo")),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        say("gemlyx", data?.error || "Something went wrong asking that.");
        if (Number.isFinite(data?.used)) setQuota({ used: data.used, limit: data.limit });
        return;
      }
      setQuota({ used: data.used, limit: data.limit });
      say("gemlyx", data.answer, { lookedUp: data.lookedUp, sources: data.sources || [] });
    } catch {
      say("gemlyx", "Could not reach the answer service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const left = quota ? Math.max(0, quota.limit - quota.used) : null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title={`Ask about ${item.name}`}
        style={{ position: "fixed", right: 16, bottom: 84, zIndex: 980, display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`, border: `1px solid ${C.gold}66`, color: C.text, borderRadius: 100, padding: "11px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 26px rgba(0,0,0,0.55)", fontFamily: "'Inter', sans-serif" }}>
        <span style={{ color: C.gold }}>✦</span> Ask about this place
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 985, width: "min(400px, calc(100vw - 24px))", maxHeight: "min(70vh, 640px)", display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,.6)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: "'Fraunces', serif" }}>✦ Ask Gemlyx</div>
          <div style={{ fontSize: 10.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            About {item.name}{left != null ? ` · ${left} question${left === 1 ? "" : "s"} left today` : ""}
          </div>
        </div>
        <button onClick={() => (onClose ? onClose() : setOpen(false))} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {log.length === 0 && (
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.65 }}>
            {/* ── SOUND PLEASED TO BE ASKED ──────────────────────────
                Oliver, 8 Aug 2026, on the old version of this: "it almost
                sounds aggressive.. Gemlyx AI should be happy to help. And just
                leave it with 'Anything I can help you with about Amalienborg'
                or something."
                
                He is right, and it is the same defensiveness as the heading he
                rejected an hour earlier. The old copy explained the retrieval
                architecture to a traveller who had not asked: what is checked,
                what is looked up, where sources come from, what this cannot
                change. All of it true, none of it what someone opening a chat
                box wants to read. The honesty still happens where it counts,
                on the ANSWER, where a looked-up reply carries its sources. It
                does not need announcing in advance like terms and conditions. */}
            {session?.token
              ? `Anything I can help you with about ${item.name}? Ask away.`
              : `Sign in and I will happily answer anything about ${item.name}.`}
          </div>
        )}
        {/* ── THE GATE HE IS STANDING THROUGH ──────────────────────
            "But still show me that it's a part that needs account login."
            Every turn, not once at the top, because this panel scrolls and a
            notice that has scrolled away is a notice he does not have. */}
        {founder && (
          <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 0.6, textTransform: "uppercase", border: `1px dashed ${C.gold}55`, borderRadius: 8, padding: "6px 8px" }}>
            Reader gate: a traveller needs an account here. You are through it on your Studio login.
          </div>
        )}
        {log.map((l, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: l.role === "you" ? "flex-end" : "flex-start", gap: 4, maxWidth: "100%" }}>
            {/* An answer that came from a live search says so. The two kinds are
                never blended, so a reader always knows which one they hold. */}
            {l.role === "gemlyx" && l.lookedUp && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8AB4F8", letterSpacing: 0.6, textTransform: "uppercase" }}>Not in the entry, looked up just now</div>
            )}
            <div style={bubble(l.role)}>{l.text}</div>
            {l.sources?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {l.sources.map((u, j) => {
                  let host = u; try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { /* show the raw string */ }
                  return <a key={j} href={u} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: C.gold, textDecoration: "none", border: `1px solid ${C.border}`, borderRadius: 100, padding: "3px 9px" }}>{host} ↗</a>;
                })}
              </div>
            )}
          </div>
        ))}
        {busy && <div style={{ ...bubble("gemlyx"), color: C.muted, fontSize: 11.5 }}>Checking the entry…</div>}
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-end" }}>
        {session?.token ? (
          <>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={left === 0 ? "No questions left today" : `Ask about ${item.name}`}
              rows={1} disabled={left === 0}
              style={{ flex: 1, resize: "none", minHeight: 38, maxHeight: 120, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12.5, padding: "9px 10px", outline: "none", fontFamily: "'Inter', sans-serif" }} />
            <button onClick={send} disabled={busy || !input.trim() || left === 0}
              style={{ background: busy || !input.trim() || left === 0 ? C.bg : C.gold, border: `1px solid ${C.border}`, color: busy || !input.trim() || left === 0 ? C.muted : "#000", borderRadius: 100, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", flexShrink: 0 }}>
              {busy ? "…" : "➤"}
            </button>
          </>
        ) : (
          <button onClick={() => onSignIn?.()}
            style={{ width: "100%", background: C.gold, border: "none", color: "#000", borderRadius: 100, padding: "10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Sign in to ask
          </button>
        )}
      </div>
    </div>
  );
};
