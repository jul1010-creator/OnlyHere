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
// ── "'CHECKED', WHAT DOES THAT MEAN?" ───────────────────────────────
//
// Oliver, 5 Sep 2026, looking at his own chat. It is a fair question and the
// badge could not answer it. Checked by whom, against what, and why is it on a
// photograph — it reads as a trust mark of the kind every site has and nobody
// believes.
//
// What it actually meant is much more specific and much more interesting: a
// picture appears ONLY when Gemlyx holds its own written page for the place, and
// tapping it opens that page. That is the rule chatPlaces.js enforces and the
// reason the silence matters as much as the photograph. So the badge says that
// instead, in words, and the line under the name says what tapping does.
//
// Two languages here rather than six, for the reason readerLanguage.js gives
// about its own Danish block: a word nobody in this project can read is a word
// nobody can correct.
const OURS = { da: "VORES SIDE", de: "UNSERE SEITE", nl: "ONZE PAGINA", sv: "VÅR SIDA", no: "VÅR SIDE" };
const OPEN_IT = {
  da: "Tryk for at læse den", de: "Tippen zum Lesen",
  nl: "Tik om te lezen", sv: "Tryck för att läsa", no: "Trykk for å lese",
};
const langKey = (lang) => String(lang?.tag || "").split("-")[0].toLowerCase();
const oursLabel = (lang) => OURS[langKey(lang)] || "OUR PAGE";
const openLabel = (lang) => OPEN_IT[langKey(lang)] || "Tap to read it";

// ── AND IT ARRIVES THE WAY A PICTURE ARRIVES ────────────────────────
//
// Oliver, same message: "make it a small picture into the chat. Imagine you're
// talking to me and you want to show me a picture."
//
// That is a precise brief and the old layout was the opposite of it. A row of
// 124-pixel cards scrolling sideways under the reply is a carousel, and nobody
// sends a carousel to a friend. A shared picture is one image, roughly the width
// of the message it came with, sitting under the sentence with the same corner
// cut off — and it lands a beat AFTER the words, because that is the order it
// happens in when a person does it.
//
// The stagger is what makes two pictures read as two things being shown rather
// than as a gallery loading.
const PHOTO_CSS = `
@keyframes gx-shared-photo{
  from{opacity:0;transform:translateY(8px) scale(.97)}
  to{opacity:1;transform:none}
}
.gx-shared-photo{animation:gx-shared-photo .34s cubic-bezier(.2,.7,.3,1) both}
@media (prefers-reduced-motion: reduce){.gx-shared-photo{animation:none}}
`;

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

