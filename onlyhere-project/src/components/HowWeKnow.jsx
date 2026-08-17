import { useState } from "react";
import { C } from "../utils/theme";
import { dayLabel } from "../utils/calendarDay";
import { readerCorrections, readerUncertainties } from "../utils/provenance";

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

// ── AND A BARE DAY WOULD PRINT THE DAY BEFORE ───────────────────────
// Every value this is handed today is a full ISO instant, so a raw parse has
// always been right and this is not a fix for a live bug. It is a fix for the
// shape: one module away, openingHours.js writes `checkedOn` as
// String(fetchedAt).slice(0, 10), a bare day, and the moment anything renders
// one of those through here, `new Date("2026-08-11")` is UTC midnight and
// toLocaleDateString reads it locally, so it prints 10 Aug for every reader west
// of Greenwich. That is finding five of last night's five, verbatim.
//
// dayStart is right for both: a bare day is the day it names, and an instant is
// the local calendar day it fell on, which is what a "last checked" line means.
// It also returns null rather than an Invalid Date, so the fallback below fires
// on an unreadable value instead of relying on isNaN coercion.
//
// ── AND THE FORMATTING MOVED, 16 AUG ────────────────────────────────
// journey.js needed the same "16 Aug 2026" for the measured-on stamp under a
// stored timetable, and a util cannot import a component. This was the only copy
// and it is now dayLabel in calendarDay.js, next to the three readers it belongs
// with. What stays here is the FALLBACK, which is this file's own decision: an
// unreadable value is shown as it was stored rather than swallowed, because a
// provenance block that quietly drops a date is the one thing it must not do.
const dateLabel = (iso) => {
  if (!iso) return null;
  return dayLabel(iso) || (typeof iso === "string" ? iso : null);
};

