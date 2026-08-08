import { TOWN_COORDS } from "../data/towns";

// Works out the real travel mode for ONE leg of a guide, instead of assuming
// the traveler's whole-trip primary mode applies to every leg. This is what
// lets a mostly-bike trip correctly show/fetch a ferry leg to Bornholm (etc.)
// instead of asking Google Directions for a "bike route" across open water,
// which fails and silently falls back to a wrong straight-line estimate.
export const detectLegMode = (how, primaryMode) => {
  const text = how || "";
  if (/ferry|boat/i.test(text)) return "transit"; // closest Directions API mode — transit itineraries can include ferry legs
  if (/bike|cycl/i.test(text)) return "bicycling";
  if (/drive|car\b/i.test(text)) return "driving";
  if (/walk/i.test(text)) return "walking";
  if (/train|bus|transit/i.test(text)) return "transit";
  return primaryMode === "bike" ? "bicycling" : primaryMode === "car" ? "driving" : "transit";
};

export const getSeason = () => {
  const m = new Date().getMonth(); // 0=Jan
  if ([11, 0, 1].includes(m)) return "winter";
  if ([2, 3, 4].includes(m)) return "spring";
  if ([5, 6, 7].includes(m)) return "summer";
  return "autumn";
};

export const getEventDate = (dateStr, dateEnd) => {
  // "Dates TBA" read like an abbreviation nobody had explained. It means the
  // entry has no confirmed date: either the organiser has not announced one, or
  // the drafting pipeline stripped a date it could not stand up (a festival date
  // already in the past is treated as a guess and removed rather than shown).
  // Saying that plainly is also more honest than a three letter acronym.
  if (!dateStr) return "Dates not confirmed";
  const d = new Date(dateStr);
  const opts = { day: "numeric", month: "short" };
  if (dateEnd) return d.toLocaleDateString("en-GB", opts) + " – " + new Date(dateEnd).toLocaleDateString("en-GB", opts);
  return d.toLocaleDateString("en-GB", { ...opts, weekday: "short" });
};

// NOTE THE `!d`: an entry with NO date counts as upcoming here, deliberately,
// because a festival whose dates have not been announced has not finished
// either and should still be findable on the Events page.
export const isUpcoming = (d) => !d || new Date(d) >= new Date();

// ── "Don't have it showing it in 'coming events' then" ─────────────
// Oliver, 7 Aug, on seeing "Dates not confirmed" inside a list headed COMING
// EVENTS. He is right: a browse page can honestly list something whose dates
// are unannounced, but a strip promising what is COMING cannot, because the one
// thing it claims is the one thing that entry does not have. isUpcoming stays
// as it is, since the Events page still wants those entries; this is the
// stricter test for anywhere that presents a date as the point.
export const hasConfirmedDate = (e) => {
  const d = e?.date ?? e;
  if (!d) return false;
  const parsed = new Date(d);
  return !isNaN(parsed);
};
export const isConfirmedUpcoming = (e) => hasConfirmedDate(e) && isUpcoming(e?.date ?? e);

export const isCurrentlyLive = (start, end) => {
  const now = new Date();
  const s = new Date(start);
  const e = end ? new Date(end) : s;
  return s <= now && now <= e;
};


export const weatherIcon = (code) => {
  if (!code) return "🌤";
  if (code.includes("rain") || code.includes("sleet")) return "🌧";
  if (code.includes("snow")) return "❄️";
  if (code.includes("thunder")) return "⛈";
  if (code.includes("cloudy") || code.includes("fog")) return "☁️";
  if (code.includes("clearsky") || code.includes("fair")) return "☀️";
  return "⛅";
};



export const isInDenmark = (coords) => coords && typeof coords === "object" &&
  coords.lat >= 54.4 && coords.lat <= 57.9 && coords.lon >= 7.9 && coords.lon <= 15.3;

