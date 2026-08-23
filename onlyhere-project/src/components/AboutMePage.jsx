import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { EMPTY_PROFILE, cleanProfile, cleanLearned, isBlank, saveProfile, SETUP_SQL, OBSERVED_FIELDS } from "../utils/profile";
import { settledObservations, learnedIsEmpty, OBSERVED_MIN } from "../utils/profileLearning";
import { accountProviders, hasPassword, updatePassword } from "../utils/auth";
import { currentTrip, tripStatusLine } from "../utils/tripStatus";
import { ProfileQuestions } from "./ProfileQuestions";

// ── INFO ABOUT ME ────────────────────────────────────────────────────
//
// Oliver, 23 Aug 2026: "We need a page where you can set up profile picture,
// edit your info, change password, etc. and your 'edit what Gemlyx knows about
// you' should be 'info about me'. And this should show EVERYTHING you've
// gathered as info about the user already."
//
// ── THIS IS RULE 4, NOT A NEW FEATURE ────────────────────────────────
//
// utils/profileLearning.js has demanded this page in writing since 21 August,
// as the fourth of the four rules it was built on:
//
//   "IT HAS TO BE VISIBLE AND REVERSIBLE. Somebody has to be able to see what
//    Gemlyx thinks it has noticed and clear it. A profile that grows silently
//    from behaviour and cannot be inspected is the thing people mean when they
//    say they do not want to be profiled, and this is a Danish business."
//
// The learning half shipped and the seeing half did not, so for two days Gemlyx
// has been building a picture of people with nowhere for them to look at it.
//
// ── TWO KINDS OF FACT, AND THEY DO NOT GET MERGED ────────────────────
//
// He asked for one page showing everything, and the one thing that page must not
// do is print it as one list. What somebody TYPED and what Gemlyx NOTICED are
// different kinds of fact: profileLearning's third rule is that typed beats
// noticed always, and that an observation must never quietly become a typed
// answer. A merged list is exactly that promotion happening in the interface.
//
// So: two sections, in a person's words rather than the code's, and the noticed
// half says how it was noticed and can be cleared line by line.
//
// ── AND ONE THING THAT IS NEITHER ────────────────────────────────────
//
// Whether they are on the trip right now. Computed from the saved guide and
// today, never stored. See utils/tripStatus.js for why storing it would be a
// claim that was true when it was written.
//
// ── NO PROFILE PICTURE ───────────────────────────────────────────────
//
// He asked for one and then agreed to drop it, on the finding that gemlyx-media
// serves from /object/public/, so a face uploaded there is fetchable by anybody
// holding the URL, forever, and is covered by neither the published privacy
// policy nor the deletion copy. His own rule from August: a privacy promise that
// quietly goes stale is worse than one never made. Nothing in this product ever
// shows one person's picture to another, so it buys nothing to weigh against
// that. If it comes back it needs its own private bucket.
// The noticed fields in a person's words rather than the code's. MODULE SCOPE
// and exported, so the suite can assert that every field in OBSERVED_FIELDS has
// one: a field in the vocabulary and missing from here would print its own
// internal name at somebody, which is the fault TYPE_LABEL already exists to
// stop in Studio. Sorting is by OBSERVED_FIELDS, not by this object, so the two
// cannot disagree about the order either.
export const NOTICED_LABEL = {
  interests: "What you plan around",
  transport: "How you get about",
  company: "Who you travel with",
  parts: "Where in Denmark you go",
  spend: "What you have said about money",
};

