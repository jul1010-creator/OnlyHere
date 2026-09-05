// ── "MAKE ME ABLE TO SEND YOU A REPORT OF MY CHATS" ──────────────────
//
// Oliver, 17 Aug 2026:
//
//   "Make me able to send you a report of my chats with Gemlyx, so you can
//    identify the problems"
//
// He asked once, it did not get built, and the cost of that showed up the same
// night. Diagnosing the "you already answered everything I needed" bug took a
// pasted transcript, ten screenshots inside an ODT, and a reconstruction of which
// turn had errored — and the single most important fact, that Gemlyx's reply to his
// answer had FAILED and been stripped from the history, was not visible in any of
// them. It had to be inferred from the shape of the conversation. That inference
// happened to be right. The misses are expensive: a wrong diagnosis ships a fix for
// a bug that was not there and leaves the one that was.
//
// Same argument previewReport.js makes about the preview screen, and the same
// answer. A screenshot shows the output. This writes down what the chat KNEW at the
// moment it replied.
//
// ── WHAT MAKES THIS DIFFERENT FROM A COPY-PASTE ──────────────────────
// Four things that cannot be seen in a transcript, and every one of them is a real
// diagnosis from tonight:
//
//   isError        which replies FAILED. Invisible in a paste, and it was the
//                  cause of the worst bug of the night.
//   the brief      what the trip brief actually held, turn by turn: what was
//                  known, what was missing, what had been asked. "It didn't know
//                  what kind of trip we were looking for" is a claim this settles
//                  in one field instead of an argument.
//   the marker     whether Gemlyx claimed to be ready to build, and whether that
//                  claim was withheld in code.
//   the intake     which boxes were ticked, so "it asked me for something I had
//                  already typed" is checkable.
//
// ── AND WHAT IS DELIBERATELY LEFT OUT ────────────────────────────────
// previewReport.js already set this rule and it holds here with more force,
// because a chat is where people actually type about themselves. The traveller's
// name and any free-text self description stay out. The intake fields are recorded
// as WHETHER THEY WERE FILLED plus the parsed brief value, never as raw prose: the
// budget box says "tight" rather than whatever sentence somebody typed into it. A
// debug file is exactly the sort of place personal text ends up living forever.
//
// The conversation itself is the traveller's own words, and there is no way to
// diagnose a conversation without them — so that part IS included, and the file is
// local, produced by a button he presses, going nowhere he does not send it.
import { readBrief, nextAsks, BRIEF_SLOTS } from "./tripBrief";
import { askedBeforeTurns } from "./directAnswer";
import { briefConflicts, conflictLabel, conflictSlots } from "./briefConflicts";
import { isReadyToBuild } from "./helpers";
import { travelModeKey } from "./routeOrder";
import { travellerBudget } from "./accommodation";

export const CHAT_REPORT_KIND = "gemlyx-chat-report";
export const CHAT_REPORT_VERSION = 1;

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// A turn, as it happened. The text is kept in full: a truncated transcript is how a
// diagnosis goes wrong, and the whole point of this file is not having to guess.
export const turnReport = (m, i) => ({
  i,
  role: m?.role === "assistant" ? "assistant" : "user",
  // THE FIELD A PASTE CANNOT CARRY. A failed reply looks like an ordinary one in a
  // screenshot and is stripped from the history the model sees, so a "why did it
  // say that" question about the NEXT turn is unanswerable without this.
  isError: !!m?.isError,
  hidden: !!m?.hidden,
  chars: clean(m?.text).length,
  text: String(m?.text ?? ""),
  // Whether this reply claimed the trip was ready to build. Read off the raw text,
  // because the rendered bubble has the marker stripped out of it.
  claimedReady: m?.role === "assistant" ? isReadyToBuild(m?.text) : false,
});