// ── TWO LAYOUTS, ONE CARD ───────────────────────────────────────────
//
// Oliver, 26 Aug 2026: "Can you have it showing on the side of the chat panel?
// With such a small chat panel, it is more convenient that people can read
// while seeing the picture."
//
// The card itself does not change — same photograph, same checked mark, same
// credit, same door into the entry. What changes is whether they run across
// under the reply or down the side of it, which is one flex-direction and one
// width. A second component would be a second place for the licence credit rule
// to be got wrong, and that rule is the one with a legal edge on it.
//
// Both layouts now have room for a name to wrap. "row" used to be a sideways
// strip of 124-pixel cards where it could not, and the ellipsis went with the
// strip when the row became a shared picture on 5 Sep. The names are kept
// because they are what the two call sites pass and what the CSS in chatRail.js
// switches between; "row" means "under the reply" and "rail" means "beside it".
// ── AND A THIRD LAYOUT, INSIDE A MAP PIN ────────────────────────────
//
// Oliver, 6 Sep 2026, having seen the pins: "coordinate the map with these..
// so basically on the map, have them as small pop ups with a picture."
//
// A third layout rather than a second component, for the reason the second
// layout gives one screen up: "a second component would be a second place for
// the licence credit rule to be got wrong, and that rule is the one with a
// legal edge on it." A popup on a 148px map is the smallest thing this card
// has ever had to fit in, which makes it exactly the place somebody would be
// tempted to hand-write a bit of HTML with an <img> in it and no credit.
//
// So "pin" is "rail", narrower and with a shorter photograph. Everything that
// matters — showablePhoto's licence check, the OUR PAGE mark, the wording and
// its five translations, the credit that wraps rather than truncating — is the
// same code running in a smaller box.
export const ChatPlaceCards = ({ places = [], C, onOpen, lang = null, layout = "row", className = "" }) => {
  const pin = layout === "pin";
  const rail = layout === "rail" || pin;
  const rows = (Array.isArray(places) ? places : [])
    .map(p => ({ place: p, shot: showablePhoto(p) }))
    .filter(x => x.shot);
  if (!rows.length) return null;

  return (
    <>
    <style>{PHOTO_CSS}</style>
    <div
      className={className || undefined}
      style={rail ? {
        display: "flex", flexDirection: "column", gap: 10,
        width: pin ? 132 : "100%",
      } : {
        // ── SHOWN, NOT SHELVED ──────────────────────────────────────
        // A column under the reply, left-aligned with it, one picture per row.
        // The old version was a sideways-scrolling strip of 124px cards, which
        // is a carousel; nobody sends a carousel to a friend.
        display: "flex", flexDirection: "column", gap: 6,
        marginTop: 6, marginLeft: 6, maxWidth: "min(82%, 240px)",
      }}
    >
      {rows.map(({ place, shot }, idx) => (
        <div
          key={`${place._src || "row"}-${place.name}`}
          onClick={() => onOpen && onOpen(place)}
          // Staggered, so two pictures read as two things being shown one after
          // the other rather than as a gallery finishing its load.
          className={rail ? undefined : "gx-shared-photo"}
          style={rail ? {
            width: "100%", background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden",
            cursor: onOpen ? "pointer" : "default",
          } : {
            width: "100%", background: C.surface,
            border: `1px solid ${C.border}`,
            // The same corner the assistant's own bubble has, so the picture
            // reads as coming from the same speaker rather than from the page.
            borderRadius: "14px 14px 14px 4px", overflow: "hidden",
            cursor: onOpen ? "pointer" : "default",
            animationDelay: `${idx * 90}ms`,
          }}
        >
          <div style={{ position: "relative", height: pin ? 62 : rail ? 88 : 132, background: `${C.gold}18` }}>
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
            {/* ── WHAT THE MARK ACTUALLY MEANS ────────────────────────
                It used to say "CHECKED", which Oliver asked about directly on
                5 Sep and which could not answer him: checked by whom, against
                what. What it means is that Gemlyx has its own written page for
                this place — that is the whole rule for whether a picture appears
                at all — so that is what it says. */}
            <div style={{
              position: "absolute", top: 6, left: 6, fontSize: 9, fontWeight: 700,
              letterSpacing: ".08em", color: C.onGold || "#20160A", background: C.gold,
              borderRadius: 100, padding: "2px 6px",
            }}>✦ {oursLabel(lang)}</div>
          </div>
          <div style={{ padding: "7px 9px 8px" }}>
            <EntryLink
              type={place._src}
              name={place.name}
              style={{ color: C.text, textDecoration: "none" }}
            >
              <div style={rail ? {
                fontSize: 11.5, fontWeight: 700, color: C.text, lineHeight: 1.3,
                // The rail has the height a row does not, so a long name wraps
                // rather than being cut. "Østerlars Rundkirke" with an ellipsis
                // through it is a name nobody can match against a road sign.
                wordBreak: "break-word",
              } : {
                fontSize: 12.5, fontWeight: 700, color: C.text, lineHeight: 1.3,
                // Wraps here too now. The old strip could not afford two lines at
                // 124px wide; a shared picture can.
                wordBreak: "break-word",
              }}>{place.name}</div>
            </EntryLink>
            {/* Says what tapping does, which is the other half of the answer to
                "what does that mean?". A picture that opens something has to say
                so, or it is a picture. */}
            <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2, fontWeight: 600 }}>
              {openLabel(lang)}
            </div>
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
    </>
  );
};
