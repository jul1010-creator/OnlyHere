import { useState, useRef, useEffect } from "react";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { askClaude, askPerplexity, parseClaudeJSON } from "../utils/aiClient";
import { auditEntry, auditAll } from "../utils/entryAudit";
import { correctEntry, routeMessage, ASK_PROMPT } from "../utils/correction";
import { departureParam } from "../utils/helpers";

// ── The founder's assistant, on every page ──────────────────────────
// Oliver, 6 Aug 2026: "Is it possible to install some sort of assistant for the
// admin /#studio guy? That will always be with me? Even when I'm on the blogs."
// And then the line that says what it is actually for: "Then I won't need to
// take pictures of what I mean."
//
// That is the real problem. Every fix this week started with him screenshotting
// a page, opening a chat, and describing what he was looking at. The app already
// knows all of it: which entry is open, its exact stored payload, what the audit
// says about it, whether its coordinates are real. The context was never
// missing, it was just unreachable from where he was standing.
//
// So this follows him. It sits on top of every page including an open blog entry
// (DetailPage runs at z-index 970, this runs above it), it reads the entry he is
// currently looking at, and it takes plain sentences.
//
// THREE THINGS IT DOES, and it decides between them from what he types:
//   "Google AI says this is wrong. Correct it. <paste>"  runs the correction pass
//   "why does this say the ferry is required?"           answers from the entry
//   "which ones need work?"                              audits everything live
//
// WHAT IT WILL NOT DO: change anything without showing him first. A correction
// produces a patch, a per-claim verdict list and a field diff, and nothing
// reaches Supabase until he presses Save. The rule that has held all week is
// that what you review must be what you publish, and an assistant that edits
// live content on a sentence would break it in the most expensive way available.
//
// ONLY FOR HIM: it renders only when a Studio session exists. There is no
// visitor-facing path to it, and it is not lazy-gated behind a flag that could
// be flipped by a URL.