// ── THE BRIEF AS IT STOOD AT EACH OF HIS TURNS ───────────────────────
// Recomputed turn by turn from HIS turns only, which is the same rule the live chat
// follows, so the report shows what the gate would have said at each point rather
// than only where it ended up. "It asked me twice" and "it planned on nothing" are
// both visible in this one array.
// ── AND THE ASKED LIST BELONGS TO THE END, NOT TO EVERY TURN ─────────
// The same review found the smaller version of the bug above: passing the final
// `asked` list into every row made turn zero show slots as "declined" that had not
// been asked about yet. The timeline is a record of what was true THEN, so it
// carries the asked list only from the point Gemlyx could have asked — which is
// after its first reply. Before that, nothing has been asked, whatever the end
// state says.
export const briefTimeline = (messages, { intake = {}, asked = [], today = new Date() } = {}) => {
  const list = Array.isArray(messages) ? messages : [];
  const out = [];
  const said = [];
  list.forEach((m, i) => {
    if (m?.role === "assistant") return;
    said.push(String(m?.text ?? ""));
    const askedByNow = list.slice(0, i).some(x => x?.role === "assistant") ? asked : [];
    // ── AND READ THE WAY THE APP READS IT ───────────────────────────
    // This passed neither the turns nor what each of them was answering, so
    // every row of the timeline reproduced the OLD reading. On Oliver's own
    // export that made the summary and the timeline contradict each other: the
    // brief said nothing was declined and the last row of the timeline said four
    // slots were. A timeline is the thing somebody debugs from.
    const brief = readBrief({
      travellerText: said.join("\n"), travellerTurns: said,
      answering: askedBeforeTurns(list.slice(0, i)), intake, asked: askedByNow, today,
    });
    out.push({
      afterTurn: i,
      known: Object.fromEntries(Object.entries(brief.known).map(([k, v]) => [k, v?.value ?? true])),
      missing: brief.missing,
      declined: brief.declined || [],
      vague: brief.vague,
      ready: brief.ready,
      wouldAsk: nextAsks(brief).map(s => s.key),
    });
  });
  return out;
};

// The form, as WHETHER it was filled rather than as what was typed in it. Enough to
// answer "it asked me for something I had already given it" without carrying
// anybody's prose into a file.
export const intakeReport = (intake = {}) => ({
  arrival: !!clean(intake.arrival),
  departure: !!clean(intake.departure),
  startPoint: !!clean(intake.startPoint),
  travelers: !!clean(intake.travelers),
  interests: Array.isArray(intake.interest) ? intake.interest.length : 0,
  transport: Array.isArray(intake.transport) ? intake.transport.slice() : [],
  // The PARSED value, not the sentence: "tight" rather than whatever was typed.
  budgetLevel: travellerBudget(intake.budgetText) || null,
  budgetFilled: !!clean(intake.budgetText),
  familyMode: !!intake.familyMode,
});


// Each assistant turn that claimed the trip was ready to build, judged against the
// brief AS IT STOOD AT THAT MOMENT rather than at the end of the conversation.
export const readyClaimsWhileIncomplete = (messages, { intake = {}, asked = [], today = new Date() } = {}) => {
  const list = Array.isArray(messages) ? messages : [];
  const said = [];
  let bad = 0;
  list.forEach((m, i) => {
    if (m?.role !== "assistant") { said.push(String(m?.text ?? "")); return; }
    if (!isReadyToBuild(m?.text)) return;
    // Read the way the app read it AT THIS TURN: the turns so far, and what each
    // of them was answering. Passing neither meant every claim was judged
    // against the old reading of the conversation rather than the one the
    // traveller was actually looking at.
    const brief = readBrief({
      travellerText: said.join("\n"), travellerTurns: said,
      answering: askedBeforeTurns(list.slice(0, i)), intake, asked, today,
    });
    if (!brief.ready) bad += 1;
  });
  return bad;
};

