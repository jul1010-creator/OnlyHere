import { useState } from "react";
import { C } from "../utils/theme";
import { askOpenAI } from "../utils/aiClient";
import { menuImagesToRead, textHasPrice, hostOf } from "../utils/pageScan";
import { gemSearches, gemSearchesFor, ownPagesIn, pageAsResult, GEMS_PROMPT, settleGems, gemRunNotes, gemProblems, isCouponSite, isDataSite, WHERE_LABEL, saidLine, gemsToLocate, gemBranchesFound, gemLocateNote } from "../utils/cheapGems";

// ── FINDING CHEAP GEMS, FOR HIM TO PICK ─────────────────────────────
//
// Oliver, 21 Sep 2026, choosing who fills the Cheap gems page: "Pipeline
// research". It PROPOSES. Nothing reaches a reader until he ticks it and
// presses the button, and a row with a blocking problem cannot be ticked.
//
// Four searches and one model call a run. The results that come off coupon
// sites are dropped BEFORE the model reads them, which saves the tokens and
// means the model never sees "85% OFF" to repeat; settleGems drops them again
// afterwards, because a rule the prompt states is not a rule until code
// enforces it.
const MAX_RESULTS = 20;

const parseJson = (text) => {
  const raw = String(text || "").replace(/^```json\s*|\s*```$/g, "").trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(raw.slice(a, b + 1)); } catch { return null; }
};

