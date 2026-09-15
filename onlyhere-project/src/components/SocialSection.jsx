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
// ── THE MARKS ───────────────────────────────────────────────────────
//
// Oliver, same day: "can you change the 'social medias' to their icons? To make
// it look more modern", and then "icons = logos".
//
// These are the real marks, and they are NOT drawn here by hand. They come from
// `simple-icons`, the CC0 set that publishes each platform's official glyph, so
// the shapes are the platforms' own rather than somebody's approximation of
// them. That matters beyond neatness: a hand-traced logo is a distorted
// trademark, which is the one version of this that is a problem.
//
// Two conditions come with using them and both are met here. The shapes are
// unmodified, and they are used to link to those platforms and nothing else.
// Monochrome is deliberate: every brand's guidelines allow a single-colour mark,
// and six full-colour logos in a row on a page this warm would look like an
// advertising strip rather than a footer.
//
// LINKEDIN HAS NO GLYPH IN THE SET, so it falls back to its name in a pill. A
// missing icon is a fallback, never a blank chip.
import { C } from "../utils/theme";
import { platformLabel, socialSourceLine, NAMED } from "../utils/socialAccounts";
import { siFacebook, siInstagram, siX, siTiktok, siYoutube } from "simple-icons";

// Keyed by the platform strings socialAccounts.js already uses, so a platform
// added there shows up here as a name in a pill rather than as nothing.
const GLYPH = {
  facebook: siFacebook,
  instagram: siInstagram,
  x: siX,
  tiktok: siTiktok,
  youtube: siYoutube,
};

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
  const tint = unconfirmed ? C.light : C.gold;
  const edge = unconfirmed ? C.border : `${C.gold}55`;

  return (
    <div style={{ marginTop: 22, marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        Social media
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {accounts.map((a, i) => {
          const glyph = GLYPH[String(a.platform).toLowerCase()];
          const name = platformLabel(a.platform);
          // The handle is in the label rather than beside the mark: a row of
          // circles reads as one object, and a row of circles with text after
          // each one reads as a list of links wearing decorations.
          const label = a.handle ? `${name}, @${a.handle}` : name;
          return (
            // rel="noreferrer" and nothing else: these are not affiliate links
            // and must not be dressed as any. A new tab because the reader is in
            // the middle of an entry and a profile is a detour.
            <a key={i} href={a.url} target="_blank" rel="noreferrer" title={label} aria-label={label}
              style={glyph ? {
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 38, height: 38, borderRadius: "50%",
                background: C.surface, border: `1px solid ${edge}`, color: tint, textDecoration: "none",
              } : {
                display: "inline-flex", alignItems: "center", gap: 6,
                background: C.surface, border: `1px solid ${edge}`, color: tint,
                borderRadius: 100, padding: "9px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none",
              }}>
              {glyph ? (
                // viewBox 0 0 24 24 is the set's own, and the path is theirs
                // unchanged. currentColor so the two states above are the only
                // place a colour is decided.
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" focusable="false">
                  <path d={glyph.path} />
                </svg>
              ) : name}
            </a>
          );
        })}
      </div>
      {note ? (
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginTop: 10 }}>{note}</div>
      ) : null}
    </div>
  );
};

export default SocialSection;
