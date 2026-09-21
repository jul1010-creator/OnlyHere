import { useState } from "react";
import { C } from "../utils/theme";
import { Pill } from "./Pill";
import { gemsView, GEM_SECTION, WHERE_LABEL, checkedLabel, isOwnSite } from "../utils/cheapGems";

// ── THE CHEAP GEMS PAGE ─────────────────────────────────────────────
//
// Oliver, 21 Sep 2026, choosing an own entry in the navigation over a tab on
// every town. So this is one national page with a town filter, and a chain
// with no town on it shows under every town, because a Flying Tiger voucher
// works in the Flying Tiger in Ribe as well as the one on Strøget.
//
// THE ORDER ON A CARD IS THE ORDER A VISITOR NEEDS IT IN: what you save, who
// gets it, how, and then the catch, which is last because it is the thing
// that decides whether any of the rest applies to them. The checked date and
// the brand's own page close every card, so the claim and its evidence are
// never apart.
const sourceHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "Source"; } };

const GemCard = ({ g }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 16px" }}>
    <div style={{ fontSize: 18, fontWeight: 600, color: C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.15 }}>{g.name}</div>
    {g.what && <div style={{ fontSize: 13.5, color: C.gold, fontWeight: 700, marginTop: 6 }}>{g.what}</div>}
    {g.desc && <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.65, marginTop: 6 }}>{g.desc}</div>}
    {(g.who || g.how || g.where) && (
      <div style={{ fontSize: 12, color: C.light, lineHeight: 1.65, marginTop: 8, display: "grid", gap: 3 }}>
        {g.who && <div><b style={{ color: C.text }}>For:</b> {g.who}</div>}
        {g.how && <div><b style={{ color: C.text }}>How:</b> {g.how}</div>}
        {g.where && <div><b style={{ color: C.text }}>Where:</b> {WHERE_LABEL[g.where]}</div>}
      </div>
    )}
    {g.catch && (
      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginTop: 9, background: `${C.gold}12`, border: `1px solid ${C.gold}33`, borderRadius: 9, padding: "7px 10px" }}>
        <b>The catch:</b> {g.catch}
      </div>
    )}
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10, fontSize: 11, color: C.muted }}>
      <span>{checkedLabel(g)}</span>
      {g.towns?.length ? <span>{g.towns.join(", ")}</span> : null}
      {/* "Their page" only when it is theirs. A cheap place can be vouched for
          by a page that is not the place's own, and the link says whose it is
          rather than letting a third site pass for the brand. */}
      <a href={g.source} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>
        {isOwnSite(g.source, g.name) ? "Their page" : sourceHost(g.source)} ↗
      </a>
    </div>
  </div>
);

const Section = ({ title, rows }) => (
  <div style={{ marginBottom: 26 }}>
    <h3 style={{ fontSize: 21, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, margin: "0 0 12px" }}>{title}</h3>
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
      {rows.map(g => <GemCard key={`${g.kind}-${g.name}`} g={g} />)}
    </div>
  </div>
);

export const CheapGemsPage = ({ rows = [], title = "Cheap gems" }) => {
  const [town, setTown] = useState("");
  const view = gemsView(rows, { town });
  const all = gemsView(rows);
  const empty = !all.scheme.length && !all.cheap.length;
  return (
    <div style={{ padding: "16px", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 18, paddingTop: 8 }}>
        <h2 style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.05, margin: "0 0 10px" }}>{title}</h2>
        <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>
          Denmark is expensive, and the people who live here know where it is less so. Two kinds on this page: discounts you only get if you know to ask, and places that are cheap without asking. Each one says when it was last checked and links the page it was checked against.
        </div>
      </div>
      {empty ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 18px", maxWidth: 560 }}>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, marginBottom: 8 }}>No cheap gems published yet.</div>
          <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7 }}>
            Each one is checked against a page you can open yourself before it goes up, and the first ones will appear here as soon as they have been.
          </div>
        </div>
      ) : (<>
        {all.towns.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {[{ id: "", label: "All of Denmark" }, ...all.towns.map(t => ({ id: t, label: t }))].map(o => (
              <Pill key={o.id || "all"} label={o.label} active={town === o.id} onClick={() => setTown(o.id)} />
            ))}
          </div>
        )}
        {view.scheme.length > 0 && <Section title={GEM_SECTION.scheme} rows={view.scheme} />}
        {view.cheap.length > 0 && <Section title={GEM_SECTION.cheap} rows={view.cheap} />}
      </>)}
    </div>
  );
};

