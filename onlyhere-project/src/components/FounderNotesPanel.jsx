import { useState } from "react";
import { C } from "../utils/theme";
import { askOpenAI } from "../utils/aiClient";
import { NOTE_KINDS, NOTE_KIND_LABEL, NOTE_KIND_MEANING, noteSearches, NOTE_PROMPT, settleNote, noteProblems, noteRunNotes, NOTE_LINE, noteLive, shapeNote, namesPublished } from "../utils/founderNotes";

// ── TELLING GEMLYX SOMETHING IT COULD NOT LOOK UP ───────────────────
//
// Oliver, 23 Sep 2026: "I want it to learn from me... I want Gemlyx AI to
// actually be as close to a local as possible."
//
// He writes a sentence, says which sort of thing it is and when it holds, and
// presses check. The pass looks for what NARROWS it rather than for whether
// he is right, because his own first example was true day to day and false
// six weeks out. Nothing reaches a traveller until he publishes it.
const parseJson = (text) => {
  const raw = String(text || "").replace(/^```json\s*|\s*```$/g, "").trim();
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(raw.slice(a, b + 1)); } catch { return null; }
};

const field = {
  width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text,
  borderRadius: 8, padding: "7px 10px", fontSize: 11.5, fontFamily: "'Inter', sans-serif",
};

