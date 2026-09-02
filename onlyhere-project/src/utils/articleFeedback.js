// ── WHAT A REPORT AND A REVIEW ACTUALLY SEND ────────────────────────
//
// Pure, and in its own file, because the component around it cannot be asked
// anything by a test: it needs a browser, a fetch and a Supabase key. The rules
// worth pinning — what counts as sendable, what the row looks like, that the
// page's own URL travels with it — are all here, where they can be.
export const FEEDBACK_KINDS = ["outdated", "review"];

export const FEEDBACK_TYPE = { outdated: "Outdated", review: "Article review" };

// ── AN EMPTY REPORT IS NOT A REPORT ─────────────────────────────────
//
// "Suggest a Place" already sets the precedent one screen away: it refuses a
// blank name rather than posting an empty row. Same here, with one difference —
// a REVIEW may be a rating alone, because a star with nothing typed is still a
// real answer, and demanding a sentence is how you get "good" typed to get past
// the form.
export const MIN_REPORT_CHARS = 4;

export const feedbackProblem = (kind, text, rating = 0) => {
  if (!FEEDBACK_KINDS.includes(String(kind || ""))) return "Nothing to send.";
  const said = String(text || "").trim();
  if (kind === "review") {
    return said.length >= MIN_REPORT_CHARS || Number(rating) > 0
      ? ""
      : "Give it a star rating, or say what you think — either is enough.";
  }
  return said.length >= MIN_REPORT_CHARS
    ? ""
    : "Say what is out of date, even in a few words. A blank report cannot be acted on.";
};

// ── THE URL IS THE HALF THAT MAKES IT ACTIONABLE ────────────────────
//
// The run log learned this the hard way and the lesson is written all over
// entryAudit: "a ticket shop states 280 DKK" is not actionable and
// "akkc.dk states 280 DKK" is. A report saying "the price is wrong" with no
// page attached is the same unactionable shape, so the entry's name, its type
// and the exact URL the reader was looking at all travel with the words.
export const feedbackRow = (kind, { itemType = "", itemName = "", text = "", rating = 0, url = "" } = {}) => {
  const said = String(text || "").trim();
  const stars = Number(rating) > 0 ? `${Math.min(5, Math.max(1, Math.round(Number(rating))))}/5` : "";
  const where = [String(itemType || "").trim(), String(url || "").trim()].filter(Boolean).join(" · ");
  return {
    name: String(itemName || "").trim() || "(unnamed entry)",
    type: FEEDBACK_TYPE[kind] || "Outdated",
    note: [stars && `Rated ${stars}`, said, where].filter(Boolean).join("\n"),
  };
};
