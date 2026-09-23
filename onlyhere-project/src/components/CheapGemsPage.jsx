import { useState } from "react";
import { C } from "../utils/theme";
import { Pill } from "./Pill";
import { gemsView, GEM_SECTION, WHERE_LABEL, checkedLabel, isOwnSite, gemMatches, gemFilterOptions, gemWhere, GEM_CATEGORY_LABEL, saidLine } from "../utils/cheapGems";

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

const GemCard = ({ g, point, me }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 16px" }}>
    {/* ── WHERE IT IS, AND HOW FAR THAT IS ───────────────────────────
        Oliver, 22 Sep 2026: "And also add location, and how far it is from
        'you'." The town is the location a shop has; the distance is only
        printed when the town is one we hold a point for and the reader is
        somewhere in Denmark, so nothing here is a figure nobody measured.
        A chain with no town works everywhere and says so. */}
    <div style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>
      {gemWhere(g, { point, me })}
    </div>
    <div style={{ fontSize: 18, fontWeight: 600, color: C.text, fontFamily: "'Fraunces', serif", lineHeight: 1.15 }}>{g.name}</div>
    {g.what && <div style={{ fontSize: 13.5, color: C.gold, fontWeight: 700, marginTop: 6 }}>{g.what}</div>}
    {g.desc && <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.65, marginTop: 6 }}>{g.desc}</div>}
    {(g.who || g.how || (g.where && g.kind === "scheme")) && (
      <div style={{ fontSize: 12, color: C.light, lineHeight: 1.65, marginTop: 8, display: "grid", gap: 3 }}>
        {g.who && <div><b style={{ color: C.text }}>For:</b> {g.who}</div>}
        {g.how && <div><b style={{ color: C.text }}>How:</b> {g.how}</div>}
        {/* Only for a discount, where "in the shop" against "online" is the
            thing that decides whether it is any use. Oliver, 22 Sep 2026, of a
            cheap shop: "it should ONLY be in the shop. Nobody will buy
            anything online." */}
        {g.where && g.kind === "scheme" && <div><b style={{ color: C.text }}>Where:</b> {WHERE_LABEL[g.where]}</div>}
      </div>
    )}
    {g.catch && (
      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginTop: 9, background: `${C.gold}12`, border: `1px solid ${C.gold}33`, borderRadius: 9, padding: "7px 10px" }}>
        <b>The catch:</b> {g.catch}
      </div>
    )}
    {/* ── WHOSE WORD THIS IS ON ─────────────────────────────────────
        A saving that came off a page shows the page and says nothing more.
        One that came from somebody who has been there says so in as many
        words, because a reader who walks in and asks for it deserves to know
        who told us. See saidLine. */}
    {saidLine(g) && (
      <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.6, marginTop: 9, background: `${C.border}44`, borderRadius: 9, padding: "7px 10px" }}>
        {saidLine(g)}
      </div>
    )}
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10, fontSize: 11, color: C.muted }}>
      <span>{checkedLabel(g)}</span>
      {/* "Their page" only when it is theirs. A cheap place can be vouched for
          by a page that is not the place's own, and the link says whose it is
          rather than letting a third site pass for the brand. A row standing
          on a local's word has no page at all, and shows no link rather than
          a link to nowhere. */}
      {g.source && (
        <a href={g.source} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>
          {isOwnSite(g.source, g.name) ? "Their page" : sourceHost(g.source)} ↗
        </a>
      )}
    </div>
  </div>
);

const Grid = ({ rows, point, me }) => (
  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginBottom: 26 }}>
    {rows.map(g => <GemCard key={`${g.kind}-${g.name}`} g={g} point={point} me={me} />)}
  </div>
);

export const CheapGemsPage = ({ rows = [], title = "Cheap gems", pointFor = null, userCoords = null }) => {
  const [town, setTown] = useState("");
  const [kind, setKind] = useState("");
  const [category, setCategory] = useState("");
  const [students, setStudents] = useState(false);
  const [q, setQ] = useState("");
  const narrowed = rows.filter(g => gemMatches(g, { category, students, q }));
  const view = gemsView(narrowed, { town });
  const all = gemsView(rows);
  const opts = gemFilterOptions(rows);
  const empty = !all.scheme.length && !all.cheap.length;
  const showScheme = kind !== "cheap" && view.scheme.length > 0;
  const showCheap = kind !== "scheme" && view.cheap.length > 0;
  const anyFilter = !!(town || kind || category || students || q);
  const clearAll = () => { setTown(""); setKind(""); setCategory(""); setStudents(false); setQ(""); };
  const row = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 };
  return (
    <div style={{ padding: "16px", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 18, paddingTop: 8 }}>
        <h2 style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.05, margin: "0 0 10px" }}>{title}</h2>
        <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>
          Denmark is one of the most expensive countries to visit. If you want to avoid that, you can try out the following shops.
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
        {opts.search && (
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search cheap gems" aria-label="Search cheap gems"
            style={{ width: "100%", maxWidth: 420, boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "10px 16px", fontSize: 13, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 12 }} />
        )}
        {all.towns.length > 0 && (
          <div style={row}>
            {[{ id: "", label: "All of Denmark" }, ...all.towns.map(t => ({ id: t, label: t }))].map(o => (
              <Pill key={o.id || "all"} label={o.label} active={town === o.id} onClick={() => setTown(o.id)} />
            ))}
          </div>
        )}
        {(opts.categories.length > 0 || opts.kinds.length > 0 || opts.students) && (
          <div style={{ ...row, marginBottom: 18 }}>
            {opts.categories.map(c => (
              <Pill key={c} label={GEM_CATEGORY_LABEL[c]} active={category === c} onClick={() => setCategory(category === c ? "" : c)} />
            ))}
            {opts.kinds.map(k => (
              <Pill key={k} label={GEM_SECTION[k]} active={kind === k} onClick={() => setKind(kind === k ? "" : k)} />
            ))}
            {opts.students && <Pill label="For students" active={students} onClick={() => setStudents(!students)} />}
          </div>
        )}
        {/* ── ONE GRID, AND THE FILTERS DO THE SORTING ──────────────
            Oliver, 22 Sep 2026: "remove 'Cheap anyway', swap it out with
            filters." Two headings over two short lists read as two pages;
            the pills above already say which kind is which, so the rows sit
            in one grid with the discounts first. */}
        {(showScheme || showCheap) && (
          <Grid rows={[...(showScheme ? view.scheme : []), ...(showCheap ? view.cheap : [])]} point={pointFor} me={userCoords} />
        )}
        {!showScheme && !showCheap && anyFilter && (
          <div style={{ textAlign: "center", padding: "36px 16px" }}>
            <div style={{ fontSize: 15, color: C.light, fontFamily: "'Fraunces', serif", marginBottom: 8 }}>Nothing published matches that.</div>
            <button onClick={clearAll}
              style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              Clear
            </button>
          </div>
        )}
      </>)}
    </div>
  );
};

