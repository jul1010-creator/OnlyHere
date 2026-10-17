import { useState, useEffect } from "react";
import { noticeWhen } from "../utils/nearbyNotices";
import { AI_GUIDES_SHOWN } from "../utils/features";
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
import { LIBRARY_PATH } from "../utils/tripLibrary";
import { externalHref } from "../utils/helpers";
import { t as uiT } from "../utils/uiLanguage";
import { DealAlertsCard } from "./DealAlerts";
import { GemlyxLogo } from "./GemlyxLogo";

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
  // ── NEAR YOU ──────────────────────────────────────────────────────
  //
  // Oliver, 17 Sep 2026: "it will have its own tab under 'near you' in the
  // account section where saved trips, General, about me, etc. is. and again,
  // when the event is over, then it disappears. Only what is current."
  //
  // Third, under Saved trips, because it belongs with the other section
  // somebody opens to USE rather than to change a setting, and it is the one
  // that goes stale: a reader who opens this account page at all is more likely
  // to be looking for what is on this week than for their own name.
  { id: "near", label: "Near you", blurb: "What the locals have on, while it is still on." },
  // ── DEAL ALERTS ───────────────────────────────────────────────────
  //
  // 15 Oct 2026, the same settings as the bell's (components/DealAlerts.jsx):
  // which kinds of place, and mail or not. Here as well "so it is easy to
  // find". Fourth, beside Near you, the other section about being told of
  // things. `labelKey` and `blurbKey` read it in the reader's language; the
  // English stays as the fallback the rest of this list uses.
  { id: "alerts", label: "Deal alerts", blurb: "New deals in the app and by email.", labelKey: "alerts.bell", blurbKey: "alerts.blurb" },
  { id: "about", label: "About me", blurb: "Your travel preferences and what Gemlyx has learned." },
  { id: "plan", label: "Plan", blurb: "What your account includes." },
  { id: "legal", label: "Legal", blurb: "Terms of Service and Privacy Policy." },
];
// The sections about guides, out of sight while utils/features.js says so
// (17 Oct 2026): Saved trips, About me (what guides are built from), Plan
// (the paid guide tier).
export const GUIDE_SECTIONS = ["trips", "about", "plan"];
export const SHOWN_ME_SECTIONS = ME_SECTIONS.filter(s => AI_GUIDES_SHOWN || !GUIDE_SECTIONS.includes(s.id));
export const DEFAULT_ME_SECTION = "general";
// An unknown id in the address is not a section. Falls back rather than
// rendering an empty shell, because /me/nonsense is a link somebody can type.
export const meSectionFor = (id) =>
  SHOWN_ME_SECTIONS.some(s => s.id === id) ? id : DEFAULT_ME_SECTION;

export const NOTICED_LABEL = {
  interests: "Interests",
  transport: "Transport",
  company: "Travelling with",
  parts: "Regions visited",
  spend: "Budget",
};

// ── MY ACCOUNT, 17 OCT 2026 ─────────────────────────────────────────
//
// Oliver, with a screenshot of the Legal section: "I want you to redesign the
// whole thing. 'Info about me' should be 'my account'. Take hold on Fable and
// you together scout the internet for something that can inspire. The logo
// also needs to be present."
//
// What Fable brought back from account pages that work (SAP Fiori's profile
// pattern, Vercel, Raycast, Apple Account, Linear on settings), and what was
// taken from it:
//   * The real Gemlyx mark and wordmark at the top, not the small ✦ GEMLYX.
//   * "My account" as the title, and under it whose account this is: initials
//     in a ring, the name if one is given, the email, how they sign in.
//   * The rail stays on a desktop and the list stays on a phone, as Oliver
//     chose on 23 Aug, but both are quieter: a thin gold bar marks the open
//     section instead of a filled box, and the phone list is one grouped
//     panel with dividers rather than a stack of separate cards.
//   * Rows that show the current value (the email, how the password stands)
//     with the action at the end of the row, so the page reads as facts about
//     the account rather than as one long form.
//   * Sign out as a quiet row of its own, and deleting the account last, on a
//     surface of its own with a red edge. Gold is never used for anything
//     that cannot be undone.
//
// THE PANELS AND ROWS LIVE AT MODULE SCOPE. Card used to be declared inside
// the component, which made it a new component on every render: React then
// threw away and rebuilt everything inside it on each keystroke, so a field in
// General lost focus after every letter typed. Declared once here, they keep
// their identity and the fields keep their focus.
export const meInitials = (name, email) => {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length) return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
  const e = String(email || "").trim();
  return e ? e[0].toUpperCase() : "G";
};

