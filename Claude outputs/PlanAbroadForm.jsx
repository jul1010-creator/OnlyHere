// ── THE TRIP FORM ON ANOTHER COUNTRY'S PAGE ─────────────────────────
//
// Phase 3 of LITHUANIA_PLAN_29SEP.md, with no chat: Oliver, 29 Sep 2026,
// "Leave out the Chat Assistant.. I doubt anyone will use it tbh.. but yes,
// start phase 3."
//
// Shorter than the Danish form on purpose. The Danish one carries a budget
// estimate built on Danish prices (Danhostel, Novasol, DKK meal tiers), the
// sommerhus and the "Explore Denmark" scope, none of which is true anywhere
// else. What is left is what a planner needs for a city: when, who, from
// where, what they like and how they move. Same state as the Danish form, so
// readBrief and the preview read it exactly as they read the Danish one.
import { useRef } from "react";
import { Pill } from "./Pill";
import { Ico } from "./Icon";
import { DateTimePicker } from "./DateTimePicker";
import { startsFor, ABROAD_TRANSPORT, ABROAD_INTERESTS, sameDayHours } from "../utils/guideAbroad";

const label = (C) => ({ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 });
const chip = (C, on) => ({ background: on ? C.gold : "none", border: `1px solid ${on ? C.gold : C.border}`, color: on ? "#0A0F1E" : C.light, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" });
const field = (C) => ({ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" });

export const PlanAbroadForm = ({
  C, land, towns = [],
  arrival, setArrival, departure, setDeparture,
  travelers, setTravelers, kids, setKids,
  start, setStart, startText, setStartText,
  interests, setInterests, transport, setTransport,
  freeOnly, setFreeOnly, events, setEvents,
  savedCount = 0, includeSaved, setIncludeSaved,
  busy = false, error = "", onBuild,
}) => {
  const departureRef = useRef(null);
  const starts = startsFor(land.code);
  const toggle = (list, set, v) => set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const hours = sameDayHours(arrival, departure);
  const ready = !!(arrival && departure) && new Date(departure) > new Date(arrival);
  const where = towns.length ? towns.map(t => t.name).join(", ") : land.name;
  return (
    <div data-testid="plan-abroad" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 16px", marginBottom: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>When are you in {where}?</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>A few hours off a ship or a few days in town, Gemlyx plans it from the places it has checked.</div>
      <div className="detour-2col" style={{ marginBottom: 6 }}>
        <DateTimePicker label="Arrival" hint="(date & time)" value={arrival} onChange={setArrival} minDate={new Date()}
          onDaySelected={() => departureRef.current?.openPicker()} />
        <DateTimePicker ref={departureRef} label="Departure" hint="(date & time)" value={departure} onChange={setDeparture}
          minDate={arrival ? new Date(arrival) : new Date()} />
      </div>
      {hours !== null && (
        <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 600, marginBottom: 12 }}>About {hours} hours in town</div>
      )}
      <div style={{ height: hours !== null ? 0 : 8 }} />

      <div style={label(C)}>Who's traveling</div>
      <input value={travelers} onChange={e => setTravelers(e.target.value)} placeholder="e.g. 2 adults, or 4 friends" style={{ ...field(C), marginBottom: 8 }} />
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}>
        <input type="checkbox" checked={kids} onChange={e => setKids(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.accent, cursor: "pointer" }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.text }}><Ico name="family" size={14} color={C.light} /> Traveling with kids</span>
      </label>

      <div style={label(C)}>Where you start</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {starts.map(s => (
          <button key={s.key} onClick={() => setStart(start === s.key ? "" : s.key)} style={chip(C, start === s.key)}>{s.label}</button>
        ))}
      </div>
      <input value={startText} onChange={e => setStartText(e.target.value)}
        placeholder={start === "hotel" ? "Which hotel?" : "Or type a place"} style={{ ...field(C), marginBottom: 14 }} />

      <div style={label(C)}>Into</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {ABROAD_INTERESTS.map(i => <Pill key={i} label={i} active={interests.includes(i)} onClick={() => toggle(interests, setInterests, i)} />)}
      </div>

      <div style={label(C)}>Getting around</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {ABROAD_TRANSPORT.map(t => <Pill key={t} label={t} active={transport.includes(t)} onClick={() => toggle(transport, setTransport, t)} />)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: freeOnly ? C.gold : C.light, cursor: "pointer" }}>
          <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} style={{ accentColor: C.gold, cursor: "pointer" }} />
          Free entry only
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: events ? C.gold : C.light, cursor: "pointer" }}>
          <input type="checkbox" checked={events} onChange={e => setEvents(e.target.checked)} style={{ accentColor: C.gold, cursor: "pointer" }} />
          Include events on my dates
        </label>
        {savedCount > 0 && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.text, cursor: "pointer" }}>
            <input type="checkbox" checked={includeSaved} onChange={e => setIncludeSaved(e.target.checked)} style={{ accentColor: C.accent, cursor: "pointer" }} />
            ♥ Include my {savedCount} saved place{savedCount !== 1 ? "s" : ""}
          </label>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: "#FFB347", textAlign: "center", marginBottom: 12 }}>{error}</div>}
      <button data-testid="plan-abroad-build" disabled={!ready || busy} onClick={onBuild}
        style={{ display: "block", width: "100%", background: ready ? `linear-gradient(135deg, ${C.accent}, #C22A3C)` : C.border, border: "none", color: "#fff", borderRadius: 100, padding: "13px", fontSize: 13.5, fontWeight: 700, cursor: ready && !busy ? "pointer" : "default", fontFamily: "'Inter', sans-serif", opacity: busy ? 0.7 : 1 }}>
        {ready ? "✦ Plan my visit" : "Add your arrival and departure"}
      </button>
    </div>
  );
};
