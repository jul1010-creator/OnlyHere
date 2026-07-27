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
  if (!dateStr) return "Dates TBA";
  const d = new Date(dateStr);
  const opts = { day: "numeric", month: "short" };
  if (dateEnd) return d.toLocaleDateString("en-GB", opts) + " – " + new Date(dateEnd).toLocaleDateString("en-GB", opts);
  return d.toLocaleDateString("en-GB", { ...opts, weekday: "short" });
};

export const isUpcoming = (d) => !d || new Date(d) >= new Date();

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
  "not just", "but also", "elevate", "unparalleled", "nestled", "vibrant",
  "boasts a", "a testament to", "delve into", "dive into", "unlock", "unleash",
  "whether you're", "look no further", "when it comes to", "in conclusion",
  "moreover", "furthermore", "additionally", "it's important to note",
  "rich history", "hidden gem" /* ironic here, but still an overused shorthand */,
  "picture this", "imagine", "let's explore", "journey through", "tapestry of",
];

export const scanForAITells = (text) => {
  if (!text) return [];
  const found = [];
  const lower = text.toLowerCase();
  for (const phrase of AI_TELL_PHRASES) {
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