// Budget filter for Food — prefers an explicit AI-given budgetLevel (new drafts),
// falls back to parsing the price text for older entries that predate that field,
// so existing listings still filter sensibly without needing to be re-drafted.
export const deriveBudgetLevel = (priceStr, explicitLevel) => {
  if (explicitLevel) return explicitLevel;
  if (!priceStr) return "Mid-range";
  const nums = (priceStr.match(/\d+/g) || []).map(Number);
  if (nums.length === 0) return "Mid-range"; // "See website", "Varies by stall" etc — unknown, don't hide it from any filter
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (avg < 100) return "Budget";
  if (avg <= 250) return "Mid-range";
  return "Splurge";
};

// Straight-line km between two {lat,lon} points — used as a sanity check on leg
// transport mode, since an AI-written "how" description (e.g. "on foot") can be
// geographically wrong in a way regex text-matching alone can never catch.
export const haversineKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Straight-line km distance from the user to a named town, falling back to the
// existing "from Copenhagen" travel-time string whenever it can't be resolved.
export const travelLabel = (userCoords, townName, fallbackTravelTime) => {
  if (isInDenmark(userCoords) && townName && TOWN_COORDS[townName]) {
    const [tLat, tLon] = TOWN_COORDS[townName];
    const dLat = (tLat - userCoords.lat) * 111.32;
    const dLon = (tLon - userCoords.lon) * 62.06;
    const km = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
    return km < 2 ? "~2 km from you" : `~${km} km from you`;
  }
  return `${fallbackTravelTime} from CPH`;
};

// A message counts as a "full plan" once it lays out 2+ days — these get collapsed
// to a short line in chat; the real detail only appears inside the generated guide.
// The chat reply no longer needs to BE a day-by-day breakdown to signal "ready to
// build" — that forced a full itinerary into the plain-text chat, duplicating what
// the actual guide (with real routes/maps) shows once built. Instead the model ends
// a genuinely-ready summary with a hidden marker string; this checks for that marker
// instead of counting "Day N:" occurrences. isFullPlanText is kept for any content
// that still uses the old day-by-day format (e.g. already-sent messages).
export const READY_MARKER = "[[GEMLYX_READY_TO_BUILD]]";
export const isReadyToBuild = (text) => !!text && text.includes(READY_MARKER);
export const stripReadyMarker = (text) => text ? text.replaceAll(READY_MARKER, "").trim() : text;

// Common AI-writing tells — surface-level phrases that read as generic AI filler
// rather than a real person's voice. Case-insensitive, checked as whole phrases
// so "great" alone doesn't false-positive on "Great Belt Bridge" etc.
export const AI_TELL_PHRASES = [
  "great!", "certainly!", "absolutely!", "i'd be happy to", "you're in for a",
  "it's worth noting", "it is worth noting", "in today's world", "in this day and age",
  "not just", "but also", "elevate", "elevated", "unparalleled", "nestled", "vibrant",
  "boasts a", "boasts", "a testament to", "delve into", "dive into", "unlock", "unleash",
  "whether you're", "look no further", "when it comes to", "in conclusion",
  "moreover", "furthermore", "additionally", "it's important to note",
  "rich history", "hidden gem" /* ironic here, but still an overused shorthand */,
  "picture this", "imagine", "let's explore", "journey through", "tapestry of",
  // From the editorial style guide (fancy adjectives, travel clichés, corporate language):
  "meticulously", "artisanal", "curated", "handcrafted", "refined", "sophisticated",
  "nuanced", "intricate", "exemplary", "exceptional", "remarkable", "outstanding",
  "world-class", "unforgettable", "seamless", "ultimate", "premium",
  "immerse", "immerse yourself", "iconic", "bustling", "picturesque", "quaint",
  "enchanting", "captivating", "renowned", "must-visit", "timeless charm",
  "breathtaking", "perfect blend", "not to be missed", "leaves a lasting impression",
  "something for everyone", "leverage", "facilitate", "optimise", "optimize",
  "maximise", "maximize", "holistic", "dynamic", "innovative", "robust",
  "comprehensive", "enhance", "delicately", "lively energy", "to perfection",
];

