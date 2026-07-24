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