export const FounderNotesPanel = ({ onPublish, onSave = null, existing = [], library = [], onRemove = null }) => {
  const [said, setSaid] = useState("");
  const [kind, setKind] = useState("how");
  const [when, setWhen] = useState("");
  const [about, setAbout] = useState("");
  const [towns, setTowns] = useState("");
  const [row, setRow] = useState(null);
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");
  // ── EDITING ONE IT ALREADY KNOWS ──────────────────────────────────
  //
  // The id of the published row the boxes are holding, or null for a new
  // sentence. Set by Change on a listed note, cleared by saving it or by
  // Leave it. The check button reads it too: a reworded sentence is a
  // different claim and goes through the pass again, so the row it saves is
  // the one that came back, not the one he opened.
  const [editing, setEditing] = useState(null);

  const draft = () => ({
    said: said.trim(),
    kind,
    when: when.trim(),
    about: about.trim(),
    towns: towns.split(",").map(t => t.trim()).filter(Boolean),
  });

  const check = async () => {
    const note = draft();
    if (!note.said) return;
    setBusy("checking"); setError(""); setAdded(""); setRow(null); setNotes([]);
    // ADVICE IS NOT CHECKED. "It would be a good idea to get to know a local"
    // is not a claim about the world, and a page agreeing with it would not
    // make it truer. It goes straight to a row he can publish.
    if (kind === "advice") {
      const at = new Date();
      const got = { ...note, check: "", checkedAt: `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}` };
      setRow(got); setNotes(noteRunNotes(got)); setBusy("");
      return;
    }
    try {
      const seen = new Set();
      const results = [];
      for (const q of noteSearches(note)) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&n=6`);
        const data = await res.json().catch(() => null);
        for (const r of Array.isArray(data?.results) ? data.results : []) {
          const url = String(r?.url || "");
          if (!url || seen.has(url)) continue;
          seen.add(url);
          results.push(r);
        }
      }
      const out = await askOpenAI(NOTE_PROMPT(note, results.slice(0, 18)), 1200);
      if (out?.error) { setError(String(out.error).slice(0, 200)); setBusy(""); return; }
      const json = parseJson(out?.text);
      // A PASS THAT SAID NOTHING USABLE HAS FOUND NOTHING, which is a real
      // answer and not an error: the note still goes up on his word.
      const got = settleNote(json || {}, note, results.slice(0, 18));
      setRow(got);
      setNotes(noteRunNotes(got));
    } catch (err) {
      setError(String(err?.message || err).slice(0, 200));
    }
    setBusy("");
  };

  const clear = () => {
    setRow(null); setNotes([]); setSaid(""); setWhen(""); setAbout(""); setTowns(""); setEditing(null);
  };

  const publish = async () => {
    if (!row) return;
    // A row he opened for a change goes back to where it came from. A new one
    // is inserted. Nothing else about the two paths differs, which is why the
    // button says the same thing in both.
    const write = editing != null && onSave ? () => onSave(editing, row) : onPublish ? () => onPublish([row]) : null;
    if (!write) return;
    setBusy("saving"); setError(""); setAdded("");
    const got = await write();
    if (got?.ok) {
      setAdded(editing != null ? "Changed. The next conversation has the new words." : "Saved. Gemlyx knows it from the next conversation on.");
      clear();
    } else {
      setError(got?.why || "Could not save it.");
    }
    setBusy("");
  };

  const openNote = ({ id, note }) => {
    setSaid(note.said); setKind(note.kind || "how"); setWhen(note.when);
    setAbout(note.about); setTowns(note.towns.join(", "));
    setEditing(id); setRow(null); setNotes([]); setError(""); setAdded("");
  };

  const st = row ? noteProblems(row) : { problems: [], blocks: true };
  const alsoPublished = row ? namesPublished(row.said, library) : [];
  const published = (Array.isArray(existing) ? existing : [])
    .map(r => ({ id: r?.id, note: shapeNote(r?.payload || {}), live: noteLive(r?.payload || {}) }))
    .filter(r => r.id != null && r.note.said && r.id !== editing)
    .sort((a, b) => Number(a.live) - Number(b.live) || a.note.said.localeCompare(b.note.said));
  const box = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", marginTop: 12 };
  return (
    <div style={box}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{editing != null ? "Changing what it knows" : "Tell Gemlyx something"}</div>
        {editing != null && (
          <button onClick={clear}
            style={{ background: "none", border: "none", padding: 0, fontSize: 10.5, fontWeight: 700, color: C.muted, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Leave it
          </button>
        )}
      </div>
      <textarea value={said} onChange={e => setSaid(e.target.value)} rows={2}
        placeholder="Both Kombardo Ekspressen and Flixbus are budget alternatives to DSB"
        style={{ ...field, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 7 }}>
        {NOTE_KINDS.map(k => (
          <button key={k} onClick={() => setKind(k)} title={NOTE_KIND_MEANING[k]}
            style={{
              background: kind === k ? C.gold : "none", border: `1px solid ${kind === k ? C.gold : C.border}`,
              borderRadius: 100, padding: "6px 13px", fontSize: 11, fontWeight: 700,
              color: kind === k ? C.onGold : C.muted, cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}>
            {NOTE_KIND_LABEL[k]}
          </button>
        ))}
      </div>
      {kind !== "advice" && (
        <input value={when} onChange={e => setWhen(e.target.value)} style={{ ...field, marginTop: 7 }}
          placeholder="if you are booking within a week or two" />
      )}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 7 }}>
        <input value={about} onChange={e => setAbout(e.target.value)} style={{ ...field, flex: "1 1 200px", width: "auto" }}
          placeholder="What it is about: trains, buses, fares" />
        <input value={towns} onChange={e => setTowns(e.target.value)} style={{ ...field, flex: "1 1 140px", width: "auto" }}
          placeholder="Towns, or empty for all of Denmark" />
      </div>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginTop: 9 }}>
        <button onClick={check} disabled={!!busy || !said.trim()}
          style={{ background: C.gold, border: "none", borderRadius: 100, padding: "8px 15px", fontSize: 11.5, fontWeight: 700, color: C.onGold, cursor: busy || !said.trim() ? "default" : "pointer", opacity: busy || !said.trim() ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
          {busy === "checking" ? "Looking…" : kind === "advice" ? "Write it down" : "Check it"}
        </button>
        {error && <span style={{ fontSize: 10.5, color: "#FFB347" }}>{error}</span>}
        {added && <span style={{ fontSize: 10.5, color: C.gold }}>{added}</span>}
      </div>
      {notes.length > 0 && (
        <ul style={{ margin: "9px 0 0", paddingLeft: 15, fontSize: 10.5, color: C.muted, lineHeight: 1.55 }}>
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
      {/* ── WHAT IT HAS BEEN TOLD ALREADY ──────────────────────────
          A sentence published into a prompt is the one thing in this Studio
          with no page to go and look at, so the list of them lives where they
          are written. Empty until the published rows are loaded, and saying
          nothing rather than saying none. */}
      {published.length > 0 && (
        <div style={{ marginTop: 11, paddingTop: 9, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 6 }}>
            It knows {published.length}
          </div>
          {published.map(({ id, note, live }) => (
            <div key={id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: live ? C.light : C.muted, lineHeight: 1.5 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 100, padding: "1px 7px", marginRight: 6 }}>
                  {NOTE_KIND_LABEL[note.kind] || note.kind}
                </span>
                {note.said}
                {note.when && <div style={{ color: C.muted }}>Holds {note.when}</div>}
                {!live && <div style={{ color: "#FFB347" }}>Too old to be told to anybody. Say it again or take it down.</div>}
              </div>
              {onSave && (
                <button onClick={() => openNote({ id, note })}
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 100, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: C.muted, cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                  Change
                </button>
              )}
              {onRemove && (
                <button onClick={() => onRemove(id)}
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 100, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: C.muted, cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                  Take it down
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {row && (
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.border}` }}>
          {/* WHAT THE CHAT WILL BE HANDED, word for word. He is publishing a
              line into a prompt, and a line into a prompt is the one thing in
              this Studio he cannot see on a page afterwards. */}
          <div style={{ fontSize: 10.5, color: C.light, lineHeight: 1.6, fontFamily: "ui-monospace, monospace", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
            {NOTE_LINE(row)}
          </div>
          {/* ── AND WHAT GEMLYX ALREADY PUBLISHES ABOUT IT ───────
              A note and an entry can disagree with nobody reading both. This
              is the moment he can see it. */}
          {alsoPublished.length > 0 && (
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5 }}>
              Gemlyx already publishes {alsoPublished.join(", ")}
            </div>
          )}
          {row.source && (
            <div style={{ fontSize: 10.5, marginTop: 5 }}>
              <a href={row.source} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>The page it found ↗</a>
            </div>
          )}
          {st.problems.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 14, fontSize: 10, color: st.blocks ? "#FFB347" : C.muted }}>
              {st.problems.map((p, k) => <li key={k}>{p}</li>)}
            </ul>
          )}
          <button onClick={publish} disabled={!!busy || st.blocks}
            style={{ marginTop: 8, background: C.gold, border: "none", borderRadius: 100, padding: "8px 15px", fontSize: 11.5, fontWeight: 700, color: C.onGold, cursor: busy || st.blocks ? "default" : "pointer", opacity: busy || st.blocks ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
            {busy === "saving" ? "Saving…" : editing != null ? "Change it" : "Teach it this"}
          </button>
        </div>
      )}
    </div>
  );
};
