// ── "A STARTING POINT CHIP CALLED FROM MY LOCATION" ─────────────────
//
// Oliver, 19 Sep 2026. Every other chip in replyChips.js is a fixed sentence
// and this one cannot be: what it says is not known until the browser has been
// asked where the person is. So the chip carries an ACTION rather than a `say`,
// App.jsx does the two things only a browser can do, and the reading of the
// answer lives here where it can be put in front of the suite.
//
// ── THE COORDINATE NEVER REACHES THE CHAT ───────────────────────────
//
// This is the rule the whole file is arranged around. A geolocation fix is
// accurate to a few metres and this app would be posting it into a transcript
// that is saved with the trip, sent to a model and exported to a .json the
// traveller can hand to anybody. So the fix is turned into a TOWN and the town
// is what gets typed. Nothing else is kept, and nothing else is sent.
//
// TOWN_ZOOM is how that is enforced rather than promised: Nominatim's reverse
// endpoint takes a zoom, and 10 is the level at which it answers with a city or
// a municipality instead of a street and a house number. Asking for less
// precision is better than asking for all of it and throwing most away, because
// the second one puts the address in a response somebody could log.
export const TOWN_ZOOM = 10;

// ── AND WHAT COUNTS AS AN ANSWER ────────────────────────────────────
//
// In the order a person would name where they are. `city` and `town` are the
// answer almost always; `village` matters here more than it would anywhere else
// because half of what this app is about is places of four hundred people;
// `municipality` is the fallback for a fix out in a field, and it is still a
// place rather than a coordinate.
//
// ROAD AND HOUSE NUMBER ARE NOT ON THIS LIST AND MUST NOT BE. Nominatim returns
// them when it has them, whatever zoom it was asked for, and a reader that
// walked the object looking for "the most specific thing present" would put
// somebody's home address in the chat. The list is what may be used, not a
// preference order over everything available.
const PLACE_FIELDS = ["city", "town", "village", "municipality", "suburb", "county"];

export const townFromReverse = (json) => {
  const a = json && typeof json === "object" ? (json.address || {}) : {};
  for (const f of PLACE_FIELDS) {
    const v = String(a[f] || "").trim();
    if (v) return v;
  }
  return "";
};

// The country, for the one case where naming the town alone would mislead. A
// person sitting at home in Hamburg planning a Denmark trip is telling the
// truth when they say they start in Hamburg, and "Hamburg" on its own in a
// Denmark app reads as somewhere in Denmark.
export const countryFromReverse = (json) => {
  const a = json && typeof json === "object" ? (json.address || {}) : {};
  return String(a.country || "").trim();
};

export const isDenmark = (json) => {
  const a = json && typeof json === "object" ? (json.address || {}) : {};
  return String(a.country_code || "").toLowerCase() === "dk";
};

// ── THE SENTENCE IT TYPES ───────────────────────────────────────────
//
// "Starting from" and not "I am in", because the slot's question is where the
// trip starts and those are two different facts: somebody can be in Aarhus
// today and flying out of Billund on Friday. The sentence is what a person
// would have typed, and it goes through the same readers a typed one does.
//
// AND IT DOES NOT MAKE THEM A DANE. Being in Denmark right now is not living
// here: a tourist tapping this on their second morning is standing in their
// hotel. `fromHome` stays off unless they said so, which is the same line
// tripBrief.js draws when it refuses to read a Danish town as a Dane.
//
// AND THE COUNTRY IS DECIDED BY ITS CODE, NOT BY ITS NAME. The caller passes an
// empty country for a fix inside Denmark and the country's name for one
// outside, because `country` comes back localised: Danmark, Denmark, Dänemark
// and Danemark are the same place and a reader matching on the word would have
// written "I'm starting from Aarhus, Dänemark" for a German phone. isDenmark
// reads country_code, which is "dk" in every language.
export const locateSentence = (town, country = "", lang = "") => {
  const t = String(town || "").trim();
  if (!t) return "";
  const c = String(country || "").trim();
  const where = c ? `${t}, ${c}` : t;
  return lang === "da" ? `Jeg tager afsted fra ${where}` : `I'm starting from ${where}`;
};

// ── AND THE BUTTON SAYS WHAT HAPPENED TO IT ─────────────────────────
//
// His standing rule is that nothing explains a control: a label and the control
// is the whole of a form field. A control reporting its OWN state is a
// different thing and it is the only honest option here, because the three ways
// this fails are all silent. A chip that does nothing when tapped, twice, is
// how somebody decides the app is broken.
//
// One word each, in the chip itself, and the other chips and the text box are
// untouched the whole time.
export const LOCATE_LABEL = { label: "From my location", labelDa: "Fra min placering" };
export const LOCATE_STATE = {
  asking: { label: "Locating…", labelDa: "Finder dig…" },
  refused: { label: "No location access", labelDa: "Ingen adgang til placering" },
  failed: { label: "Could not place you", labelDa: "Kunne ikke finde dig" },
};
export const locateLabel = (state, lang = "") => {
  const row = LOCATE_STATE[state] || LOCATE_LABEL;
  return lang === "da" ? row.labelDa : row.label;
};

// The reverse lookup's URL, built in one place so the zoom cannot be dropped by
// a caller. Nominatim is the same free service geocodeStopsForGuide uses, and
// the same politeness applies: one request per tap, never in a loop.
export const reverseUrl = (lat, lon) =>
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=${TOWN_ZOOM}&addressdetails=1`;
