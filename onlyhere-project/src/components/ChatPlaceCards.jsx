import { EntryLink } from "./EntryLink";
import { creditIsRequired } from "../utils/imageCredits";

// ── THE PICTURES UNDER A REPLY ───────────────────────────────────────
//
// Oliver, 23 Aug 2026: "when Ribe is mentioned, show a picture of it as well.
// Make it distinct from other AIs."
//
// What is distinct is not the picture. It is that there is only ever a picture
// when Gemlyx holds a checked entry for the place, and that tapping it opens
// that entry. See utils/chatPlaces.js for the rule and why the silence matters
// as much as the photograph.
//
// ── THE CREDIT IS NOT OPTIONAL AND NOT DECORATION ───────────────────
//
// imageCredits.js states the licence position in its own words: CC BY and CC
// BY-SA make attribution MANDATORY, and the credit has to sit reasonably near
// the work rather than only on a credits page. A 116px card is near the work.
//
// So a photo whose licence requires a credit and whose credit is not known does
// not get shown. That is the same call licenseIsUsable makes in
// api/commons-photo, and it is the only one available: showing it would be a
// licence breach on the page whose terms clause 10.5 says the photographs
// belong to their photographers.
// ── THE BADGE IS COPY, SO IT FOLLOWS THE CONVERSATION ───────────────
// A Danish reader being shown a Danish town under a Danish sentence should not
// be told "CHECKED". Two languages here rather than six, for the reason
// readerLanguage.js gives about its own Danish block: a word nobody in this
// project can read is a word nobody can correct.
const CHECKED = { da: "TJEKKET", de: "GEPRÜFT", nl: "GECHECKT", sv: "KOLLAD", no: "SJEKKET" };
const checkedLabel = (lang) => CHECKED[String(lang?.tag || "").split("-")[0].toLowerCase()] || "CHECKED";

const creditLine = (credit) => {
  const who = String(credit?.photographer || "").trim();
  const lic = String(credit?.license || "").trim();
  if (!who) return "";
  return lic ? `${who} · ${lic}` : who;
};

export const showablePhoto = (place) => {
  const photo = String(place?.photo || "").trim();
  if (!photo) return null;
  const credit = place?.__photoCredit || null;
  // Unknown licence: treated as not requiring a credit, which is the existing
  // behaviour everywhere else in this app for a photo Oliver took himself.
  if (credit && creditIsRequired(credit) && !String(credit.photographer || "").trim()) return null;
  return { photo, credit };
};

export const ChatPlaceCards = ({ places = [], C, onOpen, lang = null }) => {
  const rows = (Array.isArray(places) ? places : [])
    .map(p => ({ place: p, shot: showablePhoto(p) }))
    .filter(x => x.shot);
  if (!rows.length) return null;

  return (
    <div
      style={{
        display: "flex", gap: 8, marginTop: 8, marginLeft: 6,
        overflowX: "auto", paddingBottom: 2, maxWidth: "100%",
        scrollbarWidth: "none",
      }}
    >
      {rows.map(({ place, shot }) => (
        <div
          key={`${place._src || "row"}-${place.name}`}
          onClick={() => onOpen && onOpen(place)}
          style={{
            flex: "0 0 auto", width: 124, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden",
            cursor: onOpen ? "pointer" : "default",
          }}
        >
          <div style={{ position: "relative", height: 78, background: `${C.gold}18` }}>
            <img
              src={shot.photo}
              alt={place.name}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* The emoji sits UNDER the photo rather than beside it, so a broken
                image leaves the card looking deliberate instead of empty. */}
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 26, zIndex: -1,
            }}>{place.emoji || "📍"}</div>
            {/* The mark that says this one is ours and was checked. */}
            <div style={{
              position: "absolute", top: 6, left: 6, fontSize: 9, fontWeight: 700,
              letterSpacing: ".08em", color: C.onGold || "#20160A", background: C.gold,
              borderRadius: 100, padding: "2px 6px",
            }}>✦ {checkedLabel(lang)}</div>
          </div>
          <div style={{ padding: "7px 9px 8px" }}>
            <EntryLink
              type={place._src}
              name={place.name}
              style={{ color: C.text, textDecoration: "none" }}
            >
              <div style={{
                fontSize: 11.5, fontWeight: 700, color: C.text, lineHeight: 1.3,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{place.name}</div>
            </EntryLink>
            {creditLine(shot.credit) && (
              // WRAPS, never truncates. An ellipsis through "CC BY-SA 3.0"
              // leaves an attribution that names the photographer and not the
              // licence, which is half of what CC BY asks for. Two lines of 8.5px
              // is a smaller price than a licence breach.
              <div style={{
                fontSize: 8.5, color: C.muted, marginTop: 3, lineHeight: 1.35,
                wordBreak: "break-word",
              }}>{creditLine(shot.credit)}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
