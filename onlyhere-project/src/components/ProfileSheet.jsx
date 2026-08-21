import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { EMPTY_PROFILE, cleanProfile, isBlank, saveProfile, SETUP_SQL } from "../utils/profile";
// One form, two callers. See ProfileQuestions.jsx: a second copy of these
// fields is how the signup version and this one drift apart.
import { ProfileQuestions } from "./ProfileQuestions";

// ── TELLING GEMLYX WHO YOU ARE ───────────────────────────────────────
//
// Oliver, 10 Aug: "you should be able to give an 'optional' description of
// yourself... That would help the AI get to know the person." And, on the first
// auth sheet: "give it a good design. Right now it's just ... lame. Adopt the
// theme."
//
// SHOWN AFTER THE ACCOUNT EXISTS, NEVER DURING SIGNUP. Two reasons, and the
// second is the one that would have hurt. First, his friend's whole complaint
// about this product was being asked things before being given anything, and
// bolting six fields onto a signup form is that complaint again in a new place.
// Second, this sheet frequently appears on the way back from the Google
// redirect, at the exact moment a guide is being claimed, so it has to be
// something a person can dismiss in one tap and never see again.
//
// EVERY FIELD IS OPTIONAL INCLUDING ALL OF THEM. Skip is a real answer with the
// same visual weight as Save, not a grey afterthought under the button, because
// an optional form whose decline is hard to find is not optional.
//
// It follows C rather than any fixed colour, so it inherits Warm, Dark and Light
// like everything else. Chips, not dropdowns: the same control the trip planner
// already uses, and it makes the whole thing answerable with the thumb.
export const ProfileSheet = ({ open, session, initial, onDone, onNeedsSetup }) => {
  const [p, setP] = useState(EMPTY_PROFILE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 720);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reopening must not show the last person's half-typed answers, and editing an
  // existing profile must start from what is already stored.
  useEffect(() => {
    if (open) { setP(initial ? cleanProfile(initial) : EMPTY_PROFILE); setError(null); }
  }, [open, initial]);

  if (!open) return null;

  const finish = async (save) => {
    if (!save) { onDone(null); return; }
    setBusy(true); setError(null);
    const res = await saveProfile(session, p);
    setBusy(false);
    if (res.ok) { onDone(cleanProfile(p)); return; }
    if (res.missingColumn) { onNeedsSetup?.(SETUP_SQL); setError("Gemlyx could not store this yet: the profile column is missing from the database. Nothing you typed has been lost, and the setup step is now shown in Studio."); return; }
    setError(res.error || "Could not save that. Your account is fine, this just did not go through.");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 985, display: "flex", justifyContent: "center", alignItems: wide ? "center" : "flex-end", padding: wide ? 24 : 0, boxSizing: "border-box", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
      <div style={{ background: C.surface, width: "100%", maxWidth: wide ? 470 : 520, maxHeight: wide ? "92vh" : "90vh", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: wide ? 20 : "20px 20px 0 0", borderBottom: wide ? `1px solid ${C.border}` : "none", padding: wide ? "26px 26px 22px" : "22px 20px calc(26px + env(safe-area-inset-bottom))", boxShadow: wide ? "0 24px 70px rgba(0,0,0,0.55)" : "none", boxSizing: "border-box" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ color: C.gold, fontSize: 15 }}>✦</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: 3, color: C.light, fontWeight: 600 }}>GEMLYX</span>
        </div>

        <div style={{ fontSize: wide ? 27 : 24, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.15, marginBottom: 8 }}>
          Who is this for?
        </div>
        <div style={{ fontSize: 13, color: C.light, lineHeight: 1.62, marginBottom: 18 }}>
          Anything you put here shapes what Gemlyx suggests and how it talks to you. All of it is optional, you can change or clear it whenever you like, and skipping costs you nothing.
        </div>

        <ProfileQuestions value={p} onChange={setP} />

        {error && <div style={{ fontSize: 12, color: "#FF8A80", lineHeight: 1.55, marginBottom: 12 }}>{error}</div>}

        {/* Skip carries the same weight as Save. An optional step whose decline
            is a grey link is not optional, it is a dark pattern with good
            manners. */}
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={() => finish(false)} disabled={busy}
            style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.light, borderRadius: 11, padding: "13px", fontSize: 14.5, fontWeight: 600, cursor: busy ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
            Skip
          </button>
          <button onClick={() => finish(true)} disabled={busy || isBlank(p)}
            style={{ flex: 1.6, background: C.gold, border: "none", color: "#0A0F1E", borderRadius: 11, padding: "13px", fontSize: 15, fontWeight: 700, cursor: (busy || isBlank(p)) ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: (busy || isBlank(p)) ? 0.45 : 1 }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>

        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55, marginTop: 14 }}>
          This is stored with your account and used only to write your guides. It is never sold, never used for advertising, and deleting your account deletes it with everything else.
        </div>
      </div>
    </div>
  );
};