export const scanForAITells = (text, extraPhrases = []) => {
  if (!text) return [];
  const found = [];
  const lower = text.toLowerCase();
  for (const phrase of [...AI_TELL_PHRASES, ...extraPhrases.map(p => p.toLowerCase())]) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      found.push({ phrase, index: idx, match: text.slice(idx, idx + phrase.length) });
      idx = lower.indexOf(phrase, idx + phrase.length);
    }
  }
  return found.sort((a, b) => a.index - b.index);
};

export const isFullPlanText = (text) => {
  if (!text) return false;
  const dayHeaders = (text.match(/day\s*\d+\s*[:\-–]/gi) || []).length;
  return dayHeaders >= 2 || (dayHeaders >= 1 && text.length > 500);
};

export const stripMarkdown = (text) => {
  if (!text) return text;
  return text
    .replace(/^#{1,6}\s+/gm, "")       // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")    // bold
    .replace(/\*(.+?)\*/g, "$1")        // italics
    .replace(/^[-•]\s+/gm, "")          // bullet dashes
    .replace(/^\d+\.\s+/gm, "");        // numbered lists
};


export const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

// Pure helpers moved out of App.jsx — none of these close over component state,
// they only ever read their own parameters.
export const normName = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
export const dedupeAgainstExisting = (candidates, existingNames) => {
  const existingNorm = existingNames.map(normName);
  return (candidates || []).filter(c => {
    if (!c?.name) return false;
    const cn = normName(c.name);
    return !existingNorm.some(e => e === cn || e.includes(cn) || cn.includes(e));
  });
};

export const getEnclosingJSONStringBounds = (text, index) => {
  let start = index;
  while (start > 0 && !(text[start] === '"' && text[start - 1] !== "\\")) start--;
  let end = index;
  while (end < text.length && !(text[end] === '"' && text[end - 1] !== "\\")) end++;
  return { start: start + 1, end };
};

export const nextWeekdayTimestamp = (dayOfWeek, hour) => {
  const now = new Date();
  const d = new Date(now);
  let diff = (dayOfWeek - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7; // always the NEXT occurrence, not today
  d.setDate(now.getDate() + diff);
  d.setHours(hour, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
};

// Realistic stay-duration by category — never let the model guess this from
// language probability (which is how a "Half day" ended up attached to a
// hot dog stand with no seats). Applied AFTER the draft, keyed off the
// category the AI itself determined, overriding whatever it guessed.
export const stayDurationForCategory = (studioType, category) => {
  const c = (category || "").toLowerCase();
  if (studioType === "food") {
    if (/hot dog|stand|kiosk|food truck|street food|takeaway/.test(c)) return "15–30 mins"; // no seats, eaten standing
    if (/bakery|café|coffee|ice cream/.test(c)) return "30–45 mins";
    return "60–90 mins"; // casual dining / restaurant chains / pub strips — a real sit-down meal, not a quick bite
  }
  if (studioType === "foodStreet") return "60–120 mins"; // grazing across multiple vendors, longer than a single sit-down meal
  if (studioType === "free") {
    if (/palace|slot|castle|museum|exhibition/.test(c)) return "2–3 hours"; // historic interiors, real exhibitions
    if (/square|plaza|torv|park|garden|viewpoint/.test(c)) return "30–45 mins"; // outdoor public spaces, a look-around not a tour
    return "1–2 hours";
  }
  return null; // no confident category mapping for this type — leave the AI's own judgment
};

export const parsePrice = (str) => {
  if (!str) return 0;
  const m = str.replace(/,/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const d = R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return d < 1 ? Math.round(d*1000)+"m" : d.toFixed(1)+"km";
};
export const getDistanceRaw = (lat1, lon1, lat2, lon2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ── 3D TILT (shared) ─────────────────────────────────────────
// Redesign pass: cards tilt toward the cursor in real 3D with no library and
// no re-renders — handlers write transforms straight onto the element. Touch
// devices never fire mousemove, so phones are unaffected.
export const tiltMove = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  el.style.transform = `perspective(950px) rotateX(${((0.5 - py) * 5).toFixed(2)}deg) rotateY(${((px - 0.5) * 7).toFixed(2)}deg) translateY(-2px)`;
};
export const tiltLeave = (e) => { e.currentTarget.style.transform = ""; };

// ── What kind of arrival point is this, actually? ──────────────────
// Oliver, 5 Aug 2026: "if the nearest station is just a terminal and bus stop,
// then the 'station' just gotta be changed to terminal and bus stop."
//
// The At a Glance row was hardcoded to 🚆 "Nearest Station" for every content
// type, so a value like "Sælvig Ferry Terminal" was presented under a train
// icon and the word Station. The value was true and the label was not, which
// is the kind of small wrongness that makes someone stand on a quay looking
// for a platform.
//
// The value itself is never rewritten, only labelled for what it is. Order
// matters: ferry beats bus beats train, because a value like "Bus to Sælvig
// Ferry Terminal" is fundamentally a ferry arrival. Danish and English terms
// both, since published entries genuinely use both.
//
// ── AND THE FALLBACK IS "STOP", NOT "STATION" ──────────────────────
// Oliver, 7 Aug 2026: "Maybe it shouldn't be nearest station, but nearest stop.
// If it's an Island, this will often be awkward."
//
// Right, and the awkwardness is not cosmetic. "Nearest Station" on an Ærø or
// Samsø page promises a platform that does not exist anywhere on the island.
// The specific labels below stay, because when we DO know it is rail, "Nearest
// Station" is the more useful word. What changes is the case where we do not
// know: that now reads Nearest Stop, which is true of a platform, a quay and a
// roadside shelter alike.
//
// The optional `kind` argument comes from geo.js, which knows the answer from
// the Places category rather than from guessing at a name. When it is present
// it wins; when it is absent the name is read, which is all any of the already
// published entries can offer.
const ARRIVAL_BY_KIND = {
  rail:  { icon: "🚆", label: "Nearest Station" },
  ferry: { icon: "⛴", label: "Ferry Terminal" },
  bus:   { icon: "🚌", label: "Nearest Bus Stop" },
  air:   { icon: "✈️", label: "Nearest Airport" },
};

// ── WHO GETS AN ARRIVAL POINT, AND WHY A TOWN DOES NOT ──────────────
// Oliver, 8 Aug 2026, looking at the published Copenhagen entry:
//   "nearestStation on a capital city is weird tbh. With major cities, that is
//    just odd. Maybe leave out nearest station on towns."
//
// He is right, and the reason is worth writing down because it is not about
// Copenhagen. For an attraction, a workshop, a restaurant or a festival, the
// nearest stop is a real answer to a real question: that place sits at one point
// on the map and there is one sensible way to arrive at it.
//
// A TOWN IS NOT A POINT. It is the destination itself, and it has as many
// arrival points as it has edges. The stored Copenhagen row said
//   "nearestStation": "Nørreport (9 mins walk)"
// which is nine minutes' walk from the coordinate a geocoder happened to pick
// for the middle of a city of 660,000 people. It is a fact about that
// coordinate, not about Copenhagen, and it is misleading in the bargain:
// Nørreport is a local S-train stop, while the station a traveller actually
// plans a Copenhagen trip around is København H. The field was answering a
// question nobody asked with a value that was never checked against the
// question.
//
// What replaces it is what was already there and already true: travelTime says
// how long it takes to get there, region and mapHint say where it is, and the
// Reality Check paragraph says how you arrive in prose, where there is room to
// say "by ferry, twice a day" instead of naming a quay.
//
// KEPT for festivals and venues, because a festival ground genuinely is one
// point in a field somewhere and the nearest stop is the single most useful
// logistical fact about it.
export const ARRIVAL_TYPES = new Set(["festival", "free", "booking", "food", "foodStreet", "night", "craft", "attraction"]);
export const hasArrivalField = (type) => ARRIVAL_TYPES.has(String(type || ""));

export const arrivalRow = (value, kind) => {
  const v = String(value || "").toLowerCase();
  if (kind && ARRIVAL_BY_KIND[kind]) return { ...ARRIVAL_BY_KIND[kind], value };
  if (!v.trim()) return { icon: "🚆", label: "Nearest Stop", value };
  // ── AIRPORT BEFORE FERRY, AND \bhavn NOT havn ──────────────────
  // Found by the tests on 7 Aug, and it had been shipping the whole time:
  // "Billund Lufthavn" was labelled a Ferry Terminal, because "lufthavn" ends in
  // the Danish word for harbour. So did "København H", for the same reason
  // hiding inside the city's name. Both are among the most likely arrival
  // points in the country, and both were being sent to a quay.
  //
  // Two fixes, because either alone leaves the other case broken: airport is
  // tested first, and the harbour pattern now requires a word boundary before
  // "havn" so it matches "Hou Havn" and refuses "lufthavn" and "København".
  // (Danish letters are non-word characters to \b, so this had to be checked
  // rather than assumed: in "københavn" the h follows an n, which is a word
  // character, so no boundary exists there. It holds.)
  if (/airport|lufthavn/.test(v)) return { icon: "✈️", label: "Nearest Airport", value };
  if (/ferry|færge|faerge|terminal|\bhavn(en)?\b|harbour|harbor|quay|kaj\b/.test(v)) {
    return { icon: "⛴", label: "Ferry Terminal", value };
  }
  if (/bus stop|busstop|busstoppested|stoppested|rutebil|coach stop/.test(v)) {
    return { icon: "🚌", label: "Nearest Bus Stop", value };
  }
  // "Bus" without "stop" usually means a bus route serves it, still not a train.
  if (/\bbus\b|\bcoach\b/.test(v) && !/station|banegård|banegaard/.test(v)) {
    return { icon: "🚌", label: "Nearest Bus Stop", value };
  }
  if (/metro/.test(v)) return { icon: "🚇", label: "Nearest Metro", value };
  // "København H" and "Aarhus H" are the real names of those two stations: H is
  // short for hovedbanegård, central station. Without this they read as an
  // unknown stop, which is a strange thing to say about the busiest railway
  // station in the country. Same for the "St." suffix on smaller ones.
  if (/station|banegård|banegaard|\bst\.?$|\bh$/.test(v)) return { icon: "🚆", label: "Nearest Station", value };
  // Something real, but nothing in the name says what it is. Do not promise a
  // platform.
  return { icon: "📍", label: "Nearest Stop", value };
};

// ── When a transit query should pretend to depart ──────────────────
// A Google Directions transit query with NO departure_time means "if you left
// right this second". That is almost never the question being asked, and it
// caused the worst accuracy bug of the 5 Aug 2026 session: published town travel
// times were whatever Google returned at the accidental moment a draft ran.
// Measured live at 22:38 against the same routes anchored to a weekday morning:
// Nysted 6h08 vs 2h03, Thorup Strand 12h27 vs 7h08, Møgeltønder 5h53 vs 4h39,
// Ribe 4h40 vs 3h33, Ærøskøbing 4h14 vs 3h04, Viborg 5h47 vs 5h01. Every single
// one inflated, because late-evening timetables are sparse.
//
// The next Tuesday at 09:00: a plain weekday mid-morning. No rush hour, no
// weekend timetable, no public holiday, and it is the journey a traveler
// actually makes. Reproducible within a week, which also means two runs of the
// same draft agree with each other.
//
// ONLY for transit. Driving is deliberately left unanchored, because without
// departure_time Google returns its typical duration rather than a live-traffic
// snapshot, and a typical duration is the right thing to publish.
export const transitDepartureAnchor = () => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 2);
  return Math.floor(d.getTime() / 1000);
};

// Appends the anchor only for a transit leg, so call sites stay one-liners and
// cannot accidentally anchor a driving query.
export const departureParam = (mode) => (mode === "transit" ? `&departure_time=${transitDepartureAnchor()}` : "");

// ── Is this domain literally the place's own name ───────────────────
// Oliver, 6 Aug 2026, on the Aarhus Festuge draft that published with an empty
// website field: "how could it not find the website of aarhus festuge.. it was
// literally called that as a website."
//
// He is right, and the failure is not a search failure. A query for the
// official site of a well-known Danish festival returns aarhusfestuge.dk near
// the top. The URL was almost certainly in the research. What failed is that
// the WRITER was asked to pick the official site out of a list, and it declined
// to commit, which is the safe behaviour we deliberately trained into it
// everywhere else.
//
// So this stops asking. A domain that IS the name, with the punctuation and the
// Danish letters normalised out, is not a judgement call: aarhusfestuge.dk for
// "Aarhus Festuge" is the same string. That gets applied in code, like the
// coordinates and the travel time, and the model is left out of it.
//
// Deliberately strict about short names. A three-letter place name would match
// half the internet on a substring rule, so containment needs at least six
// characters on the side doing the containing.
export const hostMatchesName = (url, name) => {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  host = host.replace(/^www\./, "");
  const bare = host.replace(/\.(dk|com|net|org|eu|info|travel)$/i, "").replace(/[^a-z0-9]/g, "");
  const n = String(name || "").toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/[^a-z0-9]/g, "");
  if (!bare || !n) return false;
  if (bare === n) return true;
  if (n.length >= 6 && bare.includes(n)) return true;
  if (bare.length >= 6 && n.includes(bare)) return true;
  return false;
};

// Aggregators, booking sites and social platforms are never "the official
// site", however well their URL happens to match. Kept next to the matcher so
// the two cannot drift apart.
//
// THE EXPERIENCE RESELLERS WERE MISSING FROM THIS LIST. Added 7 Aug 2026, the
// same hour GetYourGuide became a required research source: the two changes
// have to land together. Telling the pipeline to go and read getyourguide.com
// for every attraction, while this list still let a getyourguide.com URL
// through as an official website, would have put a checkout page in the field
// that is supposed to send a reader to the museum. Viator, Tiqets and Headout
// are the same business and were missing for the same reason.
const NOT_OFFICIAL = /facebook|instagram|tripadvisor|booking\.com|expedia|getyourguide|viator|tiqets|headout|klook|musement|wikipedia|wikimedia|youtube|tiktok|eventbrite|ticketmaster|billetlugen|visitdenmark|visitaarhus|google\.|yelp|foursquare|reddit/i;

// The first candidate URL whose domain is the name. Returns null rather than a
// best guess, because an empty website field is honest and a wrong one is not.
export const officialSiteFromCandidates = (candidateUrls, name) => {
  for (const u of candidateUrls || []) {
    if (typeof u !== "string") continue;
    if (NOT_OFFICIAL.test(u)) continue;
    if (hostMatchesName(u, name)) {
      // Normalise to the site root. A deep link into a programme page ages out
      // in a season; the domain does not.
      try { const p = new URL(u); return `${p.protocol}//${p.hostname}`; } catch { return u; }
    }
  }
  return null;
};

// ── Danish alphabetical order ───────────────────────────────────────
// Oliver, 7 Aug 2026, relaying a friend's review of the site: "We need
// alphabetical order."
//
// It has to be DANISH alphabetical, not a plain sort. Æ, Ø and Å come after Z
// in Danish, so a default sort files Ærø, Ørsted and Ålborg up among the A's
// and O's, which is the one ordering mistake a Danish reader spots instantly on
// a site about Denmark. Å and the older spelling Aa are the same letter, and
// the Danish collator already knows it, so Aarhus lands with Århus instead of
// at the very top of every list.
//
// numeric:true so "Café 2" comes before "Café 10". sensitivity:"base" so case
// and spelling variants of the same word sit together rather than splitting the
// list in two.
export const daCompare = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), "da", { sensitivity: "base", numeric: true });

