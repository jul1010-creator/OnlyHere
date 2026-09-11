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
// ── "'CHECKED', WHAT DOES THAT MEAN?" AND THEN, "DO WE NEED IT?" ────
//
// Oliver asked the first on 5 Sep 2026, looking at his own chat, and it was a
// fair question the badge could not answer: checked by whom, against what.
//
// What it meant was specific and interesting: a picture appears ONLY when
// Gemlyx holds its own written page for the place, and pressing it opens that
// page. So the badge was rewritten to say that. Then, on 9 Sep: "Do you really
// think we need the 'our page' badge?"
//
// No, and his own argument against "CHECKED" is what settles it. See the note
// where the badge used to be. The line under the name carries the useful half
// and the rule lives in chatPlaces.js, where it always did.
//
// Two languages here rather than six, for the reason readerLanguage.js gives
// about its own Danish block: a word nobody in this project can read is a word
// nobody can correct.
const OPEN_IT = {
  da: "Læs mere", de: "Mehr lesen",
  nl: "Lees meer", sv: "Läs mer", no: "Les mer",
};
const langKey = (lang) => String(lang?.tag || "").split("-")[0].toLowerCase();
const openLabel = (lang) => OPEN_IT[langKey(lang)] || "Read more";

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
// "rail" is gone as a call site. Oliver, 8 Sep 2026: "The sidepanel is
// primarily for the map. If you want pictures there, have them minimized. But I
// prefer having them put under the text instead." So the side column carries
// the map alone and every card is under the reply, which is the layout this was
// written for in the first place.
//
// The narrow column layout itself did not go anywhere: it is what a pin popup
// is, and "pin" is that shape one size smaller. What follows keeps the two
// names it still has, "row" and "pin".
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
// So "pin" is the column card, narrower and with a shorter photograph.
// Everything that matters, showablePhoto's licence check, the OUR PAGE mark,
// the wording and its five translations, the credit that wraps rather than
// truncating, is the same code running in a smaller box.
// How many pictures one reply may show. Exported so the suite can assert the
// cap rather than counting a literal, and so the number has one home.
//
// ── IT WAS TWO, AND TWO WAS A HEIGHT BUDGET ───────────────────────
//
// Two existed because the cards ran DOWN a 190px column beside the bubble, and
// three at 88px stacked is 264px of pictures beside a reply that is often 120px
// tall, which pushes the next reply off the screen. That was a real cost and it
// is gone: a row has the same height whether it holds one card or four.
//
// So the ceiling is CHAT_PLACE_CAP now, upstream in chatPlaces.js, where the
// reason is about the reply rather than about the layout: "a reply that names
// six places and shows six photographs is a gallery with a sentence attached,
// and the sentence is the product." Three is that rule's number, and this slice
// stops throwing away the third thing it found.
export const CARDS_MAX = 3;

// The width of one card in a row of them. Three plus their gaps is 466px, which
// sits inside the chat column on a laptop and runs past the edge of a phone,
// where it scrolls. Beside photoHeight rather than in the CSS file, because the
// two numbers are one decision about the shape of a card.
export const STRIP_CARD_W = 150;

