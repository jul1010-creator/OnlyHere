import { useState, useRef, useEffect } from "react";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { askClaude, askPerplexity, parseClaudeJSON } from "../utils/aiClient";
import { auditEntry, auditAll } from "../utils/entryAudit";
import { correctEntry, routeMessage, offersCorrection, ASK_PROMPT, LOOKUP_PROMPT, NOT_IN_ENTRY } from "../utils/correction";
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
//
// ── IT WORKS ON A DRAFT TOO (Oliver, 7 Aug 2026) ────────────────────
// "I would like to have an AI I can write to after the draft where I can say
// 'Fact-checkers say bla bla bla is wrong, and that really bla bla bla is true.'"
//
// The first version could only correct a PUBLISHED row: runCorrection bailed
// unless the entry carried a Supabase row id, so standing in Studio with a
// fresh draft on screen, the assistant told him to go open an entry first. The
// exact moment he wants this is the one moment it refused to work.
//
// So it now takes a second target. Whichever detail page is open still wins,
// because that is what he is looking at. With none open and a draft in the
// Studio editor, the draft is the target, and a correction is written back into
// studioDraftText, which is the thing Publish actually reads. Nothing new to
// learn: the same diff, the same Save, and the normal publish path after it.

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

// `inline` (Oliver, 7 Aug: "Is it possible you can install an AI in the studio
// draft? That I can talk to.. like if Gemini says something, then I can use
// Claude and Perplexity as a like 'Hold on.. let me confirm that.'")
//
// That machine already existed, and that is the problem: it lived behind a
// small floating ✦ in the corner, so from inside the draft editor there was
// nothing to suggest the draft could be argued with at all. A feature nobody
// can find is a feature that does not exist.
//
// So the same component now also renders as an ordinary block, mounted
// directly under the draft it is talking about. Same routing, same claim
// splitting, same Perplexity verification, same scope guard, same Save. The
// only difference is that it is sitting where the work is.
export const StudioAssistant = ({ session, item, kind, draft, draftKind, onDraftPatched, onSaved, inline }) => {
  const [open, setOpen] = useState(!!inline);
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
  // An open detail page wins over the Studio draft: it is what he is looking at,
  // and a correction landing on the wrong one of the two would be the most
  // expensive kind of surprise this tool can produce.
  const onDraft = !item && !!draft;
  const target = item || draft || null;
  const targetKind = item ? kind : draftKind;
  // ── EDITING IS A STUDIO ACT (Oliver, 7 Aug) ────────────────────────
  // "the fact-checker assistant should only be for studio.. the assistant that
  // is ready on blogs and what not are about questions only."
  //
  // He is drawing the right line. On a blog page he is a READER, and a reader
  // asking "why does this say the ferry is required" should get an answer, not
  // a verification pass that rewrites the page under him. Correcting is
  // deliberate work and belongs where the draft and the diff and the Save
  // button are. Published rows are still correctable: open the row in Studio,
  // which loads it into the editor, and the assistant is in Studio mode again.
  //
  // This is a HARD gate, not a hint to the router. routeMessage still does its
  // job in Studio; on a blog its answer is discarded before it can act.
  const studioMode = onDraft;
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
    // Three possible targets, and only one of them is an error case now.
    let entry = null, before = null;
    if (onDraft) {
      entry = draft;
    } else if (rowId) {
      const row = await fetchRow(rowId);
      if (!row?.payload) { say("gemlyx", "Could not load that row from Supabase. Your Studio login may have expired."); return; }
      entry = row.payload;
    } else {
      say("gemlyx", item
        ? `"${item.name}" is one of the old hardcoded entries, so there is no published row to correct. Redraft it through Studio and this will work on it.`
        : "Open an entry, or draft one in Studio, then paste the fact-check here.");
      return;
    }
    before = entry;

    const result = await correctEntry({
      entry,
      criticism: message,
      deps: { askClaude, askPerplexity, parseJSON: parseClaudeJSON, directions, onStage: setStage },
    });
    setStage(null);

    // ✍️ is deliberately not a tick. A value applied on his own word has to look
    // different from one a primary source confirmed, at a glance, forever.
    const lines = result.claims.map(c => {
      const mark = c.verdict === "confirmed" ? "✅" : c.verdict === "rejected" ? "❌" : c.verdict === "asserted" ? "✍️" : "❓";
      const head = `${mark} ${c.field}: ${c.says}`;
      const why = c.verdict === "rejected"
        ? `\n   Not applied, a source says otherwise. ${c.evidence}`
        : c.verdict === "unresolved"
        ? `\n   Left alone, nothing settled it and you gave no value to use. ${c.evidence}`
        : c.verdict === "asserted"
        ? `\n   Applied on your word, still unconfirmed. ${c.evidence}`
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
    const counts = [
      `${result.confirmed.length} confirmed`,
      result.asserted?.length ? `${result.asserted.length} on your word` : null,
      `${result.rejected.length} rejected`,
      `${result.unresolved.length} unsettled`,
    ].filter(Boolean).join(", ");
    say("gemlyx", `${counts}.\n\n${lines.join("\n\n")}${revertNote}`);
    setPending({ mode: onDraft ? "draft" : "row", rowId, before, after: result.patched, changed: result.changed });
  };

  const runAsk = async (message) => {
    if (!target) { say("gemlyx", "Open an entry or draft one in Studio and ask me about it, or ask which entries need work."); return; }
    const audit = auditEntry({ id: rowId, type: targetKind, payload: target });
    const auditText = audit.findings.length
      ? audit.findings.map(f => `${f.severity}: ${f.field}. ${f.detail}`).join("\n")
      : "No findings.";
    const res = await askClaude(ASK_PROMPT(JSON.stringify(target, null, 2), auditText, message), 900);
    if (res.error) { say("gemlyx", `Could not reach Claude: ${res.error}`); return; }

    // ── "AND IF IT CAN'T ANSWER, THEN PERPLEXITY WILL QUICKLY RESEARCH
    // TO ANSWER THE QUESTION" (Oliver, 7 Aug) ────────────────────────
    // The entry is still the first and preferred source, because it is the
    // thing that was actually fact-checked. Only when the entry genuinely does
    // not contain the answer does this go and look, and the two kinds of answer
    // are never blended: an answer from the entry is silent about where it came
    // from, an answer from a live search says so and carries its source. A
    // reader must always be able to tell which one they are holding.
    const answer = (res.text || "").trim();
    if (!answer.startsWith(NOT_IN_ENTRY)) {
      say("gemlyx", answer, (studioMode && offersCorrection(message)) ? { retryAs: message } : {});
      return;
    }
    setStage({ label: "Not in the entry. Looking it up" });
    const gap = answer.slice(NOT_IN_ENTRY.length).replace(/^[\s:.-]+/, "").trim();
    const research = await askPerplexity(LOOKUP_PROMPT(target?.name, message, gap));
    setStage(null);
    if (research.error || !(research.text || "").trim()) {
      say("gemlyx", `The entry does not say, and the lookup failed: ${research.error || "nothing came back"}. ${gap || ""}`.trim());
      return;
    }
    const written = await askClaude(
      `Answer the question below using ONLY the fresh research provided. Be short and direct. If the research does not actually settle it, say so plainly rather than hedging into a non-answer. Never use an em dash or an en dash.\n\nQuestion: ${message}\n\nFresh research:\n${research.text}`,
      500
    );
    const cites = (research.citations || []).slice(0, 3).filter(u => typeof u === "string");
    say("gemlyx", `Not in the entry, so I looked it up just now.\n\n${written.error ? research.text : written.text}${cites.length ? `\n\nSources: ${cites.join("  ")}` : ""}`);
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

  const send = async (override, forceCorrect = false) => {
    const message = (override ?? input).trim();
    if (!message || busy) return;
    if (!override) setInput("");
    setPending(null);
    if (!override) say("you", message);
    setBusy(true);
    try {
      const routed = forceCorrect ? "correct" : routeMessage(message);
      // Reading a blog: answer, always. Nothing here can change a published row.
      const intent = studioMode ? routed : "ask";
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
    // A draft has no row to PATCH. It goes back into studioDraftText, which is
    // what Publish reads, so the correction rejoins the normal path instead of
    // creating a second way to put content live.
    if (pending.mode === "draft") {
      onDraftPatched?.(pending.after);
      say("gemlyx", `Written into the Studio draft. ${pending.changed.filter(k => k !== "__corrections").length} field${pending.changed.filter(k => k !== "__corrections").length === 1 ? "" : "s"} changed. Review it in the editor and Publish when you are happy.`);
      setPending(null);
      return;
    }
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

  // The conversation itself. Declared once and rendered by both forms, so the
  // inline panel in the draft editor and the floating one on a blog page can
  // never drift into being two slightly different assistants.
  const body = (
    <>
          {/* maxHeight rather than flex:1 alone: inside the floating panel the
              flex parent gives this its height, but the inline form is an
              ordinary block with no height of its own, and flex:1 in that
              context collapses the conversation to zero pixels. */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8, maxHeight: inline ? 300 : undefined, minHeight: inline && log.length ? 120 : undefined }}>
            {log.length === 0 && (
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                {studioMode
                  ? `Tell me what is wrong and what is right, in your own words. "Fact-checkers say the station is wrong, it is really Aarhus H" is enough, you do not have to say "correct it". Every claim gets checked before a word changes. A source that contradicts you wins and I will say so, and nothing settling it does not block you: if you gave me the value, it goes in marked as yours.`
                  : `Ask me anything about this page. I answer from what is actually stored, and if the entry does not say, I will look it up and show you the source. Nothing here changes the page: corrections happen in Studio, on the draft.`}
              </div>
            )}
            {log.map((l, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: l.role === "you" ? "flex-end" : "flex-start", gap: 4 }}>
                <div style={bubble(l.role)}>{l.text}</div>
                {l.retryAs && !busy && studioMode && (
                  <button onClick={() => send(l.retryAs, true)}
                    style={{ background: "none", border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Did you mean correct it? Run the correction pass
                  </button>
                )}
              </div>
            ))}
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
                    {saving ? "Saving…" : pending.mode === "draft" ? "Put it in the draft" : "Save to the live entry"}
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
              placeholder={!target ? "Ask which entries need work" : studioMode ? `Paste a fact-check about ${target.name || "this draft"}, or just ask` : `Ask anything about ${target.name || "this page"}`}
              rows={2}
              style={{ flex: 1, resize: "vertical", minHeight: 40, maxHeight: 160, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12.5, padding: "8px 10px", outline: "none", fontFamily: "'Inter', sans-serif" }} />
            <button onClick={() => send()} disabled={busy || !input.trim()}
              style={{ background: busy || !input.trim() ? C.surface : C.gold, border: `1px solid ${C.border}`, color: busy || !input.trim() ? C.muted : "#000", borderRadius: 100, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", flexShrink: 0 }}>
              {busy ? "…" : "Send"}
            </button>
          </div>
    </>
  );

  if (inline) {
    return (
      <div style={{ border: `1px solid ${C.gold}44`, borderRadius: 14, background: C.surface, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "11px 13px 9px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.gold }}>✦ Argue with this draft</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.55 }}>
            Paste what Gemini said. Every claim gets checked against a real source before a word changes, and anything that fails the check is rejected with the evidence.
          </div>
        </div>
        {body}
      </div>
    );
  }

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
            {item
              ? `Reading ${item.name} · questions only`
              : onDraft
              ? `Studio draft: ${draft?.name || "unnamed"} (not published yet)`
              : "No entry open"}
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

      {body}
    </div>
  );
};
