import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { EMPTY_PROFILE, cleanProfile, cleanLearned, isBlank, saveProfile, SETUP_SQL, OBSERVED_FIELDS, knownAboutTraveller, REPLY_LENGTHS } from "../utils/profile";
import { settledObservations, learnedIsEmpty, OBSERVED_MIN } from "../utils/profileLearning";
import { accountProviders, hasPassword, updatePassword } from "../utils/auth";
// The guide's own first-stop photograph, the same one its header uses. Imported
// rather than passed in, because the alternative is threading a resolver through
// App.jsx for one screen, and this module already has no opinion about where the
// library lives.
import { guideHero, heroCaption } from "../utils/guideHero";
import { lookupRealPlace } from "../utils/guideEnrichment";
import { currentTrip, tripStatusLine } from "../utils/tripStatus";
import { ProfileQuestions } from "./ProfileQuestions";
import { AFFILIATES_PATH } from "../utils/affiliateRoster";

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
// ── THE SECTIONS, AND THE ORDER THEY ARE READ IN ────────────────────
//
// Oliver, 23 Aug 2026, revising the first cut: "throw phone number, adress, and
// name into the account part. Which should be called 'General', and should be
// the top of the panel. About me and Your data should be combined... And perhaps
// have the terms of use and privacy policies as a last panel."
//
// General is first because it holds identity and contact, which is what a person
// opens a settings screen to change. Legal is last because it is reference
// rather than a control. Plan sits between the two halves of what somebody does
// here: what Gemlyx knows about them, and what they are paying for.
//
// DATE OF BIRTH AND GENDER ARE ON NO SECTION. His instruction: "Date of Birth
// and Gender should be completely gone. You don't change your birth." Asked once
// at signup and never shown again. See utils/profile.js for what that costs.
//
// `id` is in the URL, `label` is on the rail, `blurb` is the line under it on the
// phone list, where every section is read before any is opened.
export const ME_SECTIONS = [
  { id: "general", label: "General", blurb: "Name, contact details and password." },
  // ── SAVED TRIPS BECAME A PLACE RATHER THAN A ROW ──────────────────
  //
  // Oliver, 15 Sep 2026: "I'd like 'saved trips' to have its own page under
  // account information. I want it to be a bunch of banners from the guides."
  //
  // They were a stack of one-line rows two thirds of the way down the Explore
  // tab, reachable from the menu by scrolling to an anchor. The thing somebody
  // came back to the app for was the hardest thing on it to find, and it looked
  // like a file list rather than like the trips it holds.
  //
  // Second in the rail on purpose. It is the only section here somebody opens to
  // USE rather than to change a setting, so it sits directly under General.
  { id: "trips", label: "Saved trips", blurb: "The guides you kept, and the way back into them." },
  { id: "about", label: "About me", blurb: "Your travel preferences and what Gemlyx has learned." },
  { id: "plan", label: "Plan", blurb: "What your account includes." },
  { id: "legal", label: "Legal", blurb: "Terms of Service and Privacy Policy." },
];
export const DEFAULT_ME_SECTION = "general";
// An unknown id in the address is not a section. Falls back rather than
// rendering an empty shell, because /me/nonsense is a link somebody can type.
export const meSectionFor = (id) =>
  ME_SECTIONS.some(s => s.id === id) ? id : DEFAULT_ME_SECTION;

export const NOTICED_LABEL = {
  interests: "Interests",
  transport: "Transport",
  company: "Travelling with",
  parts: "Regions visited",
  spend: "Budget",
};