export const HowWeKnow = ({ item }) => {
  const [open, setOpen] = useState(false);
  if (!item) return null;

  const corrections = Array.isArray(item.__corrections) ? item.__corrections : [];
  // ── ONLY THE OPEN QUESTIONS THAT CHANGE A DECISION ────────────────
  // Oliver, 17 Aug 2026, on this section: "only include things that are very
  // relevant.. Like 'Specific dishes, techniques, or signature ingredients on the
  // tasting menus aren't detailed in the source material.' who the fk cares..."
  //
  // The drafting prompt asks for an uncertainty per unconfirmed fact, which is
  // right, and it produces a list that is right for Studio and wrong here: the two
  // lines about money and hours end up buried under five about how thin the
  // research was. Filtered to money, time, getting in, getting there and whether
  // the thing exists, and capped, because a reader will read two and skim the rest.
  // Studio still sees all of them. See readerUncertainties in utils/provenance.js.
  const uncertainties = readerUncertainties(item.uncertainties);
  const official = isLink(item.website) ? item.website : null;

  // Nothing real to show means nothing shown. See rule 1 above.
  // ── THE OTHER PAGES THE RESEARCH ACTUALLY OPENED ─────────────────
  // "showing 1 source.. lmao." His words, and he is right: the paragraph above
  // claims entries are checked against primary sourceS and then produced one
  // link. Every page the pipeline opened for this place now travels on the
  // entry as __sources, minus aggregators and minus the official site, which
  // has its own line.
  //
  // CORRECTED 9 Aug: this comment used to say "absent on everything published
  // before 8 Aug". Checked against the live table, it was absent on ALL 79
  // rows, because shapeForLive is an allow-list and __sources was not on it, so
  // publish threw the list away every time. Fixed in utils/studioContent.js.
  const officialHost = official ? hostOf(official) : null;
  const sources = (Array.isArray(item.__sources) ? item.__sources : [])
    .filter(u => isLink(u) && hostOf(u) !== officialHost);

  if (corrections.length === 0 && uncertainties.length === 0 && !official && sources.length === 0) return null;

  // The most recent thing that actually happened to this entry. `verified` is
  // the festival stamp written at draft time; a correction is newer and more
  // specific, so it wins when both exist.
  const lastCheck = dateLabel(corrections.length ? corrections[corrections.length - 1].at : null) || (typeof item.verified === "string" ? item.verified : null);

  // ── "1 SOURCE" IS THE WORST THING THIS PANEL CAN SAY ─────────────
  // Oliver, 9 Aug 2026: "the picture with '1 source' makes me look like we got
  // it all from one source... this would instantly make people delete the app."
  //
  // He is right, and a bare count was the wrong shape for the number one. The
  // paragraph under it promises primary sourceS and rigour, and then the header
  // quietly reports the opposite. A reader does not think "the source list was
  // not recorded", they think "these people read one page and wrote an essay".
  //
  // So the count is never printed as a count of one. One known page is named
  // for what it is, the official site, which is a true and unembarrassing thing
  // to have checked. Several are counted, because then the number is the point.
  //
  // The underlying gap is real and being fixed separately: shapeForLive was
  // dropping __sources at publish, so zero of 79 rows carried the list the
  // research pipeline had already built. Entries drafted from now on carry it.
  const sourceHosts = new Set([
    ...(official ? [hostOf(official)] : []),
    ...sources.map(u => hostOf(u)),
    ...corrections.filter(c => isLink(c.source)).map(c => hostOf(c.source)),
  ].filter(Boolean));
  const sourceCount = sourceHosts.size;

  const summary = [
    sourceCount > 1 ? `${sourceCount} sources` : sourceCount === 1 ? "Official site" : null,
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
          {/* The paragraph has to match what is under it. Claiming "primary
              sources" over a single link is the exact thing that reads as a
              lie, so the sentence changes with the evidence rather than
              standing there as a fixed boast. */}
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.65, margin: "12px 0 16px" }}>
            {sourceCount > 1 ? (
              <>Gemlyx entries are researched and fact-checked against primary sources, then re-checked when
              something looks wrong. We do not claim to have been anywhere in person, and anything we could
              not stand up is listed below rather than quietly smoothed over.</>
            ) : (
              <>Gemlyx entries are researched against primary sources and re-checked when something looks
              wrong. This one was written before we started saving the full list of pages the research
              opened, so only the official site is shown below. We do not claim to have been anywhere in
              person, and anything we could not stand up is listed rather than quietly smoothed over.</>
            )}
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

          {sources.length > 0 && (
            <div style={{ marginBottom: uncertainties.length || corrections.length ? 16 : 0 }}>
              <div style={label}>Also checked</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px" }}>
                {sources.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11.5, color: C.light, textDecoration: "none", borderBottom: `1px solid ${C.border}`, wordBreak: "break-word" }}>
                    {hostOf(u)} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {corrections.length > 0 && (
            <div style={{ marginBottom: uncertainties.length ? 16 : 0 }}>
              <div style={label}>What we corrected</div>
              {/* ── THE CHECKER'S VOICE NEVER REACHES A READER ──────
                  Oliver, 17 Aug 2026, highlighting a line on the live Aro page:
                  "howItsMade · was: The draft incorrectly states diners can choose
                  three, four, five, or seven courses". His verdict: "People will
                  think the draft is incorrect.. don't include this."

                  Two things were wrong. The label said "was:" and the text was
                  never the old value: nothing stores that, so this printed the
                  CHECKER'S finding, written for Studio, under a label promising a
                  fact. And a visitor reading "the draft incorrectly states" on a
                  published page concludes the page is wrong, which is the exact
                  opposite of what this panel exists to say.

                  What a reader gets now is the part that is a trust signal and is
                  entirely true: which field was checked, against which page, on
                  which day. Studio keeps the full text. See readerCorrections. */}
              {readerCorrections(item).slice().reverse().map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 9 }}>
                  <span style={{ color: C.text, fontWeight: 700 }}>{c.field}</span>
                  <span style={{ color: C.muted }}> · checked against </span>
                  <a href={c.source} target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 700 }}>{hostOf(c.source)} ↗</a>
                  {c.at ? <span style={{ color: C.muted }}> · {dateLabel(c.at)}</span> : null}
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
