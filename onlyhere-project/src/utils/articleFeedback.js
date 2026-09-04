// ── WHAT A REPORT AND A REVIEW ACTUALLY SEND ────────────────────────
//
// Pure, and in its own file, because the component around it cannot be asked
// anything by a test: it needs a browser, a fetch and a Supabase key. The rules
// worth pinning — what counts as sendable, what the row looks like, that the
// page's own URL travels with it — are all here, where they can be.
export const FEEDBACK_KINDS = ["outdated", "review", "pick"];

export const FEEDBACK_TYPE = { outdated: "Outdated", review: "Article review", pick: "Wrong pick" };

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
  if (kind === "pick") {
    return said.length >= MIN_REPORT_CHARS
      ? ""
      : "Say what is wrong with the picks, even in a few words. A blank report cannot be acted on.";
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


// ── AND A WRONG PICK IS ONLY REPORTABLE WITH ITS BRIEF ──────────────
//
// Oliver, 4 Sep 2026, on a preview screen: "this review was after a chat where
// I mentioned travelling with 7 kids.. yet it puts me on a bar/club for 21+."
// Then: "Make a studio report button on the preview. So you can start fixing
// that."
//
// The whole value of that report is the pair. "Heidi's Bier Bar is wrong" is not
// actionable and "Heidi's Bier Bar is wrong, and the traveller had said seven
// kids" is the bug report. It is the same rule feedbackRow already states about
// the URL, one level up: the claim and the evidence travel together or the row
// cannot be acted on.
//
// So this carries three things the other two kinds never needed:
//
//   said      the traveller's own turns, which is where "7 kids" lived. It was
//             never on the intake form, and that is exactly the case worth
//             catching: familyMode is a CHECKBOX and nothing reads the chat for
//             it, so a brief that says it in words sets nothing at all.
//   onScreen  what the preview was actually showing, because the pick is the
//             defect and a report naming only one card loses the other five.
//   text      what he typed.
//
// Same { name, type, note } shape as feedbackRow, deliberately, so this posts to
// gemlyx_suggestions with no migration and shows up in the same place he already
// reads. A second table for a third kind of the same thing is how two lists
// start disagreeing.
export const PREVIEW_SAID_CAP = 1200;
export const PREVIEW_SCREEN_CAP = 800;

// Only the traveller's turns. The assistant's are the thing being reported on,
// and feeding its own words back as the brief is how a bad pick justifies
// itself. Same rule the guide builder follows with saidByTravellerOnly.
export const travellerTurns = (messages, cap = PREVIEW_SAID_CAP) =>
  (Array.isArray(messages) ? messages : [])
    .filter(m => m && m.role === "user" && !m.isError)
    .map(m => String(m.text || "").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, cap);

export const previewReportRow = ({ text = "", said = "", onScreen = "", url = "" } = {}) => {
  const note = [
    String(text || "").trim(),
    said ? `WHAT THE TRAVELLER SAID:\n${String(said).slice(0, PREVIEW_SAID_CAP)}` : "",
    onScreen ? `WHAT THE PREVIEW SHOWED:\n${String(onScreen).slice(0, PREVIEW_SCREEN_CAP)}` : "",
    String(url || "").trim(),
  ].filter(Boolean).join("\n\n");
  return { name: "Preview picks", type: FEEDBACK_TYPE.pick, note };
};