// The usual case: a list of content rows, ordered by the name a reader reads.
export const byName = (a, b) => daCompare(a?.name, b?.name);

// ── IS THIS A GOOD TIME TO GO ───────────────────────────────────────
// Oliver, 7 Aug 2026: "it has to be places that are considered great during the
// season. Visiting Bonbon Land during winter is not great."
//
// THE RULE THAT KEEPS THIS HONEST: this only ever says "not now" when the entry
// itself gives a POSITIVE reason to think so. Silence is never treated as
// evidence. An entry with nothing to say about seasons comes back "unknown" and
// is left alone, because demoting a perfectly good year-round place on a guess
// is the same class of mistake as recommending a closed water park, and this
// app does not get to make either one quietly.
//
// Two signals, both read off text the entry already carries:
//   1. It says so. "Year-round" is a clear yes. A named open season, "open May
//      to September", is a clear window.
//   2. It is obviously an outdoor summer thing. A Danish sommerland, a water
//      park, a beach, a lido, an open-air pool. These are not open in January
//      and everyone in Denmark knows it, which is exactly why a guide that
//      suggests one in January looks like it has never been there.
// And the reverse: a Christmas market is wonderful in December and meaningless
// in June.
const MONTH_WORDS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Outdoor and warm-weather by nature. Deliberately short and specific: every
// word here is a thing that genuinely shuts or stops being pleasant in a Danish
// winter. Museums, castles, bars and restaurants are NOT on this list, because
// they are fine in February and a longer list would start guessing.
const SUMMER_ONLY = /\b(sommerland|summerland|water\s?park|vandland|aquapark|amusement park|theme park|forlystelsespark|tivoli friheden|beach|strand(en)?\b|lido|open-air pool|friluftsbad|outdoor pool|badeland|mini ?golf|surf|kayak|kajak|camping|campsite|teltplads)\b/i;
const WINTER_ONLY = /\b(christmas market|julemarked|jul(e|emarked)?\b.*market|advent|christmas fair|ice rink|skøjtebane|winter market)\b/i;
const YEAR_ROUND  = /\b(year[-\s]?round|all year|open all year|hele året|året rundt)\b/i;

