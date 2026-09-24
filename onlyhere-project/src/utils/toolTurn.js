// ── ONE TOOL RESULT PER TOOL CALL, OR THE WHOLE THREAD DIES ─────────
//
// Found live on gemlyxtravel.com, 23 Sep 2026, on the first message of a
// fresh Detour thread:
//
//   Hit a snag: messages.4: `tool_use` ids were found without `tool_result`
//   blocks immediately after: toolu_01MacYLivgm4uTFd3vfvMGNu. Each `tool_use`
//   block must have a corresponding `tool_result` block in the next message.
//
// The chat's tool loop took `out.content?.find(b => b.type === "tool_use")`,
// answered THAT ONE, and sent the turn back. A model may call a tool more than
// once in a single turn, and Anthropic's rule is all or nothing: every
// tool_use in an assistant turn needs its own tool_result in the very next
// message. Answer one of two and the API rejects the whole conversation, so
// the traveller loses the thread rather than losing a search.
//
// The same comment block two hundred lines up in App.jsx already records this
// error string being fixed once, for a different cause (thinking blocks
// stripped out of the turn that came back). Same error, second cause. That is
// why this one lives in a file with tests rather than inside the loop.
//
// DELIBERATELY NOT A FIX IN THE PROMPT. A model is free to search twice and
// is right to, and the request now also carries disable_parallel_tool_use so
// it usually will not. This is what makes it harmless when it does.

export const toolUsesIn = (content) =>
  (Array.isArray(content) ? content : []).filter(b => b?.type === "tool_use" && b.id);

// The user message that answers a turn's tool calls. One block per call, in
// the order the model made them, and a call with no answer still gets one:
// a missing tool_result is the failure this file exists to prevent, so a
// search that threw comes back as a sentence rather than as nothing.
export const NO_ANSWER = "No results found.";

export const toolResultsFor = (uses, answers = []) =>
  toolUsesIn(uses).map((u, i) => ({
    type: "tool_result",
    tool_use_id: u.id,
    content: String(answers[i] == null || answers[i] === "" ? NO_ANSWER : answers[i]),
  }));

// What each call is asking for. Kept beside the two above because a tool with
// no query is the other way this loop can end up sending nothing useful, and
// an empty query search is a wasted call rather than a broken thread.
export const queriesIn = (content) =>
  toolUsesIn(content).map(u => String(u?.input?.query || "").trim());
