import { useState } from "react";
import { C } from "../utils/theme";
import { askOpenAI } from "../utils/aiClient";
import { menuImagesToRead, textHasPrice } from "../utils/pageScan";
import { gemSearches, gemSearchesFor, ownPagesIn, pageAsResult, GEMS_PROMPT, settleGems, gemRunNotes, gemProblems, isCouponSite, WHERE_LABEL } from "../utils/cheapGems";

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

export const CheapGemsPanel = ({ existing = [], onPublish, readPage = null, readImage = null }) => {
  const [place, setPlace] = useState("");
  const [named, setNamed] = useState("");
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState([]);
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");

  const have = new Set(existing.map(n => String(n || "").trim().toLowerCase()));
  const statusOf = (r) => {
    const { problems, blocks } = gemProblems(r);
    const dupe = have.has(String(r.name || "").trim().toLowerCase());
    return { problems: dupe ? [...problems, "Already published under this name."] : problems, blocks: blocks || dupe };
  };

  // `only`: a place he already knows. The town field still narrows the search.
  const find = async (only = "") => {
    setBusy("searching"); setError(""); setAdded(""); setRows([]); setPicked([]); setNotes([]);
    try {
      const seen = new Set();
      const results = [];
      for (const q of only ? gemSearchesFor(only, place) : gemSearches(place)) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&n=6`);
        const data = await res.json().catch(() => null);
        for (const r of Array.isArray(data?.results) ? data.results : []) {
          const url = String(r?.url || "");
          if (!url || seen.has(url) || isCouponSite(url)) continue;
          seen.add(url);
          results.push(r);
        }
      }
      if (!results.length) { setError("The searches came back empty."); setBusy(""); return; }
      // A NAME LOOKUP READS THE PLACE'S OWN PAGES, and a menu that is a
      // picture is transcribed. What they add goes to the front, so it is
      // inside the results the model is handed. See ownPagesIn.
      const read = [];
      const readNotes = [];
      if (only && readPage) {
        setBusy("reading the page");
        for (const r of ownPagesIn(results, only)) {
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
      const out = await askOpenAI(GEMS_PROMPT(place, results.slice(0, MAX_RESULTS), { only }), 3000);
      if (out?.error) { setError(String(out.error).slice(0, 200)); setBusy(""); return; }
      const json = parseJson(out?.text);
      if (!json) { setError("The model answered with something that was not a list."); setBusy(""); return; }
      const settled = settleGems(json, results.slice(0, MAX_RESULTS), { only });
      setRows(settled.gems);
      // TICKED ONLY WHEN IT MAY GO UP AND COMES FROM THE BRAND ITSELF. A lead
      // from somebody else's page waits for him to look at it.
      setPicked(settled.gems.map(g => g.own && !statusOf(g).blocks));
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
        <input value={named} onChange={e => setNamed(e.target.value)} placeholder="A place you know, by name"
          style={{ flex: "1 1 200px", minWidth: 0, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, fontFamily: "'Inter', sans-serif" }} />
        <button onClick={() => find(named.trim())} disabled={!!busy || !named.trim()}
          style={{ background: "none", border: `1px solid ${C.gold}66`, borderRadius: 100, padding: "8px 15px", fontSize: 11.5, fontWeight: 700, color: C.gold, cursor: busy || !named.trim() ? "default" : "pointer", opacity: busy || !named.trim() ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
          Look it up
        </button>
      </div>
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