// Danish summer, generously: the parks are typically open from spring holidays
// to the end of the school break, so May through September is the honest window
// rather than a meteorological one.
const SUMMER_MONTHS = [4, 5, 6, 7, 8];      // May..September, zero indexed
const WINTER_SEASON = [10, 11];             // November, December

export const seasonFit = (item, month) => {
  const m = Number.isFinite(month) ? month : new Date().getMonth();
  const text = [item?.bestTimeGlance, item?.desc, item?.type, item?.category, item?.name, item?.tag,
    ...(Array.isArray(item?.thingsToKnow) ? item.thingsToKnow : [])].filter(Boolean).join(" ").toLowerCase();
  if (!text) return { fit: "unknown", why: "" };

  if (YEAR_ROUND.test(text)) return { fit: "good", why: "open year round" };

  if (WINTER_ONLY.test(text)) {
    return WINTER_SEASON.includes(m)
      ? { fit: "good", why: "this is its season" }
      : { fit: "poor", why: "a Christmas market outside December" };
  }
  if (SUMMER_ONLY.test(text)) {
    return SUMMER_MONTHS.includes(m)
      ? { fit: "good", why: "this is its season" }
      : { fit: "poor", why: "an outdoor summer place in the cold half of the year" };
  }

  // "Open May to September", "best June to August". Only trusted when the text
  // is actually talking about opening or the best time, so a passing mention of
  // a month in a history sentence cannot close a place for nine months.
  const windowish = /\b(open|opens|opening|season|best time|best in|closed)\b/i.test(text);
  if (windowish) {
    const named = MONTH_ABBR.map((a, i) => (text.includes(MONTH_WORDS[i]) || new RegExp(`\\b${a}\\b`).test(text) ? i : -1)).filter(i => i >= 0);
    // Two or more named months read as a range. One is an anecdote.
    if (named.length >= 2) {
      const lo = Math.min(...named), hi = Math.max(...named);
      const inWindow = m >= lo && m <= hi;
      return inWindow ? { fit: "good", why: "inside its stated season" } : { fit: "poor", why: "outside the season the entry names" };
    }
  }
  return { fit: "unknown", why: "" };
};

