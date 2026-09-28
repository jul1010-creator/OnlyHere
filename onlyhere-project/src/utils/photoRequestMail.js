// ── ASKING A PLACE FOR ITS PHOTOS ───────────────────────────────────
//
// Oliver, 28 Sep 2026, on the entries with no picture: "Can you create this
// for me? So next to Wiki and upload picture, you have 'draft a mail to..'"
//
// A template and not a model call. It costs nothing, it is there the moment
// the button is pressed, and it cannot invent a fact about the place. What it
// asks for is what makes a yes worth keeping: one or two photos, where they
// will be used, the credit line, and that the place owns the rights.
//
// One line is left for him on purpose. A small business can tell a mass
// mail, and the sentence only he could write (why he picked the place) is
// what gets a reply. The draft cannot be sent while that line is still the
// placeholder.

import { SITE_ORIGIN } from "../config";
import { entryUrlPath } from "./placeUrl";
import { hostOf } from "./pageScan";

export const OWN_LINE = {
  da: "[Skriv én linje om, hvorfor du valgte stedet]",
  en: "[Write one line about why you picked this place]",
};

export const SENDER = {
  name: "Oliver Verhein Hoffmann",
  email: "oliver@gemlyxtravel.com",
};

export const entryAddress = (type, name) => {
  const path = entryUrlPath(type, name);
  return path ? `${SITE_ORIGIN}${path}` : SITE_ORIGIN;
};

export const photoRequestMail = ({ name = "", type = "", lang = "da" } = {}) => {
  const place = String(name || "").trim() || (lang === "en" ? "your place" : "jer");
  const url = entryAddress(type, name);
  if (lang === "en") {
    return {
      subject: `Photos of ${place} for Gemlyx`,
      body: [
        "Hi,",
        "",
        "My name is Oliver and I run Gemlyx (gemlyxtravel.com), a travel guide to Denmark that sends visitors to places beyond the best known ones.",
        "",
        `${place} has a page with us here: ${url}`,
        "",
        OWN_LINE.en,
        "",
        `The page is missing a good photo. May we use one or two of your photos on the page about ${place}? We will put your name, or the photographer you tell us, under the photo, and only use them where we write about you.`,
        "",
        "If you have press photos, a link is enough. Could you also confirm that you hold the rights to the photos?",
        "",
        "Kind regards,",
        SENDER.name,
        "Gemlyx",
        SENDER.email,
      ].join("\n"),
    };
  }
  return {
    subject: `Billeder af ${place} til Gemlyx`,
    body: [
      "Hej,",
      "",
      "Jeg hedder Oliver og driver Gemlyx (gemlyxtravel.com), en rejseguide til Danmark, der sender besøgende ud til steder uden for de mest kendte.",
      "",
      `${place} har en side hos os her: ${url}`,
      "",
      OWN_LINE.da,
      "",
      `Siden mangler et godt billede. Må vi bruge et eller to af jeres billeder på siden om ${place}? Vi skriver jeres navn, eller den fotograf I oplyser, under billedet og bruger dem kun, hvor vi skriver om jer.`,
      "",
      "Hvis I har pressebilleder, er et link nok. Vil I også bekræfte, at I har rettighederne til billederne?",
      "",
      "Venlig hilsen",
      SENDER.name,
      "Gemlyx",
      SENDER.email,
    ].join("\n"),
  };
};

// Still carrying the placeholder, in either language.
export const needsOwnLine = (body) => Object.values(OWN_LINE).some(l => String(body || "").includes(l));

// Gmail opens as the Gemlyx address, since the mail should come from the
// business and not from a private inbox.
export const gmailComposeUrl = ({ to = "", subject = "", body = "" } = {}) =>
  `https://mail.google.com/mail/?authuser=${encodeURIComponent(SENDER.email)}&view=cm&fs=1` +
  `&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const mailtoUrl = ({ to = "", subject = "", body = "" } = {}) =>
  `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

// Their own site first: many Danish attractions and festivals publish press
// photos under "presse", and that answer needs no mail at all.
export const pressSearchUrl = (website) => {
  const host = hostOf(String(website || "").trim());
  return host ? `https://www.google.com/search?q=${encodeURIComponent(`site:${host} presse OR press OR pressebilleder`)}` : "";
};

export const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
