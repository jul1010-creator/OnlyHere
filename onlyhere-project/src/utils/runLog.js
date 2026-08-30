// ── WHAT THE PIPELINE ACTUALLY DID ───────────────────────────────────
//
// Oliver, 11 Aug 2026: "In order to finally sort out logistics, I need to be
// able to exactly have a note of what the Pipeline did... while the pipeline
// certainly works, I want to see what happened in the making of a draft."
//
// A Studio draft makes between 25 and 40 external calls across 28 steps, to six
// providers. Before this file, NOTHING survived the run:
//
//   - apiCost kept an in-memory array capped at 25 runs, gone on reload, with
//     no timestamps, no URLs and no outcomes.
//   - gemlyx_research stored the research text but nothing about the process.
//   - the stage bar showed the current step and then cleared it.
//   - fifteen of the twenty-eight steps fail SILENTLY: the journey query, the
//     official-site query, every founder-domain search, the night-transport
//     check, the geocode, the nearest-stop lookup, the real-transport check,
//     the ferry probe, the opening-hours lookup, the re-geocode, every page
//     scrape, the phrasing scan, the targeted rewrite, the invented-claim
//     check and its re-research, and the memory write.
//
// So a draft that came out thin was indistinguishable from a draft where nine
// grounding steps quietly returned nothing. That is the whole reason logistics
// could not be reasoned about: not that the pipeline is wrong, but that it is
// unobservable.
//
// ── WHY THIS LIVES BESIDE apiCost RATHER THAN BESIDE NOTHING ─────────
// apiCost already owns the run lifecycle (startRun / endRun) and already wraps
// window.fetch once to see every request. A second recorder with its own
// lifecycle is precisely the duplicated-state bug this codebase keeps finding,
// so the journal is written INTO the same run object. One run, two questions:
// what did it cost, and what did it do.
//
// ── THE RULE THIS FILE EXISTS TO ENFORCE ────────────────────────────
// Every step records an OUTCOME, and "skipped" is a first-class outcome with a
// reason. A step that did not run is not the same as a step that ran and found
// nothing, and neither is the same as a step that failed. Collapsing those
// three into a blank is exactly how nine silent failures looked like a working
// pipeline.

// ── AND A FIFTH, WHICH WAS BEING RECORDED AS ITS OPPOSITE ───────────
//
// Oliver's run log, 30 Aug 2026, drafting Vanvittig Verdenshistorie - Aarhus:
//
//   31. What the pages say a ticket costs  [fetch · empty · discarded]
//       got: 280 DKK, from a ticket shop or calendar
//
// Empty, discarded, and a price. The step had done its job perfectly — a page
// states 280 DKK, the draft states nothing, and that gap went to him as a
// founder note. It had no honest outcome to report itself with. "ok" would say
// the draft is fine, "empty" says nothing was found, and the truth is the third
// thing: SOMETHING WAS FOUND AND THE DRAFT IS MISSING IT.
//
// He read "empty · discarded" on the one line in a 49-step run that was worth
// acting on, and concluded the pipeline was being obtuse about a cost anybody
// could look up. He was reading it correctly. The label was wrong.
//
// This is the same argument the file already makes one paragraph up, one rung
// further along: a step that did not run is not a step that found nothing, and
// A STEP THAT FOUND A PROBLEM IS NOT A STEP THAT FOUND NOTHING EITHER.
//
// ── AND AN UNKNOWN OUTCOME BECOMES "ok", WHICH IS WHY THIS IS HERE ──
// entry() below falls back to "ok" for anything not on this list. Adding the
// outcome at the call site without adding it here would have recorded the miss
// as a clean pass — quieter than the bug it was fixing, and invisible.
export const OUTCOMES = ["ok", "empty", "failed", "skipped", "found"];

// One entry per step. `used` is the honest half: a step can succeed and have
// its answer thrown away, which is invisible in a cost meter and is the thing
// worth seeing when two sources disagree.
const entry = (step, o) => ({
  step,
  at: o.at ?? null,                  // ms since the run started, filled by note()
  provider: o.provider || "",        // google | perplexity | tavily | claude | openai | nominatim | supabase
  detail: o.detail || "",            // what it was asked, in one line
  outcome: OUTCOMES.includes(o.outcome) ? o.outcome : "ok",
  why: o.why || "",                  // required in spirit for skipped and failed
  got: o.got || "",                  // a short readable summary of the answer
  used: o.used === undefined ? null : !!o.used,   // did the answer reach the draft
});

let run = null;
const finished = [];
const MAX_KEPT = 12;
const STORE_KEY = "gemlyx_run_log";

const now = () => (typeof performance !== "undefined" ? performance.now() : 0);

export const startLog = (label, subject) => {
  run = { label, subject: subject || "", startedAt: new Date().toISOString(), t0: now(), steps: [], decisions: [] };
  return run;
};

// Deliberately tolerant: a draft must never fail because logging failed, which
// is the same rule the fetch meter follows.
export const note = (step, opts = {}) => {
  if (!run) return;
  try { run.steps.push(entry(step, { ...opts, at: Math.round(now() - run.t0) })); } catch { /* never break a draft */ }
};

