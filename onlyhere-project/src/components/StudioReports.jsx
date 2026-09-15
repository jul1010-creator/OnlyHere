// ── THE REPORTS TAB ─────────────────────────────────────────────────
//
// Oliver, 15 Sep 2026: "all the reports should go to Oliververhein@gmail.com's
// account. So not on the mail, but in a report fixes tab for studio."
//
// Everything that decides anything is in utils/supportInbox.js so it can be
// tested. This file is the part that cannot be: the arrangement on screen.
//
// ── IT OPENS ON WHAT IS LEFT TO DO ──────────────────────────────────
//
// The default filter is Open, not All. A panel that opens on everything ever
// received is a panel he scrolls; one that opens on the four things still
// waiting is a panel he finishes. All is one tap away for the times he is
// looking for something he has already handled.
import { useState } from "react";
import { C } from "../utils/theme";
import { splitReport, topicLabel, reportAge, isHandled, unhandledCount } from "../utils/supportInbox";

const FILTER_LABEL = { open: "Open", all: "All", feedback: "Guide feedback", problem: "Feedback" };

export const StudioReports = ({ rows, loading, error, filter, onFilter, onReload, onHandled, setupSql }) => {
  // Which rows are expanded. A list of twelve reports where every message is
  // shown in full is a page he has to scroll past to find the next one, and the
  // first line is nearly always enough to know whether this is the one.
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const list = Array.isArray(rows) ? rows : [];
  const waiting = unhandledCount(rows);

  const pill = (on) => ({
    background: on ? `${C.gold}1a` : "transparent",
    border: `1px solid ${on ? `${C.gold}88` : C.border}`,
    color: on ? C.gold : C.light,
    borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });

  return (
    <div style={{ background: C.surface, border: `1px dashed ${C.gold}66`, borderRadius: 14, padding: 16, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "'Fraunces', serif" }}>
          Reports
          {/* The count is on the heading rather than in the body, because the
              only question he has before opening this is whether it is worth
              opening. */}
          {waiting > 0 && (
            <span style={{ marginLeft: 8, background: C.accent, color: C.onAccent, borderRadius: 100, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
              {waiting}
            </span>
          )}
        </div>
        <button onClick={onReload} disabled={loading}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "5px 12px", fontSize: 11, cursor: loading ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {["open", "all", "problem", "feedback"].map(f => (
          <button key={f} onClick={() => onFilter?.(f)} aria-pressed={filter === f} style={pill(filter === f)}>
            {FILTER_LABEL[f] || f}
          </button>
        ))}
      </div>

      {/* ── THE MISSING POLICY, SAID OUT LOUD ────────────────────────
          gemlyx_support has no select policy by default, so until the SQL is
          run this panel gets an empty array and no error, which looks exactly
          like "no reports yet". That is the failure this codebase has shipped
          three times (gemlyx_research, the been column, the profile column) and
          the symptom is always the same: a thing that silently does nothing. */}
      {setupSql && (
        <div style={{ background: C.bg, border: `1px solid #FFB34755`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, color: "#FFB347", lineHeight: 1.6, marginBottom: 8 }}>
            Reports cannot be read yet. gemlyx_support has no select policy, so the table answers with nothing rather than with an error. Run this once in the Supabase SQL editor:
          </div>
          <pre style={{ margin: 0, fontSize: 10.5, color: C.light, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, overflowX: "auto", whiteSpace: "pre" }}>{setupSql}</pre>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "#FF8A80", marginBottom: 10 }}>{error}</div>
      )}

      {!loading && !list.length && (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, padding: "8px 0" }}>
          {filter === "open" ? "Nothing waiting. Everything that came in has been marked handled." : "No reports under this filter yet."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(row => {
          const id = String(row.id);
          const { said, context } = splitReport(row.message);
          const done = isHandled(row);
          const expanded = open.has(id);
          // The first line, for the collapsed state. A report's first sentence
          // is what it is about far more often than its topic is.
          const firstLine = said.split("\n").find(l => l.trim()) || "(no message)";
          return (
            <div key={id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", opacity: done ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{topicLabel(row.topic)}</span>
                <span style={{ fontSize: 10.5, color: C.muted }}>{reportAge(row.created_at)}</span>
                {row.reference && <span style={{ fontSize: 10.5, color: C.muted }}>· {row.reference}</span>}
                {row.email && (
                  // A mailto, because the commonest next action on a report is
                  // answering the person who sent it, and copying an address
                  // out of a table is the step where that stops happening.
                  <a href={`mailto:${row.email}?subject=${encodeURIComponent(`Gemlyx · ${row.reference || "your report"}`)}`}
                    style={{ fontSize: 10.5, color: C.gold, textDecoration: "underline" }}>{row.email}</a>
                )}
              </div>

              <div onClick={() => toggle(id)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } }}
                style={{ cursor: "pointer", fontSize: 12.5, color: C.text, lineHeight: 1.55, whiteSpace: expanded ? "pre-wrap" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {expanded ? said : firstLine}
              </div>

              {expanded && context && (
                <pre style={{ margin: "8px 0 0", fontSize: 10.5, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, overflowX: "auto", whiteSpace: "pre-wrap" }}>{context}</pre>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => onHandled?.(row, !done)}
                  style={{ background: done ? "transparent" : `${C.gold}1a`, border: `1px solid ${done ? C.border : `${C.gold}88`}`, color: done ? C.muted : C.gold, borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  {done ? "Reopen" : "Mark handled"}
                </button>
                <button onClick={() => toggle(id)}
                  style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: "'Inter', sans-serif" }}>
                  {expanded ? "Less" : "Read"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