export const AboutMePage = ({
  open, session, profile, savedGuides = [], savedPlaces = [], cloudSyncOk = true,
  setupSql = null, deleting = false, section = null, onSection, onClose, onProfileSaved,
  onNeedsSetup, onSignOut, onDelete, onOpenGuide, onDeleteGuide,
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
  // Shared with ProfileQuestions' own field styling so the two halves of the
  // General section do not read as two different forms.
  const legend = { fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 8 };
  const boxField = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px 13px", fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none" };
  const Card = ({ children }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: pad, marginBottom: 14 }}>{children}</div>
  );

  // ── WHICH SECTION, AND WHETHER THE RAIL IS EVEN THERE ─────────────
  //
  // His answer to how this behaves on a phone: "List, then push into the
  // section", the way phone settings work everywhere. So the rail is a DESKTOP
  // thing, and on a phone /me is the list and /me/<section> is the section with
  // a way back. The alternative he turned down, a row of tabs across the top,
  // is this morning's manage-list bug in a new place: five labels at 390px
  // either shrink to nothing or scroll sideways with options off the edge.
  const current = meSectionFor(section);
  // On a phone, an address with no section is the LIST. On a desktop there is no
  // list screen, because the rail is the list and it is always on screen.
  const showList = !wide && !section;

  const railItem = (sec, i) => (
    <button key={sec.id} onClick={() => onSection?.(sec.id)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
               background: current === sec.id ? `${C.gold}1F` : "none",
               border: `1px solid ${current === sec.id ? `${C.gold}55` : "transparent"}`,
               color: current === sec.id ? C.text : C.light,
               borderRadius: 11, padding: "11px 13px", fontSize: 13.5,
               fontWeight: current === sec.id ? 700 : 600, cursor: "pointer",
               fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
      <span style={{ color: current === sec.id ? C.gold : C.muted, fontSize: 11, flexShrink: 0 }}>✦</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec.label}</span>
    </button>
  );

  // ── THE THREE SECTIONS ────────────────────────────────────────────

  // ── GENERAL ───────────────────────────────────────────────────────
  const generalSection = (
    <>
      <Card>
        <H>Your details</H>
        <ProfileQuestions show="general" value={p} onChange={(v) => { setP(v); setSaved(false); }} />

        <div style={{ ...legend }}>Address</div>
        <textarea value={p.address || ""} rows={2}
          onChange={e => { setP({ ...p, address: e.target.value.slice(0, 200) }); setSaved(false); }}
          placeholder="Street, postcode, town"
          style={{ ...boxField, marginBottom: 18, resize: "vertical", lineHeight: 1.5 }} />

        <div style={{ ...legend }}>Phone</div>
        {/* type="tel" for the numeric keypad on a phone, and no pattern: formats
            differ by country, people write spaces, brackets and a leading plus,
            and a regex that rejects a real number is worse than one that accepts
            an unusual one. */}
        <input type="tel" value={p.phone || ""} autoComplete="tel"
          onChange={e => { setP({ ...p, phone: e.target.value.slice(0, 40) }); setSaved(false); }}
          placeholder="+45 12 34 56 78"
          style={{ ...boxField, marginBottom: 18 }} />

        {error && <div style={{ fontSize: 12, color: "#FF8A80", lineHeight: 1.55, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <button onClick={saveTyped} disabled={busy || isBlank(p)}
            style={{ background: C.gold, border: "none", color: C.onGold, borderRadius: 11, padding: "12px 22px", fontSize: 14.5, fontWeight: 700, cursor: (busy || isBlank(p)) ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: (busy || isBlank(p)) ? 0.45 : 1, whiteSpace: "nowrap" }}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {saved && <span style={{ fontSize: 12.5, color: C.light }}>Saved.</span>}
        </div>
      </Card>

      <Card>
        <H>Sign-in</H>
        {/* Read only. Email is the only route back into an account and Confirm
            email is still off in Supabase, so a change would apply without the
            new address ever being verified and one typo would lock somebody out
            permanently. Stated with the way to correct it, not greyed out. */}
        <div style={{ fontSize: 15, color: C.text, marginBottom: 6, overflowWrap: "anywhere" }}>{session?.email || "Signed in"}</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>
          Contact hello@gemlyxtravel.com to change your email address.
        </div>

        {setupSql && (
          <div style={{ fontSize: 11, color: "#FFB347", lineHeight: 1.6, marginBottom: 14, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
            Gemlyx cannot store your details yet: the database has no profile column. Run this once in the Supabase SQL editor.
            <code style={{ display: "block", marginTop: 7, color: C.light, fontSize: 10.5, wordBreak: "break-all" }}>{setupSql}</code>
          </div>
        )}

        {/* providers === null means the answer has not arrived. Nothing renders
            while that is true, because a control that might be dead is worse
            than one that arrives a moment later. */}
        {providers !== null && (hasPassword(providers) ? (
          pwOpen ? (
            <div style={{ marginBottom: 14 }}>
              <input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="New password" autoComplete="new-password"
                style={{ ...boxField, fontSize: 16, marginBottom: 8 }} />
              <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"
                style={{ ...boxField, fontSize: 16, marginBottom: 10 }} />
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
            You sign in with Google. There is no Gemlyx password on this account.
          </div>
        ))}

        {pwNote && (
          <div style={{ fontSize: 12, color: pwNote.bad ? "#FF8A80" : C.light, lineHeight: 1.55, marginBottom: 12 }}>{pwNote.text}</div>
        )}

        <button onClick={onSignOut}
          style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          Sign out
        </button>
      </Card>

      {/* ── AND DELETING IT SITS WITH SIGNING OUT OF IT ────────────────
          Oliver, 14 Sep 2026: "make a 'delete account' in the account info."

          It existed, and it was under ABOUT ME, which is the page about what
          Gemlyx knows rather than the page about the account. Nobody looking for
          a way out of a product reads the section titled "About me", and he did
          not find it either, which is the only test that matters.

          Next to Sign out, because the two are the same question asked with
          different force, and somebody who has just failed to find one is
          looking for the other.

          AND IT SAYS WHAT IT DOES NOW. The button read "Delete my data" and the
          line under it read "Contact hello@gemlyxtravel.com to also remove the
          sign-in record", which was an honest label on a product that could not
          do the thing the button implied. api/delete-account.js does it, so the
          words no longer have to apologise for the code. */}
      {/* ── HIS EDIT: THE LIST WAS STATING THE OBVIOUS ────────────────
          The first version listed five things, and his answer was "some of these
          are logical". Right: nobody needs telling that an address you sign in
          with is stored. What is left is the part somebody would not assume,
          which is that Gemlyx draws conclusions from behaviour, and the two
          things that can be removed. */}
      <Card>
        <H>Delete your account</H>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 8 }}>
          {savedPlaces.length} saved {savedPlaces.length === 1 ? "place" : "places"} and {savedGuides.length} saved {savedGuides.length === 1 ? "guide" : "guides"}
          {cloudSyncOk ? ", synced to this account." : ". Not reaching your account right now, so these are on this device only."}
        </div>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 18 }}>
          No tracking, no marketing email, nothing sold. The <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>Privacy Policy</a> lists it in full.
        </div>
        <button onClick={onDelete} disabled={deleting}
          style={{ width: "100%", background: "none", border: "1px solid #E23B4E66", color: "#E57373", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: deleting ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginTop: 12 }}>
          Removes your saved places, your guides, your details, everything Gemlyx has learned, and the login itself, on this device and in your account. This cannot be undone.
        </div>
      </Card>
    </>
  );

  // ── ABOUT ME ──────────────────────────────────────────────────────
  //
  // "Remember, everything AI knows about the person should be together.
  // EVERYTHING." The editing is split across sections because that is what suits
  // editing, so this section opens with the whole picture, read only, built by
  // knownAboutTraveller from the same cleaned profile profileForPrompt sends to
  // the model. One place that answers "what does this thing know about me".
  const known = knownAboutTraveller(p);
  const aboutSection = (
    <>
      {/* Rendered only when there is something to state. A card reading "not
          currently travelling" would be on the page every day of the year bar a
          fortnight. */}
      {trip && tripStatusLine(trip.status, trip.guide?.title) && (
        <div style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: pad, marginBottom: 14 }}>
          <H>Current trip</H>
          <div style={{ fontSize: 15, color: C.text, fontWeight: 600, lineHeight: 1.5 }}>
            {tripStatusLine(trip.status, trip.guide?.title)}
          </div>
          <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.6, marginTop: 8 }}>
            Based on your saved trip dates. Not stored.
          </div>
        </div>
      )}

      <Card>
        <H>What Gemlyx knows about you</H>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 16 }}>
          Everything on this list is sent to Gemlyx when it answers you. Nothing else about you is.
        </div>
        {known.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: "12px 0" }}>
            Nothing yet.
          </div>
        ) : known.map(k => (
          <div key={k.label} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flex: "0 0 auto", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, fontWeight: 700, minWidth: 118 }}>{k.label}</span>
            <span style={{ flex: "1 1 160px", minWidth: 0, fontSize: 13.5, color: C.text, overflowWrap: "anywhere" }}>{k.value}</span>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 14 }}>
          Name and country are edited under General. Age and gender were set when you created your account and cannot be changed here.
        </div>
      </Card>

      <Card>
        <H>Answer length</H>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 14 }}>
          How much Gemlyx says when it answers you.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          {REPLY_LENGTHS.map(o => {
            const on = p.replyLength === o;
            return (
              <button key={o} onClick={() => { setP({ ...p, replyLength: on ? "" : o }); setSaved(false); }}
                style={{ background: on ? C.gold : "transparent", border: `1px solid ${on ? C.gold : C.border}`, color: on ? C.onGold : C.light, borderRadius: 100, padding: "8px 16px", fontSize: 13, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {on ? "✓ " : ""}{o}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
          {p.replyLength === "Short" ? "Straight answers, no preamble."
            : p.replyLength === "Long" ? "Context and reasoning, the way a well-travelled friend would put it."
            : "Not set. Gemlyx picks the length to suit the question."}
        </div>
      </Card>

      <Card>
        <H>Travel preferences</H>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 16 }}>
          Used to tailor your guides.
        </div>
        <ProfileQuestions show="travel" value={p} onChange={(v) => { setP(v); setSaved(false); }} />
        {error && <div style={{ fontSize: 12, color: "#FF8A80", lineHeight: 1.55, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <button onClick={saveTyped} disabled={busy || isBlank(p)}
            style={{ background: C.gold, border: "none", color: C.onGold, borderRadius: 11, padding: "12px 22px", fontSize: 14.5, fontWeight: 700, cursor: (busy || isBlank(p)) ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: (busy || isBlank(p)) ? 0.45 : 1, whiteSpace: "nowrap" }}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {saved && <span style={{ fontSize: 12.5, color: C.light }}>Saved.</span>}
        </div>
      </Card>

      {/* Rule 4 of utils/profileLearning.js: visible AND reversible. The way out
          of each line sits on the line. */}
      <Card>
        <H>Learned preferences</H>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 16 }}>
          Drawn from your saved trips. Applied after {OBSERVED_MIN} trips. Your own answers always take priority.
        </div>

        {nothingNoticed ? (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: "12px 0" }}>
            None yet.
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
                        {/* The count is the evidence for the line, so it is
                            shown. A single sighting is listed and marked as not
                            applied, because hiding it would mean somebody clears
                            this page and watches it refill from evidence they
                            were never shown. */}
                        <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
                          {count === 1 ? "1 trip · not applied" : `${count} trips`}
                        </span>
                        <button onClick={() => forget(f, value)}
                          style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
              </div>
            ))}
            <button onClick={forgetAll}
              style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", marginTop: 4 }}>
              Clear all
            </button>
          </>
        )}
      </Card>

    </>
  );

  // ── PLAN ──────────────────────────────────────────────────────────
  //
  // His question was "make a payment panel as well. or?" and the answer he chose
  // was a panel that states the truth. There is no billing to show: nothing
  // charges, so there is no card on file, no invoice and no renewal date, and a
  // form for any of those would be the dead control this codebase spent the
  // morning removing from the landing page.
  //
  // What it CAN say is which plan somebody is on and what it covers, which is a
  // real question with a real answer. The tiers are his own, 10 Aug: the guide is
  // free and ungated, an account keeps it, and the living part is paid.
  const planSection = (
    <>
      <Card>
        <H>Your plan</H>
        <div style={{ fontSize: 20, fontFamily: "'Fraunces', serif", color: C.text, marginBottom: 10 }}>Free</div>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.75 }}>
          Unlimited guides.<br />
          Saved places and trips, kept on your account.<br />
          Gemlyx Detour and the entry pages in full.
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 14 }}>
          No payment method is held, because nothing on Gemlyx charges yet.
        </div>
      </Card>

      <Card>
        <H>Coming later</H>
        <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.75 }}>
          Updates as your trip approaches, when something worth rerouting for appears.<br />
          Help while you are there.
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 14 }}>
          Not available to buy yet. Nothing you have now will be taken away to make room for it.
        </div>
      </Card>
    </>
  );

  // ── LEGAL ─────────────────────────────────────────────────────────
  //
  // His: "perhaps have the terms of use and privacy policies as a last panel."
  // Links rather than the text itself: both are static pages served from
  // public/, they are the documents somebody may need to keep or print, and
  // reproducing them here would be a second copy to keep in step with the first.
  const legalSection = (
    <Card>
      <H>Legal</H>
      <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 18 }}>
        The agreement between you and Gemlyx, and what is done with your data.
      </div>
      {/* ── AND HOW THE SITE IS PAID FOR ────────────────────────────
          Oliver, 9 Sep 2026, asked for the affiliates page in the menu. It sits
          under Legal rather than in a section of its own because it answers the
          same kind of question the other two do: what the arrangement between
          you and Gemlyx is. It opens in this tab rather than a new one,
          because unlike the other two it is a page of this app.
          "How we are paid" rather than "Affiliates": a reader asking the
          question is not asking about our commercial arrangements, they are
          asking whether the recommendation was bought. */}
      {[["How we are paid", AFFILIATES_PATH, false], ["Terms of Service", "/terms.html", true], ["Privacy Policy", "/privacy.html", true]].map(([label, href, away]) => (
        <a key={href} href={href} {...(away ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textDecoration: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 15px", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{label}</span>
          <span style={{ fontSize: 15, color: C.gold, flexShrink: 0 }}>↗</span>
        </a>
      ))}
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 6 }}>
        Questions about either: hello@gemlyxtravel.com
      </div>
    </Card>
  );

  // ── SAVED TRIPS ──────────────────────────────────────────────────
  //
  // "a bunch of banners from the guides", and the banner he pointed at is the
  // one at the top of a guide: the photograph, the gold eyebrow, the title over
  // it. So this is that header at a smaller size, which means somebody scrolling
  // this list is looking at the same object they will be looking at one tap
  // later rather than at a row that represents it.
  //
  // THE PHOTOGRAPH IS THE GUIDE'S OWN, not a stock shot. guideHero walks the
  // trip in order and takes the first stop that resolves to a published row with
  // a picture, so every banner shows a real place on that specific route. The
  // header of utils/guideHero.js is the argument for why it is that and not
  // "something Danish", and it applies here unchanged.
  //
  // AND WHERE THERE IS NO PHOTOGRAPH THERE IS NO IMAGE. Same rule, same file: a
  // gradient pretending to be a photo would be a picture of nowhere, on exactly
  // the guides we know least about. Those banners are typographic instead, which
  // is honest and still reads as a banner.
  const tripsSection = (
    <Card>
      <H>Saved trips</H>
      {!savedGuides.length ? (
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65 }}>
          Nothing saved yet. Build a trip in Gemlyx Detour and press Keep, and it will be here on every device you sign in on.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6, marginBottom: 14 }}>
            {savedGuides.length} saved {savedGuides.length === 1 ? "guide" : "guides"}
            {cloudSyncOk ? ", synced to this account." : ". Not reaching your account right now, so these are on this device only."}
          </div>
          {savedGuides.map(g => {
            const hero = guideHero(g, lookupRealPlace);
            const caption = heroCaption(hero);
            const dayCount = Array.isArray(g.days) ? g.days.length : 0;
            return (
              <div key={g.id} style={{ position: "relative", marginBottom: 12 }}>
                {/* The whole banner is the target, not a link at the end of it.
                    A card somebody has to aim at is a row wearing a photograph. */}
                <div role="button" tabIndex={0}
                  onClick={() => onOpenGuide?.(g)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenGuide?.(g); } }}
                  style={{
                    position: "relative", overflow: "hidden", cursor: "pointer",
                    borderRadius: 14, border: `1px solid ${C.border}`,
                    minHeight: hero?.photo ? 150 : 0,
                    background: hero?.photo ? `#0b1020 url("${hero.photo}") center/cover no-repeat` : C.surface,
                    display: "flex", alignItems: "flex-end",
                  }}>
                  {/* The scrim, and it is not decoration: white text on an
                      unknown photograph is unreadable on about half of them. */}
                  {hero?.photo && (
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,10,22,0.92) 0%, rgba(6,10,22,0.55) 45%, rgba(6,10,22,0.15) 100%)" }} />
                  )}
                  <div style={{ position: "relative", padding: hero?.photo ? "18px 16px 14px" : "16px 16px 14px", width: "100%" }}>
                    <div style={{ fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase", color: C.gold, fontWeight: 700, marginBottom: 6 }}>
                      ✦ Your Gemlyx guide
                    </div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, lineHeight: 1.2, color: hero?.photo ? "#fff" : C.text }}>
                      {g.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: hero?.photo ? "rgba(255,255,255,0.78)" : C.muted, marginTop: 5 }}>
                      {[dayCount ? `${dayCount} ${dayCount === 1 ? "day" : "days"}` : "", caption].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                {/* Outside the clickable banner, so removing a trip can never be
                    a mis-tap on the thing that opens it. */}
                {onDeleteGuide && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteGuide(g.id); }}
                    aria-label={`Remove ${g.title}`}
                    style={{ position: "absolute", top: 10, right: 10, background: "rgba(6,10,22,0.66)", border: `1px solid ${C.border}`, color: "#fff", borderRadius: 100, width: 28, height: 28, fontSize: 13, lineHeight: 1, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          {/* The credit the licence asks for. Named per banner rather than in one
              line at the bottom, because CC BY attaches to the picture and not to
              the page it is on. */}
          {savedGuides.some(g => guideHero(g, lookupRealPlace)?.credit) && (
            <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.6, marginTop: 4 }}>
              Photographs are from the first stop of each trip, credited in full on the guide itself.
            </div>
          )}
        </>
      )}
    </Card>
  );

  const bodyFor = { general: generalSection, trips: tripsSection, about: aboutSection, plan: planSection, legal: legalSection };

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 990, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: `${wide ? 26 : 16}px ${wide ? 22 : 14}px calc(48px + env(safe-area-inset-bottom))` }}>

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

        {showList ? (
          /* ── THE PHONE LIST ─────────────────────────────────────────
             Every section visible at once, with the line that says what is in
             it, before anything is opened. His father is the accessibility test
             for this product and a name alone on a row is a guess. */
          <div>
            {ME_SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => onSection?.(sec.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 16px", cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3 }}>{sec.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{sec.blurb}</div>
                </div>
                <span style={{ color: C.gold, fontSize: 18, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", gap: wide ? 24 : 0 }}>
            {wide && (
              <nav style={{ flex: "0 0 216px", width: 216, position: "sticky", top: 26 }}>
                {ME_SECTIONS.map(railItem)}
              </nav>
            )}
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              {/* ── THE LABEL GOES WHEREVER THE RAIL IS NOT ──────────
                  On a desktop the highlighted rail item says which section you
                  are in. On a phone there is no rail, so the heading and the
                  way back have to carry it, or somebody is on a screen with no
                  name and no exit but the browser's own. */}
              {!wide && (
                <div style={{ marginBottom: 14 }}>
                  <button onClick={() => onSection?.(null)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.gold, padding: "6px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    <span style={{ fontSize: 17 }}>‹</span> Info about me
                  </button>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: C.text, marginTop: 4 }}>
                    {(ME_SECTIONS.find(x => x.id === current) || {}).label}
                  </div>
                </div>
              )}
              {bodyFor[current]}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