// A DECISION is different from a step: it is the moment two sources disagreed
// and something picked. Recorded separately because these are the lines he
// actually wants to audit, and they are drowned by 40 call records otherwise.
export const decide = (what, opts = {}) => {
  if (!run) return;
  try {
    run.decisions.push({
      what,
      at: Math.round(now() - run.t0),
      winner: opts.winner || "",       // who was believed
      loser: opts.loser || "",         // who was overruled, or "" if nobody
      rule: opts.rule || "",           // the rule that decided it, in one line
      value: opts.value === undefined ? "" : String(opts.value),
    });
  } catch { /* never break a draft */ }
};

export const endLog = () => {
  if (!run) return null;
  run.endedAt = new Date().toISOString();
  run.ms = Math.round(now() - run.t0);
  delete run.t0;
  const done = run;
  run = null;
  finished.unshift(done);
  if (finished.length > MAX_KEPT) finished.length = MAX_KEPT;
  // Survives a reload, which is the difference between a log and a status bar.
  //
  // AND IT SAYS WHETHER IT SURVIVED. This swallowed the error entirely, so a
  // full quota meant the shelf silently stopped advancing and the panel showed
  // an old run as though it were the last one. See storeState at the foot of
  // this file. The in-memory copy is still authoritative for this session, so a
  // failed write is a reload problem and never a draft problem.
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(finished));
    storeState.wrote = true; storeState.why = "";
  } catch (e) {
    storeState.wrote = false;
    storeState.why = /quota|exceeded/i.test(String(e?.name || e?.message || ""))
      ? "The browser's storage for this site is full, so these runs are kept for this session only and will be gone after a reload."
      : "This browser refused to store the run log, so these runs are kept for this session only and will be gone after a reload.";
  }
  return done;
};

export const currentLog = () => run;
export const recentLogs = () => {
  if (finished.length) return finished.slice();
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
};

// ── READING IT ──────────────────────────────────────────────────────
// The counts he asked for first: what ran, what quietly did not, and which
// providers were actually consulted.
export const summariseLog = (log) => {
  const steps = log?.steps || [];
  const by = (o) => steps.filter(s => s.outcome === o);
  const providers = [...new Set(steps.map(s => s.provider).filter(Boolean))];
  // ── HOW MUCH OF THE RUN NOBODY WROTE DOWN ─────────────────────────
  // Oliver's first real log, 11 Aug: a 210 second draft with three steps in it,
  // the last one at 43.4s. So 167 seconds, eighty per cent of the run, happened
  // with nothing recording it, and the log did not say so. It listed what it
  // had and left the reader to notice the arithmetic.
  //
  // That is the exact failure this file was written against, one level up: a
  // step that did not run is not the same as a step that ran and found nothing,
  // AND A STEP NOBODY INSTRUMENTED IS NOT THE SAME AS A STEP THAT DID NOT RUN.
  // Three outcomes became four, and the fourth was invisible.
  const lastAt = steps.length ? Math.max(...steps.map(s => s.at || 0)) : 0;
  const ms = log?.ms ?? null;
  const unlogged = ms != null && ms > lastAt ? ms - lastAt : 0;
  return {
    label: log?.label || "",
    subject: log?.subject || "",
    ms,
    total: steps.length,
    ok: by("ok").length,
    empty: by("empty").length,
    failed: by("failed").length,
    skipped: by("skipped").length,
    found: by("found").length,
    // The number that matters: steps that ran, succeeded, and were thrown away.
    discarded: steps.filter(s => s.used === false).length,
    lastAt,
    unlogged,
    unloggedShare: ms ? unlogged / ms : 0,
    providers,
    decisions: (log?.decisions || []).length,
  };
};