const bubble = (role) => ({
  alignSelf: role === "you" ? "flex-end" : "flex-start",
  background: role === "you" ? `${C.gold}1f` : C.surface,
  border: `1px solid ${role === "you" ? `${C.gold}55` : C.border}`,
  color: C.text,
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: 12.5,
  lineHeight: 1.55,
  maxWidth: "92%",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

// A live item carries id = 100000 + the Supabase row id (see liveContent.js).
// Anything below that offset is legacy hardcoded data with no row to save back
// to, and saying so plainly beats a save button that silently does nothing.
export const rowIdForItem = (item) => {
  const n = Number(item?.id);
  return Number.isFinite(n) && n >= 100000 ? n - 100000 : null;
};

export const StudioAssistant = ({ session, item, kind, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);
  const [pending, setPending] = useState(null);   // a correction awaiting Save
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log, pending, stage]);

  if (!session) return null;

  const rowId = rowIdForItem(item);
  const say = (role, text, extra = {}) => setLog(l => [...l, { role, text, ...extra }]);

  // The same routing call the drafting pipeline makes, so a correction can
  // never disagree with a fresh draft about the same journey.
  const directions = async (origin, dest, mode, extra = {}) => {
    const qs = `origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&mode=${mode}${departureParam(mode)}${extra.avoid ? `&avoid=${extra.avoid}` : ""}`;
    const r = await fetch(`/api/directions?${qs}`);
    return r.json();
  };

  // The payload the site renders is the merged live object, which carries the
  // id offset and whatever the arrays added. The row is fetched fresh before
  // correcting so the patch is built against exactly what is stored.
  const fetchRow = async (id) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?id=eq.${id}&select=id,type,payload`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : null;
  };

  const runCorrection = async (message) => {
    if (!rowId) {
      say("gemlyx", item
        ? `"${item.name}" is one of the old hardcoded entries, so there is no published row to correct. Redraft it through Studio and this will work on it.`
        : "Open the entry you want corrected first, then paste the criticism here.");
      return;
    }
    const row = await fetchRow(rowId);
    if (!row?.payload) { say("gemlyx", "Could not load that row from Supabase. Your Studio login may have expired."); return; }

    const result = await correctEntry({
      entry: row.payload,
      criticism: message,
      deps: { askClaude, askPerplexity, parseJSON: parseClaudeJSON, directions, onStage: setStage },
    });
    setStage(null);

    const lines = result.claims.map(c => {
      const mark = c.verdict === "confirmed" ? "✅" : c.verdict === "rejected" ? "❌" : "❓";
      const head = `${mark} ${c.field}: ${c.says}`;
      const why = c.verdict === "rejected"
        ? `\n   Not applied. ${c.evidence}`
        : c.verdict === "unresolved"
        ? `\n   Left alone, nothing settled it. ${c.evidence}`
        : `\n   ${c.evidence}${c.sourceUrl ? `\n   Source: ${c.sourceUrl}` : ""}`;
      return head + why;
    });

    if (!result.patched) {
      say("gemlyx", `Nothing changed.\n\n${lines.join("\n\n")}`);
      return;
    }
    const revertNote = result.reverted.length
      ? `\n\nIt also tried to change ${result.reverted.join(", ")}, which nothing asked for. Those were put back.`
      : "";
    say("gemlyx", `${result.confirmed.length} confirmed, ${result.rejected.length} rejected, ${result.unresolved.length} unsettled.\n\n${lines.join("\n\n")}${revertNote}`);
    setPending({ rowId, before: row.payload, after: result.patched, changed: result.changed });
  };

  const runAsk = async (message) => {
    if (!item) { say("gemlyx", "Open an entry and ask me about it, or ask which entries need work."); return; }
    const audit = auditEntry({ id: rowId, type: kind, payload: item });
    const auditText = audit.findings.length
      ? audit.findings.map(f => `${f.severity}: ${f.field}. ${f.detail}`).join("\n")
      : "No findings.";
    const res = await askClaude(ASK_PROMPT(JSON.stringify(item, null, 2), auditText, message), 900);
    say("gemlyx", res.error ? `Could not reach Claude: ${res.error}` : res.text);
  };

  const runAudit = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=id,type,payload&published=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    const rows = await res.json();
    if (!Array.isArray(rows)) { say("gemlyx", "Could not load the published rows."); return; }
    const scored = auditAll(rows).filter(r => r.score >= 8).slice(0, 12);
    if (!scored.length) { say("gemlyx", `All ${rows.length} published entries came back clean on the deterministic checks.`); return; }
    say("gemlyx", `${scored.length} of ${rows.length} entries have something concrete wrong with them, worst first:\n\n`
      + scored.map(r => `${r.verdict} · ${r.name} (${r.type})\n   ${r.findings.slice(0, 2).map(f => f.detail).join("\n   ")}`).join("\n\n"));
  };

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setPending(null);
    say("you", message);
    setBusy(true);
    try {
      const intent = routeMessage(message);
      if (intent === "correct") await runCorrection(message);
      else if (intent === "audit") await runAudit();
      else await runAsk(message);
    } catch (err) {
      say("gemlyx", `That failed: ${err?.message || String(err)}`);
    }
    setStage(null);
    setBusy(false);
  };

  const savePending = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?id=eq.${pending.rowId}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ payload: pending.after }),
      });
      if (!res.ok) {
        const body = await res.text();
        say("gemlyx", `Save failed (${res.status}). ${body.slice(0, 200)}`);
      } else {
        say("gemlyx", `Saved. ${pending.changed.length} field${pending.changed.length === 1 ? "" : "s"} updated. Reload to see it on the page.`);
        setPending(null);
        onSaved?.();
      }
    } catch (err) {
      say("gemlyx", `Save failed: ${err?.message || String(err)}`);
    }
    setSaving(false);
  };

  // ── "Then I won't need to take pictures of what I mean" ────────────
  // The screenshot replacement. One block holding everything a screenshot was
  // standing in for and several things it never could: the exact stored
  // payload, the audit verdict, and the conversation so far. Paste it into a
  // chat and the whole context arrives with it.
  const copyContext = async () => {
    const audit = item ? auditEntry({ id: rowId, type: kind, payload: item }) : null;
    const block = [
      `GEMLYX CONTEXT, copied from the app`,
      `Page: ${kind || "browsing"}${item ? ` · ${item.name}` : ""}`,
      rowId ? `Supabase row id: ${rowId}` : `No published row (legacy hardcoded entry)`,
      audit ? `\nAUDIT: ${audit.verdict} (score ${audit.score})\n${audit.findings.map(f => `- ${f.severity} · ${f.field}: ${f.detail}`).join("\n") || "- no findings"}` : "",
      item ? `\nSTORED PAYLOAD:\n${JSON.stringify(item, null, 2)}` : "",
      log.length ? `\nWHAT I ASKED THE ASSISTANT:\n${log.map(l => `${l.role === "you" ? "Oliver" : "Assistant"}: ${l.text}`).join("\n\n")}` : "",
    ].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(block); say("gemlyx", "Copied. Paste that into the chat instead of a screenshot, it carries the payload and the audit with it."); }
    catch { say("gemlyx", "Clipboard was blocked. Here it is to copy by hand:\n\n" + block.slice(0, 4000)); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Gemlyx assistant"
        style={{ position: "fixed", right: 16, bottom: 16, zIndex: 3000, width: 52, height: 52, borderRadius: "50%", background: C.gold, color: "#000", border: "none", fontSize: 22, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,.45)" }}>
        ✦
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", right: 12, bottom: 12, zIndex: 3000, width: "min(420px, calc(100vw - 24px))", maxHeight: "min(76vh, 720px)", display: "flex", flexDirection: "column", background: C.bg, border: `1px solid ${C.gold}66`, borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,.6)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: "'Fraunces', serif" }}>✦ Gemlyx assistant</div>
          <div style={{ fontSize: 10.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item ? `Looking at ${item.name}${rowId ? "" : " (not a published row)"}` : "No entry open"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={copyContext} title="Copy this page's full context"
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "4px 10px", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
            ⧉ Context
          </button>
          <button onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {log.length === 0 && (
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            Paste a fact-check and say "correct it" and I will verify every claim before changing a word, then show you the patch.
            Ask me anything about the entry you have open, and I answer from what is actually stored, never from memory.
            Ask which ones need work and I will scan everything published.
          </div>
        )}
        {log.map((l, i) => <div key={i} style={bubble(l.role)}>{l.text}</div>)}
        {stage && (
          <div style={{ ...bubble("gemlyx"), color: C.muted, fontSize: 11.5 }}>
            {stage.label}{typeof stage.percent === "number" ? ` · ${stage.percent}%` : ""}
          </div>
        )}
        {pending && (
          <div style={{ background: C.surface, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 6 }}>
              {pending.changed.length} field{pending.changed.length === 1 ? "" : "s"} would change
            </div>
            {pending.changed.filter(k => k !== "__corrections").map(k => (
              <div key={k} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
                <div style={{ fontSize: 11.5, color: "#E57373", textDecoration: "line-through", whiteSpace: "pre-wrap" }}>
                  {String(JSON.stringify(pending.before?.[k] ?? "") ?? "").slice(0, 260)}
                </div>
                <div style={{ fontSize: 11.5, color: "#8BC34A", whiteSpace: "pre-wrap" }}>
                  {String(JSON.stringify(pending.after?.[k] ?? "") ?? "").slice(0, 260)}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button onClick={savePending} disabled={saving}
                style={{ background: C.gold, border: "none", color: "#000", borderRadius: 100, padding: "7px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving…" : "Save to the live entry"}
              </button>
              <button onClick={() => { setPending(null); say("gemlyx", "Discarded, nothing was saved."); }}
                style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "7px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          placeholder={item ? `Paste a fact-check about ${item.name}, or just ask` : "Ask which entries need work"}
          rows={2}
          style={{ flex: 1, resize: "vertical", minHeight: 40, maxHeight: 160, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12.5, padding: "8px 10px", outline: "none", fontFamily: "'Inter', sans-serif" }} />
        <button onClick={send} disabled={busy || !input.trim()}
          style={{ background: busy || !input.trim() ? C.surface : C.gold, border: `1px solid ${C.border}`, color: busy || !input.trim() ? C.muted : "#000", borderRadius: 100, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", flexShrink: 0 }}>
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
};
