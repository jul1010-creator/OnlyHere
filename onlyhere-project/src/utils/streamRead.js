// ── AN EMPTY REPLY IS NOT A DIAGNOSIS ───────────────────────────────
//
// 25 August 2026, live. Oliver pasted a 750-character trip brief into the chat.
// Twice. Both times: "Hit a snag on my end. Try sending that again."
//
// That sentence is what App.jsx prints when the reply came back with no text AND
// no error AND the tool loop was not exhausted. Three conditions, one message,
// and the message names none of them. It is the sentence a chat prints when it
// does not know what happened.
//
// ── AND THE READER GENUINELY COULD NOT KNOW ─────────────────────────
//
// streamClaudeChat parses Anthropic's SSE by hand. Read what it does with the
// cases it was not written for:
//
//   AN UNKNOWN BLOCK TYPE. `content_block_start` for anything that is not
//   tool_use becomes `{ type: "text", text: "" }`. A thinking block, a
//   server_tool_use block, a redacted block, anything Anthropic adds next year:
//   all of them arrive as an empty TEXT block. The deltas that follow are
//   thinking_delta or something else, so nothing accumulates, and the result is
//   a content array holding one text block containing "". Indistinguishable, to
//   every line downstream, from a model that chose to say nothing.
//
//   A STREAM THAT STOPS EARLY. A serverless function that hits its execution
//   limit mid-stream has already sent 200 and the event-stream headers, so the
//   browser sees a clean response that simply ends. `done` comes back true, the
//   loop exits, and zero blocks is reported as an empty reply rather than as a
//   connection that died.
//
//   A STREAM THAT CARRIED NOTHING AT ALL. Zero events is a different failure
//   from twenty events carrying no text, and both produced the same silence.
//
// A limit hit is not a limit reported. That is the third time today — the chat
// truncation this morning, the run-log quota this evening, the logistics census
// an hour ago — and this is the fourth. The pattern is always the same: the code
// knows something went wrong and the sentence it prints does not say so.
//
// So the reader now records what it SAW, and the failure has a name.

// Delta types that carry text a reader is meant to see. Everything else is
// either machinery or a block type this file has not met yet, and the difference
// matters: one is normal, the other has to be reported.
const TEXT_DELTAS = new Set(["text_delta"]);
const JSON_DELTAS = new Set(["input_json_delta"]);
// Anthropic's own names for blocks that are NOT prose for the reader. Listed so
// an unknown type is genuinely unknown rather than merely unlisted.
const KNOWN_NON_TEXT = new Set(["thinking", "redacted_thinking", "tool_use", "server_tool_use", "web_search_tool_result"]);

export const newStreamState = () => ({
  blocks: [],
  stopReason: null,
  error: null,
  events: 0,          // how many SSE events parsed at all
  sawStart: false,    // message_start
  sawStop: false,     // message_stop — the stream ENDED rather than was cut
  unknownBlocks: [],  // block types this reader has no handling for
  unknownDeltas: [],  // delta types likewise
});

