import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { C } from "../utils/theme";
import { dayStart } from "../utils/calendarDay";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ── AND THIS WAS A SEVENTH PRIVATE COPY OF dayStart ─────────────────
// utils/calendarDay.js exists because this same three-line function had been
// written independently in five places and each one was wrong in a way the
// others were not. This copy is the mildest of them: the picker only ever hands
// it a Date, so `new Date(d)` is a clone and setHours does exactly what dayStart
// does. It is replaced anyway, because "correct as long as nobody passes it a
// stored date string" is the precondition every other member of this family
// also satisfied right up until somebody did.
//
// The one behaviour difference is the improvement: dayStart returns null for a
// value it cannot read, where this returned an Invalid Date, and an Invalid Date
// is truthy and poisons every comparison it touches.
const startOfDay = (d) => dayStart(d);

// Real, custom-built calendar — past days are structurally disabled (no onClick,
// greyed out, cursor not-allowed), not just soft-validated like a native
// <input type="date">, which still lets you tap any day and only complains
// on submit. This is what actually gives Skyscanner-style behavior.
//
// forwardRef + useImperativeHandle so a PARENT field (e.g. Arrival) can tell
// a SIBLING field (e.g. Departure) to open itself once a day is picked here —
// see openPicker() below, used for the auto-advance-to-departure behavior.
export const DateTimePicker = forwardRef(({ value, onChange, minDate, label, hint, onDaySelected }, ref) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = value ? new Date(value) : null;
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const [timeValue, setTimeValue] = useState(() => {
    if (!selected) return "12:00";
    return `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`;
  });
  const min = startOfDay(minDate || new Date());

  useImperativeHandle(ref, () => ({
    openPicker: () => setOpen(true),
  }));

  useEffect(() => {
    const onClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const commit = (day, time) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    // Local-time string, no timezone suffix — matches what the native
    // datetime-local input produced, and what downstream `new Date(...)`
    // parsing throughout the app expects (parsed as local time, not UTC).
    // toISOString() would convert to UTC first and silently shift the hour.
    const pad = (n) => String(n).padStart(2, "0");
    onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const year = viewMonth.getFullYear(), month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array(daysInMonth).keys()].map(v => v === null ? null : v + 1);

  const canGoPrevMonth = new Date(year, month, 1) > new Date(min.getFullYear(), min.getMonth(), 1);

  const displayText = selected
    ? `${selected.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${timeValue}`
    : "Select date & time";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {label && <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label} {hint && <span style={{ textTransform: "none", fontWeight: 400, color: C.muted }}>{hint}</span>}</div>}
      {/* gx-field: a <button> that is a field. It sits under a form label, it
          says "Select date & time", and it is the first thing on the screen
          Oliver's father was looking at when he said he could not tell what he
          could write into. The affordance rule in utils/theme.js is keyed on
          element type and cannot see that on its own, so this says it. */}
      <button type="button" className="gx-field" onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: selected ? C.text : C.muted, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>
        {displayText}
      </button>

      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 6px)", left: 0, width: 300, maxWidth: "90vw", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" disabled={!canGoPrevMonth} onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              style={{ background: "none", border: "none", color: canGoPrevMonth ? C.text : C.border, fontSize: 16, cursor: canGoPrevMonth ? "pointer" : "not-allowed", padding: "4px 10px" }}>‹</button>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{MONTH_NAMES[month]} {year}</div>
            <button type="button" onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              style={{ background: "none", border: "none", color: C.text, fontSize: 16, cursor: "pointer", padding: "4px 10px" }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ textAlign: "center", fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: 0.5, padding: "4px 0" }}>{w}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 12 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const thisDate = new Date(year, month, day);
              const disabled = thisDate < min;
              const isSelected = selected && startOfDay(selected).getTime() === thisDate.getTime();
              return (
                <button type="button" key={i} disabled={disabled}
                  onClick={() => {
                    commit(thisDate, timeValue);
                    setViewMonth(thisDate);
                    setOpen(false);
                    if (onDaySelected) onDaySelected();
                  }}
                  style={{
                    aspectRatio: "1", borderRadius: 8, border: "none", fontSize: 12.5, fontFamily: "'Inter', sans-serif",
                    background: isSelected ? C.accent : "transparent",
                    color: disabled ? C.border : isSelected ? "#fff" : C.text,
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontWeight: isSelected ? 700 : 400,
                  }}>
                  {day}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Time</div>
            <input type="time" value={timeValue} onChange={e => {
              setTimeValue(e.target.value);
              if (selected) commit(selected, e.target.value);
            }} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: C.text, colorScheme: "dark", fontFamily: "'Inter', sans-serif" }} />
            <button type="button" onClick={() => setOpen(false)}
              style={{ background: C.accent, border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
});
