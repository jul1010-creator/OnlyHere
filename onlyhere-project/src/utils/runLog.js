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

export const OUTCOMES = ["ok", "empty", "failed", "skipped"];

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
  try { localStorage.setItem(STORE_KEY, JSON.stringify(finished)); } catch { /* private mode, keep the in-memory copy */ }
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
  return {
    label: log?.label || "",
    subject: log?.subject || "",
    ms: log?.ms ?? null,
    total: steps.length,
    ok: by("ok").length,
    empty: by("empty").length,
    failed: by("failed").length,
    skipped: by("skipped").length,
    // The number that matters: steps that ran, succeeded, and were thrown away.
    discarded: steps.filter(s => s.used === false).length,
    providers,
    decisions: (log?.decisions || []).length,
  };
};

// Plain text, because the first thing he will want to do with a run is paste it
// into a message and ask why a draft came out the way it did.
export const formatLog = (log) => {
  if (!log) return "";
  const s = summariseLog(log);
  const mark = { ok: "ok", empty: "empty", failed: "FAILED", skipped: "skipped" };
  const lines = [
    `${s.label}${s.subject ? `: ${s.subject}` : ""}`,
    `${log.startedAt || ""}${s.ms != null ? `  ·  ${(s.ms / 1000).toFixed(1)}s` : ""}`,
    `${s.total} steps  ·  ${s.ok} ok, ${s.empty} found nothing, ${s.failed} failed, ${s.skipped} skipped`
      + (s.discarded ? `  ·  ${s.discarded} answered and were discarded` : ""),
    `providers: ${s.providers.join(", ") || "none"}`,
    "",
  ];
  (log.steps || []).forEach((st, i) => {
    const head = `${String(i + 1).padStart(2, " ")}. ${st.step}`;
    const tail = [
      st.provider,
      mark[st.outcome] || st.outcome,
      st.used === false ? "discarded" : null,
    ].filter(Boolean).join(" · ");
    lines.push(`${head}  [${tail}]${st.at != null ? `  ${(st.at / 1000).toFixed(1)}s` : ""}`);
    if (st.detail) lines.push(`     asked: ${st.detail}`);
    if (st.got) lines.push(`     got:   ${st.got}`);
    // The reason is the point of the whole file for these two.
    if (st.why && (st.outcome === "skipped" || st.outcome === "failed")) lines.push(`     why:   ${st.why}`);
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