const MeCard = ({ children, testid }) => (
  <div data-testid={testid} style={{ background: C.surface, border: `1px solid ${C.gold}1F`, borderRadius: 14, padding: "clamp(18px, 3vw, 24px)", marginBottom: 14 }}>{children}</div>
);

// A titled group: the name above the panel in the serif, an optional line
// under it, and one surface holding the rows.
const MeGroup = ({ title, note, danger = false, children, testid, pad = false }) => (
  <section data-testid={testid} style={{ marginBottom: 26 }}>
    {title && <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 500, letterSpacing: -0.1, color: danger ? "#F0A49C" : C.text, margin: "0 0 4px" }}>{title}</h3>}
    {note && <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, margin: "0 0 12px" }}>{note}</div>}
    {!note && title && <div style={{ height: 8 }} />}
    <div style={{ background: C.surface, border: `1px solid ${danger ? "#E5737347" : `${C.gold}1F`}`, borderRadius: 14, overflow: "hidden", ...(pad ? { padding: "clamp(18px, 3vw, 24px)" } : null) }}>{children}</div>
  </section>
);

// One row: a label (and a line under it on the phone list), the current value
// in muted text, and what pressing it does at the end: a chevron into a
// section, ↗ out to a document, or a word of its own.
const MeRow = ({ label, sub, value, onClick, href, away = false, trail = null, tone = null, first = false, testid, strong = true }) => {
  const style = { display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 56, boxSizing: "border-box", padding: "12px 18px", background: "none", border: "none", borderTop: first ? "none" : `1px solid ${C.border}`, borderRadius: 0, textAlign: "left", textDecoration: "none", cursor: onClick || href ? "pointer" : "default", fontFamily: "'Inter', sans-serif", color: C.text };
  const body = (
    <>
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: strong ? 600 : 500, color: tone || C.text }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{sub}</span>}
      </span>
      {value != null && value !== "" && <span style={{ fontSize: 13.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "58%", textAlign: "right" }}>{value}</span>}
      {trail === "chevron" && <span aria-hidden="true" style={{ color: C.gold, opacity: 0.7, fontSize: 19, lineHeight: 1, flexShrink: 0 }}>›</span>}
      {trail === "away" && <span aria-hidden="true" style={{ color: C.gold, fontSize: 14, flexShrink: 0 }}>↗</span>}
      {trail && trail !== "chevron" && trail !== "away" && <span style={{ fontSize: 13.5, fontWeight: 700, color: C.gold, flexShrink: 0 }}>{trail}</span>}
    </>
  );
  if (href) return <a className="gx-me-row" href={href} data-testid={testid} {...(away ? { target: "_blank", rel: "noopener noreferrer" } : {})} style={style}>{body}</a>;
  if (onClick) return <button className="gx-me-row" type="button" data-testid={testid} onClick={onClick} style={style}>{body}</button>;
  return <div data-testid={testid} style={style}>{body}</div>;
};