// Plain text, because the first thing he will want to do with a run is paste it
// into a message and ask why a draft came out the way it did.
export const formatLog = (log) => {
  if (!log) return "";
  const s = summariseLog(log);
  // FOUND is shouted like FAILED, because it is the line he has to act on and
  // it was previously the quietest line on the page.
  const mark = { ok: "ok", empty: "empty", failed: "FAILED", skipped: "skipped", found: "FOUND A GAP" };
  const lines = [
    `${s.label}${s.subject ? `: ${s.subject}` : ""}`,
    `${log.startedAt || ""}${s.ms != null ? `  ·  ${(s.ms / 1000).toFixed(1)}s` : ""}`,
    `${s.total} steps  ·  ${s.ok} ok, ${s.empty} found nothing, ${s.failed} failed, ${s.skipped} skipped`
      + (s.found ? `  ·  ${s.found} found a gap in the draft` : "")
      // Was "1 answered and were discarded".
      + (s.discarded ? `  ·  ${s.discarded} answered and ${s.discarded === 1 ? "was" : "were"} discarded` : ""),
    `providers: ${s.providers.join(", ") || "none"}`,
  ];
  // Printed as its own line rather than tucked into the counts, because it is
  // the one number that says how much of this report to trust as a whole.
  if (s.unlogged > 1000) {
    lines.push(`NOT RECORDED: ${(s.unlogged / 1000).toFixed(1)}s after the last logged step, ${Math.round(s.unloggedShare * 100)}% of the run. Those steps ran, nothing wrote them down.`);
  }
  lines.push("");
  (log.steps || []).forEach((st, i) => {
    const head = `${String(i + 1).padStart(2, " ")}. ${st.step}`;
    const tail = [
      st.provider,
      mark[st.outcome] || st.outcome,
      st.used === false ? "discarded" : null,
    ].filter(Boolean).join(" · ");
    // "at 38.5s", not "38.5s". Three steps reading 38.5, 40.1 and 43.4 look
    // like three forty-second calls when they are actually three moments five
    // seconds apart. He read it that way, and so did I writing it.
    lines.push(`${head}  [${tail}]${st.at != null ? `  at ${(st.at / 1000).toFixed(1)}s` : ""}`);
    if (st.detail) lines.push(`     asked: ${st.detail}`);
    if (st.got) lines.push(`     got:   ${st.got}`);
    // The reason is the point of the whole file for these two.
    // "found" joins these two: the reason IS the finding, and printing the
    // figure without saying what is wrong with it is how this read as noise.
    if (st.why && (st.outcome === "skipped" || st.outcome === "failed" || st.outcome === "found")) lines.push(`     why:   ${st.why}`);
  });
  if ((log.decisions || []).length) {
    lines.push("", "DECISIONS (where two sources disagreed and something picked)");
    log.decisions.forEach(d => {
      lines.push(`  · ${d.what}: believed ${d.winner}${d.loser ? `, overruled ${d.loser}` : ""}`);
      if (d.value) lines.push(`      value: ${d.value}`);
      if (d.rule) lines.push(`      rule:  ${d.rule}`);
    });
  }
  return lines.join("\n");
};

// ── TWELVE RUNS KEPT, ONE EVER SHOWN ────────────────────────────────
//
// Oliver, 25 Aug 2026: "its draft on Aarhus was called out by Gemini.
// Unfortunately I can only see the latest report."
//
// He can only see the latest report because the panel renders `logs[0]` under a
// heading reading "What the last run did", and nothing else. MAX_KEPT has been
// 12 since this file was written, every one of them is persisted through a
// reload, and eleven of the twelve have never been visible to anybody.
//
// That is this repository's signature failure wearing its reporting hat:
// finished, correct, tested code that nothing surfaces. Same shape as the six
// DetailPage save props that were passed and rendered as an unlabelled heart,
// found four hours ago. The log did not need building. It needed a door.
//
// AND THE MISSING DOOR HAS A COST HE JUST PAID. A draft is checked by a person
// afterwards; by the time Gemini calls out the Aarhus logistics, that run is
// two or three drafts back and its trace — which names every logistics step that
// found nothing, and every measured leg the prose then contradicted — is sitting
// in localStorage with no way to read it. The check happened. The evidence was
// kept. Nobody could open it.

// One line per stored run, for a picker. Short enough to sit on a chip.
export const logChips = (logs) => (Array.isArray(logs) ? logs : []).map((log, i) => {
  const s = summariseLog(log);
  // The subject is what he is looking for — "Aarhus" — so it leads. The label
  // ("Draft", "Guide") only disambiguates when there is no subject.
  const name = s.subject || s.label || "run";
  return {
    i,
    name,
    // A run is WORTH OPENING when something in it went wrong, and the chip says
    // so rather than making him open twelve to find out. failed outranks empty
    // outranks discarded, because those are increasing degrees of "it ran".
    trouble: s.failed ? "failed" : s.empty ? "empty" : s.discarded ? "discarded" : "",
    count: s.failed || s.empty || s.discarded || 0,
    when: log?.startedAt || "",
    seconds: s.ms != null ? Math.round(s.ms / 1000) : null,
  };
});

// The whole shelf as one paste. This is the thing he actually needs at the
// moment a draft is called out: the run in question is several drafts back and
// he does not know which one it was.
export const formatLogs = (logs) => {
  const list = (Array.isArray(logs) ? logs : []).filter(Boolean);
  if (!list.length) return "";
  const head = `${list.length} run${list.length === 1 ? "" : "s"} kept, newest first. Nothing older is stored.`;
  return [head, ...list.map((l, i) => `\n${"═".repeat(64)}\nRUN ${i + 1} OF ${list.length}\n${"═".repeat(64)}\n${formatLog(l)}`)].join("\n");
};

// ── AND WHY THERE MAY BE FEWER THAN TWELVE ──────────────────────────
//
// endLog writes all twelve runs to localStorage as one string and swallows
// whatever comes back. A run with forty steps carrying full `got` sentences is
// tens of kilobytes, twelve of them can pass the 5MB origin quota alongside
// everything else this app stores, and a QuotaExceededError there means the
// shelf silently stops advancing: the panel then shows a run that is not the
// last one, with no indication that it is stale.
//
// A limit hit is not a limit reported — the rule this codebase found twice
// today. So the write says whether it worked, and the panel can say so too.
export const storeState = { wrote: null, why: "" };
