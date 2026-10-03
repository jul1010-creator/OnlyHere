// ── A PROVIDER'S ERROR, SAFE TO HAND BACK ───────────────────────────
//
// Security review, 3 Oct 2026, finding 11: the Claude and OpenAI routes
// passed the provider's error body back whole, and an OpenAI key error names
// the last characters of the key. The message is still useful to the app
// (askClaude reads it, and the guide builder looks for the billing wording
// "credit balance is too low" to say so plainly), so it is kept, with
// anything shaped like a key taken out and its length capped. The type stays,
// since "overloaded_error" is how a retry knows to retry.
//
// Imports nothing, so a server route can load it.
const KEYISH = /\b(sk|pplx|tvly|AIza)[-_][A-Za-z0-9*_.\-]{6,}|\*{3,}[A-Za-z0-9]{0,8}/g;

export const cleanErrorMessage = (msg) =>
  String(msg || "").replace(KEYISH, "[key]").slice(0, 300);

// `data` is the provider's parsed JSON, or anything else; `status` its HTTP code.
export const safeUpstreamError = (data, status, provider = "The AI service") => {
  const e = data && typeof data === "object" ? data.error : null;
  const raw = e && typeof e === "object" ? e.message : typeof e === "string" ? e : "";
  const type = e && typeof e === "object" && typeof e.type === "string" ? e.type.slice(0, 60) : "";
  return { error: { message: cleanErrorMessage(raw) || `${provider} request failed (${status})`, ...(type ? { type } : {}) } };
};