export const AboutMePage = ({
  open, session, profile, savedGuides = [], savedPlaces = [], cloudSyncOk = true,
  setupSql = null, deleting = false, section = null, onSection, onClose, onProfileSaved,
  onNeedsSetup, onSignOut, onDelete, onOpenGuide, onDeleteGuide,
  notices = [], noticeRadiusKm = 30, hasLocation = false, onAskLocation,
  lang = "en",
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
  // The same component on every render (see MeCard at the top of the file).
  const Card = MeCard;

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

  // A section's name and line, in the reader's language where it has one.
  const labelOf = (sec) => (sec?.labelKey ? uiT(sec.labelKey, lang) : sec?.label);
  const blurbOf = (sec) => (sec?.blurbKey ? uiT(sec.blurbKey, lang) : sec?.blurb);

  // The rail: the section's name, and a thin gold bar on the open one rather
  // than a filled box, so the content beside it carries the weight.
  const railItem = (sec) => {
    const on = current === sec.id;
    return (
      <button key={sec.id} type="button" onClick={() => onSection?.(sec.id)} aria-current={on ? "page" : undefined} data-testid={`me-rail-${sec.id}`}
        style={{ display: "flex", alignItems: "center", width: "100%", textAlign: "left", position: "relative",
                 background: on ? `${C.gold}14` : "none", border: "none", borderRadius: 10,
                 color: on ? C.text : C.light, opacity: on ? 1 : 0.9,
                 padding: "11px 14px 11px 16px", fontSize: 15, fontWeight: on ? 600 : 500, cursor: "pointer",
                 fontFamily: "'Inter', sans-serif", marginBottom: 2 }}>
        <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 2, borderRadius: 2, background: on ? C.gold : "transparent" }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labelOf(sec)}</span>
      </button>
    );
  };

  // ── THE THREE SECTIONS ────────────────────────────────────────────

  // ── GENERAL ───────────────────────────────────────────────────────
  const generalSection = (
    <>
      <MeGroup title="Your details" pad testid="me-details">
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

        {error && <div role="alert" style={{ fontSize: 12.5, color: "#FF8A80", lineHeight: 1.55, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          {/* Off as an outline rather than a faded gold block, which read as
              mud on the dark panel (Fable's review, 17 Oct 2026). */}
          <button onClick={saveTyped} disabled={busy || isBlank(p)}
            style={{ ...((busy || isBlank(p)) ? { background: "none", border: `1px solid ${C.gold}66`, color: `${C.gold}99`, cursor: "default" } : { background: C.gold, border: `1px solid ${C.gold}`, color: C.onGold, cursor: "pointer" }), borderRadius: 11, padding: "12px 22px", fontSize: 14.5, fontWeight: 700, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {saved && <span role="status" style={{ fontSize: 13, color: C.light }}>Saved.</span>}
        </div>
      </MeGroup>

      {/* ── SIGNING IN ─────────────────────────────────────────────
          Rows that state the facts, with the action at the end of the row.
          The email is read only. Email is the only route back into an account
          and Confirm email is still off in Supabase, so a change would apply
          without the new address ever being verified and one typo would lock
          somebody out permanently. Stated with the way to correct it, not
          greyed out. */}
      <MeGroup title="Signing in" note="To change your email address, write to hello@gemlyxtravel.com." testid="me-signin">
        <MeRow first label="Email" value={session?.email || "Signed in"} />
        {/* providers === null means the answer has not arrived. Nothing renders
            while that is true, because a control that might be dead is worse
            than one that arrives a moment later. */}
        {providers !== null && (hasPassword(providers) ? (
          pwOpen ? (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 18px" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>Change password</div>
              <input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="New password" autoComplete="new-password"
                style={{ ...boxField, fontSize: 16, marginBottom: 8 }} />
              <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"
                style={{ ...boxField, fontSize: 16, marginBottom: 12 }} />
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
            <MeRow label="Password" value="••••••••" trail="Change" testid="me-change-password" onClick={() => { setPwOpen(true); setPwNote(null); }} />
          )
        ) : (
          <MeRow label="Password" value="Signed in with Google" />
        ))}
        {pwNote && (
          <div role="status" style={{ borderTop: `1px solid ${C.border}`, padding: "12px 18px", fontSize: 12.5, color: pwNote.bad ? "#FF8A80" : C.light, lineHeight: 1.55 }}>{pwNote.text}</div>
        )}
        {setupSql && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 18px", fontSize: 11, color: "#FFB347", lineHeight: 1.6 }}>
            Gemlyx cannot store your details yet: the database has no profile column. Run this once in the Supabase SQL editor.
            <code style={{ display: "block", marginTop: 7, color: C.light, fontSize: 10.5, wordBreak: "break-all" }}>{setupSql}</code>
          </div>
        )}
        {/* Sign out as the quiet last row of signing in, never a red button
            near the top. */}
        <MeRow label="Sign out" strong={false} onClick={onSignOut} testid="me-signout-row" />
      </MeGroup>

      {/* ── AND DELETING IT SITS WITH SIGNING OUT OF IT ────────────────
          Oliver, 14 Sep 2026: "make a 'delete account' in the account info."
          Next to Sign out, because the two are the same question asked with
          different force, and somebody who has just failed to find one is
          looking for the other. Last, on its own surface with a red edge,
          since 17 Oct 2026, and it says what goes rather than reassuring.
          api/delete-account.js does it, so the words do not have to apologise
          for the code. The old "No tracking, no marketing email, nothing
          sold" line went the same day the sign-in sheet's did: those are the
          Privacy Policy's to state, not a button's. */}
      <MeGroup title="Delete account" danger pad testid="me-delete">
        <div style={{ fontSize: 13.5, color: C.light, lineHeight: 1.65, marginBottom: 6 }}>
          {AI_GUIDES_SHOWN
            ? "Removes your saved places, your guides, your details, everything Gemlyx has learned, and the login itself, on this device and in your account."
            : "Removes your saved places, your details and the login itself, on this device and in your account."}
        </div>
        {/* The count only when there is something to count: "0 saved places"
            read as noise above the one sentence that matters. */}
        {(savedPlaces.length > 0 || (AI_GUIDES_SHOWN && savedGuides.length > 0)) && (
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 6 }}>
            {AI_GUIDES_SHOWN
              ? `${savedPlaces.length} saved ${savedPlaces.length === 1 ? "place" : "places"} and ${savedGuides.length} saved ${savedGuides.length === 1 ? "guide" : "guides"}`
              : `${savedPlaces.length} saved ${savedPlaces.length === 1 ? "place" : "places"}`}
            {cloudSyncOk ? ", synced to this account." : ". Not reaching your account right now, so these are on this device only."}
          </div>
        )}
        <div style={{ fontSize: 13.5, color: C.light, fontWeight: 600, lineHeight: 1.6, marginBottom: 16 }}>This cannot be undone.</div>
        <button onClick={onDelete} disabled={deleting} data-testid="me-delete-button"
          style={{ background: "none", border: "1px solid #E5737399", color: "#F0A49C", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: deleting ? "default" : "pointer", fontFamily: "'Inter', sans-serif" }}>
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </MeGroup>
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
          {/* Off as an outline rather than a faded gold block, which read as
              mud on the dark panel (Fable's review, 17 Oct 2026). */}
          <button onClick={saveTyped} disabled={busy || isBlank(p)}
            style={{ ...((busy || isBlank(p)) ? { background: "none", border: `1px solid ${C.gold}66`, color: `${C.gold}99`, cursor: "default" } : { background: C.gold, border: `1px solid ${C.gold}`, color: C.onGold, cursor: "pointer" }), borderRadius: 11, padding: "12px 22px", fontSize: 14.5, fontWeight: 700, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
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
    <>
      {/* ── AND HOW THE SITE IS PAID FOR ────────────────────────────
          Oliver, 9 Sep 2026, asked for the affiliates page in the menu, and it
          sat here under Legal as "How we are paid".

          TAKEN OFF THE ACCOUNT PAGE, 17 Oct 2026. Oliver: "Remove 'How we're
          paid' from the account". The page itself stays, at /affiliates, and
          so does its link in the site footer beside Terms and Privacy, which
          is where a reader wondering about a booking link looks. */}
      {/* No line above the panel: the section's own line already says what
          is in it, and the two read as a stutter. */}
      <MeGroup testid="me-legal">
        {[["Terms of Service", "/terms.html", true], ["Privacy Policy", "/privacy.html", true]].map(([label, href, away], i) => (
          <MeRow key={href} first={i === 0} label={label} href={href} away={away} trail="away" />
        ))}
      </MeGroup>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: -12 }}>
        Questions about either: hello@gemlyxtravel.com
      </div>
    </>
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
    <>
    {/* ── AND OTHER PEOPLE'S, WHICH IS WHERE THIS BELONGS ──────
        19 Sep 2026, with the published list. Somebody who opens Saved trips is
        looking for a trip, and the shortest honest thing to offer a reader who
        has none of their own yet is somebody else's. One card, above their own,
        and it says in its own line what was taken out of those trips before
        they went up. */}
    <Card>
      <H>Trips people kept</H>
      <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.65 }}>
        Real trips Gemlyx built for other travellers, with the dates, who was coming and the conversation taken out.
      </div>
      <a href={LIBRARY_PATH}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: `${C.gold}1a`, border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "8px 13px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
        Browse them
      </a>
    </Card>
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
    </>
  );

  // ── NEAR YOU ──────────────────────────────────────────────────────
  //
  // Three states and they are different facts: this browser has not said where
  // it is, it has and nothing is on, or here is what is on. The first is a
  // question with a button on it; the second is an answer and not a failure.
  const nearSection = (
    <>
      <Card>
        {!hasLocation ? (
          <>
            <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.75, marginBottom: 12 }}>
              Gemlyx needs to know roughly where you are before it can tell you what is on within {noticeRadiusKm} km.
            </div>
            <button onClick={() => onAskLocation?.()}
              style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 100, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Use my location
            </button>
          </>
        ) : notices.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.75 }}>
            Nothing on within {noticeRadiusKm} km of you right now. This fills up when a local community posts something with a date on it, and
            empties itself again the day after.
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.75 }}>
            {notices.length === 1 ? "One thing on near you." : `${notices.length} things on near you.`} They disappear on their own once they are over.
          </div>
        )}
      </Card>

      {notices.map(n => (
        <Card key={n.id}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.gold, marginBottom: 6 }}>
            {n.place || "Near you"}{n.km >= 1 ? ` · ${Math.round(n.km)} km` : ""}
          </div>
          <div style={{ fontSize: 15, fontFamily: "'Fraunces', serif", color: C.text, lineHeight: 1.3, marginBottom: 6 }}>{n.headline}</div>
          {n.body && <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>{n.body}</div>}
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{noticeWhen(n)}</div>
          {/* WHERE IT CAME FROM, because this is the one thing on Gemlyx that
              has not been through the pipeline. A reader deciding whether to
              drive an hour deserves to see the post it came from. */}
          {externalHref(n.sourceUrl) && (
            <a href={externalHref(n.sourceUrl)} target="_blank" rel="noreferrer"
              style={{ display: "inline-block", marginTop: 10, fontSize: 11.5, fontWeight: 700, color: C.gold, textDecoration: "none" }}>
              Where this was posted ↗
            </a>
          )}
        </Card>
      ))}
    </>
  );

  // ── DEAL ALERTS ───────────────────────────────────────────────────
  // The bell's settings, read and saved by the card itself. A plain box in
  // Card's own style rather than <Card>, which is made anew on every render
  // and would start the settings over each time this page draws. No heading
  // of its own: the rail, or the phone's title, already says Deal alerts.
  const alertsSection = (
    <div data-testid="me-alerts-section" style={{ background: C.surface, border: `1px solid ${C.gold}1F`, borderRadius: 14, padding: pad, marginBottom: 14 }}>
      <DealAlertsCard session={session} lang={lang} />
    </div>
  );

  const bodyFor = { general: generalSection, trips: tripsSection, near: nearSection, alerts: alertsSection, about: aboutSection, plan: planSection, legal: legalSection };

  // ── THE HEADER: THE MARK, THE TITLE, AND WHOSE ACCOUNT ────────────
  // The name comes from the stored profile rather than the form being edited,
  // so the header does not change letter by letter while somebody types.
  const shownName = String(profile?.name || "").trim();
  const signInWay = providers === null ? "" : hasPassword(providers) ? "Signs in with email and password" : "Signs in with Google";
  const identity = (
    <div data-testid="me-identity" style={{ display: "flex", alignItems: "center", gap: 14, marginTop: wide ? 16 : 12 }}>
      <div aria-hidden="true" style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface, border: `1px solid ${C.gold}66`, boxShadow: `0 0 0 4px ${C.gold}10`, color: C.text, fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 500, letterSpacing: 0.5 }}>
        {meInitials(shownName, session?.email)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shownName || session?.email || "Signed in"}</div>
        {shownName && <div style={{ fontSize: 13, color: C.light, opacity: 0.8, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.email}</div>}
        {signInWay && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{signInWay}</div>}
      </div>
    </div>
  );
  const title = uiT("me.title", lang);
  const openSec = ME_SECTIONS.find(x => x.id === current) || {};

  return (
    <div data-testid="me-page" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 990, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <style>{`.gx-me-row:hover { background: ${C.gold}0D !important; }
        .gx-me-row:focus-visible, [data-testid="me-page"] button:focus-visible, [data-testid="me-page"] a:focus-visible { outline: 2px solid ${C.gold}; outline-offset: -2px; }`}</style>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: `${wide ? 26 : 16}px ${wide ? 28 : 16}px calc(56px + env(safe-area-inset-bottom))` }}>

        {/* ── THE BAR ─────────────────────────────────────────────────
            The Gemlyx mark and wordmark, which the page did not carry before
            ("The logo also needs to be present"), and the way out. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: wide ? 34 : 24 }}>
          <span data-testid="me-logo" role="img" aria-label="Gemlyx" style={{ display: "inline-flex" }}>
            <GemlyxLogo size={wide ? 26 : 22} color={C.text} />
          </span>
          <button onClick={onClose} data-testid="me-close"
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 100, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
            Close
          </button>
        </div>

        {(wide || showList) ? (
          <header style={{ marginBottom: wide ? 30 : 24, paddingBottom: wide ? 28 : 0, borderBottom: wide ? `1px solid ${C.border}` : "none" }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: wide ? 38 : 30, fontWeight: 500, letterSpacing: -0.5, color: C.text, lineHeight: 1.08, margin: 0 }}>
              {title}
            </h1>
            {identity}
          </header>
        ) : (
          /* ── THE LABEL GOES WHEREVER THE RAIL IS NOT ──────────────
             On a phone there is no rail, so the heading and the way back carry
             the section's name, or somebody is on a screen with no name and no
             exit but the browser's own. */
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => onSection?.(null)} data-testid="me-back"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.gold, padding: "6px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>‹</span> {title}
            </button>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500, letterSpacing: -0.3, color: C.text, margin: "6px 0 0" }}>
              {labelOf(openSec)}
            </h1>
          </div>
        )}

        {showList ? (
          /* ── THE PHONE LIST ─────────────────────────────────────────
             Every section visible at once, with the line that says what is in
             it, before anything is opened. His father is the accessibility test
             for this product and a name alone on a row is a guess. One grouped
             panel with dividers, then Sign out as its own quiet row. */
          <div data-testid="me-list">
            <MeGroup>
              {SHOWN_ME_SECTIONS.map((sec, i) => (
                <MeRow key={sec.id} first={i === 0} label={labelOf(sec)} sub={blurbOf(sec)} trail="chevron" onClick={() => onSection?.(sec.id)} testid={`me-list-${sec.id}`} />
              ))}
            </MeGroup>
            <MeGroup>
              <MeRow first label="Sign out" strong={false} onClick={onSignOut} />
            </MeGroup>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", gap: wide ? 40 : 0 }}>
            {wide && (
              <nav aria-label={title} style={{ flex: "0 0 210px", width: 210, position: "sticky", top: 26 }}>
                {SHOWN_ME_SECTIONS.map(railItem)}
              </nav>
            )}
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              {/* The section's name only. Its line lives on the phone list's
                  rows, and a blurb here stacked a third heading layer above the
                  first field (Fable's review, 17 Oct 2026). */}
              {wide && (
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 500, letterSpacing: -0.3, color: C.text, margin: 0 }}>{labelOf(openSec)}</h2>
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
