import { useState } from "react";
import { C } from "../utils/theme";
import { BORN_YEARS, SEX_OPTIONS, COMPANY, PACE, INTERESTS, TRANSPORT, TRAVEL_STYLE, TRAVEL_STYLE_MIX, COUNTRIES, DESCRIPTION_MAX, REQUIRED_PROFILE } from "../utils/profile";

// ── THE QUESTIONS, IN ONE PLACE ──────────────────────────────────────
//
// Oliver, 21 Aug 2026, point 9 of his document, restated after testing:
//
//   "And creating an account should then change the page into several
//    questions: Name / Born / Gender / MAKE TICKBOXES HERE! So you can click
//    multiple! / (Optional) About yourself / Interests / Prefered transport /
//    Prefered travelling / More about yourself"
//
// These fields already existed and lived only inside ProfileSheet, which opens
// AFTER an account exists and behind a cooldown. So the questions were built and
// the signup flow could not reach them, which is what he was looking at when he
// wrote "And you still haven't done the account part!!!!!"
//
// Extracted rather than copied into AuthSheet, because a second copy of a form
// is how the two drift: this codebase has already found four duplicated
// functions the hard way (resolveLegMode, lookupRealPlace, the heading list,
// studioTypes.js), each one a place where a fix landed on one copy.
//
// PRESENTATION ONLY. It owns no state, saves nothing, and knows nothing about
// sessions. The two callers do completely different things with the answers:
// ProfileSheet writes them to Supabase immediately; AuthSheet holds them on the
// device until a session exists, because on the email path there is no session
// for as long as it takes somebody to open their inbox.
// `required` marks the fields his document did not call optional, and `showGaps`
// turns those marks red once somebody has pressed the button with one empty. Off
// until then, because a form that scolds you before you have typed anything is a
// worse form.
export const ProfileQuestions = ({ value, onChange, required = false, showGaps = false }) => {
  const p = value;
  // Open/closed is pure display state and belongs here rather than in either
  // caller, which is the whole point of this component owning no data.
  const [moreOpen, setMoreOpen] = useState(false);
  const set = (k, v) => onChange({ ...p, [k]: v });
  // A chip toggles off when pressed again. Without that there is no way back to
  // "I would rather not say" once something has been tapped by accident.
  const pick = (k, v) => set(k, p[k] === v ? "" : v);

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
  const note = { textTransform: "none", letterSpacing: 0, fontWeight: 500, color: C.muted };
  // The asterisk itself. Gold normally, red once the gap has been pointed out,
  // so the mark that says "this is needed" is the same mark that says "this one".
  const gap = (k) => required && showGaps && REQUIRED_PROFILE.includes(k) && !String(p[k] ?? "").trim();
  const star = (k) => required && REQUIRED_PROFILE.includes(k)
    ? <span style={{ color: gap(k) ? "#FF8A80" : C.gold, marginLeft: 3 }}>*</span>
    : null;
  const ring = (k) => (gap(k) ? { borderColor: "#FF8A80" } : null);

  // ── NOT A COMPONENT DECLARED IN THE RENDER BODY ──────────────────
  // `const Group = ({...}) => ...` inside the body creates a new component TYPE
  // on every render, so React unmounts and remounts the entire chip subtree
  // rather than updating it. Every keystroke in the name field destroyed and
  // rebuilt every group and their buttons, and any chip holding keyboard focus
  // lost it. Plain functions returning elements are inlined into this render
  // instead, so there is no component identity to change.
  const group = (label, hint, options, k) => (
    <div key={k}>
      <div style={legend}>{label}{star(k)}{hint ? <span style={note}> · {hint}</span> : null}</div>
      <div style={row}>
        {options.map(o => <button key={o} onClick={() => pick(k, o)} style={chip(p[k] === o)}>{o}</button>)}
      </div>
    </div>
  );

  // ── THE SAME THING, TICKABLE ──────────────────────────────────────
  // "MAKE TICKBOXES HERE! So you can click multiple!" Same chips, same styling,
  // so the difference is stated in words under the label rather than left to be
  // discovered by tapping twice.
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
  const groupMany = (label, hint, options, k) => (
    <div key={k}>
      <div style={legend}>{label}<span style={note}> · pick as many as you like{hint ? `, ${hint}` : ""}</span></div>
      <div style={row}>
        {options.map(o => (
          <button key={o} onClick={() => pickMany(k, o)} style={chip((p[k] || []).includes(o))}>
            {(p[k] || []).includes(o) ? "✓ " : ""}{o}
          </button>
        ))}
      </div>
    </div>
  );

  // ── THREE ON ONE LINE, ALL DROPDOWNS ──────────────────────────────
  // Oliver, 21 Aug 2026: "if you can, make gender, year of birth, and country of
  // origin on one line. Make them all a drop down. This will make page much
  // smaller, and less need of scrolling."
  //
  // Gender was a chip row, which is three lines tall on a phone. auto-fit rather
  // than three fixed columns, so the same markup is one line on a laptop and
  // stacks on a narrow phone without a second breakpoint to keep in sync.
  const trio = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 };
  const select = (k, options, placeholder) => (
    <select value={p[k]} onChange={e => set(k, e.target.value)}
      style={{ ...field, appearance: "none", cursor: "pointer", ...ring(k) }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <>
      {/* ── NO EXPLAINING WHY ─────────────────────────────────────
          "No reason to explain why we need country and gender and what not.
          It's default to always write that on a sign up page." Every note under
          every field is gone; a label and a control is what a signup form is. */}
      <div style={legend}>Name{star("name")}</div>
      <input value={p.name} onChange={e => set("name", e.target.value.slice(0, 60))} placeholder="Or a nickname"
        autoComplete="given-name" style={{ ...field, marginBottom: 18, ...ring("name") }} />

      <div style={trio}>
        <div>
          <div style={legend}>Year of birth{star("bornYear")}</div>
          {select("bornYear", BORN_YEARS, "Select")}
        </div>
        <div>
          <div style={legend}>Gender{star("sex")}</div>
          {select("sex", SEX_OPTIONS, "Select")}
        </div>
        <div>
          <div style={legend}>Country of origin</div>
          <select value={p.country} onChange={e => set("country", e.target.value)}
            style={{ ...field, appearance: "none", cursor: "pointer" }}>
            <option value="">Select</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── THE OPTIONAL HALF, BEHIND THE SAME DOOR AS FINE-TUNE ───
          "Make a dropdown on the 'optional' exactly like with the Gemlyx
          finetuning." Same bordered gold button, same chevron, same rule his dad
          taught this codebase once already: a borderless text row reads as a
          heading rather than something you can press. */}
      <button onClick={() => setMoreOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: moreOpen ? `${C.gold}14` : C.bg, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "12px 14px", marginBottom: moreOpen ? 16 : 4, cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "left" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>✦ Optional: about yourself</span>
        <span style={{ fontSize: 11, color: C.muted }}>the more Gemlyx knows, the better it plans</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.gold, transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", display: "inline-block" }}>▾</span>
      </button>

      {moreOpen && (<div>
        {groupMany("Interests", "", INTERESTS, "interests")}
        {groupMany("Preferred transport", "", TRANSPORT, "transport")}
        {groupMany("Preferred travelling", "", TRAVEL_STYLE, "style")}

        {group("Who you usually travel with", "", COMPANY, "company")}
        {group("Pace", "", PACE, "pace")}

        <div style={legend}>More about yourself</div>
        <textarea value={p.description} onChange={e => set("description", e.target.value.slice(0, DESCRIPTION_MAX))}
          rows={4} placeholder="What you enjoy, what you would rather avoid, anything that would change what a good friend recommended to you."
          style={{ ...field, resize: "vertical", lineHeight: 1.6 }} />
        <div style={{ fontSize: 10.5, color: C.muted, textAlign: "right", marginTop: 5, marginBottom: 4 }}>
          {p.description.length}/{DESCRIPTION_MAX}
        </div>
      </div>)}
    </>
  );
};