// One SSE event, folded into the state. Returns the state so a caller can chain.
// `onText` is called with the full visible text so far, exactly as before.
export const readStreamEvent = (st, evt, onText) => {
  if (!st || !evt || typeof evt !== "object") return st;
  st.events++;
  const t = evt.type;
  if (t === "message_start") { st.sawStart = true; return st; }
  if (t === "message_stop") { st.sawStop = true; return st; }
  if (t === "ping") return st;

  if (t === "content_block_start") {
    const kind = evt.content_block?.type;
    if (kind === "tool_use") {
      st.blocks[evt.index] = { type: "tool_use", id: evt.content_block.id, name: evt.content_block.name, inputJson: "" };
    } else if (kind === "text") {
      st.blocks[evt.index] = { type: "text", text: "" };
    } else {
      // NOT a text block with nothing in it. Its own kind, kept out of the
      // reply, and RECORDED — because a reply that is empty because the model
      // only thought is a different event from a reply that is empty because
      // the model said nothing, and the traveller deserves the difference.
      st.blocks[evt.index] = { type: "other", kind: kind || "unnamed", text: "", signature: evt.content_block?.signature || "", data: evt.content_block?.data || "" };
      if (!KNOWN_NON_TEXT.has(kind)) st.unknownBlocks.push(kind || "unnamed");
      else if (!st.unknownBlocks.includes(kind)) st.unknownBlocks.push(kind);
    }
    return st;
  }

  if (t === "content_block_delta") {
    // A delta for a block whose start never arrived is still text, and dropping
    // it silently is how a whole reply can go missing behind one lost event.
    const b = st.blocks[evt.index] || (st.blocks[evt.index] = { type: "text", text: "" });
    const d = evt.delta?.type;
    if (TEXT_DELTAS.has(d)) {
      if (b.type === "other") { /* thinking text is not the reader's */ }
      else { b.text = (b.text || "") + (evt.delta.text || ""); }
      if (typeof onText === "function") onText(visibleText(st));
    } else if (JSON_DELTAS.has(d)) {
      b.inputJson = (b.inputJson || "") + (evt.delta.partial_json || "");
    } else if (d === "thinking_delta") {
      // KEPT, THOUGH THE READER NEVER SEES IT. See streamContentForApi: a
      // thinking block has to go BACK to the API verbatim when the same turn
      // also called a tool, and a block we did not keep is a block we cannot
      // return.
      b.text = (b.text || "") + (evt.delta.thinking || "");
      if (!st.unknownDeltas.includes(d)) st.unknownDeltas.push(d);
    } else if (d === "signature_delta") {
      // The signature is what makes a returned thinking block verifiable. It
      // arrives as its own delta type and dropping it is the same as dropping
      // the block.
      b.signature = (b.signature || "") + (evt.delta.signature || "");
    } else if (d && !st.unknownDeltas.includes(d)) {
      // thinking_delta lands here and is correct to ignore for the READER,
      // but it must still be recorded, or "the model only thought" looks
      // exactly like "the model was silent".
      st.unknownDeltas.push(d);
    }
    return st;
  }

  if (t === "message_delta") {
    if (evt.delta?.stop_reason) st.stopReason = evt.delta.stop_reason;
    return st;
  }
  if (t === "error") { st.error = evt.error?.message || "Stream error"; return st; }
  return st;
};

export const visibleText = (st) =>
  (st?.blocks || []).filter(b => b && b.type === "text").map(b => b.text || "").join("");

// The content array in the shape the rest of App.jsx already expects. "other"
// blocks are dropped: nothing downstream knows what to do with them, and their
// existence is carried in the diagnosis instead.
// ── TWO VIEWS OF ONE STREAM, AND THEY ARE NOT THE SAME ──────────────
//
// 26 Aug 2026, live, and this one is mine. Oliver's second brief came back:
//
//   Hit a snag: messages.4: `tool_use` ids were found without `tool_result`
//   blocks immediately after: toolu_016zzngc...
//
// A REGRESSION I INTRODUCED AN HOUR EARLIER, and the diagnosis written in the
// same hour is what surfaced it.
//
// The old reader turned every block type it had not met into an empty TEXT
// block. That was wrong for the reader — it is why "thinking and no text" was
// indistinguishable from silence — but it accidentally kept the round trip
// intact, because an empty text block is legal in an assistant turn.
//
// This function then made the parse honest and DROPPED those blocks. runTurn
// pushes the assistant turn straight back into the message list before sending a
// tool_result:
//
//   msgs = [...msgs, { role: "assistant", content: out.content }, { role: "user", ... }]
//
// With extended thinking and tools together, Anthropic requires the thinking
// block — with its signature — to come back in that assistant turn. Stripped, the
// turn is malformed and the API rejects the whole sequence.
//
// So: the READER's view excludes thinking, and the API's view keeps it. One
// stream, two consumers, and conflating them is what broke it.
export const streamContent = (st) =>
  (st?.blocks || []).filter(Boolean).filter(b => b.type !== "other").map(b => {
    if (b.type === "tool_use") {
      let input = {};
      try { input = JSON.parse(b.inputJson || "{}"); } catch { /* malformed tool input, treated as no-op */ }
      return { type: "tool_use", id: b.id, name: b.name, input };
    }
    return { type: "text", text: b.text || "" };
  });