// Sorting helper: good first, unknown next, out of season last. Used to shape
// the front page picks without ever hiding something outright on a guess.
export const seasonRank = (item, month) => ({ good: 0, unknown: 1, poor: 2 }[seasonFit(item, month).fit]);

// ── WHAT THE RANDOM-GUIDE TEST ACTUALLY PICKED ─────────────────────
// Oliver, 7 Aug 2026, on the preview screen: "we definitely gotta fix that."
// The card read "4 days, based around , into coastal views and local food",
// with nothing between "around" and the comma.
//
// The blank is my fault and it is the visible half of a deliberate change. The
// random brief used to NAME published entries ("the person wanted Amalienborg
// and Planetarium included"), which pre-solved the hardest thing the pipeline
// does, so it stopped naming them. Two screens were printing that list, and
// only one of them was updated.
//
// So the description lives HERE now, in one place both screens read, because
// two copies of the same sentence built from the same object will drift again
// the next time the object changes. Anything the profile does not carry is
// simply left out rather than printed as an empty gap.
export const testTravelerLine = (p) => {
  if (!p) return "";
  return [
    typeof p.days === "number" ? `${p.days} day${p.days !== 1 ? "s" : ""}` : null,
    p.who,
    p.arrival,
    p.transport,
    p.moving,
    (p.interests || []).length ? `into ${(p.interests || []).join(" and ")}` : null,
    p.budget && p.budget !== "unstated" ? p.budget : null,
  ].filter(Boolean).join(" · ");
};

