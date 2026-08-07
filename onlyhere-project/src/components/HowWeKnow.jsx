import { useState } from "react";
import { C } from "../utils/theme";

// ── SHOWING THE WORKING (Oliver, 7 Aug 2026) ─────────────────────────
//
// Everything this app is built around is currently invisible to the person
// reading it. There is a deterministic audit over every published row, a
// __corrections log carrying real primary-source URLs, and an uncertainties
// array recording what could not be confirmed. A visitor sees none of it, and
// so Gemlyx makes exactly the same claim every travel site makes: trust us.
//
// This is the part nobody copies. Any site can say "verified". Almost none will
// print, under their own article, the list of things they could not stand up.
// That second section is the one that matters, and it is only publishable
// because the pipeline already refuses to guess: the uncertainties are real,
// they were written by the system rather than by a person deciding what to
// admit to, and Oliver's whole standing rule is that an unconfirmable claim
// comes out rather than getting softened.
//
// TWO RULES THIS FILE OBEYS.
//
// 1. NEVER MANUFACTURE PROVENANCE. If an entry has no corrections, no
//    uncertainties and no official site, this renders NOTHING. An empty
//    "verified" badge on an entry with nothing behind it would be worse than
//    no badge at all, because it would be the app doing the exact thing it
//    exists to stop. Most older entries will show nothing today, and that is
//    the honest state of them, not a bug to paper over.
// 2. NEVER SAY OR IMPLY ANYONE WENT THERE. The framing is researched and
//    fact-checked, which is true, and it is the standing rule.

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
};

// A correction row is only worth showing as a SOURCE if it points at something
// a reader can open. "asserted by the founder, not source-verified" and "live
// routing measurement" are honest provenance but they are not links, so they
// are shown as text and never dressed up as a citation.
const isLink = (s) => typeof s === "string" && /^https?:\/\//i.test(s);

const dateLabel = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return typeof iso === "string" ? iso : null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const HowWeKnow = ({ item }) => {
  const [open, setOpen] = useState(false);
  if (!item) return null;

  const corrections = Array.isArray(item.__corrections) ? item.__corrections : [];
  const uncertainties = (Array.isArray(item.uncertainties) ? item.uncertainties : []).filter(u => typeof u === "string" && u.trim());
  const official = isLink(item.website) ? item.website : null;

  // Nothing real to show means nothing shown. See rule 1 above.
  if (corrections.length === 0 && uncertainties.length === 0 && !official) return null;

  // The most recent thing that actually happened to this entry. `verified` is
  // the festival stamp written at draft time; a correction is newer and more
  // specific, so it wins when both exist.
  const lastCheck = dateLabel(corrections.length ? corrections[corrections.length - 1].at : null) || (typeof item.verified === "string" ? item.verified : null);

  const sourceCount = new Set([
    ...(official ? [hostOf(official)] : []),
    ...corrections.filter(c => isLink(c.source)).map(c => hostOf(c.source)),
  ].filter(Boolean)).size;

  const summary = [
    sourceCount ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}` : null,
    corrections.length ? `${corrections.length} correction${corrections.length === 1 ? "" : "s"}` : null,
    uncertainties.length ? `${uncertainties.length} open question${uncertainties.length === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(" · ");

  const label = { fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, marginBottom: 7 };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 22, overflow: "hidden", background: C.surface }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: "13px 15px", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 3l7.5 3v5.4c0 4.4-3 8.2-7.5 9.6-4.5-1.4-7.5-5.2-7.5-9.6V6z" />
          <path d="M9 12.2l2.1 2.1L15.4 10" />
        </svg>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.text }}>
            How we know this{lastCheck ? <span style={{ color: C.muted, fontWeight: 600 }}> · checked {lastCheck}</span> : null}
          </span>
          {summary && <span style={{ display: "block", fontSize: 11, color: C.muted, marginTop: 2 }}>{summary}</span>}
        </span>
        <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 15px 15px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.65, margin: "12px 0 16px" }}>
            Gemlyx entries are researched and fact-checked against primary sources, then re-checked when
            something looks wrong. We do not claim to have been anywhere in person, and anything we could
            not stand up is listed below rather than quietly smoothed over.
          </div>

          {official && (
            <div style={{ marginBottom: uncertainties.length || corrections.length ? 16 : 0 }}>
              <div style={label}>Primary source</div>
              <a href={official} target="_blank" rel="noreferrer"
                style={{ fontSize: 12.5, color: C.gold, fontWeight: 700, textDecoration: "none", wordBreak: "break-word" }}>
                {hostOf(official)} ↗
              </a>
            </div>
          )}

          {corrections.length > 0 && (
            <div style={{ marginBottom: uncertainties.length ? 16 : 0 }}>
              <div style={label}>What we corrected</div>
              {corrections.slice().reverse().map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 9 }}>
                  <span style={{ color: C.text, fontWeight: 700 }}>{c.field}</span>
                  {c.was ? <span style={{ color: C.muted }}> · was: {c.was}</span> : null}
                  <div style={{ marginTop: 2 }}>
                    {isLink(c.source)
                      ? <a href={c.source} target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>{hostOf(c.source)} ↗</a>
                      : <span style={{ color: C.muted, fontStyle: "italic" }}>{c.source}</span>}
                    {c.at ? <span style={{ color: C.muted }}> · {dateLabel(c.at)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {uncertainties.length > 0 && (
            <div>
              {/* THE SECTION THAT MAKES THIS WORTH SHIPPING. Printed verbatim,
                  not summarised: the moment these get rewritten to sound better
                  they stop being a record and become copy. */}
              <div style={{ ...label, color: "#FFB347" }}>What we could not confirm</div>
              {uncertainties.map((u, i) => (
                <div key={i} style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 7, paddingLeft: 12, borderLeft: `2px solid #FFB34755` }}>{u}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