// What goes BACK to the API. Every block in the order it arrived, thinking
// included, in Anthropic's own shape. Never rendered and never read for text.
export const streamContentForApi = (st) =>
  (st?.blocks || []).filter(Boolean).map(b => {
    if (b.type === "tool_use") {
      let input = {};
      try { input = JSON.parse(b.inputJson || "{}"); } catch { /* malformed, sent as a no-op */ }
      return { type: "tool_use", id: b.id, name: b.name, input };
    }
    if (b.type === "other") {
      // Redacted thinking carries `data` rather than text and must be returned
      // exactly as it came. Anything else unknown is returned as its own kind so
      // the sequence stays whole rather than silently losing a block.
      if (b.kind === "redacted_thinking") return { type: "redacted_thinking", data: b.data || "" };
      return { type: b.kind || "thinking", thinking: b.text || "", signature: b.signature || "" };
    }
    return { type: "text", text: b.text || "" };
  });

// ── WHY THERE IS NO TEXT, IN ONE SENTENCE A TRAVELLER CAN ACT ON ────
//
// Returns "" when there IS text, so the caller renders nothing. Every other
// branch names the actual condition. None of them is "something went wrong".
export const streamDiagnosis = (st) => {
  const s = st || {};
  if (visibleText(s).trim()) return "";
  if (s.error) return `The model reported: ${s.error}`;
  if (!s.events) return "Nothing came back at all. The connection opened and closed without a single word, which usually means the request timed out on the way out rather than anything about what you asked.";
  if (s.sawStart && !s.sawStop) return "The reply was cut off before it started. It began sending and the connection dropped, so nothing usable arrived. Sending it again usually works.";
  if ((s.blocks || []).some(b => b?.type === "tool_use")) return "";   // a search turn, handled by the tool loop
  if ((s.blocks || []).some(b => b?.type === "other")) {
    const kinds = [...new Set((s.blocks || []).filter(b => b?.type === "other").map(b => b.kind))].join(", ");
    // ── THINKING *AND* max_tokens IS ITS OWN THING ──────────────────
    // Oliver's second run, 25 Aug: the diagnosis correctly said "thinking and no
    // text" and stopped there, which named the symptom and not the cause. The
    // cause is in the same response object: stop_reason max_tokens. The model
    // spent the entire budget reasoning and the reply never started.
    //
    // That is why a short message worked all evening and a 689-character brief
    // failed twice: thinking scales with the question and the budget did not.
    // Worth its own sentence, because the two have different fixes — one is a
    // parser that cannot read a block type, the other is a number.
    if (s.stopReason === "max_tokens") {
      return `I thought about that one until I ran out of room to answer it, so nothing came out. That is a fault on my end. Send it again and I will give myself more room.`;
    }
    return `The reply came back as ${kinds} and no text, so there is nothing to show. That is a fault on my end, not with what you asked.`;
  }
  if (s.stopReason === "max_tokens") return "The reply ran out of room before it wrote anything. Ask for one part of it and I will get there.";
  return "The model finished without writing anything. Sending it again usually works.";
};

// For the console. Everything the diagnosis is based on, so a report pasted in
// later can be read rather than guessed at.
export const streamTrace = (st) => {
  const s = st || {};
  return {
    events: s.events || 0,
    started: !!s.sawStart,
    finished: !!s.sawStop,
    blocks: (s.blocks || []).filter(Boolean).map(b => b.type === "other" ? `other:${b.kind}` : b.type),
    chars: visibleText(s).length,
    stopReason: s.stopReason || null,
    error: s.error || null,
    unknownBlocks: s.unknownBlocks || [],
    unknownDeltas: s.unknownDeltas || [],
  };
};

// ── AND THE ONE QUESTION THE CALLER HAS TO ACT ON ───────────────────
//
// True when the turn produced no text because the whole budget went on thinking.
// The empty-reply retry that already exists re-runs the SAME turn identically,
// which is exactly why Oliver's brief failed twice rather than once: a retry that
// changes nothing fails the same way. This is what tells it to change something.
export const ranOutThinking = (st) => {
  const s = st || {};
  if (visibleText(s).trim()) return false;
  if ((s.blocks || []).some(b => b?.type === "tool_use")) return false;
  return s.stopReason === "max_tokens" || (s.blocks || []).some(b => b?.type === "other");
};