export const ChatPlaceCards = ({ places = [], C, onOpen, lang = null, layout = "row", className = "" }) => {
  // One name for the two, because they were two until the side column stopped
  // carrying cards. Kept as a separate word rather than folded into `pin`
  // everywhere below, so the difference between "this is the column shape" and
  // "this is the smaller one inside a marker" stays readable.
  const pin = layout === "pin";
  const rail = pin;
  const found = (Array.isArray(places) ? places : [])
    .map(p => ({ place: p, shot: showablePhoto(p) }))
    .filter(x => x.shot);
  // TWO, for the reason spelled out below. The cap is here rather than at the
  // call site because both call sites want it and one of them is a map marker
  // that only ever passes one anyway.
  const rows = pin ? found : found.slice(0, CARDS_MAX);
  if (!rows.length) return null;
  // ── ONE PICTURE, OR A ROW OF THEM ─────────────────────────────────
  //
  // Oliver, 10 Sep 2026: "have the pictures going under its text. So if the AI
  // mentions multiple attractions or towns, it will become a long horrizontal
  // line, rather than vertical."
  //
  // THIS DOES NOT UNDO "NOBODY SENDS A CAROUSEL TO A FRIEND". That was about
  // ONE picture rendered as a small card in a scrolling strip, and one picture
  // is still one picture, message width, the size it has been since 5 Sep. What
  // changes is the case that argument never covered: several places in one
  // reply. Down a column they cost height per place and the answer was to show
  // fewer; across a row they cost none, and the third card comes back.
  //
  // Asked which he wanted for a single place, he chose the big picture.
  const strip = !pin && rows.length > 1;

  // ── HOW MANY, AND HOW BIG ─────────────────────────────────────────
  //
  // Oliver, 9 Sep 2026: "if it suggests others as well, then the individual
  // pictures will just become smaller to avoid a chaos." And then, on his way
  // to bed: "instead of having multiple pictures if it talks about Legoland and
  // Tivoli, you could make it into a slideshow. Whatever you find to be the
  // best solution."
  //
  // ── THE SLIDESHOW IS THE WRONG ANSWER AND SHRINKING IS HALF ONE ───
  //
  // A slideshow keeps the height constant however many places there are, which
  // is the thing to want. What it costs is that every picture after the first
  // is behind a control, and a picture nobody looks at has not appeared. The
  // whole feature is that a place Gemlyx mentions shows its face; putting the
  // second face behind a dot is the same as not having it. This component
  // already argued the shape down once, when the row of 124px cards became a
  // shared picture: "nobody sends a carousel to a friend."
  //
  // Shrinking alone runs out too. Three at 62px stacked in a 190px column is
  // 330px of pictures beside a reply that is often 120px tall, which pushes the
  // next reply down and is the exact thing putting them beside the text avoided.
  //
  // SO THE ANSWER IS FEWER, NOT SMALLER OR HIDDEN. Two beside the text, at a
  // size where the photograph is worth looking at. A third place named in the
  // same reply still gets its name in the sentence, which is where a reader
  // learns about it anyway, and still gets a pin on the map beside it. It loses
  // a thumbnail, and it was going to lose one either way, to a dot or to 62px.
  //
  // The two heights are this file's own ladder rather than numbers picked
  // tonight: 132 under a reply, 88 in a column, 62 inside a map marker, each
  // measured against a real width once.
  // 132 under a reply, 110 in a row of them, 62 inside a map marker. The middle
  // number is new and it is not a shrink for its own sake: a row card is about
  // as wide as it is tall, so 110 keeps three of them inside a laptop column
  // while leaving the photograph worth looking at. STRIP_CARD_W is the width
  // that goes with it.
  const photoHeight = pin ? 62 : strip ? 110 : 132;

  return (
    <>
    <style>{PHOTO_CSS}</style>
    <div
      className={className || undefined}
      style={rail ? {
        display: "flex", flexDirection: "column", gap: 10,
        width: pin ? 132 : "100%",
      } : strip ? {
        // ── SEVERAL PLACES RUN ACROSS ───────────────────────────────
        // Constant height however many there are, which is the property the
        // column never had and the reason a third card can exist again. Wider
        // than the column can hold, it scrolls sideways rather than wrapping:
        // a second row would put the height back.
        display: "flex", flexDirection: "row", gap: 8,
        marginTop: 6, marginLeft: 6, maxWidth: "100%",
        overflowX: "auto", overflowY: "hidden",
        paddingBottom: 2, scrollbarWidth: "thin",
      } : {
        // ── SHOWN, NOT SHELVED ──────────────────────────────────────
        // One place, one picture, roughly the width of the message it came
        // with. "Imagine you're talking to me and you want to show me a
        // picture." A single card in a strip would be that same picture made
        // small for no reason, which is the carousel argument again.
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
            // A fixed width in the strip, because a flex row of `100%` children
            // collapses them all to nothing. The single-picture case keeps the
            // full width of its own container.
            width: strip ? STRIP_CARD_W : "100%",
            flex: strip ? `0 0 ${STRIP_CARD_W}px` : undefined,
            background: C.surface,
            border: `1px solid ${C.border}`,
            // The same corner the assistant's own bubble has, so the picture
            // reads as coming from the same speaker rather than from the page.
            borderRadius: "14px 14px 14px 4px", overflow: "hidden",
            cursor: onOpen ? "pointer" : "default",
            animationDelay: `${idx * 90}ms`,
          }}
        >
          <div style={{ position: "relative", height: photoHeight, background: `${C.gold}18` }}>
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
            {/* ── AND THE BADGE IS GONE ───────────────────────────────
                It said "CHECKED" until Oliver asked what that meant, then "OUR
                PAGE" once the honest answer was written down. He asked again on
                9 Sep: "Do you really think we need the 'our page' badge?"

                No. It distinguished a Gemlyx page from the other things that
                can appear in this slot, and nothing else can appear in this
                slot. A label on a set with one member.

                It was also the kind of mark he objected to in the first place:
                a trust badge a site awards its own content, which every site
                has and nobody believes.

                THE RULE IT DOCUMENTED IS UNTOUCHED. A picture appears only when
                Gemlyx holds its own written page for the place, and that is
                enforced in chatPlaces.js rather than by a sticker. If a partner
                product ever does land in this slot, the label goes on THAT: a
                badge on the odd one out is information, and a badge on
                everything is furniture. */}
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
            {/* Says what tapping does, which is the whole of what the badge
                above it was reaching for. A picture that opens something has to
                say so, or it is a picture.

                "Read more" since 9 Sep, Oliver's own words, replacing "Tap to
                read it". Shorter, and it says what you GET rather than what to
                do with your finger, which is also the right words on a desktop
                where nobody taps anything. */}
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