export const buildChatReport = ({
  at = "",
  messages = [],
  intake = {},
  asked = [],
  today = new Date(),
  buildStarted = false,
  guideId = null,
  // Conflicts already put to the traveller. Without it every conflict the
  // conversation resolved is reported as still open, which is the opposite of
  // what the field is called.
  settled = [],
} = {}) => {
  const list = Array.isArray(messages) ? messages : [];
  const travellerTurns = list.filter(m => m?.role === "user").map(m => String(m?.text ?? ""));
  const travellerText = travellerTurns.join("\n");
  // ── READ THE WAY THE APP READS IT ─────────────────────────────────
  //
  // This call used to pass neither the turns nor what each of them was
  // answering, so the report reproduced the OLD reading of the conversation and
  // not the app's. That is how Oliver's export came to say "declined" for four
  // slots he had answered out loud: the report was not describing the bug, it
  // was reproducing it and calling it the state of the brief.
  //
  // A report that reads differently from the screen is worse than no report,
  // because it is the thing somebody debugs from.
  const answering = askedBeforeTurns(list);
  const brief = readBrief({ travellerText, travellerTurns, answering, intake, asked, today });
  const clashes = briefConflicts(brief, settled).map(c => ({
    key: c.key,
    label: conflictLabel(c.key),
    slots: conflictSlots(c.key),
    question: c.question,
  }));
  const errors = list.filter(m => m?.isError).length;
  const assistantTurns = list.filter(m => m?.role === "assistant");
  return {
    kind: CHAT_REPORT_KIND,
    version: CHAT_REPORT_VERSION,
    at,
    // ── THE FIVE NUMBERS WORTH READING FIRST ──────────────────────────
    // A report nobody skims is a report nobody opens twice.
    summary: {
      turns: list.length,
      travellerTurns: list.length - assistantTurns.length,
      failedReplies: errors,
      // The count that mattered tonight: Gemlyx saying it had everything while the
      // computed brief said otherwise. One number instead of an argument.
      // ── COUNTED AT THE TURN, NOT AT THE END ────────────────────────
      // Found 18 Aug 2026 by an adversarial review, and it reported ZERO for the
      // incident it is named after: the first version compared every ready claim
      // against the FINAL brief, so a marker emitted on an empty brief at turn one
      // read as fine once the traveller went on to supply everything. A founder
      // reading "the five numbers worth reading first" would have shipped a fix for
      // the wrong bug. Each claim is now judged against what was known when it was
      // made, which is the only question worth asking about it.
      readyClaimsWhileIncomplete: readyClaimsWhileIncomplete(list, { intake, asked, today }),
      briefReady: brief.ready,
      stillMissing: brief.missing,
      askedAndUnanswered: brief.declined || [],
      // Two facts that are both true and do not fit. Named in the summary
      // because a guide built through one of these is the guide somebody files a
      // report about, and "nightlife with children" is the first line of the
      // explanation. See utils/briefConflicts.js.
      unresolvedConflicts: clashes.map(c => c.label),
      buildStarted: !!buildStarted,
      guideId: guideId || null,
    },
    // What the gate holds now, in full, with the slot labels so the file reads
    // without the source next to it.
    brief: {
      slots: BRIEF_SLOTS.map(s => ({
        key: s.key,
        label: s.label,
        tier: s.tier,
        value: brief.known[s.key]?.value ?? null,
        source: brief.known[s.key]?.source ?? null,
      })),
      missing: brief.missing,
      declined: brief.declined || [],
      vague: brief.vague,
      ready: brief.ready,
      wouldAskNext: nextAsks(brief).map(s => ({ key: s.key, ask: s.ask })),
      conflicts: clashes,
    },
    // Read the same way the preview reads it, so a report and a screen cannot
    // disagree about what mode or budget the trip was planned on.
    read: {
      mode: travelModeKey((intake.transport || []).join(", ")) || travelModeKey(travellerText) || null,
      budget: travellerBudget([intake.budgetText, travellerText].filter(Boolean).join("\n")) || null,
    },
    intake: intakeReport(intake),
    briefTimeline: briefTimeline(list, { intake, asked, today }),
    turns: list.map(turnReport),
  };
};

export const chatReportFilename = (at = "") => {
  const stamp = String(at).replace(/[:.]/g, "-").replace(/T/, "_").slice(0, 19) || "chat";
  return `gemlyx-chat-${stamp}.json`;
};
