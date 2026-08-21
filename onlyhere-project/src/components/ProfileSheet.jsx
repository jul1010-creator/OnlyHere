import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { AGE_BANDS, SEX_OPTIONS, COMPANY, PACE, INTERESTS, TRANSPORT, TRAVEL_STYLE, TRAVEL_STYLE_MIX, COUNTRIES, homeCurrency, DESCRIPTION_MAX, EMPTY_PROFILE, cleanProfile, isBlank, saveProfile, SETUP_SQL } from "../utils/profile";

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

  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  // A chip toggles off when pressed again. Without that there is no way back to
  // "I would rather not say" once something has been tapped by accident.
  const pick = (k, v) => set(k, p[k] === v ? "" : v);

  const finish = async (save) => {
    if (!save) { onDone(null); return; }
    setBusy(true); setError(null);
    const res = await saveProfile(session, p);
    setBusy(false);
    if (res.ok) { onDone(cleanProfile(p)); return; }
    if (res.missingColumn) { onNeedsSetup?.(SETUP_SQL); setError("Gemlyx could not store this yet: the profile column is missing from the database. Nothing you typed has been lost, and the setup step is now shown in Studio."); return; }
    setError(res.error || "Could not save that. Your account is fine, this just did not go through.");
  };

  const chip = (active) => ({
    background: active ? C.gold : "transparent",
    border: `1px solid ${active ? C.gold : C.border}`,
    color: active ? "#0A0F1E" : C.light,
    borderRadius: 100, padding: "7px 13px", fontSize: 12.5,
    fontWeight: active ? 700 : 500, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", transition: "all .14s ease",
  });
  const row = { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 };
  const legend = { fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 8 };
  const field = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px 13px", fontSize: 14, fontFamily: "'Inter', sans-serif" };

  // ── NOT A COMPONENT DECLARED IN THE RENDER BODY ──────────────────
  // `const Group = ({...}) => ...` inside the body creates a new component TYPE
  // on every render, so React unmounts and remounts the entire chip subtree
  // rather than updating it. Every keystroke in the name field or the
  // description box destroyed and rebuilt all four groups and their twenty
  // buttons, and any chip holding keyboard focus lost it. A plain function that
  // returns elements is inlined into this render instead, so there is no
  // component identity to change.
  const group = (label, note, options, k) => (
    <div key={k}>
      <div style={legend}>{label}{note ? <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, color: C.muted }}> · {note}</span> : null}</div>
      <div style={row}>
        {options.map(o => <button key={o} onClick={() => pick(k, o)} style={chip(p[k] === o)}>{o}</button>)}
      </div>
    </div>
  );

  // ── THE SAME THING, TICKABLE ──────────────────────────────────────
  // "MAKE TICKBOXES HERE! So you can click multiple!" Same chips, same styling,
  // so the difference a reader has to notice is stated in words under the label
  // rather than left to be discovered by tapping twice.
  //
  // "A mix" is not a fourth thing to like, it is "no strong preference", so it
  // clears the others and the others clear it. Without that rule the commonest
  // accidental answer is "hidden gems, and also no preference", which is not an
  // answer and would reach the prompt as one.
  const pickMany = (k, option) => {
    const now = Array.isArray(p[k]) ? p[k] : [];
    const on = now.includes(option);
    let next;
    if (option === TRAVEL_STYLE_MIX) next = on ? [] : [TRAVEL_STYLE_MIX];
    else next = (on ? now.filter(x => x !== option) : [...now, option]).filter(x => x !== TRAVEL_STYLE_MIX);
    set(k, next);
  };
  const groupMany = (label, note, options, k) => (
    <div key={k}>
      <div style={legend}>{label}<span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, color: C.muted }}> · pick as many as you like{note ? `, ${note}` : ""}</span></div>
      <div style={row}>
        {options.map(o => (
          <button key={o} onClick={() => pickMany(k, o)} style={chip((p[k] || []).includes(o))}>
            {(p[k] || []).includes(o) ? "✓ " : ""}{o}
          </button>
        ))}
      </div>
    </div>
  );

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

        <div style={legend}>What should we call you</div>
        <input value={p.name} onChange={e => set("name", e.target.value.slice(0, 60))} placeholder="First name is plenty"
          autoComplete="given-name" style={{ ...field, marginBottom: 16 }} />

        {/* ── WHERE THEY ARE COMING FROM ────────────────────────────
            "In the create an account, ask what country they're from. Because
            then the guide can probably write in their currency."

            A select rather than chips: two dozen options is a list, not a row,
            and a row of two dozen gold pills would swamp every real question
            above it. The note under it says what the field does and, just as
            importantly, what it does not do, because a reader who expects to
            see pounds in their guide and gets kroner should have been told
            here. */}
        <div style={legend}>Where you are travelling from<span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, color: C.muted }}> · so we can tell you what DKK is worth</span></div>
        <select value={p.country} onChange={e => set("country", e.target.value)}
          style={{ ...field, marginBottom: 6, appearance: "none", cursor: "pointer" }}>
          <option value="">Somewhere else, or rather not say</option>
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 16 }}>
          {homeCurrency(p.country)
            ? `Your guide will still price everything in DKK, because that is what the sign and the ticket app say. It will open with what 100 DKK is worth in ${homeCurrency(p.country)} on the day it was built.`
            : "Prices are always in DKK, because that is what you will actually be charged. Tell us where you are from and the guide will open with what that is worth to you."}
        </div>

        {group("Age", "it changes what is worth recommending", AGE_BANDS, "ageBand")}
        {group("Who you usually travel with", "", COMPANY, "company")}
        {group("Pace", "", PACE, "pace")}
        {group("Sex", "optional, and it changes very little", SEX_OPTIONS, "sex")}

        {groupMany("Interests", "they are weighted, not filters", INTERESTS, "interests")}
        {groupMany("How you like to get around", "", TRANSPORT, "transport")}
        {groupMany("What a trip is for", "", TRAVEL_STYLE, "style")}

        <div style={legend}>Anything else worth knowing</div>
        <textarea value={p.description} onChange={e => set("description", e.target.value.slice(0, DESCRIPTION_MAX))}
          rows={4} placeholder="What you actually enjoy, what you would rather avoid, anything that would change what a good friend recommended to you."
          style={{ ...field, resize: "vertical", lineHeight: 1.6 }} />
        <div style={{ fontSize: 10.5, color: C.muted, textAlign: "right", marginTop: 5, marginBottom: 14 }}>
          {p.description.length}/{DESCRIPTION_MAX}
        </div>

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