// ── THE DASH BAN, ENFORCED RATHER THAN REQUESTED ───────────────────
// Five em dashes shipped inside a saved guide payload on 7 Aug, in text a
// traveler reads. The rule is in every prompt in this project and has been for
// weeks. Asking a model not to do something is not a guarantee, and this
// project already has a standing rule for exactly that situation: anything the
// system knows is enforced in code, never requested in a prompt.
//
// A dash is not simply deleted. "Faxe is on Zealand, Ærø is off Funen — so this
// is a cross country trip" has to keep reading as a sentence, so a dash acting
// as punctuation becomes a comma and a dash acting as a range becomes "to".
// Hyphens are untouched, because "63-million-year-old" is correct.
const EN = "\u2013", EM = "\u2014", MINUS = "\u2212", HORIZ = "\u2015";
// NOT global, and that is the entire point. A /g/ regex carries lastIndex
// between calls, so using one as a guard makes .test() alternate true and false
// across strings and silently skip every other one. Caught by the first run of
// this function: "12–15 minutes" came back untouched purely because the string
// before it had matched. The replacements below are built fresh per call.
const HAS_DASH = new RegExp(`[${EN}${EM}${MINUS}${HORIZ}]`);
export const stripDashes = (text) => {
  if (typeof text !== "string" || !HAS_DASH.test(text)) return text;
  return text
    // 12–15, 2024–2026, 09:00–17:00: a range, and the word is "to".
    .replace(new RegExp(`(\\d)\\s*[${EN}${EM}${MINUS}${HORIZ}]\\s*(\\d)`, "g"), "$1 to $2")
    // Spaced, or hugging a word on both sides: punctuation. A comma carries it.
    .replace(new RegExp(`\\s*[${EN}${EM}${MINUS}${HORIZ}]\\s*`, "g"), ", ")
    // Two clauses now separated by ", ," or a comma landing before another one.
    .replace(/,\s*,+/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*([.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
};

// Walks a whole guide object and cleans every string a traveler can read.
// Deliberately recursive and type-blind: the guide shape has grown several
// times this month, and a hand-listed set of fields would miss the next one.
export const stripDashesDeep = (value) => {
  if (typeof value === "string") return stripDashes(value);
  if (Array.isArray(value)) return value.map(stripDashesDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // Keys beginning with _ are machinery, not prose: coordinates, cached
      // durations, the raw conversation. Leave them exactly as they are.
      out[k] = k.startsWith("_") ? v : stripDashesDeep(v);
    }
    return out;
  }
  return value;
};