export const CheapGemsPanel = ({ existing = [], published = [], onPublish, onLocate = null, readPage = null, readImage = null }) => {
  const [place, setPlace] = useState("");
  const [named, setNamed] = useState("");
  // ── WHAT HE ALREADY KNOWS THE DEAL IS ─────────────────────────────
  //
  // Oliver, 23 Sep 2026: "If I write something, then also let me be able to
  // write the discount." Empty, this is the pass it has always been. Filled,
  // the pass stops looking for a saving and goes to confirm his.
  const [deal, setDeal] = useState("");
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState([]);
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");
  // What the location sweep came back with, one entry per published gem.
  const [found, setFound] = useState([]);

  const have = new Set(existing.map(n => String(n || "").trim().toLowerCase()));
  const statusOf = (r) => {
    const { problems, blocks } = gemProblems(r);
    const dupe = have.has(String(r.name || "").trim().toLowerCase());
    return { problems: dupe ? [...problems, "Already published under this name."] : problems, blocks: blocks || dupe };
  };

  // `only`: a place he already knows, by name or as its address. Oliver,
  // 22 Sep 2026: "And I still can't search for https://www.mschcopenhagen.dk/".
  // Pasting the shop's own page is the shortest way to say which shop, so a
  // URL in that box is read directly and the searches run on its host name.
  const find = async (typed = "", told = "") => {
    const url = /^https?:\/\//i.test(String(typed).trim()) ? String(typed).trim() : "";
    const only = url ? hostOf(url).replace(/\.[a-z.]{2,7}$/i, "").replace(/[-_]+/g, " ") : String(typed).trim();
    // A sentence with no place to attach it to is not a lookup. The button
    // that carries it is disabled without a name, and this is the same rule
    // where the run happens.
    const said = only ? String(told).trim() : "";
    setBusy("searching"); setError(""); setAdded(""); setRows([]); setPicked([]); setNotes([]);
    try {
      const seen = new Set();
      const results = [];
      for (const q of only ? gemSearchesFor(only, place, said) : gemSearches(place)) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&n=6`);
        const data = await res.json().catch(() => null);
        for (const r of Array.isArray(data?.results) ? data.results : []) {
          const url = String(r?.url || "");
          if (!url || seen.has(url) || isCouponSite(url) || isDataSite(url)) continue;
          seen.add(url);
          results.push(r);
        }
      }
      if (!results.length && !url && !said) { setError("The searches came back empty."); setBusy(""); return; }
      // A NAME LOOKUP READS THE PLACE'S OWN PAGES, and a menu that is a
      // picture is transcribed. What they add goes to the front, so it is
      // inside the results the model is handed. See ownPagesIn.
      const read = [];
      const readNotes = [];
      if (only && readPage) {
        setBusy("reading the page");
        // The page he pasted first, then the place's own pages in the results.
        for (const r of [...(url ? [{ url, title: only }] : []), ...ownPagesIn(results, only).filter(r => r.url !== url)]) {
          const page = await readPage(r.url).catch(() => null);
          const text = String(page?.text || "");
          // The page's own words go in whatever they are about, so a shop's
          // discount page counts as much as a restaurant's menu. Then, only
          // when those words carry no price, its menu pictures.
          const got = pageAsResult({ url: r.url, title: r.title, text });
          if (got) read.push(got);
          if (textHasPrice(text)) continue;
          for (const img of (readImage ? menuImagesToRead({ url: r.url, text, banners: page?.banners }) : [])) {
            const shot = await readImage(img.url, only).catch(() => null);
            if (!shot?.text) continue;
            const got = pageAsResult({ url: r.url, title: r.title, text: shot.text, fromImage: true });
            if (got) { read.push(got); readNotes.push(`Read a menu picture on ${new URL(r.url).hostname.replace(/^www\./, "")}. Check the figure against it before publishing.`); }
          }
        }
      }
      results.unshift(...read);
      setBusy("reading");
      const out = await askOpenAI(GEMS_PROMPT(place, results.slice(0, MAX_RESULTS), { only, said }), 3000);
      if (out?.error) { setError(String(out.error).slice(0, 200)); setBusy(""); return; }
      const json = parseJson(out?.text);
      if (!json) { setError("The model answered with something that was not a list."); setBusy(""); return; }
      const settled = settleGems(json, results.slice(0, MAX_RESULTS), { only, said });
      setRows(settled.gems);
      // TICKED ONLY WHEN IT MAY GO UP AND COMES FROM THE BRAND ITSELF. A lead
      // from somebody else's page waits for him to look at it.
      // A row he wrote the deal for is ticked whoever's page it stands on:
      // the lead is his, and what he is looking at is what the pass made of
      // it rather than whether to trust the lead.
      setPicked(settled.gems.map(g => (g.own || !!g.said) && !statusOf(g).blocks));
      setNotes([...readNotes, ...gemRunNotes(settled)]);
    } catch (err) {
      setError(String(err?.message || err).slice(0, 200));
    }
    setBusy("");
  };

  const setSource = (i, url) => {
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, source: url.trim() } : r)));
  };

  const publish = async () => {
    const chosen = rows.filter((r, i) => picked[i] && !statusOf(r).blocks);
    if (!chosen.length || !onPublish) return;
    setBusy("saving"); setError(""); setAdded("");
    const got = await onPublish(chosen);
    if (got?.ok) {
      setAdded(`Published ${got.done}. They show on the page after a reload.`);
      setRows(prev => prev.filter(r => !chosen.includes(r)));
      setPicked(prev => prev.filter((_, i) => !chosen.includes(rows[i])));
    } else {
      setError(got?.why || "Could not publish.");
    }
    setBusy("");
  };

  // ── THE LOCATION SWEEP ────────────────────────────────────────────
  //
  // Oliver, 24 Sep 2026: "we need a 'location sweep'. Now, some will be all of
  // Denmark, just make a 'store closest to me'." One call to places-locate per
  // published gem that has no shops on it yet, the chains first, and every
  // address ticked the way the single-entry lookup already ticks them: named
  // like the brand is ticked, anything else is shown and left for him.
  const toLocate = gemsToLocate(published);
  const sweepOne = async (row) => {
    const res = await fetch(`/api/places-locate?limit=12&name=${encodeURIComponent(row.gem.name)}`);
    const data = await res.json().catch(() => null);
    if (data?.error) throw new Error(String(data.error).slice(0, 120));
    const found = gemBranchesFound(row.gem, data?.candidates);
    return { ...row, found, chosen: new Set(found.map((c, i) => (c.matches ? i : -1)).filter(i => i >= 0)) };
  };
  const sweep = async () => {
    if (!toLocate.length) return;
    setBusy("locating"); setError(""); setAdded("");
    const out = [];
    try {
      for (const row of toLocate) out.push(await sweepOne(row));
    } catch (err) {
      setError(String(err?.message || err).slice(0, 200));
    }
    setFound(out);
    setBusy("");
  };
  const saveFound = async () => {
    if (!onLocate) return;
    setBusy("saving"); setError(""); setAdded("");
    let done = 0;
    for (const row of found) {
      const picked = [...row.chosen].map(i => row.found[i]).filter(Boolean);
      if (!picked.length) continue;
      const got = await onLocate(row.id, picked);
      if (!got?.ok) { setError(got?.why || "Could not save the shops."); setBusy(""); return; }
      done += 1;
    }
    setAdded(`${done} now know where their shops are.`);
    setFound([]);
    setBusy("");
  };

  const box = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", marginTop: 12 };
  const count = rows.filter((r, i) => picked[i] && !statusOf(r).blocks).length;
  return (
    <div style={box}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>Cheap gems</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
        <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Town, or empty for all of Denmark"
          style={{ flex: "1 1 200px", minWidth: 0, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, fontFamily: "'Inter', sans-serif" }} />
        <button onClick={() => find()} disabled={!!busy}
          style={{ background: C.gold, border: "none", borderRadius: 100, padding: "8px 15px", fontSize: 11.5, fontWeight: 700, color: C.onGold, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
          {busy === "searching" ? "Searching…" : busy === "reading the page" ? "Reading their page…" : busy === "reading" ? "Reading…" : `Find cheap gems in ${place.trim() || "Denmark"}`}
        </button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
        <input value={named} onChange={e => setNamed(e.target.value)} placeholder="A place you know, by name or its web address"
          style={{ flex: "1 1 200px", minWidth: 0, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, fontFamily: "'Inter', sans-serif" }} />
        <button onClick={() => find(named.trim(), deal.trim())} disabled={!!busy || !named.trim()}
          style={{ background: "none", border: `1px solid ${C.gold}66`, borderRadius: 100, padding: "8px 15px", fontSize: 11.5, fontWeight: 700, color: C.gold, cursor: busy || !named.trim() ? "default" : "pointer", opacity: busy || !named.trim() ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
          {deal.trim() ? "Confirm it" : "Look it up"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
        <input value={deal} onChange={e => setDeal(e.target.value)} placeholder="The deal, in your words, if you know it"
          style={{ flex: "1 1 260px", minWidth: 0, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, fontFamily: "'Inter', sans-serif" }} />
      </div>
      {(toLocate.length > 0 || found.length > 0) && onLocate && (
        <div style={{ marginTop: 11, paddingTop: 9, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.1, textTransform: "uppercase" }}>
              Where their shops are
            </div>
            <button onClick={sweep} disabled={!!busy || !toLocate.length}
              style={{ background: "none", border: `1px solid ${C.gold}66`, borderRadius: 100, padding: "5px 12px", fontSize: 10.5, fontWeight: 700, color: C.gold, cursor: busy || !toLocate.length ? "default" : "pointer", opacity: busy || !toLocate.length ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
              {busy === "locating" ? "Looking…" : `Sweep ${toLocate.length}`}
            </button>
          </div>
          {found.map((row, ri) => (
            <div key={row.id ?? ri} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10.5, color: C.muted }}>{gemLocateNote(row.gem.name, row.found)}</div>
              {row.found.map((c, i) => (
                <label key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 11, color: C.light, marginTop: 3, cursor: "pointer" }}>
                  <input type="checkbox" checked={row.chosen.has(i)}
                    onChange={() => setFound(prev => prev.map((r, j) => {
                      if (j !== ri) return r;
                      const next = new Set(r.chosen);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return { ...r, chosen: next };
                    }))}
                    style={{ marginTop: 3, accentColor: C.gold, cursor: "pointer" }} />
                  <span>{[c.address, c.town].filter(Boolean).join(", ")}{c.found && !c.matches ? ` (listed as ${c.found})` : ""}</span>
                </label>
              ))}
            </div>
          ))}
          {found.length > 0 && (
            <button onClick={saveFound} disabled={!!busy}
              style={{ marginTop: 9, background: C.gold, border: "none", borderRadius: 100, padding: "7px 14px", fontSize: 11, fontWeight: 700, color: C.onGold, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
              {busy === "saving" ? "Saving…" : "Save the ticked ones"}
            </button>
          )}
        </div>
      )}
      {notes.length > 0 && (
        <ul style={{ margin: "9px 0 0", paddingLeft: 15, fontSize: 10.5, color: C.muted, lineHeight: 1.55 }}>
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
      {rows.length > 0 && (
        <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 9 }}>
          {rows.map((r, i) => {
            const st = statusOf(r);
            return (
              <div key={`${r.kind}-${r.name}-${i}`} style={{ display: "flex", gap: 7, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <input type="checkbox" checked={!!picked[i] && !st.blocks} disabled={st.blocks}
                  onChange={() => setPicked(prev => prev.map((v, j) => (j === i ? !v : v)))}
                  style={{ marginTop: 3, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: C.light, lineHeight: 1.55, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 100, padding: "1px 7px", marginRight: 6 }}>{r.kind}</span>
                  <b style={{ color: C.text }}>{r.name}</b>
                  {r.what && <span style={{ color: C.gold }}> · {r.what}</span>}
                  {r.towns?.length ? <span style={{ color: C.muted }}> · {r.towns.join(", ")}</span> : null}
                  {r.who && <div>For: {r.who}</div>}
                  {r.how && <div>How: {r.how}</div>}
                  {r.where && <div>Where: {WHERE_LABEL[r.where]}</div>}
                  {r.catch && <div style={{ color: C.text }}>The catch: {r.catch}</div>}
                  {r.desc && <div style={{ color: C.muted }}>{r.desc}</div>}
                  {r.said && (
                    <div style={{ marginTop: 5, color: r.saidCheck === "contradicted" ? "#FFB347" : C.light }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 100, padding: "1px 7px", marginRight: 6 }}>
                        {r.saidCheck === "confirmed" ? "on their page" : r.saidCheck === "contradicted" ? "page says otherwise" : "your word"}
                      </span>
                      {saidLine(r)}
                    </div>
                  )}
                  <input value={r.source} onChange={e => setSource(i, e.target.value)} aria-label="Source"
                    style={{ width: "100%", marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 7px", fontSize: 10.5, fontFamily: "'Inter', sans-serif" }} />
                  {st.problems.length > 0 && (
                    <ul style={{ margin: "4px 0 0", paddingLeft: 14, fontSize: 10, color: st.blocks ? "#FFB347" : C.muted }}>
                      {st.problems.map((p, k) => <li key={k}>{p}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {(rows.length > 0 || added || error) && (
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginTop: 9 }}>
          {rows.length > 0 && (
            <button onClick={publish} disabled={!!busy || !count}
              style={{ background: C.gold, border: "none", borderRadius: 100, padding: "8px 15px", fontSize: 11.5, fontWeight: 700, color: C.onGold, cursor: busy || !count ? "default" : "pointer", opacity: busy || !count ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
              {busy === "saving" ? "Publishing…" : `Publish ${count}`}
            </button>
          )}
          {added && <span style={{ fontSize: 10.5, color: C.gold }}>{added}</span>}
          {error && <span style={{ fontSize: 10.5, color: "#FFB347" }}>{error}</span>}
        </div>
      )}
    </div>
  );
};