export const AboutMePage = ({
  open, session, profile, savedGuides = [], onClose, onProfileSaved,
  onNeedsSetup, onSignOut, onDelete,
}) => {
  const [p, setP] = useState(EMPTY_PROFILE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 720);

  // null means NOT YET KNOWN, which is different from "no password". See
  // accountProviders in utils/auth.js: rendering a control we are not yet
  // entitled to render is the fault this distinction exists to prevent.
  const [providers, setProviders] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNote, setPwNote] = useState(null);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reopening must start from what is stored, not from the last edit somebody
  // abandoned. Same rule ProfileSheet already follows.
  useEffect(() => {
    if (!open) return;
    setP(profile ? cleanProfile(profile) : EMPTY_PROFILE);
    setError(null); setSaved(false);
    setPwOpen(false); setPw1(""); setPw2(""); setPwNote(null);
  }, [open, profile]);

  // ── ASKED ONCE, WHEN THE PAGE OPENS ─────────────────────────────────
  // Cancelled on close, because a slow answer landing after somebody has left
  // sets state on a page nobody is looking at.
  useEffect(() => {
    if (!open || !session) return;
    let live = true;
    accountProviders(session).then(list => { if (live) setProviders(list); });
    return () => { live = false; };
  }, [open, session]);

  if (!open) return null;

  const learned = cleanLearned(profile?.learned);
  const settled = settledObservations(learned);
  const nothingNoticed = learnedIsEmpty(learned);
  const trip = currentTrip(savedGuides, new Date());

  const saveTyped = async () => {
    setBusy(true); setError(null); setSaved(false);
    // The learned half is carried through UNTOUCHED. cleanProfile emits the
    // whole object literal and saveProfile writes it, so a save built from the
    // form alone would wipe every observation on the server: the same data loss
    // an adversarial review found on 22 August, from the other direction.
    const next = { ...cleanProfile(p), learned };
    const res = await saveProfile(session, next);
    setBusy(false);
    if (res.ok) { setSaved(true); onProfileSaved?.(next); return; }
    if (res.missingColumn) { onNeedsSetup?.(SETUP_SQL); setError("Gemlyx could not store this: the profile column is missing from the database. Nothing you typed has been lost, and the setup step is now shown in Studio."); return; }
    setError(res.error || "Could not save that. Your account is fine, this just did not go through.");
  };

  // Clearing one noticed thing means clearing its COUNT, not hiding it. A row
  // still holding four sightings would come straight back on the next trip and
  // read as though the clear had not worked.
  const forget = async (field, value) => {
    const nextLearned = { ...learned, [field]: { ...(learned[field] || {}) } };
    delete nextLearned[field][value];
    if (!Object.keys(nextLearned[field]).length) delete nextLearned[field];
    const next = { ...cleanProfile(profile || {}), learned: cleanLearned(nextLearned) };
    const res = await saveProfile(session, next);
    if (res.ok) onProfileSaved?.(next);
    else setError(res.error || "Could not clear that. Nothing has changed.");
  };

  const forgetAll = async () => {
    const next = { ...cleanProfile(profile || {}), learned: {} };
    const res = await saveProfile(session, next);
    if (res.ok) onProfileSaved?.(next);
    else setError(res.error || "Could not clear that. Nothing has changed.");
  };

  const changePassword = async () => {
    setPwNote(null);
    if (pw1.length < 8) { setPwNote({ bad: true, text: "A password needs at least 8 characters." }); return; }
    if (pw1 !== pw2) { setPwNote({ bad: true, text: "Those two do not match." }); return; }
    setPwBusy(true);
    try {
      await updatePassword(session, pw1);
      setPwBusy(false); setPw1(""); setPw2(""); setPwOpen(false);
      setPwNote({ bad: false, text: "Password changed. The next time you sign in, use the new one." });
    } catch (e) {
      setPwBusy(false);
      setPwNote({ bad: true, text: e?.message || "Could not change the password." });
    }
  };

  const pad = wide ? 26 : 18;
  const H = ({ children }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>{children}</div>
  );
  const Card = ({ children }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: pad, marginBottom: 14 }}>{children}</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 990, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: `${wide ? 26 : 16}px ${wide ? 22 : 14}px calc(48px + env(safe-area-inset-bottom))` }}>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: C.gold, fontSize: 14 }}>✦</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 3, color: C.light, fontWeight: 600 }}>GEMLYX</span>
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: wide ? 34 : 27, fontWeight: 600, color: C.text, lineHeight: 1.12 }}>
              Info about me
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis" }}>
              {session?.email || "Signed in"}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 100, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
            Close
          </button>
        </div>

        {/* ── RIGHT NOW ──────────────────────────────────────────────
            Only rendered when there is something true to say. A card reading
            "you are not currently travelling" is a card that tells nobody
            anything, and it would be on the page every day of the year bar a
            fortnight. */}
        {trip && tripStatusLine(trip.status, trip.guide?.title) && (
          <div style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: pad, marginBottom: 14 }}>
            <H>Right now</H>
            <div style={{ fontSize: 15, color: C.text, fontWeight: 600, lineHeight: 1.5 }}>
              {tripStatusLine(trip.status, trip.guide?.title)}
            </div>
            <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.6, marginTop: 8 }}>
              Worked out from the dates on your saved trip and today's date. Nothing is stored: change the trip and this changes with it.
            </div>
          </div>
        )}

        {/* ── WHAT YOU TOLD US ───────────────────────────────────────── */}
        <Card>
          <H>What you told us</H>
          <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 16 }}>
            Your own answers. These beat anything Gemlyx works out for itself, and you can change or empty any of them.
          </div>
          <ProfileQuestions value={p} onChange={(v) => { setP(v); setSaved(false); }} />
          {error && <div style={{ fontSize: 12, color: "#FF8A80", lineHeight: 1.55, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <button onClick={saveTyped} disabled={busy || isBlank(p)}
              style={{ background: C.gold, border: "none", color: C.onGold, borderRadius: 11, padding: "12px 22px", fontSize: 14.5, fontWeight: 700, cursor: (busy || isBlank(p)) ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: (busy || isBlank(p)) ? 0.45 : 1, whiteSpace: "nowrap" }}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            {saved && <span style={{ fontSize: 12.5, color: C.light }}>Saved.</span>}
          </div>
        </Card>

        {/* ── WHAT GEMLYX HAS PICKED UP ───────────────────────────────
            The section rule 4 asks for. Every line says what it is and offers
            the way out of it in the same row, because a list you can read and
            cannot change is not the thing that rule was asking for. */}
        <Card>
          <H>What Gemlyx has picked up</H>
          <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 16 }}>
            Noticed from the trips you have built, never from anything Gemlyx said itself. It takes {OBSERVED_MIN} trips before something counts, because one trip is not a habit. It is used to break a tie, never to overrule what you ask for.
          </div>

          {nothingNoticed ? (
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: "14px 0" }}>
              Nothing yet. Build a couple of trips and this fills up on its own.
            </div>
          ) : (
            <>
              {OBSERVED_FIELDS.filter(f => Object.keys(learned[f] || {}).length).map(f => (
                <div key={f} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{NOTICED_LABEL[f] || f}</div>
                  {Object.entries(learned[f])
                    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
                    .map(([value, count]) => {
                      const counts = (settled[f] || []).includes(value);
                      return (
                        <div key={value} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                          <span style={{ flex: "1 1 160px", minWidth: 0, fontSize: 13.5, color: counts ? C.text : C.muted }}>{value}</span>
                          {/* The count is the whole argument for the line being
                              here, so it is shown rather than summarised. One
                              sighting is visible too, marked as not counting
                              yet, because hiding it would mean somebody clears
                              this page and watches it refill from evidence they
                              were never shown. */}
                          <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
                            {count === 1 ? "once, does not count yet" : `on ${count} trips`}
                          </span>
                          <button onClick={() => forget(f, value)}
                            style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                            Forget this
                          </button>
                        </div>
                      );
                    })}
                </div>
              ))}
              <button onClick={forgetAll}
                style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 11, padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                Forget all of it
              </button>
            </>
          )}
        </Card>

        {/* ── YOUR ACCOUNT ───────────────────────────────────────────── */}
        <Card>
          <H>Your account</H>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>{session?.email || "Signed in"}</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            {savedGuides.length === 1 ? "1 saved guide" : `${savedGuides.length} saved guides`}, synced to this account.
          </div>

          {/* ── OFFERED ONLY WHERE IT CAN WORK ──────────────────────
              providers === null means the answer has not arrived, and nothing
              is rendered while that is true. A Google account has no password,
              so it is told that plainly rather than being shown a box that
              cannot do anything. */}
          {providers !== null && (hasPassword(providers) ? (
            pwOpen ? (
              <div style={{ marginBottom: 14 }}>
                <input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="New password"
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px", fontSize: 16, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 8, boxSizing: "border-box" }} />
                <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="New password again"
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px", fontSize: 16, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 10, boxSizing: "border-box" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button onClick={changePassword} disabled={pwBusy}
                    style={{ background: C.gold, border: "none", color: C.onGold, borderRadius: 10, padding: "11px 18px", fontSize: 13.5, fontWeight: 700, cursor: pwBusy ? "default" : "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
                    {pwBusy ? "Saving…" : "Save password"}
                  </button>
                  <button onClick={() => { setPwOpen(false); setPw1(""); setPw2(""); setPwNote(null); }} disabled={pwBusy}
                    style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 10, padding: "11px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setPwOpen(true); setPwNote(null); }}
                style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                Change password
              </button>
            )
          ) : (
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
              You sign in with Google, so there is no Gemlyx password to change.
            </div>
          ))}

          {pwNote && (
            <div style={{ fontSize: 12, color: pwNote.bad ? "#FF8A80" : C.light, lineHeight: 1.55, marginBottom: 12 }}>{pwNote.text}</div>
          )}

          <button onClick={onSignOut}
            style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
            Sign out
          </button>
          <button onClick={onDelete}
            style={{ width: "100%", background: "none", border: "1px solid #E23B4E66", color: "#E57373", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Delete my saved data
          </button>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginTop: 12 }}>
            This deletes everything we hold for you: your saved places, your guides, anything you told Gemlyx about yourself, and everything on this page that Gemlyx worked out for itself. To also remove the sign-in record, email hello@gemlyxtravel.com and it will be done.
          </div>
        </Card>

      </div>
    </div>
  );
};
