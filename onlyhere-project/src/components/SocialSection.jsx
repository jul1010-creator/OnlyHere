// ── THE SOCIAL MEDIA SECTION, WHICH IS NOT PART OF THE ARTICLE ──────
//
// Oliver, 15 Sep 2026: "Can you just make a section at the bottom of the drafts
// like I have instagram videos and pictures? So something that is not part of
// the draft, but a 'social media' section." And then: "sweep it into the
// 'social media' section."
//
// So this is the other end of the sweep. api/social-find.js reads a venue's own
// page, socialSweep.js writes what it found onto the row as `__social`, and
// until now nothing rendered it: the whole feature stopped one step short of a
// reader. That is the same shape as the bug this project has now hit four
// times, a feature that works and is never drawn, so it is worth saying plainly
// that THIS component is the only thing standing between the sweep and the
// page.
//
// ── WHY IT IS ITS OWN BLOCK AND NOT A LINE IN THE PROSE ─────────────
//
// Everything above it on the page was written by the pipeline and fact-checked
// as prose. This was not written at all: it is a list of accounts a crawler
// found in a footer. Mixing the two would put an unwritten, unchecked thing
// inside the part of the page that promises every claim was checked. The
// Instagram embed already sits outside the article for the same reason.
//
// ── AND IT SAYS HOW IT KNOWS ────────────────────────────────────────
//
// The record carries `how` and a date. An account found in the venue's own
// footer is a fact; an account matched because its handle resembles the venue's
// name is a guess, and the sweep stores which of the two it was. The line under
// the chips says so in words, and a name-matched record says outright that it
// is not confirmed. Same rule as the ticket links and the frozen facts: where
// something is estimated, the page says so.
import { C } from "../utils/theme";
import { platformLabel, socialSourceLine, NAMED } from "../utils/socialAccounts";

// The record is written by the sweep, but it arrives from the database, which
// means it arrives as whatever is in the column. Every field is checked here
// rather than trusted: a row with a half-written record renders nothing rather
// than a chip pointing at "undefined".
const usable = (a) =>
  a && typeof a === "object" &&
  typeof a.url === "string" && /^https:\/\//i.test(a.url) &&
  !!platformLabel(a.platform);

export const SocialSection = ({ item }) => {
  const record = item && item.__social;
  const accounts = (Array.isArray(record?.accounts) ? record.accounts : []).filter(usable);
  // No accounts is the normal state for most rows, and an empty heading that
  // promises a section and delivers nothing is worse than no section.
  if (!accounts.length) return null;

  const unconfirmed = String(record?.how || "") === NAMED;
  const note = socialSourceLine(record);

  return (
    <div style={{ marginTop: 22, marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        Social media
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {accounts.map((a, i) => (
          // rel="noreferrer" and nothing else: these are not affiliate links and
          // must not be dressed as any. Opening in a new tab because the reader
          // is in the middle of an entry and a social profile is a detour.
          <a key={i} href={a.url} target="_blank" rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: C.surface, border: `1px solid ${unconfirmed ? C.border : `${C.gold}55`}`,
              color: unconfirmed ? C.light : C.gold, borderRadius: 100,
              padding: "7px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}>
            {platformLabel(a.platform)}
            {/* The handle, because two Facebook pages for the same town are a
                real thing and the reader is the one who can tell them apart. */}
            {a.handle ? <span style={{ fontWeight: 400, color: C.muted }}>@{a.handle}</span> : null}
          </a>
        ))}
      </div>
      {note ? (
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 8 }}>{note}</div>
      ) : null}
    </div>
  );
};

export default SocialSection;
