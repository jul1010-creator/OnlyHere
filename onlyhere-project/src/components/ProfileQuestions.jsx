import { C } from "../utils/theme";
import { BORN_YEARS, SEX_OPTIONS, COMPANY, PACE, INTERESTS, TRANSPORT, TRAVEL_STYLE, TRAVEL_STYLE_MIX, COUNTRIES, homeCurrency, DESCRIPTION_MAX, REQUIRED_PROFILE } from "../utils/profile";

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

  return (
    <>
      <div style={legend}>Name{star("name")}<span style={note}> · what should we call you</span></div>
      <input value={p.name} onChange={e => set("name", e.target.value.slice(0, 60))} placeholder="First name is plenty"
        autoComplete="given-name" style={{ ...field, marginBottom: 16, ...ring("name") }} />

      {/* ── BORN, AS A YEAR ───────────────────────────────────────
          His label, and a year rather than a date. What changes a
          recommendation is roughly how old somebody is; a full date of birth is
          a much stronger identifier and buys nothing extra, which is the
          reasoning profile.js has carried since 10 August. A year satisfies
          "Born" literally and keeps the liability off a Danish business that
          would have to protect it. */}
      <div style={legend}>Born{star("bornYear")}<span style={note}> · the year is plenty</span></div>
      <select value={p.bornYear} onChange={e => set("bornYear", e.target.value)}
        style={{ ...field, marginBottom: 16, appearance: "none", cursor: "pointer", ...ring("bornYear") }}>
        <option value="">{required ? "Choose a year" : "Rather not say"}</option>
        {BORN_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      {group("Gender", required ? "" : "optional, and it changes very little", SEX_OPTIONS, "sex")}

      {/* ── WHERE THEY ARE COMING FROM ────────────────────────────
          "In the create an account, ask what country they're from. Because then
          the guide can probably write in their currency."

          A select rather than chips: two dozen options is a list, not a row, and
          a row of two dozen gold pills would swamp every real question above it.
          The note says what the field does and, just as importantly, what it
          does not do, because somebody who expects pounds in their guide and
          gets kroner should have been told here rather than finding out. */}
      <div style={legend}>Where you are travelling from<span style={note}> · so we can tell you what DKK is worth</span></div>
      <select value={p.country} onChange={e => set("country", e.target.value)}
        style={{ ...field, marginBottom: 6, appearance: "none", cursor: "pointer" }}>
        <option value="">Somewhere else, or rather not say</option>
        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 18 }}>
        {homeCurrency(p.country)
          ? `Your guide will still price everything in DKK, because that is what the sign and the ticket app say. It will open with what 100 DKK is worth in ${homeCurrency(p.country)} on the day it was built.`
          : "Prices are always in DKK, because that is what you will actually be charged. Tell us where you are from and the guide will open with what that is worth to you."}
      </div>

      {/* His own heading, and his own line under it. The tick groups are the
          optional half and he marked them as such. */}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 3 }}>
        About yourself <span style={{ fontWeight: 500, color: C.muted }}>(optional)</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>
        Everything from here down can be skipped, and you can pick more than one of each.
      </div>

      {groupMany("Interests", "they are weighted, not filters", INTERESTS, "interests")}
      {groupMany("Preferred transport", "", TRANSPORT, "transport")}
      {groupMany("Preferred travelling", "", TRAVEL_STYLE, "style")}

      {group("Who you usually travel with", "", COMPANY, "company")}
      {group("Pace", "", PACE, "pace")}

      <div style={legend}>More about yourself</div>
      <textarea value={p.description} onChange={e => set("description", e.target.value.slice(0, DESCRIPTION_MAX))}
        rows={4} placeholder="What you actually enjoy, what you would rather avoid, anything that would change what a good friend recommended to you."
        style={{ ...field, resize: "vertical", lineHeight: 1.6 }} />
      <div style={{ fontSize: 10.5, color: C.muted, textAlign: "right", marginTop: 5, marginBottom: 14 }}>
        {p.description.length}/{DESCRIPTION_MAX}
      </div>
    </>
  );
};
