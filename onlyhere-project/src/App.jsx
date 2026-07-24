import { useState, useEffect, useRef } from "react";

import { craftItemsFallback, handmadeCraftShops } from "./data/craft";
import { events, majorEvents, vikingEvents } from "./data/events";
import { towns, TOWN_COORDS } from "./data/towns";
import { freeEntrance } from "./data/freeEntrance";
import { nightlifeSpots } from "./data/nightlife";
import { foodSpots } from "./data/food";
import { essentials } from "./data/essentials";
import { roadTrips, seasonalItineraries } from "./data/roadtrips";
import { WEATHER_CITIES } from "./data/mapShapes";
import { cities, allProducts, campingSpots, PRODUCT_COORDS } from "./data/shop";

import { SUPABASE_URL, SUPABASE_KEY, APP_VERSION } from "./config";
import { C } from "./utils/theme";
import {
  getSeason, getEventDate, isUpcoming, isCurrentlyLive, weatherIcon,
  isInDenmark, travelLabel, isFullPlanText, stripMarkdown, daysUntil,
} from "./utils/helpers";

import { DetailPage } from "./components/DetailPage";
import { WeatherStrip } from "./components/WeatherStrip";
import { DKLocator } from "./components/DKLocator";
import { LeafletMap } from "./components/LeafletMap";
import { GuideRouteMap } from "./components/GuideRouteMap";
import { AtAGlanceCard } from "./components/AtAGlanceCard";
import { GemlyxFindCard } from "./components/GemlyxFindCard";
import { ReviewsSection } from "./components/ReviewsSection";
import { InstagramEmbed } from "./components/InstagramEmbed";
import { PageHero } from "./components/PageHero";
import { LiveEventsHeaderStrip } from "./components/LiveEventsHeaderStrip";
import { WeatherHeaderStrip } from "./components/WeatherHeaderStrip";
import { StoreBadge } from "./components/StoreBadge";

import "leaflet/dist/leaflet.css";

export default function Gemlyx() {
  useEffect(() => { console.log("Gemlyx", APP_VERSION); }, []);

  // Pull in anything published via Content Studio and fold it into the shared content
  // arrays. towns/majorEvents/freeEntrance/foodSpots/nightlifeSpots are module-level
  // singletons (declared once outside this component) — mutating them in place means
  // every existing .map()/lookup across the whole app picks the new items up for free,
  // no need to touch dozens of call sites. bumpLiveContent forces the one re-render
  // needed after the mutation, since React can't see a plain array push on its own.
  const [, bumpLiveContent] = useState(0);
  const fetchedLiveContent = useRef(false);
  const mergedContentIds = useRef(new Set());
  const loadLiveContent = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=*&published=eq.true`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const rows = await res.json();
      if (!Array.isArray(rows)) { console.warn("gemlyx_content fetch did not return an array:", rows); return; }
      if (rows.length === 0) return;
      const bookingRows = [];
      rows.forEach(row => {
        if (mergedContentIds.current.has(row.id)) return; // already merged this row, skip
        const item = row.payload;
        if (!item || !item.name) return;
        mergedContentIds.current.add(row.id);
        const id = 100000 + row.id; // offset keeps live IDs clear of hardcoded ones
        if (row.type === "town") {
          towns.push({ id, ...item });
          if (Number(item.__lat) && Number(item.__lon)) TOWN_COORDS[item.name] = [item.__lat, item.__lon];
        } else if (row.type === "festival") (item.__scale === "Major" ? majorEvents : events).push({ id, ...item });
        else if (row.type === "free") freeEntrance.push({ id, ...item });
        else if (row.type === "food") foodSpots.push({ id, ...item });
        else if (row.type === "night") nightlifeSpots.push({ id, ...item });
        else if (row.type === "booking") bookingRows.push({ id, ...item });
      });
      if (bookingRows.length > 0) setCraftItems(prev => [...prev, ...bookingRows]);
      bumpLiveContent(v => v + 1);
    } catch (err) { console.warn("gemlyx_content fetch failed:", err); }
  };
  useEffect(() => {
    if (fetchedLiveContent.current) return;
    fetchedLiveContent.current = true;
    loadLiveContent();
  }, []);
  const [active, setActive] = useState("home");
  const [shopTab, setShopTab] = useState("shops");
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [category, setCategory] = useState("All");
  const [savedItems, setSavedItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stillHereMap, setStillHereMap] = useState({});
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterTypes, setFilterTypes] = useState([]);
  const [priceMax, setPriceMax] = useState(5000);
  const [bookableOnly, setBookableOnly] = useState(false);
  const [craftSort, setCraftSort] = useState("recommended"); // "recommended" | "near"
  const [mapCity, setMapCity] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [eventMonth, setEventMonth] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [eventTab, setEventTab] = useState("local");
  const [townFilter, setTownFilter] = useState(null);
  const [craftItems, setCraftItems] = useState(craftItemsFallback);
  const [craftLoading, setCraftLoading] = useState(true);
  const [craftType, setCraftType] = useState(null);
  const [craftKind, setCraftKind] = useState(null);
  const [foodTab, setFoodTab] = useState("Local");
  const [nightlifeTab, setNightlifeTab] = useState("Local");
  const [attractionCity, setAttractionCity] = useState("Copenhagen");
  const [craftModal, setCraftModal] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [liveInfo, setLiveInfo] = useState({});
  const [liveInfoLoading, setLiveInfoLoading] = useState(null);

  const checkLiveInfo = async (item) => {
    setLiveInfoLoading(item.name);
    try {
      // Biases toward Instagram/Facebook when they're publicly indexed by search engines —
      // this is NOT an Instagram/Facebook API integration (Meta doesn't allow open search of
      // public content that way), just a search query nudge toward those platforms' public posts.
      const query = `${item.name} ${item.location || item.town || ""} Instagram Facebook official page latest update opening hours events 2026`;
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setLiveInfo(prev => ({ ...prev, [item.name]: data.answer || (data.results?.[0]?.snippet) || "No current updates found." }));
    } catch {
      setLiveInfo(prev => ({ ...prev, [item.name]: "Couldn't check right now — try again in a moment." }));
    }
    setLiveInfoLoading(null);
  };

  const [weather, setWeather] = useState({});
  const [weatherLoading, setWeatherLoading] = useState(null);
  const checkWeather = async (key, lat, lon) => {
    setWeatherLoading(key);
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setWeather(prev => ({ ...prev, [key]: data }));
    } catch {
      setWeather(prev => ({ ...prev, [key]: { error: true } }));
    }
    setWeatherLoading(null);
  };
  const [craftDetail, setCraftDetail] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [townDetail, setTownDetail] = useState(null);
  const [nightlifeDetail, setNightlifeDetail] = useState(null);
  const [freeDetail, setFreeDetail] = useState(null);
  const [foodDetail, setFoodDetail] = useState(null);
  const [userCoords, setUserCoords] = useState(null); // null | "denied" | "requesting" | { lat, lon }

  const requestLocation = () => {
    if (!navigator.geolocation) { setUserCoords("denied"); return; }
    setUserCoords("requesting");
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => { setUserCoords("denied"); setLocationLoading(false); },
      { timeout: 8000 }
    );
  };


  const nearYou = isInDenmark(userCoords) ? (() => {
    const ranked = Object.entries(TOWN_COORDS).map(([name, [tLat, tLon]]) => {
      const dLat = (tLat - userCoords.lat) * 111.32;
      const dLon = (tLon - userCoords.lon) * 62.06;
      return { name, km: Math.sqrt(dLat * dLat + dLon * dLon) };
    }).sort((a, b) => a.km - b.km);

    const nearestTown = ranked[0]?.name;
    const closeTowns = ranked.filter(t => t.km <= 30).map(t => t.name); // realistic same-day-trip radius

    const allTracked = [...events, ...majorEvents, ...vikingEvents];
    const nearbyEvents = allTracked.filter(e => closeTowns.includes(e.town))
      .filter(e => isUpcoming(e.date) || isCurrentlyLive(e.date, e.dateEnd));

    const matches = nearbyEvents
      .map(e => ({ ...e, _kind: "event", _km: ranked.find(t => t.name === e.town)?.km ?? 999 }))
      .sort((a, b) => a._km - b._km).slice(0, 8);

    return { town: nearestTown, distanceKm: Math.round(ranked[0]?.km ?? 0), matches };
  })() : (userCoords === "denied" ? "denied" : userCoords === "requesting" ? "loading" : null);

  const [routeStops, setRouteStops] = useState([]); // array of town names, in order
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeSummaryLoading, setRouteSummaryLoading] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gemlyx_saved_routes") || "[]"); } catch { return []; }
  });

  const [guideModal, setGuideModal] = useState(null); // null | "loading" | { title, days }
  const [glancePending, setGlancePending] = useState(0);
  const [weatherPending, setWeatherPending] = useState(0);

  // ── Founder studio (visible only at /#studio): Tavily+OpenAI drafts complete
  // entries — card + long-form blogBody — for any content type, following the
  // Gemlyx editorial documents. Output is paste-ready code the founder verifies
  // before committing, keeping "never invented content" true.
  const isStudio = typeof window !== "undefined" && window.location.hash === "#studio";
  const [studioSession, setStudioSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gemlyx_studio_session") || "null"); } catch { return null; }
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const studioLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) return;
    setLoginLoading(true); setLoginError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) { setLoginError(data.error_description || data.msg || "Login failed — check email and password."); setLoginLoading(false); return; }
      const session = { access_token: data.access_token, refresh_token: data.refresh_token, email: data.user?.email || loginEmail.trim() };
      localStorage.setItem("gemlyx_studio_session", JSON.stringify(session));
      setStudioSession(session);
      setLoginPassword("");
    } catch { setLoginError("Couldn't reach Supabase — check your connection."); }
    setLoginLoading(false);
  };
  // ── Manage Published: list everything Studio has published, with delete.
  const [manageOpen, setManageOpen] = useState(false);
  const [manageItems, setManageItems] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null); // id of the row being edited, or null for a fresh draft
  const loadManageItems = async () => {
    if (!studioSession) return;
    setManageLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=id,type,payload,published&order=id.desc`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${studioSession.access_token}` },
      });
      const rows = await res.json();
      setManageItems(Array.isArray(rows) ? rows : []);
    } catch { setManageItems([]); }
    setManageLoading(false);
  };
  const editItem = (row) => {
    setStudioType(row.type);
    setEditingId(row.id);
    setStudioDraft(row.payload);
    setStudioDraftText(JSON.stringify(row.payload, null, 2));
    setStudioResult("// Editing an existing published entry — Save changes below updates it in place.\n// (No manual-paste code needed for edits — this goes straight to Supabase.)");
    setStudioPhotoName(row.payload?.photo ? row.payload.photo.split("/").pop() : "");
    setDraftEditError(null);
    setPublishStatus(null);
    setPublishErrorDetail(null);
    setVerifyResults(null); setVerifyError(null); setGoogleCheckResult(null); setGoogleCheckError(null); setGooglePrecheckRan(false);
    setManageOpen(false);
  };

  const deleteContentItem = async (id) => {
    if (!studioSession || !window.confirm("Delete this from Gemlyx? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${studioSession.access_token}` },
      });
      if (res.ok) {
        setToast("🗑 Deleted — refreshing");
        setTimeout(() => window.location.reload(), 900); // simplest correct way to clear it from every merged array
      } else {
        setToast("❌ Delete failed — check the delete RLS policy exists");
        setTimeout(() => setToast(null), 2500);
      }
    } catch { setToast("❌ Delete failed"); setTimeout(() => setToast(null), 2500); }
    setDeletingId(null);
  };

  const studioLogout = () => {
    localStorage.removeItem("gemlyx_studio_session");
    setStudioSession(null);
  };
  // Supabase access tokens expire (~1hr). Rather than failing the whole publish,
  // try trading the refresh_token for a fresh one first — silent, no re-typing password.
  const refreshStudioSession = async () => {
    if (!studioSession?.refresh_token) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: studioSession.refresh_token }),
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) return null;
      const session = { access_token: data.access_token, refresh_token: data.refresh_token, email: studioSession.email };
      localStorage.setItem("gemlyx_studio_session", JSON.stringify(session));
      setStudioSession(session);
      return session;
    } catch { return null; }
  };
  const [studioTown, setStudioTown] = useState("");
  const [studioType, setStudioType] = useState("town");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioResult, setStudioResult] = useState(null);
  const [studioError, setStudioError] = useState(null);
  const [studioDraft, setStudioDraft] = useState(null);
  const [studioDraftText, setStudioDraftText] = useState(""); // editable JSON — what actually gets published
  const [draftEditError, setDraftEditError] = useState(null);
  const [verifyResults, setVerifyResults] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const verifySource = async () => {
    if (!studioDraft || verifyLoading) return;
    setVerifyLoading(true); setVerifyError(null); setVerifyResults(null);
    try {
      const queries = [
        `${studioDraft.name} official dates location 2026 2027 Denmark`,
        `${studioDraft.name} ticket price kr DKK venue stage names`,
      ];
      const allResults = [];
      for (const q of queries) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        (data.results || []).slice(0, 3).forEach(r => allResults.push({
          title: r.title || r.url || "Source",
          url: r.url || "",
          snippet: (r.content || r.snippet || "").slice(0, 220),
        }));
      }
      if (allResults.length === 0) { setVerifyError("No results found — try checking manually."); }
      setVerifyResults(allResults);
    } catch {
      setVerifyError("Couldn't search — check your connection and try again.");
    }
    setVerifyLoading(false);
  };

  // Real independent second opinion via Gemini + Google Search grounding — genuinely
  // different from Tavily+OpenAI (different search index, different model), which is
  // why it caught things Studio's own research missed (e.g. the fabricated "Kap" stage
  // and wrong currency for Skagen Festival). Never edits the draft automatically —
  // shows a synthesized answer with real citations for Oliver to read and act on himself.
  const askGemini = async (prompt) => {
    const key = import.meta.env.VITE_GEMINI_KEY;
    if (!key) return { error: "No Gemini API key set — add VITE_GEMINI_KEY in Vercel's environment variables (free key from aistudio.google.com)." };
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error?.message || `Request failed (${res.status})` };
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "No response text.";
      const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const citations = chunks.map(c => ({ title: c.web?.title || c.web?.uri || "Source", url: c.web?.uri || "" })).filter(c => c.url);
      return { text, citations };
    } catch (err) {
      return { error: "Couldn't reach Gemini — check the API key and your connection." };
    }
  };
  const [googlePrecheckRan, setGooglePrecheckRan] = useState(false);
  const [googleCheckLoading, setGoogleCheckLoading] = useState(false);
  const [googleCheckResult, setGoogleCheckResult] = useState(null); // { text, citations: [{title,url}] }
  const [googleCheckError, setGoogleCheckError] = useState(null);
  const googleAICheck = async () => {
    if (!studioDraft || googleCheckLoading) return;
    setGoogleCheckLoading(true); setGoogleCheckError(null); setGoogleCheckResult(null);
    const prompt = `Fact-check this draft travel listing for a Danish travel guide. Using real, current web search, verify: (1) the dates are correct and not already past, (2) any prices are real and in the right currency (DKK for Denmark), (3) any named venue, stage, or room actually exists under that exact name. List anything wrong or unverifiable, and give the correct real facts where you find them. Be concise — bullet points, not an essay.\n\nDraft: ${JSON.stringify(studioDraft)}`;
    const result = await askGemini(prompt);
    if (result.error) { setGoogleCheckError(result.error); setGoogleCheckLoading(false); return; }
    setGoogleCheckResult({ text: result.text, citations: result.citations });
    setGoogleCheckLoading(false);
  };

  const [publishStatus, setPublishStatus] = useState(null); // null | "sending" | "sent" | "error"

  // ── Scan a Source: paste a listing page, Tally-style extraction via /api/scan-source
  // (server-side fetch) + OpenAI (structured extraction only — never invents entries
  // beyond what's actually in the page text), then dedupe against what Gemlyx already has.
  const [scanUrl, setScanUrl] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanResults, setScanResults] = useState(null); // [{name, town, dates}] — new only
  const [scanHint, setScanHint] = useState(null); // {town, dates} carried from the tapped scan chip, so real facts already found aren't thrown away

  const scanSource = async () => {
    const url = scanUrl.trim();
    if (!url || scanLoading) return;
    setScanLoading(true); setScanError(null); setScanResults(null);
    try {
      const pageRes = await fetch(`/api/scan-source?url=${encodeURIComponent(url)}`);
      let pageData;
      try {
        pageData = await pageRes.json();
      } catch {
        setScanError(pageRes.status === 404
          ? "The /api/scan-source endpoint isn't found (404) — has scan-source.js been added to your repo's /api/ folder and deployed?"
          : `Got an unexpected response (status ${pageRes.status}) — not JSON. Check the Vercel deploy logs.`);
        setScanLoading(false); return;
      }
      if (!pageRes.ok || !pageData.text) { setScanError(pageData.error || "Couldn't read that page."); setScanLoading(false); return; }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `Extract every distinct Danish festival/event mentioned in this page text into strict JSON: {"items": [{"name": "exact name as written", "town": "town/city if given, else empty string", "dates": "date range as written, else empty string"}]}. Only include items ACTUALLY present in the text — never invent, never guess at ones you think might exist. If the same festival appears twice (e.g. a duplicate listing), include it once. This is a discovery list only, not final content — the founder will individually research and verify each one before anything is published.` },
            { role: "user", content: pageData.text },
          ],
          max_tokens: 8000,
        }),
      });
      const data = await res.json();
      if (data.error) { setScanError(`OpenAI error: ${data.error.message || "unknown"}`); setScanLoading(false); return; }
      let parsed;
      try {
        parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      } catch {
        setScanError("The extraction got cut off (the page had a lot of events) — try a shorter/filtered listing page, or ask me to raise the limit further.");
        setScanLoading(false); return;
      }
      const items = Array.isArray(parsed.items) ? parsed.items : [];

      // Dedupe against everything Gemlyx already has (case-insensitive substring match)
      const known = [...towns, ...majorEvents, ...events, ...freeEntrance, ...foodSpots, ...nightlifeSpots]
        .map(x => (x.name || "").toLowerCase());
      const fresh = items.filter(it => it.name && !known.some(k => k.includes(it.name.toLowerCase()) || it.name.toLowerCase().includes(k)));

      setScanResults(fresh);
    } catch {
      setScanError("Scan failed — check the URL and try again.");
    }
    setScanLoading(false);
  };
  const [publishErrorDetail, setPublishErrorDetail] = useState(null);
  const [studioPhotoName, setStudioPhotoName] = useState("");

  const STUDIO_VOICE = 'Voice rules from Gemlyx editorial docs: concrete facts over adjectives — dates, prices, distances, names, materials. Generic words like "charming", "picturesque", "rich history", "beautiful", "known for" are BANNED unless immediately followed by the specific thing that makes them true. Also BANNED outright, no exceptions: "nestled in the heart", "captivates with", "a tapestry of culture", "intertwines with stories", "vibrant", "electrifying", "must-see", "hidden treasure", "off the beaten path", "a feast for the senses" — these are cliché AI-travel-writing tells, not real description. Address the reader as "you". Warm but honest: every "Things to Know" section must include at least one real downside. NEVER invent facts, prices, dates, ratings or websites — write "See website" or "Check locally" when the search context does not clearly support a claim. Each section 2-4 full sentences. If the search context includes real visitor/local opinions (e.g. from Reddit, Quora, or Google/TripAdvisor-style reviews), fold that texture into "Things to Know" or "What Travelers Love" as plain observed fact — write "the queue regularly runs over an hour in summer" or "locals tend to avoid it on weekends", NOT "Reddit users say..." or "according to reviews..." or "according to visitors online...". Never name the source or platform, whichever it was. Never quote anyone directly — always paraphrase in your own words, and only include a specific claim if multiple sources agree or one source is clearly credible; a single offhand comment isn\'t worth repeating as fact. NEVER name a specific sub-venue, stage, room, or named feature (e.g. a stage name at a festival, a specific gallery room in a museum) unless that EXACT name appears in the search context — a plausible-sounding invented name (like a fake stage name) is a serious factual error, not a stylistic risk; if you cannot name a specific spot with confidence, describe the experience generically instead ("the main stage", "the indoor venue") rather than inventing a proper name. PRICES: always state prices in the currency actually found in the search context first (Danish prices are in kr./DKK) — you may add an approximate EUR/USD conversion in parentheses ONLY if the search context itself provides one; never calculate or invent a conversion yourself. If no real price is found, write "See website" rather than estimating one. GEMLYX FIND: this is a premium signature feature — it must be a genuinely specific, verified insider tip pulled from the search context (a real side-street spot, a real quiet corner, a real local tradition), never a generic restatement of the main attraction. If the search context has nothing that specific, OMIT gemlyxFind entirely (leave it an empty string) rather than filling it with a plausible-sounding placeholder — an empty section is honest, a fabricated one risks the brand. UNCERTAINTIES: every response MUST include an "uncertainties" array field (can be empty if genuinely nothing is unclear). If your own research and the Google AI cross-check (when provided) disagree with each other, or if BOTH leave something genuinely unconfirmed (a price, a date, whether a specific place still operates), list it as a short plain sentence in "uncertainties" — this is shown directly to the founder as a flag to check personally, so be specific ("Ticket price unconfirmed — Tavily found no number, Google AI search found none either") rather than vague ("some details may be wrong"). HONEST TIERS: be genuinely conservative with "Can\'t Miss Out" or similarly strong recommendation labels — reserve them for places that truly are exceptional or unique, not every town or place you draft. A quiet residential suburb or an ordinary neighborhood is NOT "Can\'t Miss Out" just because it exists; call it what it is ("Worth Considering" or lower) rather than inflating every entry\'s importance, which is exactly the brochure salesmanship this voice exists to avoid. TONE: write like a well-travelled local giving a friend the real, slightly blunt version — closer to a good Reddit or Google review than a tourism board — never trying to "sell" a place, and always willing to say a place is fine-but-not-special if that\'s the truth.';

  const slugify = (s) => s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "aa").replace(/[^a-z0-9]/g, "");
  const J = (v) => JSON.stringify(v ?? "");
  const bb = (pairs) => pairs.filter(([, body]) => body).map(([h, body]) => `      { type: "heading", content: ${J(h)} },\n      { type: "paragraph", content: ${J(body)} },`).join("\n");
  const bbBullets = (heading, raw) => {
    const items = (Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/\n+/).map(s => s.replace(/^[-•\d.\s]+/, "").trim()).filter(Boolean) : []).slice(0, 3);
    if (items.length === 0) return "";
    return `      { type: "heading", content: ${J(heading)} },\n      { type: "bullets", items: ${JSON.stringify(items)} },`;
  };
  const bbData = (pairs) => pairs.filter(([, body]) => body).flatMap(([h, body]) => [{ type: "heading", content: h }, { type: "paragraph", content: body }]);
  // "Things to Know" must be exactly 3 bullets per the editorial template. The AI
  // should return an array, but defensively handle a string too (split on newlines).
  const bulletsBlock = (heading, raw) => {
    let items = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/\n+/).map(s => s.replace(/^[-•\d.\s]+/, "").trim()).filter(Boolean) : [];
    items = items.slice(0, 3);
    if (items.length === 0) return [];
    return [{ type: "heading", content: heading }, { type: "bullets", items }];
  };

  // Shapes a Studio draft into the exact object shape each hardcoded array expects —
  // same fields the paste-ready codegen builds, but as a real JS object for direct use,
  // not template-string code. `id` and TOWN_COORDS are set by the caller after insert.
  const shapeForLive = (type, t) => {
    if (type === "town") return { name: t.name, photo: `/towns/${slugify(t.name)}.jpg`, region: t.region || "", emoji: t.emoji || "📍", tag: t.tag || "", desc: t.desc, highlight: t.highlight || "", travelTime: t.travelTime || "", mapHint: t.mapHint || `${t.name}, Denmark`, nomiPotential: t.nomiPotential || "Medium", tier: t.tier || "Worth Considering", __lat: Number(t.lat) || null, __lon: Number(t.lon) || null,
      nearestStation: t.nearestStation || "", recommendedStayGlance: t.recommendedStayGlance || "", bestTimeGlance: t.bestTimeGlance || "", accommodationGlance: t.accommodationGlance || "", budgetGlance: t.budgetGlance || "", gemlyxFind: t.gemlyxFind || "",
      blogBody: [
        ...bbData([["Getting There", t.gettingThere], ["Why Visit", t.whyVisit], ["What Travelers Love", t.travelersLove]]),
        ...bulletsBlock("Good to Know", t.thingsToKnow),
      ] };
    if (type === "festival") return { name: t.name, tier: t.tier || "Worth Considering", nearestStation: t.nearestStation || "", ticketInfo: t.ticketInfo || "", camping: t.camping || "", accommodationTip: t.accommodationTip || "", budgetLevel: t.budgetLevel || "", travelTime: t.travelTime || "", ticketStatus: t.ticketStatus || "on_sale", town: t.town || "", type: t.type || "Festival", emoji: t.emoji || "🎪", date: t.dateStart || "", dateEnd: t.dateEnd || "", photo: `/events/${slugify(t.name)}.jpg`, desc: t.desc, mapHint: t.mapHint || "", color: t.color || "#8E24AA", tags: Array.isArray(t.tags) ? t.tags.slice(0, 3) : [], __scale: (t.scale || "").toLowerCase().startsWith("major") ? "Major" : "Local", gemlyxFind: t.gemlyxFind || "",
      blogBody: [
        ...bbData([["Atmosphere", t.atmosphere], ["Perfect For", t.perfectFor]]),
        ...bulletsBlock("Good to Know", t.thingsToKnow),
      ] };
    if (type === "free") return { name: t.name, popularityTag: t.popularityTag || "Hidden Gem", city: t.city || "", type: t.type || "", emoji: t.emoji || "✨", desc: t.desc, website: t.website || "", color: t.color || "#2E7D32",
      ticketsGlance: t.ticketsGlance || "", timeNeeded: t.timeNeeded || "", budgetGlance: t.budgetGlance || "", accessibility: t.accessibility || "", nearestStation: t.nearestStation || "", gemlyxFind: t.gemlyxFind || "",
      blogBody: [
        ...bbData([["Why People Love It", t.special], ["Perfect For", t.whoFor]]),
        ...bulletsBlock("Good to Know", t.thingsToKnow),
      ] };
    if (type === "food") return { name: t.name, type: t.type || "Local", emoji: t.emoji || "🍽", category: t.category || "", location: t.location || "", price: t.price || "See website", photo: `/food/${slugify(t.name)}.jpg`, desc: t.desc, tip: t.tip || "", mapHint: t.mapHint || "", color: t.color || "#D4AF37" };
    if (type === "night") return { name: t.name, type: t.type || "Local", crowd: t.crowd || "", emoji: t.emoji || "🍺", category: t.category || "", location: t.location || "", desc: t.desc, tip: t.tip || "", mapHint: t.mapHint || "", color: t.color || "#5D4037" };
    if (type === "booking") return { name: t.name, type: t.type || "Local", what: Array.isArray(t.what) ? t.what : [t.what].filter(Boolean), rating: t.rating ? Number(t.rating) : null, location: t.location || "", price: t.price || "See website", priceNote: t.priceNote || "", travelTime: t.travelTime || "", bookingType: t.bookingType || "contact", popularityTag: t.popularityTag || "", transportWarning: !!t.transportWarning, emoji: t.emoji || "🔨", photo: `/craft/${slugify(t.name)}.jpg`, color: t.color || "#8E6B1F", desc: t.desc,
      timeNeeded: t.timeNeeded || "", accessibility: t.accessibility || "", nearestStation: t.nearestStation || "", gemlyxFind: t.gemlyxFind || "",
      blogBody: [
        ...bbData([["Why People Love It", t.special], ["Perfect For", t.whoFor]]),
        ...bulletsBlock("Good to Know", t.thingsToKnow),
      ] };
    return null;
  };

  const generateArea = async () => {
    const name = studioTown.trim();
    if (!name || studioLoading) return;
    setStudioLoading(true); setStudioResult(null); setStudioError(null);
    setVerifyResults(null); setVerifyError(null); setGoogleCheckResult(null); setGoogleCheckError(null); setGooglePrecheckRan(false);
    try {
      const cfg = {
        town: { queries: [`${name} Denmark travel guide history attractions what makes it special`, `${name} Denmark getting there by train best time to visit where to stay what travelers say`, `${name} reddit r/Denmark r/travel what locals visitors really think`, `${name} quora google reviews honest opinion worth it`] },
        festival: { queries: [`${name} festival Denmark 2026 dates tickets prices lineup`, `${name} festival Denmark atmosphere who goes accommodation nearest station`, `${name} reddit r/Denmark experience worth it crowds queue`, `${name} quora google reviews honest opinion worth it`] },
        free: { queries: [`${name} free entry what makes it special history opening hours`, `${name} Denmark visitor tips things to know best time to visit`, `${name} Denmark getting there how to reach`, `${name} reddit r/Denmark hidden gem overrated worth it`, `${name} quora google reviews honest opinion overrated`] },
        food: { queries: [`${name} Denmark what to order prices history reviews`, `${name} Denmark local tips address`, `${name} reddit r/Denmark r/food worth it locals think`, `${name} quora google reviews honest opinion`] },
        night: { queries: [`${name} Denmark bar atmosphere crowd prices reviews`, `${name} Denmark local tips address`, `${name} reddit r/Denmark vibe crowd locals tourists`, `${name} quora google reviews honest opinion`] },
        booking: { queries: [`${name} Denmark craft workshop what to expect prices booking`, `${name} Denmark reviews how to book opening hours`, `${name} reddit r/Denmark experience worth the money`, `${name} quora google reviews honest opinion`] },
      }[studioType];
      let context = "";
      for (const q of cfg.queries) {
        try {
          const sRes = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          const sData = await sRes.json();
          context = (context + " " + (sData.answer || "") + " " + (sData.results || []).map(r => r.snippet || r.content || "").filter(Boolean).slice(0, 6).join(" ")).trim();
        } catch { /* continue with what we have */ }
      }

      // Automatic Gemini + Google Search pre-check, BEFORE OpenAI writes a word — a second,
      // independent search pass (different index, different model than Tavily+OpenAI) that
      // caught real errors Studio's own research missed (e.g. Skagen Festival's fabricated
      // venue and wrong currency). Its findings get folded in as extra grounding for the
      // draft, not as a rewrite — OpenAI still writes every word. If the key's missing or
      // the call fails, this just skips silently — drafting must never depend on Gemini.
      let googleFindings = "";
      const geminiKey = import.meta.env.VITE_GEMINI_KEY;
      if (geminiKey) {
        const preCheck = await askGemini(`Using real, current web search, find the accurate dates, prices (in local currency), and any specific named venues/stages for "${name}" in Denmark. Be concise — short facts only, no essay.`);
        if (!preCheck.error && preCheck.text) googleFindings = preCheck.text;
      }
      setGooglePrecheckRan(!!googleFindings);

      const prompts = {
town: `Draft a complete Gemlyx town entry for ${name}, Denmark, following this EXACT structure (from Gemlyx's editorial template — a premium travel editor's voice, never Wikipedia): Hero -> At a Glance -> Gemlyx Find -> Intro (the existing desc field — do NOT write a separate Overview, that would just repeat it) -> Getting There -> Why Visit -> What Travelers Love -> Things to Know (EXACTLY 3 short bullets). Total word count across GettingThere+WhyVisit+WhatTravelersLove+ThingsToKnow+GemlyxFind should land around 220-350 words — short paragraphs, 1-3 sentences each, never encyclopedic. Every section must answer a different question; never repeat what's already said in At a Glance.
Real card example: {"name": "Ribe", "region": "South Jutland", "emoji": "⛪", "tag": "Denmark's oldest town", "desc": "Founded around 700 AD — the oldest town in Scandinavia. Medieval cathedral, Viking museum and cobblestone streets.", "highlight": "Viking Center Ribe — artisans craft authentic Viking jewellery, leather and textiles on site.", "travelTime": "3h 15min 🚂"}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "region": "...", "emoji": "one emoji", "tag": "3-5 word hook", "desc": "two card sentences in the voice above", "highlight": "one specific real place/experience with a concrete detail, or empty string", "travelTime": "EXACT format like '3h 15min 🚂' or '45min 🚌' or '2h + ferry 🚢' — duration + one emoji, NO other words", "mapHint": "Town, postcode Town, Denmark", "lat": 56.09, "lon": 8.24, "nomiPotential": "High / Very High / Medium", "tier": "Can't Miss Out / Highly Recommended / Worth Considering / Best If You're Already Nearby", "nearestStation": "short — just the station name, for the At a Glance card", "recommendedStayGlance": "e.g. 'Half day' or 'Overnight' — short, for At a Glance", "bestTimeGlance": "e.g. 'May–Sept' — short, for At a Glance", "accommodationGlance": "e.g. 'Day trip from Copenhagen' — short, for At a Glance", "budgetGlance": "e.g. 'Low–Moderate' — short, for At a Glance", "gettingThere": "elaborates BEYOND the At a Glance station name — route specifics, connections, driving option", "whyVisit": "describe the town's ACTUAL character honestly, as if explaining to a friend who asked what it's really like — NOT a persuasive case for why someone should go. If it's genuinely a quiet, unremarkable, or mostly-a-day-trip-stop kind of place, say that plainly rather than manufacturing enthusiasm. The goal is an accurate picture, not a sales pitch, even though the field is called whyVisit.", "travelersLove": "what visitors consistently, specifically praise — real and specific, not generic positivity", "thingsToKnow": ["exactly 3 short practical bullets", "each one sentence", "at least one must be a real downside"], "gemlyxFind": "ONE specific curated recommendation only Gemlyx would flag — a real place/experience with a concrete detail, distinct from highlight", "uncertainties": ["short specific sentence per genuine unconfirmed fact, empty array if none"]}`,
        festival: `Draft a complete Gemlyx festival entry for ${name}, Denmark, following this EXACT structure (a premium travel editor's voice, never Wikipedia): Hero -> At a Glance -> Gemlyx Find -> Intro (the existing desc field — do NOT write a separate Overview, that would just repeat it) -> Atmosphere (describe the FEELING of the event) -> Perfect For (also cover why someone should go — don't split this into a separate Why Go section) -> Things to Know (EXACTLY 3 short bullets). Total word count across Atmosphere+PerfectFor+ThingsToKnow+GemlyxFind should land around 220-350 words — short paragraphs, never encyclopedic. Every section answers a different question; never repeat what's already in At a Glance.
Real example: {"name": "Distortion", "town": "Copenhagen", "nearestStation": "Nørreport Station, Copenhagen Central Station or nearby Metro stations", "ticketInfo": "Street parties are free. Distortion X and Distortion Ø require tickets.", "accommodationTip": "Stay in central Copenhagen and book several months in advance.", "budgetLevel": "Moderate–High.", "desc": "Copenhagen's legendary street festival. Five days of block parties in different neighbourhoods."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "scale": "Major (large, well-known, city-wide/national draw — e.g. a festival with thousands+ attendees, mainstream press coverage) or Local (smaller, niche, community, underground, or regional — most festivals are this)", "town": "host town", "type": "Music / Festival / Market / Culture", "emoji": "one emoji", "dateStart": "STRICTLY the format YYYY-MM-DD (4-digit year FIRST, e.g. '2027-06-30' for 30 June 2027) — never DD-MM-YYYY or any other order — or empty string if not in context", "dateEnd": "same STRICT YYYY-MM-DD format, or empty", "tier": "Can't miss out / Highly Recommended / Worth Considering / Best If You're Already Nearby", "nearestStation": "short — for At a Glance", "ticketInfo": "short — for At a Glance, never invent prices", "camping": "short camping note if relevant, else empty string — for At a Glance", "accommodationTip": "short — for At a Glance", "budgetLevel": "Very Low / Low / Moderate / High — for At a Glance", "travelTime": "from Copenhagen like '1h 10min 🚂', or 'In Copenhagen 🚇'", "ticketStatus": "free / on_sale / limited / sold_out", "desc": "two card sentences", "mapHint": "Venue/street, postcode Town, Denmark", "tags": ["two", "tags"], "color": "#hex fitting the vibe", "atmosphere": "describe the FEELING — sound, crowd energy, what a day there is actually like", "perfectFor": "who this genuinely suits, described honestly — not a persuasive pitch for why someone SHOULD go. If this festival is genuinely niche, low-key, or not for everyone, say so plainly. Combine who it suits with an honest read on the actual pull, but the goal is accuracy about fit, not convincing the reader to buy a ticket", "thingsToKnow": ["exactly 3 short practical bullets", "each one sentence", "at least one must be a real downside"], "gemlyxFind": "ONE specific curated recommendation only Gemlyx would flag", "uncertainties": ["short specific sentence per genuine unconfirmed fact, empty array if none"]} If the context doesn't clearly show this is a major, mainstream-known event, default "scale" to "Local" — most festivals are, and Gemlyx only calls something Major when the evidence genuinely supports it.
Dates: ONLY from the context — empty string beats a guess.
CRITICAL GEOGRAPHY CHECK — small/underground/local festivals are the highest-risk case for this: verify the town/region named in "nearestStation", "accommodationTip", and "mapHint" is ACTUALLY where this specific event happens, not a same-named or similar-sounding place elsewhere in Denmark. A real station or stop name can exist in multiple regions — Denmark has several places with overlapping or similar names (e.g. a "Hemmet" in West Jutland is unrelated to unrelated locations elsewhere). Getting the STATION NAME right is not enough if the TOWN attached to it is wrong. If the search context doesn't clearly confirm which town/region the venue is in, say so honestly (e.g. "Check the festival's own website for directions") rather than guessing a nearby-sounding place.`,
        free: `Draft a complete Gemlyx Attraction entry for ${name} (a free-entrance attraction), following this EXACT structure (a premium travel editor's voice, never Wikipedia — focus on the EXPERIENCE, not history): Hero -> At a Glance -> Gemlyx Find -> Intro (the existing desc field — do NOT write a separate Overview, that would just repeat it) -> Why People Love It -> Perfect For -> Things to Know (EXACTLY 3 short bullets). Total word count across WhyPeopleLoveIt+PerfectFor+ThingsToKnow+GemlyxFind should land around 220-350 words — short paragraphs, 1-3 sentences each, never encyclopedic. Every section answers a different question; never repeat what's already in At a Glance.
Real example: {"name": "The Greenhouses, Botanical Garden", "city": "Aarhus", "type": "Botanical garden", "popularityTag": "Hidden Gem", "desc": "Giant glass domes housing four climate zones, exotic plants and free-flying butterflies. Entry is completely free."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "city": "which Danish city", "type": "short category", "emoji": "one emoji", "popularityTag": "Hidden Gem / Local Favourite / Popular", "desc": "two card sentences — say clearly what is free", "website": "official URL ONLY if present in context, else empty string", "color": "#hex", "ticketsGlance": "e.g. 'Free' or 'Free, donations welcome' — for At a Glance", "timeNeeded": "e.g. '1-2 hours' — for At a Glance", "budgetGlance": "e.g. 'Free' or 'Low (café on site)' — for At a Glance", "accessibility": "short accessibility note if known, else empty string — for At a Glance", "nearestStation": "short — for At a Glance", "special": "the experience of being there — focus on EXPERIENCE not history, real specific detail", "whoFor": "who this genuinely suits", "thingsToKnow": ["exactly 3 short practical bullets", "each one sentence", "at least one must be a real downside"], "gemlyxFind": "ONE specific curated recommendation only Gemlyx would flag", "uncertainties": ["short specific sentence per genuine unconfirmed fact, empty array if none"]}`,
        food: `Draft a complete Gemlyx food entry for ${name}, matching this REAL example: {"name": "Harry's Place", "type": "Local", "category": "Hot dog stand", "location": "Nørrebro/Nordvest, Copenhagen", "price": "40–70 DKK", "desc": "A hot dog cart since 1965, run by the same kind of hands-on owners the whole time. Order the \\"Børge med krudt\\" — the local's move — or the flæskesteg (roast pork) sandwich. Cash or Dankort only. No frills, no seats, just stand and eat like generations before you.", "tip": "Ask for it \\"the traditional way\\" and the person behind the counter will usually tell you exactly how to eat it."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "type": "Local / Major", "category": "e.g. Bakery, est. 1652", "location": "Neighbourhood, City", "price": "range like '40–70 DKK' ONLY from context, else 'See website'", "emoji": "one emoji", "desc": "3-4 sentences in the voice above — what to order, history, quirks", "tip": "one insider tip a local would give", "mapHint": "Name, street, postcode City, Denmark", "color": "#hex", "uncertainties": ["short specific sentence per genuine unconfirmed fact, empty array if none"]}`,
        night: `Draft a complete Gemlyx nightlife entry for ${name}, matching this REAL example: {"name": "Toga Vinstue", "type": "Local", "crowd": "Almost entirely Danish", "category": "Brown bar (bodega)", "location": "Indre By, Copenhagen", "desc": "A classic \\"brown bar\\" — old wood interior, low light, walls covered in political cartoons. Sits five minutes from the Danish Parliament, and actual lawmakers drink here. Cheap beer (around 45 DKK), smoking still allowed indoors, genuinely local despite the central address.", "tip": "Don't expect English menus or tourist-friendly service — this is a real neighbourhood bodega, not a show."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "type": "Local / Major", "crowd": "who actually drinks here", "category": "short category", "location": "Neighbourhood, City", "emoji": "one emoji", "desc": "3-4 sentences in the voice above", "tip": "one insider tip", "mapHint": "Name, street, postcode City, Denmark", "color": "#hex", "uncertainties": ["short specific sentence per genuine unconfirmed fact, empty array if none"]}`,
        booking: `Draft a complete Gemlyx Booking (bookable craft/experience) entry for ${name}, Denmark, following the same Attraction structure Gemlyx uses for its experiences (a premium travel editor's voice, never Wikipedia — focus on the EXPERIENCE, not history): Hero -> At a Glance -> Gemlyx Find -> Intro (the existing desc field — do NOT write a separate Overview, that would just repeat it) -> Why People Love It -> Perfect For -> Things to Know (EXACTLY 3 short bullets). Total word count across WhyPeopleLoveIt+PerfectFor+ThingsToKnow+GemlyxFind should land around 220-350 words — short paragraphs, never encyclopedic. Never repeat what's already in the Price block or At a Glance.
Real example: {"name": "Viking Center Ribe", "type": "Major", "what": ["blacksmithing", "leather", "textiles"], "location": "Ribe", "price": "180 DKK", "bookingType": "online", "desc": "Artisans craft authentic Viking jewellery, leather and textiles on site — watch smithing demonstrations and try archery in the reconstructed village."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "type": "Major (well-known, e.g. a named museum/center) or Local (small independent workshop)", "what": ["1-3 lowercase craft keywords from: blacksmith, ceramic/pottery, jewellery, leather, textile/dyeing/felting, wood, candy — only include what's genuinely true"], "rating": "a real rating if found in reviews, else omit", "location": "Town name", "price": "exact price if the context gives one, else 'See website'", "priceNote": "e.g. 'per person' or 'family ticket available', else empty string", "travelTime": "EXACT format like '3h 15min 🚂' from Copenhagen, or empty string", "bookingType": "'online' only if you can book/buy tickets on a website, otherwise 'contact'", "popularityTag": "'Hidden Gem' if genuinely under-the-radar, else empty string", "transportWarning": "true only if it's genuinely hard to reach without a car", "emoji": "one fitting emoji", "color": "#hex fitting the craft", "timeNeeded": "e.g. '2-3 hours' — for At a Glance", "accessibility": "short accessibility note if known, else empty string — for At a Glance", "nearestStation": "short — for At a Glance", "special": "the experience itself — what happens, what you'll actually make or see, real specific detail", "whoFor": "who this genuinely suits", "thingsToKnow": ["exactly 3 short practical bullets", "each one sentence", "at least one must be a real downside"], "gemlyxFind": "ONE specific curated recommendation only Gemlyx would flag", "uncertainties": ["short specific sentence per genuine unconfirmed fact, empty array if none"]}`,
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: prompts[studioType] },
            { role: "user", content: (scanHint && (scanHint.town || scanHint.dates)
              ? `KNOWN FROM SOURCE LISTING (trust this over a weaker fresh search unless your own search clearly contradicts it with better evidence): ${[scanHint.town && `town/city = ${scanHint.town}`, scanHint.dates && `dates = ${scanHint.dates}`].filter(Boolean).join(", ")}\n\n`
              : "") + (googleFindings ? `GOOGLE AI CROSS-CHECK (a second, independent search — weigh this alongside your own research below; if it conflicts with your own findings, prefer whichever is more specific/recent, and if you still can't tell, that's exactly the kind of thing "uncertainties" is for):\n${googleFindings}\n\n` : "") + (context || "No search context found — use only well-established knowledge, leave uncertain fields empty, and use 'See website' / 'Check locally' fallbacks.") },
          ],
          max_tokens: 2200,
        }),
      });
      const data = await res.json();
      const t = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      if (!t.name || !t.desc) throw new Error("empty");
      // The AI is told to use YYYY-MM-DD but sometimes drifts into DD-MM-YYYY (likely
      // European/Danish habit bleeding through). new Date("30-06-2027") can't parse —
      // "30" isn't a valid month — and fails silently (Invalid Date, no error thrown),
      // which then fails every downstream date check even though the date itself was
      // correctly researched. Normalize the shape BEFORE any date logic touches it,
      // rather than discarding a genuinely correct date over a formatting slip.
      const normalizeDate = (d) => {
        if (!d || typeof d !== "string") return d;
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // already correct ISO
        const dmy = d.match(/^(\d{2})-(\d{2})-(\d{4})$/); // DD-MM-YYYY
        if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
        const dmySlash = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/YYYY
        if (dmySlash) return `${dmySlash[3]}-${dmySlash[2]}-${dmySlash[1]}`;
        return d; // unrecognized shape — leave as-is, the past-date guard below will just no-op on it
      };
      if (t.dateStart) t.dateStart = normalizeDate(t.dateStart);
      if (t.dateEnd) t.dateEnd = normalizeDate(t.dateEnd);
      // A festival "date" already in the past is almost certainly a guess, not a real
      // finding — the model should have left it empty. Don't trust its own honesty here;
      // check mechanically and strip it so a wrong date can't slip through unnoticed.
      if (studioType === "festival" && t.dateStart) {
        const d = new Date(t.dateStart);
        if (!isNaN(d) && d < new Date()) {
          console.warn("Studio: dropped a festival date that was already in the past —", t.name, t.dateStart);
          t.dateStart = ""; t.dateEnd = "";
          t._dateWasStripped = true;
        }
      }
      if (t.travelTime) t.travelTime = t.travelTime.replace(/approx\.?( from)?( Copenhagen)?:?\s*/gi, "").trim();
      const slug = slugify(name);
      const stamp = new Date().toLocaleString("en-GB", { month: "short", year: "numeric" });
      let code = "";
      if (studioType === "town") {
        const nextId = Math.max(...towns.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const towns = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, photo: "/towns/${slug}.jpg", region: ${J(t.region)}, emoji: ${J(t.emoji || "📍")}, tag: ${J(t.tag)}, desc: ${J(t.desc)}, highlight: ${J(t.highlight)}, travelTime: ${J(t.travelTime)}, mapHint: ${J(t.mapHint || t.name + ", Denmark")}, nomiPotential: ${J(t.nomiPotential || "Medium")}, tier: ${J(t.tier || "Worth Considering")}, nearestStation: ${J(t.nearestStation)}, recommendedStayGlance: ${J(t.recommendedStayGlance)}, bestTimeGlance: ${J(t.bestTimeGlance)}, accommodationGlance: ${J(t.accommodationGlance)}, budgetGlance: ${J(t.budgetGlance)}, gemlyxFind: ${J(t.gemlyxFind)},\n  blogBody: [\n${bb([["Getting There", t.gettingThere], ["Why Visit", t.whyVisit], ["What Travelers Love", t.travelersLove]])}\n${bbBullets("Things to Know", t.thingsToKnow)}\n  ] },\n\n// 2) Ctrl+F for \`const TOWN_COORDS\` and paste right after the { :\n${J(t.name)}: [${Number(t.lat)?.toFixed(3) || "??"}, ${Number(t.lon)?.toFixed(3) || "??"}],\n\n// 3) Add a photo at public/towns/${slug}.jpg\n// 4) VERIFY every fact before committing — especially highlight, travelTime, dates and coordinates.`;
      } else if (studioType === "festival") {
        const isMajor = (t.scale || "").toLowerCase().startsWith("major");
        const targetArr = isMajor ? majorEvents : events;
        const targetName = isMajor ? "majorEvents" : "events";
        const nextId = Math.max(...targetArr.map(x => x.id)) + 1;
        code = `// This reads as a ${isMajor ? "MAJOR, well-known" : "LOCAL/smaller-scale"} festival — targeting the ${targetName} array. If that feels wrong, move the block below to the other array yourself.\n// 1) Ctrl+F for \`const ${targetName} = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, tier: ${J(t.tier || "Worth Considering")}, nearestStation: ${J(t.nearestStation)}, ticketInfo: ${J(t.ticketInfo)}, camping: ${J(t.camping)}, accommodationTip: ${J(t.accommodationTip)}, budgetLevel: ${J(t.budgetLevel)}, travelTime: ${J(t.travelTime)}, ticketStatus: ${J(t.ticketStatus || "on_sale")}, town: ${J(t.town)}, type: ${J(t.type || "Festival")}, emoji: ${J(t.emoji || "🎪")}, date: ${J(t.dateStart)}, dateEnd: ${J(t.dateEnd)}, photo: "/events/${slug}.jpg", desc: ${J(t.desc)}, mapHint: ${J(t.mapHint)}, verified: ${J(stamp)}, color: ${J(t.color || "#8E24AA")}, tags: ${JSON.stringify(Array.isArray(t.tags) ? t.tags.slice(0, 3) : [])}, gemlyxFind: ${J(t.gemlyxFind)},\n  blogBody: [\n${bb([["Atmosphere", t.atmosphere], ["Perfect For", t.perfectFor]])}\n${bbBullets("Good to Know", t.thingsToKnow)}\n  ] },\n\n// 2) Add a photo at public/events/${slug}.jpg\n// 3) VERIFY dates, station, town/region and ticket info before committing. Empty date fields mean the research couldn't confirm them.`;
      } else if (studioType === "free") {
        const nextId = Math.max(...freeEntrance.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const freeEntrance = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, popularityTag: ${J(t.popularityTag || "Hidden Gem")}, city: ${J(t.city)}, type: ${J(t.type)}, emoji: ${J(t.emoji || "✨")}, desc: ${J(t.desc)}, website: ${J(t.website)}, color: ${J(t.color || "#2E7D32")}, ticketsGlance: ${J(t.ticketsGlance)}, timeNeeded: ${J(t.timeNeeded)}, budgetGlance: ${J(t.budgetGlance)}, accessibility: ${J(t.accessibility)}, nearestStation: ${J(t.nearestStation)}, gemlyxFind: ${J(t.gemlyxFind)},\n  blogBody: [\n${bb([["Why People Love It", t.special], ["Perfect For", t.whoFor]])}\n${bbBullets("Things to Know", t.thingsToKnow)}\n  ] },\n\n// 2) VERIFY the website URL and that entry is genuinely free before committing.`;
      } else if (studioType === "booking") {
        const nextId = Math.max(...craftItems.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const craftItemsFallback = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, type: ${J(t.type || "Local")}, what: ${JSON.stringify(Array.isArray(t.what) ? t.what : [t.what].filter(Boolean))}, rating: ${t.rating ? Number(t.rating).toFixed(1) : "null"}, location: ${J(t.location)}, price: ${J(t.price || "See website")}, priceNote: ${J(t.priceNote)}, travelTime: ${J(t.travelTime)}, bookingType: ${J(t.bookingType || "contact")}, popularityTag: ${J(t.popularityTag || "")}, transportWarning: ${t.transportWarning ? "true" : "false"}, emoji: ${J(t.emoji || "🔨")}, photo: "/craft/${slug}.jpg", color: ${J(t.color || "#8E6B1F")}, timeNeeded: ${J(t.timeNeeded)}, accessibility: ${J(t.accessibility)}, nearestStation: ${J(t.nearestStation)}, gemlyxFind: ${J(t.gemlyxFind)},\n  desc: ${J(t.desc)},\n  blogBody: [\n${bb([["Why People Love It", t.special], ["Perfect For", t.whoFor]])}\n${bbBullets("Things to Know", t.thingsToKnow)}\n  ] },\n\n// 2) Add a photo at public/craft/${slug}.jpg (or remove the photo field)\n// 3) rating is left null unless the research found a real one — leave it as null rather than inventing a number.\n// 4) VERIFY price, booking method, and that it still operates before committing.`;
      } else if (studioType === "food") {
        const nextId = Math.max(...foodSpots.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const foodSpots = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, type: ${J(t.type || "Local")}, emoji: ${J(t.emoji || "🍽")}, category: ${J(t.category)}, location: ${J(t.location)}, price: ${J(t.price || "See website")}, photo: "/food/${slug}.jpg",\n  desc: ${J(t.desc)},\n  tip: ${J(t.tip)}, mapHint: ${J(t.mapHint)}, color: ${J(t.color || "#D4AF37")} },\n\n// 2) Add a photo at public/food/${slug}.jpg (or remove the photo field)\n// 3) VERIFY prices, address and that it still exists before committing.`;
      } else {
        const nextId = Math.max(...nightlifeSpots.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const nightlifeSpots = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, type: ${J(t.type || "Local")}, crowd: ${J(t.crowd)}, emoji: ${J(t.emoji || "🍺")}, category: ${J(t.category)}, location: ${J(t.location)}, desc: ${J(t.desc)}, tip: ${J(t.tip)}, mapHint: ${J(t.mapHint)}, color: ${J(t.color || "#5D4037")} },\n\n// 2) VERIFY address, crowd and that it still exists before committing.`;
      }
      setStudioResult(code);
      setScanHint(null);
      setStudioDraft(t);
      setStudioDraftText(JSON.stringify(t, null, 2));
      setDraftEditError(null);
      setStudioPhotoName(`${slugify(name)}.jpg`);
      setPublishStatus(null);
      setPublishErrorDetail(null);
    } catch {
      setStudioError("Couldn't draft that — try again, or check the name.");
    }
    setStudioLoading(false);
  };

  const publishDraft = async () => {
    if (!studioDraft || !studioSession) return;
    let editedDraft;
    try {
      editedDraft = JSON.parse(studioDraftText);
    } catch {
      setDraftEditError("The edited draft isn't valid JSON — check for a missing comma or quote before publishing.");
      return;
    }
    setDraftEditError(null);
    setPublishStatus("sending");
    try {
      // Editing an existing row: studioDraftText already holds the final SHAPED object
      // (the same thing the site renders) — send it as-is, never re-run shapeForLive,
      // which expects the raw flat AI-draft shape and would mangle an already-built blogBody.
      // Drafting fresh: shape the raw AI draft into the final object first, as before.
      const isEditing = editingId !== null;
      const shaped = isEditing ? editedDraft : shapeForLive(studioType, editedDraft);
      if (!isEditing && studioPhotoName) shaped.photo = `/${{ town: "towns", festival: "events", free: "free", food: "food", night: "nightlife", booking: "craft" }[studioType]}/${studioPhotoName}`;
      const url = isEditing ? `${SUPABASE_URL}/rest/v1/gemlyx_content?id=eq.${editingId}` : `${SUPABASE_URL}/rest/v1/gemlyx_content`;
      const body = isEditing ? JSON.stringify({ payload: shaped }) : JSON.stringify({ type: studioType, payload: shaped, published: true });
      const attempt = (token) => fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body,
      });
      let res = await attempt(studioSession.access_token);
      if (res.status === 401) {
        const fresh = await refreshStudioSession();
        if (fresh) res = await attempt(fresh.access_token);
      }
      if (!res.ok) {
        const errBody = await res.text();
        console.error("Gemlyx publish failed:", res.status, errBody);
        setPublishStatus("error");
        setPublishErrorDetail(res.status === 401
          ? "Your session expired and couldn't refresh automatically — please log out and back in."
          : `${res.status}: ${errBody.slice(0, 200)}`);
      } else {
        setPublishStatus("sent");
        setPublishErrorDetail(null);
        if (isEditing) {
          // Simplest correct way to reflect an in-place field change everywhere it's
          // already been merged into the app's shared arrays — same approach Delete uses.
          setToast("💾 Saved — refreshing");
          setTimeout(() => window.location.reload(), 900);
        } else {
          await loadLiveContent(); // pull it into this session right away — no reload needed
        }
      }
    } catch (err) { setPublishStatus("error"); setPublishErrorDetail(String(err)); }
  };

  // For each guide day: one Tavily search for live facts, then OpenAI distills them into
  // (a) how to travel between consecutive stops and (b) where to stay. Never invents —
  // falls back to "Check Rejseplanen" wording when the context doesn't support a claim.
  const fetchGuideWeather = (days, gid) => {
    setWeatherPending(days.length);
    days.forEach(async (day, idx) => {
      try {
        const point = day.stops.map(s => {
          const real = lookupRealPlace(s.name);
          if (real?.lat && real?.lon) return { lat: real.lat, lon: real.lon };
          const key = Object.keys(TOWN_COORDS).find(t => s.name.includes(t));
          return key ? { lat: TOWN_COORDS[key][0], lon: TOWN_COORDS[key][1] } : null;
        }).find(Boolean);
        if (!point) return;
        const res = await fetch(`/api/weather?lat=${point.lat}&lon=${point.lon}`);
        const data = await res.json();
        const slot = data?.forecast?.[idx];
        if (!slot) return;
        const cond = (slot.condition || "").toLowerCase();
        const risk = /rain|sleet|thunder|snow/.test(cond) ? "high" : /cloudy|fog/.test(cond) ? "low" : "none";
        setGuideModal(prev => (prev && typeof prev === "object" && prev._gid === gid && prev.days)
          ? { ...prev, days: prev.days.map((d, i) => i === idx ? { ...d, weather: { icon: weatherIcon(slot.condition), temp: Math.round(slot.temperature_c), risk } } : d) }
          : prev);
      } catch { /* weather is a nice-to-have — leave this day without it */ }
      finally { setWeatherPending(p => Math.max(0, p - 1)); }
    });
  };

  const enrichGuideDays = (days, gid, travelMode) => {
    setGlancePending(days.length);
    days.forEach(async (day, idx) => {
      try {
        const names = (day.stops || []).map(s => s.name);
        if (names.length === 0) return;
        const numbered = names.map((n, i) => `${i + 1}. ${n}`).join("; ");
        let context = "";
        try {
          const sRes = await fetch(`/api/search?q=${encodeURIComponent(`travel between ${names.slice(0, 4).join(" and ")} Denmark train bus travel time where to stay overnight`)}`);
          const sData = await sRes.json();
          context = ((sData.answer || "") + " " + (sData.results || []).map(r => r.snippet || r.content || "").filter(Boolean).slice(0, 5).join(" ")).trim();
        } catch { /* search down — OpenAI will fall back to safe wording */ }
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `A traveler visits these stops in Denmark in this exact order: ${numbered}. Using ONLY the provided search context plus well-established Danish geography/transit knowledge, respond with ONLY strict JSON:
{"legs": [${names.length > 1 ? `exactly ${names.length - 1} objects, where legs[0] is how to get from stop 1 to stop 2, legs[1] from stop 2 to stop 3, and so on` : "empty array"}, each: {"how": "e.g. '~10 min by bus' or '~25 min walk' or '~1h by train via Odense'"}], "accommodation": "One specific sentence — name an actual area/neighbourhood to stay in if the context supports it (e.g. 'Stay near Koge harbour for an easy morning ride out'), not a generic 'stay overnight in [town]' with no reason given. Only default to day-trip-from-Copenhagen phrasing if that is genuinely the better call for this specific day."}
Rules: always prefix times with ~. ${travelMode ? `The traveler is getting around BY ${travelMode.toUpperCase()} — every leg must use that mode (e.g. "~45 min by bike", "~30 min drive"${travelMode === "public transport" ? ', by train/bus' : ''}), and accommodation advice must fit it (bike = realistic daily distances, overnight stops matter more).` : "If the transport mode is unknown, prefer public transport phrasing."} If two stops are in the same town or area, walking is usually right. If a leg is genuinely unclear, use "Check Rejseplanen for this leg" — never invent a confident time. Each value under 12 words.` },
              { role: "user", content: context || "No live search context available — use only safe general knowledge and 'Check Rejseplanen' fallbacks." }
            ],
            max_tokens: 350,
          }),
        });
        const data = await res.json();
        const glance = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        if ((Array.isArray(glance.legs) && glance.legs.length > 0) || glance.accommodation) {
          setGuideModal(prev => (prev && typeof prev === "object" && prev._gid === gid && prev.days)
            ? { ...prev, days: prev.days.map((d, i) => i === idx ? { ...d, glance } : d) }
            : prev);
        }
      } catch { /* leave this day without travel details */ }
      finally { setGlancePending(p => Math.max(0, p - 1)); }
    });
  };
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestForm, setSuggestForm] = useState({ name: "", type: "Event", note: "" });
  const [suggestStatus, setSuggestStatus] = useState(null); // null | "sending" | "sent" | "error"
  const sendSuggestion = async () => {
    if (!suggestForm.name.trim()) { setSuggestStatus("error"); return; }
    setSuggestStatus("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_suggestions`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ name: suggestForm.name, type: suggestForm.type, note: suggestForm.note }),
      });
      setSuggestStatus(res.ok ? "sent" : "error");
      if (res.ok) setSuggestForm({ name: "", type: "Event", note: "" });
    } catch { setSuggestStatus("error"); }
  };
  const [guideError, setGuideError] = useState(null);
  const [savedGuides, setSavedGuides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gemlyx_saved_guides") || "[]"); } catch { return []; }
  });

  const [savedPlaces, setSavedPlaces] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gemlyx_saved_places") || "[]"); } catch { return []; }
  });
  const isPlaceSaved = (kind, id) => savedPlaces.some(p => p.kind === kind && p.id === id);
  const toggleSavePlace = (kind, item, townName) => {
    setSavedPlaces(prev => {
      const exists = prev.some(p => p.kind === kind && p.id === item.id);
      const updated = exists
        ? prev.filter(p => !(p.kind === kind && p.id === item.id))
        : [{ kind, id: item.id, name: item.name, emoji: item.emoji, town: townName || item.town || item.city || item.location || "" }, ...prev].slice(0, 40);
      try { localStorage.setItem("gemlyx_saved_places", JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  };

  // Resolve a guide stop name to real coordinates (content data first, then town list), or null.
  const [geocodedCoords, setGeocodedCoords] = useState({}); // name -> {lat,lon}, filled in once per guide
  const [exactDurations, setExactDurations] = useState({}); // "origin|dest|mode" -> {durationText, durationMinutes}
  // Real Google-matched travel time (not a straight-line estimate) for every leg in a
  // guide, fetched once before it's shown. Needs /api/directions.js + GOOGLE_MAPS_KEY —
  // if either is missing, this silently no-ops and legs fall back to the km estimate,
  // same graceful-degradation pattern as the Gemini pre-check.
  const fetchExactDurations = async (days, mode) => {
    const pairs = [];
    days.forEach((day, di) => {
      if (day.stops.length === 1 && di > 0) {
        const prevLast = days[di - 1].stops[days[di - 1].stops.length - 1];
        pairs.push([prevLast.name, day.stops[0].name]);
      }
      for (let i = 0; i < day.stops.length - 1; i++) pairs.push([day.stops[i].name, day.stops[i + 1].name]);
    });
    const found = {};
    const apiMode = mode === "public transport" ? "transit" : mode || "transit"; // safer default than assuming bike when unclear
    for (const [origin, dest] of pairs) {
      const key = `${origin}|${dest}|${mode}`;
      try {
        const res = await fetch(`/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&mode=${apiMode}`);
        const data = await res.json();
        if (!data.error) found[key] = data;
        else console.warn(`Directions API: no result for ${origin} → ${dest} (${apiMode}):`, data.error, "— check GOOGLE_MAPS_KEY is set on Vercel and the Directions API is enabled on that key's project.");
      } catch (err) { console.warn(`Directions API request failed for ${origin} → ${dest}:`, err); }
    }
    if (Object.keys(found).length > 0) setExactDurations(prev => ({ ...prev, ...found }));
  };
  const resolveStopCoords = (name) => {
    const real = lookupRealPlace(name);
    if (real?.lat && real?.lon) return { lat: real.lat, lon: real.lon };
    const key = Object.keys(TOWN_COORDS).find(t => name.includes(t));
    if (key) return { lat: TOWN_COORDS[key][0], lon: TOWN_COORDS[key][1] };
    return geocodedCoords[name] || null;
  };
  // Free geocoding for specific landmarks (museums, attractions) that only towns have
  // coordinates for otherwise — no API key, no billing, unlike Google's Geocoding API.
  // Runs once per guide, before it's shown, so every downstream render (maps, legs)
  // can stay simple/synchronous.
  const geocodeStopsForGuide = async (days) => {
    const names = [...new Set(days.flatMap(d => d.stops.map(s => s.name)))].filter(n => !resolveStopCoords(n));
    const found = {};
    for (const name of names) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ", Denmark")}&format=json&limit=1`);
        const data = await res.json();
        if (data?.[0]) found[name] = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      } catch { /* leave this one unresolved — map/leg for it just won't show, no crash */ }
      await new Promise(r => setTimeout(r, 250)); // be a polite, low-volume client to a free public service
    }
    if (Object.keys(found).length > 0) setGeocodedCoords(prev => ({ ...prev, ...found }));
  };
  const kmBetween = (a, b) => {
    const dLat = (a.lat - b.lat) * 111.32;
    const dLon = (a.lon - b.lon) * 62.06;
    return Math.sqrt(dLat * dLat + dLon * dLon);
  };

  // Distance (km) from user to the town mentioned in a free-text location string, or null.
  const townKmFromUser = (locStr) => {
    if (!isInDenmark(userCoords) || !locStr) return null;
    const key = Object.keys(TOWN_COORDS).find(t => locStr.includes(t));
    if (!key) return null;
    const [tLat, tLon] = TOWN_COORDS[key];
    const dLat = (tLat - userCoords.lat) * 111.32;
    const dLon = (tLon - userCoords.lon) * 62.06;
    return Math.sqrt(dLat * dLat + dLon * dLon);
  };

  // Looks up a stop name against everything real Gemlyx already knows, so the guide
  // shows real price/hours/type instead of just repeating the AI's own prose.
  const lookupRealPlace = (name) => {
    if (!name) return null;
    const norm = name.toLowerCase();
    const pools = [
      ...freeEntrance.map(p => ({ ...p, _src: "free" })),
      ...craftItemsFallback.map(p => ({ ...p, _src: "craft" })),
      ...foodSpots.map(p => ({ ...p, _src: "food" })),
      ...nightlifeSpots.map(p => ({ ...p, _src: "nightlife" })),
      ...[...events, ...majorEvents, ...vikingEvents].map(p => ({ ...p, _src: "event" })),
      ...towns.map(p => ({ ...p, _src: "town" })),
    ];
    return pools.find(p => p.name && (norm.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(norm))) || null;
  };

  const generateGuide = async () => {
    const convoText = aiMessages.slice(1).map(m => `${m.role}: ${m.text}`).join("\n");
    if (!convoText.trim()) return;
    setGuideModal("loading");
    setGuideError(null);
    try {
      // One Gemini + Google Search cross-check per guide (not per chat message — the
      // conversation itself stays fast; this only runs at the moment a real artifact
      // gets built). Pulls out the place names mentioned so far and asks Gemini to
      // ground them — same "grounding before writing" pattern as Studio, scoped to
      // the single moment concrete facts actually get committed.
      let guideGrounding = "";
      if (import.meta.env.VITE_GEMINI_KEY) {
        const preCheck = await askGemini(`This is a Denmark trip-planning conversation. Using real, current web search, verify the real place names mentioned actually exist, and find any current opening hours, prices, or dates relevant to the plan. Be concise — short facts only.\n\n${convoText.slice(0, 3000)}`);
        if (!preCheck.error && preCheck.text) guideGrounding = preCheck.text;
      }
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `Turn the trip plan discussed in this conversation into strict JSON, no markdown, no commentary — respond with ONLY the JSON object in this exact shape:
{"title": "Short evocative title for this trip", "days": [{"day": 1, "title": "Short day title", "stops": [{"name": "Real place name exactly as mentioned", "note": "2-3 sentences built from CONCRETE, SPECIFIC facts — real details, names, numbers, history, what to actually do there. Generic filler like \'charming\', \'colorful houses\', \'cozy streets\', \'steeped in history\', \'quaint\' is BANNED unless immediately followed by the specific thing that makes it true. Write like a well-travelled friend giving real advice, not a brochure."}]}]}
CRITICAL: every stop's "name" must be a real place findable on Google Maps — an official attraction, venue, street or town name (e.g. "Ebeltoft Old Town", "Den Gamle By", "Faaborg Havn"). NEVER invent a poetic label like "Crooked House Village" or "Ebeltoft Bars" — if the plan described an area loosely, use the town or street name instead.
CRITICAL: NEVER state a specific ticket price in a stop's note (e.g. "tickets cost 230 DKK") — most attractions have tiered pricing (adult/child/student/senior) and a single bare number is misleading without that context. If cost is worth mentioning, say "check current ticket prices online" instead, or describe the price tier qualitatively ("budget-friendly", "a bit of a splurge") without a specific number.
CRITICAL: capture EVERY distinct place the plan mentions for each day as its OWN stop — sights, museums, food spots, bars and evening/nightlife included. A full day is usually 2-5 stops (morning sight, afternoon sight, food, evening). Never collapse a day to a single stop if the plan mentioned more, and never bury an evening venue inside another stop's note — give it its own stop in order.
If the conversation only covers a single day or a few stops with no explicit day breakdown, use one day. Use only real place names actually mentioned in the conversation — never invent new ones, and never invent facts, prices or opening hours in the notes; describe atmosphere and experience instead.${guideGrounding ? `\nGOOGLE AI CROSS-CHECK (weigh this alongside the conversation — if it reveals a mentioned place doesn't seem to exist, prefer the nearest real equivalent rather than inventing): ${guideGrounding}` : ""}` },
            { role: "user", content: convoText }
          ],
          max_tokens: 1800,
        }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      if (!parsed.days || parsed.days.length === 0) throw new Error("empty");
      await geocodeStopsForGuide(parsed.days);
      const gid = Date.now();
      const lc = convoText.toLowerCase();
      const travelMode = /public transport|by train|by bus|trains? and buses?|offentlig transport|\btog\b/.test(lc) ? "public transport"
        : /\b(car|driving|drive|bil)\b/.test(lc) ? "car"
        : /\b(bike|cykel|cycling|cycle|bicycl)\b/.test(lc) ? "bike" : null;
      fetchExactDurations(parsed.days, travelMode); // fire-and-forget — legs show estimates until this resolves, then upgrade
      setGuideModal({ _gid: gid, _mode: travelMode, _grounded: !!guideGrounding, title: parsed.title || "Your Custom Route", days: parsed.days });
      enrichGuideDays(parsed.days, gid, travelMode);
      fetchGuideWeather(parsed.days, gid);
    } catch {
      setGuideModal(null);
      setGuideError("Couldn't build a guide from that yet — try asking for a fuller plan first.");
      setTimeout(() => setGuideError(null), 3500);
    }
  };

  const saveCurrentGuide = () => {
    if (!guideModal || guideModal === "loading") return;
    const weatherMissing = guideModal.days.some(d => !d.weather);
    if (weatherMissing && weatherPending > 0) {
      setToast("⏳ Still checking weather for this trip — try Save again in a few seconds");
      setTimeout(() => setToast(null), 2600);
      return;
    }
    const newGuide = { id: Date.now(), title: guideModal.title, days: guideModal.days, savedAt: new Date().toISOString() };
    const updated = [newGuide, ...savedGuides].slice(0, 20);
    setSavedGuides(updated);
    try { localStorage.setItem("gemlyx_saved_guides", JSON.stringify(updated)); } catch { /* ignore */ }
    setToast("📖 Guide saved — weather included for each day");
    setTimeout(() => setToast(null), 2200);
  };

  const deleteSavedGuide = (id) => {
    const updated = savedGuides.filter(g => g.id !== id);
    setSavedGuides(updated);
    try { localStorage.setItem("gemlyx_saved_guides", JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const nearbyTownsRanked = (isInDenmark(userCoords)) ? Object.entries(TOWN_COORDS).map(([name, [tLat, tLon]]) => {
    const dLat = (tLat - userCoords.lat) * 111.32;
    const dLon = (tLon - userCoords.lon) * 62.06;
    return { name, km: Math.round(Math.sqrt(dLat * dLat + dLon * dLon)) };
  }).sort((a, b) => a.km - b.km).slice(0, 12) : [];

  const toggleRouteStop = (townName) => {
    setRouteSummary(null);
    setRouteStops(prev => prev.includes(townName) ? prev.filter(t => t !== townName) : [...prev, townName]);
  };

  const generateRouteSummary = async () => {
    if (routeStops.length < 2) return;
    setRouteSummaryLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You write short, warm, specific 2-sentence route descriptions for a Denmark travel app called Gemlyx, in plain conversational text with no markdown formatting, no headers, no asterisks." },
            { role: "user", content: `Write a short, appealing 2-sentence description for a self-planned road trip starting near the traveler's current location, stopping at these towns in this order: ${routeStops.join(" → ")}. Mention the character of the route, not just the list.` }
          ],
          max_tokens: 150,
        }),
      });
      const data = await res.json();
      setRouteSummary(stripMarkdown(data.choices?.[0]?.message?.content) || "A custom route through " + routeStops.join(", ") + ".");
    } catch {
      setRouteSummary("A custom route through " + routeStops.join(", ") + ".");
    }
    setRouteSummaryLoading(false);
  };

  const saveCurrentRoute = () => {
    const newRoute = { id: Date.now(), stops: routeStops, summary: routeSummary, savedAt: new Date().toISOString() };
    const updated = [newRoute, ...savedRoutes].slice(0, 20);
    setSavedRoutes(updated);
    try { localStorage.setItem("gemlyx_saved_routes", JSON.stringify(updated)); } catch { /* storage unavailable, route still shown this session */ }
    setToast("💾 Route saved");
    setTimeout(() => setToast(null), 2200);
  };

  const deleteSavedRoute = (id) => {
    const updated = savedRoutes.filter(r => r.id !== id);
    setSavedRoutes(updated);
    try { localStorage.setItem("gemlyx_saved_routes", JSON.stringify(updated)); } catch { /* ignore */ }
  };


  const [craftStatus, setCraftStatus] = useState(null);
  const [emailSignup, setEmailSignup] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your Local Assist ◆ Tell me where you're heading — or what you're after — and I'll find you something that exists nowhere else." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [intakeTime, setIntakeTime] = useState(null);
  const [intakeBudget, setIntakeBudget] = useState(null);
  const [intakeInterest, setIntakeInterest] = useState(null);
  const [intakeTransport, setIntakeTransport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [tabArrow, setTabArrow] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/craft_items?select=*&order=id`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCraftItems(data.map(d => ({ ...d, what: Array.isArray(d.what) ? d.what : (d.what || "").split(",").map(s => s.trim()).filter(Boolean) })));
        }
      } catch { /* keep fallback data */ }
      setCraftLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (aiMessages.length > 1) document.querySelectorAll(".ai-msgs").forEach(el => { el.scrollTop = el.scrollHeight; });
  }, [aiMessages]);

  const TAB_ORDER = ["home", "essentials", "craft", "attractions", "events", "food", "nightlife", "roadtrips", "visits", "ai"];
  // Single source of truth for nav labels — same order as TAB_ORDER, so swipe and nav can never drift apart again.
  const NAV_ITEMS = [
    { id: "home", label: "🧭 Explore" },
    { id: "essentials", label: "✓ Essentials" },
    // { id: "craft", label: "◈ Booking" }, // shelved per Oliver — "crafting part gotta go for now, completely"
    { id: "attractions", label: "🆓 Free Entrance" },
    { id: "events", label: "◈ Events" },
    { id: "food", label: "🍽 Food" },
    { id: "nightlife", label: "🍺 Nightlife" },
    { id: "roadtrips", label: "🚗 Road Trips" },
    { id: "visits", label: "◉ Towns" },
    { id: "ai", label: "✦ Ask Gemlyx" },
  ];
  const [slideDir, setSlideDir] = useState(null);
  const pageAnim = "";
  const goTab = (id) => {
    const a = TAB_ORDER.indexOf(active), b = TAB_ORDER.indexOf(id);
    setSlideDir(b > a ? "next" : b < a ? "prev" : null);
    setActive(id);
  };
  const stripRef = useRef(null);
  const dragRef = useRef({ x: 0, y: 0, dx: 0, dragging: false, skip: false });
  const tabIdx = TAB_ORDER.indexOf(active);

  const setStrip = (dx, animate) => {
    const el = stripRef.current; if (!el) return;
    el.style.transition = animate ? "transform 0.32s cubic-bezier(0.2, 0.8, 0.3, 1)" : "none";
    el.style.transform = `translateX(calc(${-tabIdx * (100/TAB_ORDER.length)}% + ${dx}px))`;
  };

  useEffect(() => { setStrip(0, true); }, [active]);

  const onSwipeStart = (e) => {
    const t = e.touches[0];
    let el = e.target, skip = false;
    while (el && el !== e.currentTarget) {
      const st = window.getComputedStyle(el);
      if ((st.overflowX === "auto" || st.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 5) { skip = true; break; }
      el = el.parentElement;
    }
    dragRef.current = { x: t.clientX, y: t.clientY, dx: 0, dragging: false, skip };
  };
  const onSwipeMove = (e) => {
    const d = dragRef.current;
    if (d.skip) return;
    const t = e.touches[0];
    const dx = t.clientX - d.x, dy = t.clientY - d.y;
    if (!d.dragging) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) d.dragging = true;
      else return;
    }
    let out = dx;
    if ((tabIdx === 0 && dx > 0) || (tabIdx === TAB_ORDER.length - 1 && dx < 0)) out = dx * 0.3;
    d.dx = out;
    setStrip(out, false);
  };
  const onSwipeEnd = () => {
    const d = dragRef.current;
    if (d.skip || !d.dragging) return;
    const w = window.innerWidth;
    if (d.dx < -Math.min(90, w * 0.22) && tabIdx < TAB_ORDER.length - 1) goTab(TAB_ORDER[tabIdx + 1]);
    else if (d.dx > Math.min(90, w * 0.22) && tabIdx > 0) goTab(TAB_ORDER[tabIdx - 1]);
    else setStrip(0, true);
    d.dragging = false; d.dx = 0;
  };

  const toggleSave = (id) => setSavedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const savedProducts = allProducts.filter(p => savedItems.includes(p.id));

  const parsePrice = (str) => {
    if (!str) return 0;
    const m = str.replace(/,/g, "").match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  };

  const displayProducts = (selectedCity
    ? selectedCity.products.map(p => ({ ...p, city: selectedCity.name, color: selectedCity.color }))
    : allProducts
  ).filter(p => {
    const catOk = filterCategories.length === 0 || filterCategories.includes(p.category);
    const typeOk = filterTypes.length === 0 || filterTypes.includes(p.locationType);
    const priceOk = parsePrice(p.price) <= priceMax;
    return catOk && typeOk && priceOk;
  });

  const searchResults = search.length > 1 ? allProducts.filter(p =>
    [p.name, p.city, p.shop, p.category].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  ) : [];

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    const d = R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return d < 1 ? Math.round(d*1000)+"m" : d.toFixed(1)+"km";
  };
  const getDistanceRaw = (lat1, lon1, lat2, lon2) => {
    const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const confirmStillHere = (id) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(() => {
      setStillHereMap(prev => ({ ...prev, [id]: { count: (prev[id]?.count||0)+(prev[id]?.userConfirmed?0:1), userConfirmed: true, date: new Date().toLocaleDateString("en-GB", { month:"short", year:"numeric" }) } }));
    }, () => alert("Please enable location."));
  };

  const sendCraftRequest = async () => {
    if (!craftForm.email.includes("@") || !craftForm.interest.trim()) { setCraftStatus("invalid"); return; }
    setCraftStatus("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/craft_requests`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ craft: craftModal.name, location: craftModal.location, name: craftForm.name, email: craftForm.email, interest: craftForm.interest, visit: craftForm.visit })
      });
      if (res.ok) { setCraftStatus("sent"); }
      else { setCraftStatus("fallback"); }
    } catch { setCraftStatus("fallback"); }
  };

  const craftMailto = () => craftModal ? `mailto:hello@gemlyx.com?subject=${encodeURIComponent("Craft request — " + craftModal.name)}&body=${encodeURIComponent("Name: " + craftForm.name + "\nEmail: " + craftForm.email + "\nInterested in: " + craftForm.interest + "\nVisiting: " + craftForm.visit)}` : "#";

  const sendAI = async (forcedMsg) => {
    const forced = typeof forcedMsg === "string" ? forcedMsg.trim() : null;
    const msg = forced || aiInput.trim();
    if (!msg || aiLoading) return;
    if (!forced) setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", text: msg }]);
    setAiLoading(true);
    try {
      const productList = allProducts.map(p => `${p.name} in ${p.city} (${p.price}) - ${p.exclusive}`).join(", ");
      const townList = towns.map(t => `${t.name} (${t.region}, ${t.travelTime} from CPH) — ${t.tag}`).join("; ");
      const tripList = roadTrips.map(r => `${r.name} (${r.duration}, ${r.distance}) — stops: ${r.stops.map(s => s.name).join(", ")}`).join("; ");
      const campList = campingSpots.map(s => `${s.name} (${s.region}, ${s.type})`).join("; ");
      const foodList = foodSpots.map(f => `${f.name} (${f.type}, ${f.category}, ${f.location}, ${f.price})`).join("; ");
      const nightlifeList = nightlifeSpots.map(f => `${f.name} (${f.type}, crowd: ${f.crowd}, ${f.location})`).join("; ");
      const attractionsList = freeEntrance.map(a => `${a.name} in ${a.city} (${a.type}, free entry)`).join("; ");
      const handmadeList = handmadeCraftShops.map(s => `${s.name} in ${s.location} (${s.yearRound ? "open year-round" : "seasonal"})`).join("; ");
      const upcomingLocal = events.filter(e => isUpcoming(e.date)).slice(0, 8).map(e => `${e.name} in ${e.town} (${getEventDate(e.date, e.dateEnd)})`).join("; ");
      const upcomingMajor = majorEvents.filter(e => isUpcoming(e.date)).slice(0, 8).map(e => `${e.name} in ${e.town} (${getEventDate(e.date, e.dateEnd)})`).join("; ");
      const upcomingViking = vikingEvents.filter(e => isUpcoming(e.date)).slice(0, 8).map(e => `${e.name} in ${e.town} (${getEventDate(e.date, e.dateEnd)})`).join("; ");
      const craftList = craftItems.map(c => `${c.name} in ${c.location} (${c.price}${c.rating ? ", ★" + c.rating : ""})`).join("; ");
      const now = new Date();
      const monthName = now.toLocaleString("en", { month: "long" });
      const season = getSeason();

      const sysPrompt = `You are Gemlyx — Denmark's insider guide. You speak as Gemlyx itself: warm, confident, like a well-travelled Danish friend, never like a generic AI assistant. Never call yourself an AI or a language model. Today is ${monthName} (${season} season in Denmark). Be concise and specific — recommend real things from the lists below, never invent places. When planning multi-day trips, consider the season: winter (Dec-Feb) favors museums/indoor craft and avoids camping or long bike routes; summer (Jun-Aug) is festival season and best for road trips/camping.
Transport matters: if the person hasn't said how they're getting around, ask — car, bike, or public transport — before proposing a route, since it changes everything. Tailor plans to the answer: public transport → chain towns along direct train and bus lines and suggest checking Rejseplanen for times, and where relevant recommend real Danish operators by name — Flixbus and Kombardo Expresbus for longer intercity routes (often cheaper than DSB trains), DSB's Orange billetter (discount advance-purchase train tickets) for cross-country train trips, and a specific ferry route if the plan crosses open water where no bridge exists (e.g. to Bornholm, or between islands like Ærø or Samsø) — name the actual ferry operator/route if you know it, otherwise say "check ferry crossings for this route"; bike → keep daily distances realistic (under ~50 km) and favor flat or coastal stretches; car → flexible road trips across regions are fine, but if the route crosses open water with no bridge, mention the ferry crossing needed for the car itself.

ASK BEFORE YOU PLAN — this matters more than anything else here. If someone asks for a plan, route, or itinerary and you don't already know their budget, how much time they actually have, and roughly what they enjoy (history, nature, food, nightlife, a mix), do NOT generate a full itinerary yet. Ask ONE short, warm question that covers those three things together — for example: "Happy to help! Roughly how many days do you have, what's your budget looking like, and what do you enjoy most — history, nature, food, nightlife, or a bit of everything?" Keep it to one message, not three separate questions. Only build the actual plan once you know these, either from their answer or because they already told you in their first message.

SCOPE THE ANSWER TO WHAT THEY ASKED — once you do have enough to plan, match the plan's size to what they actually requested. Someone with a few hours doesn't need a 3-day, 3-city itinerary. Someone who said "budget-friendly" shouldn't get a plan stacked with 230 DKK museum tickets without at least flagging the cost. Don't pad a short trip into a long one just to showcase more of Gemlyx's content.

FORMATTING — this is critical: write in plain conversational text only. This is a mobile chat bubble, not a document. Never use markdown — no # headings, no ** for bold, no bullet-point dashes, no numbered lists with periods. If you're listing a few things, write them into a flowing sentence ("Try Harry's Place for a hot dog, then walk to Torvehallerne for something more substantial") rather than a list. Use line breaks between short paragraphs instead of headers to organize longer answers.

MERCHANDISE: ${productList}
BOOKING/CRAFT EXPERIENCES: ${craftList}
TOWNS: ${townList}
ROAD TRIPS: ${tripList}
CAMPING & SHELTERS: ${campList}
FOOD SPOTS (Local & Major): ${foodList}
NIGHTLIFE (note whether local/Danish or international crowd): ${nightlifeList}
FREE ENTRANCE ATTRACTIONS (genuinely free, no ticket needed): ${attractionsList}
HANDMADE CANDY & CRAFT SHOPS (walk-in, watch it made): ${handmadeList}
UPCOMING LOCAL EVENTS: ${upcomingLocal}
UPCOMING MAJOR EVENTS: ${upcomingMajor}
UPCOMING VIKING EVENTS (markets, festivals, battle reenactments): ${upcomingViking}

If asked for a plan or itinerary, structure it day by day using only the above, and factor in the current season. Gemlyx's core mission: most tourists only see Copenhagen for 3-4 days and never explore the rest of Denmark, especially Jutland and North Zealand. When someone is staying more than 2 days, actively suggest at least one destination outside Copenhagen — don't just default to city recommendations. If asked about transport, always mention that the physical Rejsekort card was discontinued (28 May 2026) and the current fine for an invalid ticket is 750 DKK — the most common tourist mistakes are forgetting to check out, and assuming an installed app means a purchased ticket.

You also have a web_search tool. Use it whenever someone asks about something that changes over time and isn't in the lists above — current opening hours, whether a specific event is still on, ticket availability, or anything at a museum/castle/attraction not already listed here. Don't use it for things already covered in your lists above.`;

      const tools = [{
        type: "function",
        function: {
          name: "web_search",
          description: "Search the live web for current information — opening hours, event schedules, ticket availability — for anything not already in your provided lists.",
          parameters: {
            type: "object",
            properties: { query: { type: "string", description: "The search query" } },
            required: ["query"],
          },
        },
      }];

      const baseMessages = [
        { role: "system", content: sysPrompt },
        ...aiMessages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
        { role: "user", content: msg },
      ];

      const callOpenAI = (messages) => fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, tools, max_tokens: 600 }),
      }).then(r => r.json());

      let data = await callOpenAI(baseMessages);
      let choice = data.choices?.[0]?.message;
      const toolCalls = choice?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        // Model wants to search — run it, then ask again with results
        const call = toolCalls[0];
        const { query } = JSON.parse(call.function.arguments || "{}");
        let searchSummary = "No results found.";
        try {
          const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const searchData = await searchRes.json();
          searchSummary = searchData.answer || (searchData.results || []).map(r => `${r.title}: ${r.snippet}`).join(" | ") || searchSummary;
        } catch { /* keep fallback summary, don't break the chat */ }

        const followUpMessages = [
          ...baseMessages,
          choice,
          { role: "tool", tool_call_id: call.id, content: searchSummary },
        ];
        data = await callOpenAI(followUpMessages);
        choice = data.choices?.[0]?.message;
      }

      setAiMessages(prev => [...prev, { role: "assistant", text: choice?.content || data.error?.message || "Something went wrong!" }]);
    } catch { setAiMessages(prev => [...prev, { role: "assistant", text: "Connection error — try again!" }]); }
    setAiLoading(false);
  };

  // ── PILL BUTTON ───────────────────────────────────────────────
  const Pill = ({ label, active, onClick, color }) => (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      background: active ? `${color || C.accent}1F` : C.surface,
      color: active ? C.text : C.muted,
      border: `1px solid ${active ? (color || C.accent) : C.border}`,
      borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
      cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
      whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.18s ease",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? (color || C.accent) : "#2A3A55", transition: "background 0.18s", flexShrink: 0 }} />
      {label}
    </button>
  );

  // ── PRODUCT CARD ─────────────────────────────────────────────
  const ProductCard = ({ product }) => (
    <div onClick={() => setSelectedProduct({ ...product, color: product.color || C.accent })}
      style={{ background: C.surface, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, cursor: "pointer", position: "relative" }}>
      <div style={{ height: 160, background: `${product.color}22`, position: "relative", overflow: "hidden" }}>
        {product.photo ? <img src={product.photo} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 48 }}>{product.emoji}</div>}
        <button onClick={e => { e.stopPropagation(); toggleSave(product.id); }}
          style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: savedItems.includes(product.id) ? C.gold : "#fff", cursor: "pointer" }}>
          {savedItems.includes(product.id) ? "♥" : "♡"}
        </button>
        {product.trending && <div style={{ position: "absolute", top: 8, left: 8, background: C.accent, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>HOT ↗</div>}
        {product.isNew && <div style={{ position: "absolute", top: product.trending ? 30 : 8, left: 8, background: C.gold, color: "#000", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>NEW</div>}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2, fontFamily: "'Cormorant Garamond', serif" }}>{product.name}</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{product.shop}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ background: `${product.color}22`, color: product.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>◆ {product.exclusive}</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{product.price}</span>
        </div>
      </div>
    </div>
  );

  // ── EVENT CARD ───────────────────────────────────────────────
  const EventCard = ({ event }) => (
    <div onClick={() => setEventDetail(event)} style={{ borderTop: `1px solid ${C.border}`, padding: "20px 0 24px", cursor: "pointer" }}>
      {event.photo && (
        <div style={{ height: 130, borderRadius: 12, overflow: "hidden", marginBottom: 14, position: "relative", background: `linear-gradient(135deg, ${event.color}33 0%, #0A0F1E 100%)` }}>
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, opacity: 0.25 }}>{event.emoji}</span>
          <img src={event.photo} alt={event.name} onError={e => { e.target.style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
        </div>
      )}
      <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: event.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{event.type} · {event.town}</div>
          <div style={{ fontSize: 23, fontWeight: 600, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.15, marginBottom: 6 }}>{event.emoji} {event.name}</div>
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{getEventDate(event.date, event.dateEnd)}</div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <div style={{ width: 88, height: 88, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <DKLocator town={event.town} color={event.color} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>
            {!event.date ? "" : daysUntil(event.date) <= 0 ? "Happening now" : daysUntil(event.date) === 1 ? "Tomorrow" : `${daysUntil(event.date)} days away`}
          </div>
        </div>
      </div>
      {event.tier && (
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 100,
            color: event.tier === "Can't miss out" ? "#0A0F1E" : event.tier === "Worth it for longer stays" ? "#FFB347" : "#4CAF50",
            background: event.tier === "Can't miss out" ? C.gold : event.tier === "Worth it for longer stays" ? "#FFB34722" : "#4CAF5022",
          }}>
            {event.tier === "Can't miss out" ? "⭐ Can't miss out" : event.tier === "Worth it for longer stays" ? "◷ Worth it for longer stays" : "👍 Recommended"}
          </span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        {event.rating && <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>★ {event.rating}</span>}
        <span style={{ fontSize: 12, color: C.muted }}>{travelLabel(userCoords, event.town, event.travelTime)}</span>
        {event.ticketStatus === "sold_out" && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff4444", background: "#ff444422", padding: "3px 9px", borderRadius: 100 }}>🔴 Sold out</span>}
        {event.ticketStatus === "selling_fast" && <span style={{ fontSize: 10, fontWeight: 700, color: "#FFB347", background: "#FFB34722", padding: "3px 9px", borderRadius: 100 }}>🟡 Selling fast</span>}
        {event.ticketStatus === "available" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "3px 9px", borderRadius: 100 }}>🟢 Available</span>}
        {event.ticketStatus === "free" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "3px 9px", borderRadius: 100 }}>✓ Free entry</span>}
      </div>
      {(event.nearestStation || event.ticketInfo || event.accommodationTip || event.budgetLevel) && (
        <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 5 }}>
          {event.nearestStation && <div style={{ fontSize: 11, color: C.light }}>🚆 <span style={{ color: C.muted }}>Station:</span> {event.nearestStation}</div>}
          {event.ticketInfo && <div style={{ fontSize: 11, color: C.light }}>🎟️ <span style={{ color: C.muted }}>Tickets:</span> {event.ticketInfo}</div>}
          {event.budgetLevel && <div style={{ fontSize: 11, color: C.light }}>💰 <span style={{ color: C.muted }}>Budget:</span> {event.budgetLevel}</div>}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.light, fontSize: 13, fontWeight: 700 }}>
        Read more <span style={{ fontSize: 15 }}>›</span>
      </div>
    </div>
  );

  const filteredEvents = (eventTab === "local" ? events : eventTab === "viking" ? vikingEvents : majorEvents)
    .filter(e => isUpcoming(e.date))
    .filter(e => {
      const em = new Date(e.date).toLocaleString("en", { month: "short" });
      return (!eventMonth || em === eventMonth) && (!eventType || e.type === eventType || (eventType === "North Zealand" && ["Gilleleje","Tisvildeleje","Hundested","Frederiksværk","Liseleje"].includes(e.town)));
    })
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  const aiHelperBlock = () => (
    <div id="ai-helper-anchor" style={{ marginTop: 28 }}>
              {/* AI at the end of the journey */}
              <div style={{ padding: "36px 20px 28px", borderTop: `1px solid ${C.border}`, background: C.surface }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>✦ Gemlyx</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>Overwhelmed? Let me help you.</div>
                </div>

                {aiMessages.length > 1 && (
                  <div className="ai-msgs" style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12, WebkitOverflowScrolling: "touch" }}>
                    {aiMessages.slice(1).map((m, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                        {m.role === "assistant" && (
                          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3, marginLeft: 6 }}>✦ Gemlyx</div>
                        )}
                        <div style={{ maxWidth: "82%", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", background: m.role === "user" ? C.accent : C.bg, color: "#fff", border: m.role === "user" ? "none" : `1px solid ${C.border}`, borderLeft: m.role === "user" ? "none" : `2px solid ${C.gold}` }}>
                          {m.role === "assistant" ? (isFullPlanText(m.text) ? "I've got you — your plan's ready. Tap \"Turn this into a guide\" below, or tell me if you'd like anything changed first." : stripMarkdown(m.text)) : m.text}
                        </div>
                      </div>
                    ))}
                    {aiLoading && <div style={{ background: C.bg, borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.gold}`, display: "inline-block", marginBottom: 10, fontStyle: "italic" }}>✦ Gemlyx is thinking…</div>}
                  </div>
                )}

                {aiMessages.length > 2 && !aiLoading && (
                  <>
                    <button onClick={generateGuide}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: `linear-gradient(135deg, ${C.gold}22, ${C.accent}22)`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, color: C.gold, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4 }}>
                      📖 Turn this into a guide
                    </button>
                    <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginBottom: 12 }}>Takes a few seconds — checking real places and routes</div>
                  </>
                )}
                {guideError && (
                  <div style={{ fontSize: 12, color: "#FFB347", textAlign: "center", marginBottom: 12 }}>{guideError}</div>
                )}

                {aiMessages.length <= 1 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    {["Plan my 3 days in Denmark", "Exclusive fashion in Copenhagen", "Best craft to commission"].map(s => (
                      <button key={s} onClick={() => setAiInput(s)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", fontSize: 11, color: C.light, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>{s}</button>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAI()}
                    placeholder="Ask Gemlyx anything about Denmark…"
                    style={{ flex: 1, border: `1.5px solid ${C.accent}`, borderRadius: 100, padding: "11px 16px", fontSize: 13, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                  <button onClick={sendAI} disabled={aiLoading} style={{ background: C.accent, border: "none", borderRadius: 100, width: 44, height: 44, cursor: "pointer", fontSize: 16, flexShrink: 0, color: "#fff" }}>↗</button>
                </div>
                <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 8 }}>
                  Answers are generated via OpenAI — please don't include personal details.{" "}
                  <span onClick={() => setShowPrivacy(true)} style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy</span>
                </div>
                {isStudio && !studioSession && (
                  <div style={{ background: C.surface, border: `1px dashed ${C.gold}66`, borderRadius: 14, padding: "20px", marginTop: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif", marginBottom: 4 }}>🔒 Content Studio — log in</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>Only you can publish. Log in with your Gemlyx admin account.</div>
                    <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && studioLogin()}
                      placeholder="Email" type="email"
                      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8, boxSizing: "border-box" }} />
                    <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && studioLogin()}
                      placeholder="Password" type="password"
                      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 10, boxSizing: "border-box" }} />
                    {loginError && <div style={{ fontSize: 12, color: "#FFB347", marginBottom: 10 }}>{loginError}</div>}
                    <button onClick={studioLogin} disabled={loginLoading}
                      style={{ width: "100%", background: C.gold, border: "none", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {loginLoading ? "Logging in…" : "Log in"}
                    </button>
                  </div>
                )}
                {isStudio && studioSession && (
                  <div style={{ background: C.surface, border: `1px dashed ${C.gold}66`, borderRadius: 14, padding: "16px", marginTop: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>🛠 Content Studio — founder tool</div>
                      <button onClick={studioLogout} style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>Log out</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontSize: 10.5, color: C.muted }}>Logged in as {studioSession.email}</div>
                      <button onClick={() => { setManageOpen(v => !v); if (!manageOpen) loadManageItems(); }}
                        style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {manageOpen ? "Hide" : "📋 Manage Published"}
                      </button>
                    </div>

                    {manageOpen && (
                      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", marginBottom: 16, maxHeight: 320, overflowY: "auto" }}>
                        {manageLoading ? (
                          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "12px 0" }}>Loading…</div>
                        ) : !manageItems || manageItems.length === 0 ? (
                          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "12px 0" }}>Nothing published yet.</div>
                        ) : (
                          manageItems.map(row => (
                            <div key={row.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {row.payload?.emoji || "•"} {row.payload?.name || "(unnamed)"}
                                </div>
                                <div style={{ fontSize: 10, color: C.muted }}>
                                  {row.type}{!row.published ? " · not published" : ""}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                <button onClick={() => editItem(row)}
                                  style={{ background: "none", border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "5px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  ✏️ Edit
                                </button>
                                <button onClick={() => deleteContentItem(row.id)} disabled={deletingId === row.id}
                                  style={{ background: "none", border: "1px solid #C8102E66", color: "#E57373", borderRadius: 100, padding: "5px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  {deletingId === row.id ? "…" : "🗑 Delete"}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>Drafts a complete entry — card + full detail page — via Tavily + OpenAI, following the Gemlyx editorial docs. Output is paste-ready code — verify every fact before committing. Not visible to users.</div>

                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>🔗 Scan a Source</div>
                      <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>Paste a listing page (e.g. a festival calendar) — pulls out names not already in Gemlyx. Doesn't write anything or publish — just gives you a queue to tap through below.</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={scanUrl} onChange={e => setScanUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && scanSource()}
                          placeholder="https://..."
                          style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, outline: "none", background: C.surface, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                        <button onClick={scanSource} disabled={scanLoading}
                          style={{ background: C.gold, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 11.5, fontWeight: 700, color: "#000", cursor: "pointer", flexShrink: 0 }}>
                          {scanLoading ? "Scanning…" : "Scan"}
                        </button>
                      </div>
                      {scanError && <div style={{ fontSize: 11.5, color: "#FFB347", marginTop: 8 }}>{scanError}</div>}
                      {scanResults && scanResults.length === 0 && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>Nothing new found — Gemlyx already has everything this page mentions.</div>}
                      {scanResults && scanResults.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 8 }}>{scanResults.length} new — tap one to start drafting it:</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {scanResults.map((it, i) => (
                              <button key={i} onClick={() => { setStudioType("festival"); setStudioTown(it.name); setScanHint({ town: it.town, dates: it.dates }); setStudioResult(null); setStudioError(null); setScanResults(prev => prev.filter((_, j) => j !== i)); }}
                                title={[it.town, it.dates].filter(Boolean).join(" · ")}
                                style={{ background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px", fontSize: 11.5, color: C.text, cursor: "pointer" }}>
                                {it.name}{it.town ? ` · ${it.town}` : ""}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {[["town", "🏘 Town"], ["festival", "🎪 Festival"], ["free", "🎟 Free Entrance"], ["food", "🍽 Food"], ["night", "🍺 Nightlife"]].map(([k, label]) => (
                        <button key={k} onClick={() => { setStudioType(k); setStudioResult(null); setStudioError(null); }}
                          style={{ background: studioType === k ? C.gold : "none", border: `1px solid ${studioType === k ? C.gold : C.border}`, borderRadius: 100, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: studioType === k ? "#000" : C.light, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <input value={studioTown} onChange={e => setStudioTown(e.target.value)} onKeyDown={e => e.key === "Enter" && generateArea()}
                        placeholder={{ town: "Town name, e.g. Ringkøbing", festival: "Festival name, e.g. Tønder Festival", free: "Place name + city, e.g. Rundetaarn Copenhagen", booking: "Workshop/craft name + city, e.g. Bornholm Ceramics Studio", food: "Place name + city, e.g. Gasoline Grill Copenhagen", night: "Bar name + city, e.g. Mikkeller Bar Viktoriagade" }[studioType]}
                        style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                      <button onClick={generateArea} disabled={studioLoading}
                        style={{ background: C.gold, border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>
                        {studioLoading ? "Researching…" : "Draft it"}
                      </button>
                    </div>
                    {studioError && <div style={{ fontSize: 12, color: "#FFB347", marginBottom: 8 }}>{studioError}</div>}
                    {studioResult && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 5 }}>✏️ EDIT BEFORE PUBLISHING — this is what actually gets saved</div>
                        <div style={{ fontSize: 9.5, color: googlePrecheckRan ? "#8AB4F8" : C.muted, marginBottom: 8 }}>
                          {googlePrecheckRan ? "✦ Written with a Google AI cross-check folded in before drafting" : "Google AI pre-check didn't run (no key set, or the call failed) — Tavily research only"}
                        </div>
                        <textarea value={studioDraftText} onChange={e => { setStudioDraftText(e.target.value); setDraftEditError(null); }}
                          rows={12}
                          style={{ width: "100%", background: C.bg, border: `1px solid ${draftEditError ? "#C8102E" : C.border}`, borderRadius: 10, padding: "12px", fontSize: 11, color: C.light, lineHeight: 1.6, fontFamily: "monospace", marginBottom: 8, boxSizing: "border-box", resize: "vertical" }} />
                        {draftEditError && <div style={{ fontSize: 11, color: "#FFB347", marginBottom: 10 }}>{draftEditError}</div>}

                        {Array.isArray(studioDraft?.uncertainties) && studioDraft.uncertainties.length > 0 && (
                          <div style={{ background: "#C8102E12", border: "1px solid #C8102E44", borderRadius: 10, padding: "11px 13px", marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#E57373", letterSpacing: 0.5, marginBottom: 6 }}>🚩 THIS DRAFT SPECIFICALLY FLAGGED (Tavily + Google AI cross-check):</div>
                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: C.light, lineHeight: 1.7 }}>
                              {studioDraft.uncertainties.map((u, i) => <li key={i}>{u}</li>)}
                            </ul>
                          </div>
                        )}

                        <div style={{ background: "#FFB34712", border: "1px solid #FFB34744", borderRadius: 10, padding: "11px 13px", marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#FFB347", letterSpacing: 0.5, marginBottom: 6 }}>⚠️ AI MIGHT BE WRONG ABOUT — CHECK BEFORE PUBLISHING:</div>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: C.light, lineHeight: 1.7 }}>
                            <li><b>Dates</b> — could be fabricated, from the wrong year, or already in the past. Verify against the event's own site.</li>
                            <li><b>Town/region attached to a station or address</b> — the station name itself can be right while the town is wrong (Denmark has similarly-named places in different regions).</li>
                            {studioType === "festival" && <li><b>Major vs. Local scale</b> — a judgment call the AI made; double-check it matches how well-known this actually is.</li>}
                            {studioType === "town" && <li><b>Map coordinates (lat/lon)</b> — check the pin would actually land on the right town.</li>}
                            {(studioType === "food" || studioType === "night" || studioType === "booking") && <li><b>Prices and opening details</b> — can go stale fast; verify the place still operates as described.</li>}
                            <li><b>Named sub-venues/stages</b> (e.g. a specific stage or room name) — the AI has invented a plausible-sounding fake name before. Verify any specific venue name actually exists.</li>
                            <li><b>Prices</b> — check the currency and the actual number. A converted price is a guess, not a fact.</li>
                            <li><b>Specific named details</b> in the description (a shop, dish, or landmark) — can be invented if the search results were thin. If in doubt, search the name yourself.</li>
                          </ul>
                          <button onClick={verifySource} disabled={verifyLoading}
                            style={{ width: "100%", background: "none", border: "1px solid #FFB34766", color: "#FFB347", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 10, marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {verifyLoading ? "Searching…" : "🔎 Verify dates, prices & venue names"}
                          </button>
                          <button onClick={googleAICheck} disabled={googleCheckLoading}
                            style={{ width: "100%", background: "none", border: "1px solid #4285F466", color: "#8AB4F8", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {googleCheckLoading ? "Asking Google AI…" : "🔷 Ask Google AI to fact-check this"}
                          </button>
                        </div>

                        {googleCheckError && <div style={{ fontSize: 11, color: "#FFB347", marginBottom: 12 }}>{googleCheckError}</div>}
                        {googleCheckResult && (
                          <div style={{ background: C.bg, border: "1px solid #4285F444", borderRadius: 10, padding: "12px", marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#8AB4F8", marginBottom: 8 }}>🔷 Google AI's independent check — read this, then edit the JSON above if it flags something:</div>
                            <div style={{ fontSize: 11.5, color: C.light, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: googleCheckResult.citations.length > 0 ? 10 : 0 }}>{googleCheckResult.text}</div>
                            {googleCheckResult.citations.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {googleCheckResult.citations.map((c, i) => (
                                  <a key={i} href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#8AB4F8", background: "#4285F418", border: "1px solid #4285F444", borderRadius: 100, padding: "3px 9px", textDecoration: "none" }}>{c.title.slice(0, 30)} ↗</a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {verifyError && <div style={{ fontSize: 11, color: "#FFB347", marginBottom: 12 }}>{verifyError}</div>}
                        {verifyResults && verifyResults.length > 0 && (
                          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Real search results — check these yourself, then edit the JSON above if anything's wrong:</div>
                            {verifyResults.map((r, i) => (
                              <div key={i} style={{ marginBottom: i < verifyResults.length - 1 ? 10 : 0, paddingBottom: i < verifyResults.length - 1 ? 10 : 0, borderBottom: i < verifyResults.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                {r.url ? (
                                  <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, textDecoration: "none" }}>{r.title} ↗</a>
                                ) : (
                                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.text }}>{r.title}</div>
                                )}
                                <div style={{ fontSize: 11, color: C.light, lineHeight: 1.5, marginTop: 3 }}>{r.snippet}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {editingId !== null && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.gold}12`, border: `1px solid ${C.gold}44`, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                            <span style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>✏️ Editing an existing published entry (id {editingId})</span>
                            <button onClick={() => { setEditingId(null); setStudioResult(null); setStudioDraft(null); setStudioDraftText(""); }}
                              style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>Cancel</button>
                          </div>
                        )}
                        {editingId === null && (
                          <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 5 }}>PHOTO FILENAME (drop the matching file in the public folder)</div>
                            <input value={studioPhotoName} onChange={e => setStudioPhotoName(e.target.value)}
                              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", background: C.bg, color: C.text, fontFamily: "monospace", marginBottom: 12, boxSizing: "border-box" }} />
                          </>
                        )}
                        {publishStatus === "sent" && editingId === null ? (
                          <div style={{ textAlign: "center", padding: "10px 0", fontSize: 12.5, color: "#4CAF50", fontWeight: 700 }}>✓ Published — live on Gemlyx now</div>
                        ) : (
                          <button onClick={publishDraft} disabled={publishStatus === "sending"}
                            style={{ width: "100%", background: C.gold, border: "none", borderRadius: 10, padding: "10px", fontSize: 12.5, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>
                            {publishStatus === "sending" ? (editingId !== null ? "Saving…" : "Publishing…") : editingId !== null ? "💾 Save changes" : "🚀 Publish to Gemlyx"}
                          </button>
                        )}
                        {publishStatus === "error" && (
                          <div style={{ fontSize: 11, color: "#FFB347", marginBottom: 8 }}>
                            {editingId !== null ? "Save failed — check the gemlyx_content table has an UPDATE policy for authenticated users." : "Publish failed — check the gemlyx_content table and RLS policy exist in Supabase."}
                            {publishErrorDetail && <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 10, color: C.muted, wordBreak: "break-word" }}>{publishErrorDetail}</div>}
                          </div>
                        )}
                        <div style={{ fontSize: 9.5, color: C.muted, textAlign: "center", marginBottom: 6 }}>Copy code below reflects the original draft, not your edits above</div>
                        <button onClick={() => { try { navigator.clipboard.writeText(studioResult); setToast("📋 Copied"); setTimeout(() => setToast(null), 1800); } catch { /* ignore */ } }}
                          style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px", fontSize: 11.5, fontWeight: 700, color: C.muted, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          📋 Or copy code (manual paste into App.jsx)
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

    </div>
  );


  const renderTab = (tab) => (
    <>
          {/* ── HOME LANDING ─────────────────────────────────── */}
          {tab === "home" && (
            <div className={pageAnim} style={{ margin: "-0px -0px" }}>
              {/* Hero */}
              <div className="hero-h" style={{ position: "relative", overflow: "hidden", background: `url('/picture3.png') center/cover no-repeat` }}>
                {!videoError && (
                  <video src="/video1.mp4" autoPlay muted loop playsInline
                    onCanPlay={() => setVideoReady(true)}
                    onError={() => setVideoError(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "25% center", opacity: videoReady ? 1 : 0, transition: "opacity 0.6s ease" }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,15,30,0.3) 0%, rgba(10,15,30,0.7) 100%)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
                  <div style={{ fontSize: 44, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#fff", marginBottom: 8, textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>◆ Gemlyx</div>
                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.9)", marginBottom: 6, textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}>Discover Denmark's hidden gems</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase" }}>It exists nowhere else</div>
                  <div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "bounce 2s infinite" }}>
                    <span>Scroll to explore</span>
                    <span style={{ fontSize: 18 }}>↓</span>
                  </div>
                </div>
              </div>

              {/* Navigation sections */}
              {[
                { id: "essentials", img: "/picture6.png", title: "Essentials", sub: "Everything you need to travel Denmark like a local", icon: "✓" },
                { id: "events", img: "/picture1.jpg", title: "Events", sub: "Festivals, markets & hidden happenings", icon: "◈" },
                { id: "food", img: "/picture5.jpg", title: "Food", sub: "From a 1965 hot dog cart to Copenhagen's biggest food market", icon: "🍽" },
                { id: "nightlife", img: "/picture3.png", title: "Nightlife", sub: "Where Danes actually drink, vs. where tourists do", icon: "🍺" },
                { id: "roadtrips", img: "/picture1.jpg", title: "Road Trips", sub: "The drive is half the adventure", icon: "🚗" },
                { id: "visits", img: "/picture4.png", title: "Towns", sub: "Denmark's most beautiful hidden towns", icon: "◉" },
                // { id: "craft", img: "/picture9.jpg", title: "Booking", sub: "Book workshops, tickets & commissions", icon: "◈" }, // shelved per Oliver
                { id: "attractions", img: "/picture7.jpg", title: "Free Entrance", sub: "Genuinely free places worth your time, city by city", icon: "🆓" },
                { id: "ai", img: "/picture9.jpg", title: "Ask Gemlyx", sub: "Your personal Denmark guide — plans trips, checks what's live", icon: "✦" },
              ].map((section, i) => (
                <div key={section.id} onClick={() => { goTab(section.id); window.scrollTo(0,0); }}
                  style={{ height: 280, position: "relative", overflow: "hidden", cursor: "pointer" }}>
                  <img src={section.img} alt={section.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }}
                    onMouseOver={e => e.target.style.transform = "scale(1.04)"}
                    onMouseOut={e => e.target.style.transform = "scale(1)"} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,15,30,0.85) 0%, rgba(10,15,30,0.2) 60%)" }} />
                  <div style={{ position: "absolute", bottom: 24, left: 24, right: 24 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#fff", marginBottom: 4 }}>{section.icon} {section.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{section.sub}</div>
                    <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(200,16,46,0.9)", color: "#fff", borderRadius: 100, padding: "8px 18px", fontSize: 12, fontWeight: 700 }}>
                      Explore →
                    </div>
                  </div>
                </div>
              ))}

              {/* Mission callout */}
              <div style={{ padding: "32px 24px", background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, marginBottom: 10 }}>Most tourists see Denmark for 3–4 days. All of it in Copenhagen.</div>
                <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 16px" }}>It's a recognised issue, even in Danish media — the rest of the country, especially Jutland and North Zealand, barely gets seen. Gemlyx exists to change that: real places, real routes, worth the extra hour outside the capital.</div>
                <button onClick={() => goTab("roadtrips")}
                  style={{ background: C.accent, border: "none", borderRadius: 100, padding: "10px 22px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  See a Road Trip →
                </button>
              </div>

              {savedGuides.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Your Saved Guides</div>
                  {savedGuides.map(g => (
                    <div key={g.id} onClick={() => setGuideModal({ title: g.title, days: g.days })}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>📖 {g.title}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{g.days.length} day{g.days.length > 1 ? "s" : ""}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteSavedGuide(g.id); }} style={{ background: "none", border: "none", color: C.muted, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}


              {/* Footer */}
              <div style={{ padding: "36px 24px 32px", textAlign: "center", borderTop: `1px solid ${C.border}` }}>
                {!emailSubmitted ? (
                  <div style={{ maxWidth: 420, margin: "0 auto 28px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Stay in the loop</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={emailSignup} onChange={e => setEmailSignup(e.target.value)} placeholder="Enter your email"
                        style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 13, color: C.text, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                      <button onClick={() => { if (emailSignup.includes("@")) setEmailSubmitted(true); }}
                        style={{ background: C.accent, border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap" }}>
                        Notify me
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Be first when we launch new cities. No spam.</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#4CAF50", fontWeight: 700, marginBottom: 28 }}>✓ You're on the list — we'll be in touch.</div>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text, marginBottom: 4 }}>◆ Gemlyx</div>
                <div style={{ fontSize: 11, color: C.muted }}>Every find personally verified · Denmark 🇩🇰</div>
                <div onClick={() => setShowPrivacy(true)} style={{ fontSize: 11, color: C.muted, marginTop: 8, textDecoration: "underline", cursor: "pointer" }}>Privacy & Data</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6, opacity: 0.6 }}>v2.87 — Jul 2026</div>
              </div>
            </div>
          )}

          {/* ── EXPLORE ──────────────────────────────────────── */}

          {/* ── CRAFT ────────────────────────────────────────── */}
          {tab === "craft" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 20, paddingTop: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>✓ Curated & Bookable</div>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Booking</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560, marginBottom: 12 }}>Worth pre-booking — museums, workshops and tickets that sell out or need advance planning. Prices are per person unless noted.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4CAF50", background: "#4CAF5015", border: "1px solid #4CAF5044", borderRadius: 10, padding: "9px 13px" }}>
                  <span style={{ fontSize: 13 }}>✦</span> Looking for something free instead? Check Free Entrance.
                </div>
              </div>

              {/* Filters */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 16px 14px", marginBottom: 18 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Type</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14, WebkitOverflowScrolling: "touch" }}>
                  {["All", "Major", "Local"].map(t => (
                    <Pill key={t} label={t} active={(t === "All" && !craftType) || craftType === t} onClick={() => setCraftType(t === "All" ? null : (craftType === t ? null : t))} />
                  ))}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Craft</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14, WebkitOverflowScrolling: "touch" }}>
                  {["All", "Blacksmithing", "Ceramics", "Jewellery", "Leather", "Textiles", "Woodwork", "Candy"].map(k => (
                    <Pill key={k} label={k} active={(k === "All" && !craftKind) || craftKind === k} onClick={() => setCraftKind(k === "All" ? null : (craftKind === k ? null : k))} />
                  ))}
                </div>
                <div style={{ height: 1, background: C.border, margin: "2px 0 14px" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#4CAF50", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Speed</div>
                    <Pill label="⚡ Bookable online" active={bookableOnly} onClick={() => setBookableOnly(v => !v)} color="#4CAF50" />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Sort</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Pill label="★ Recommended" active={craftSort === "recommended"} onClick={() => setCraftSort("recommended")} />
                      <Pill label="📍 Closest" active={craftSort === "near"} color={C.gold}
                        onClick={() => { setCraftSort("near"); if (!isInDenmark(userCoords)) requestLocation(); }} />
                    </div>
                  </div>
                </div>
                {craftSort === "near" && !isInDenmark(userCoords) && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>Works once you're in Denmark with location enabled — showing recommended order for now.</div>
                )}
              </div>

              {/* Grid */}
              {(() => {
                const kindKeys = { Blacksmithing: ["blacksmith"], Ceramics: ["ceramic", "pottery"], Jewellery: ["jewellery"], Leather: ["leather"], Textiles: ["textile", "dyeing", "felting"], Woodwork: ["wood"], Candy: ["candy"] };
                const filtered = craftItems.filter(cr => {
                  const typeOk = !craftType || cr.type === craftType;
                  const kindOk = !craftKind || cr.what.some(w => (kindKeys[craftKind] || []).some(k => w.toLowerCase().includes(k)));
                  const bookOk = !bookableOnly || cr.bookingType === "online";
                  return typeOk && kindOk && bookOk;
                }).sort((a, b) => (craftSort === "near" && isInDenmark(userCoords))
                  ? (townKmFromUser(a.location) ?? 9999) - (townKmFromUser(b.location) ?? 9999)
                  : (b.rating || 0) - (a.rating || 0));
                if (craftLoading) return <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>Loading craft spots…</div>;
                if (filtered.length === 0) return (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted, background: C.surface, borderRadius: 16, border: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>🔍</div>
                    <div style={{ fontSize: 14, color: C.light, fontWeight: 600, marginBottom: 4 }}>Nothing matches those filters</div>
                    <div style={{ fontSize: 12 }}>Try clearing one — Denmark still has plenty to offer.</div>
                  </div>
                );
                return (
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, paddingLeft: 2 }}>{filtered.length} experience{filtered.length !== 1 ? "s" : ""}{craftSort === "near" && isInDenmark(userCoords) ? " · nearest first" : ""}</div>
                    {filtered.map(craft => (
                      <div key={craft.id} onClick={() => setCraftDetail(craft)} style={{ background: C.surface, borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 16, cursor: "pointer", boxShadow: "0 4px 18px rgba(0,0,0,0.18)" }}>
                        <div style={{ height: 172, position: "relative", background: `linear-gradient(135deg, ${craft.color}40 0%, #0A0F1E 100%)` }}>
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, opacity: 0.22 }}>{craft.emoji}</span>
                          {craft.photo && <img src={craft.photo} alt={craft.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(10,15,30,0.75) 100%)" }} />

                          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ background: craft.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "5px 10px", borderRadius: 100, textTransform: "uppercase", letterSpacing: 0.5 }}>{craft.type}</span>
                            {craft.popularityTag === "Hidden Gem" && <span style={{ background: "rgba(10,15,30,0.85)", color: C.gold, fontSize: 9, fontWeight: 700, padding: "5px 10px", borderRadius: 100, backdropFilter: "blur(4px)" }}>◆ Hidden Gem</span>}
                          </div>

                          <button onClick={(e) => { e.stopPropagation(); toggleSavePlace("craft", craft, craft.location); }}
                            style={{ position: "absolute", top: 10, right: 10, background: "rgba(10,15,30,0.75)", backdropFilter: "blur(4px)", border: "none", borderRadius: 100, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, color: isPlaceSaved("craft", craft.id) ? "#E91E63" : "#ffffffaa" }}>
                            {isPlaceSaved("craft", craft.id) ? "♥" : "♡"}
                          </button>

                          <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{craft.name}</div>
                            {craft.rating && <div style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.gold, background: "rgba(10,15,30,0.75)", backdropFilter: "blur(4px)", padding: "4px 9px", borderRadius: 100 }}>★ {craft.rating}</div>}
                          </div>
                          {craft.transportWarning && <div style={{ position: "absolute", top: 10, right: 48 }} title="Limited public transport"><span style={{ background: "rgba(61,42,10,0.9)", color: "#FFB347", fontSize: 12, padding: "5px 8px", borderRadius: 100 }}>🚲</span></div>}
                        </div>
                        <div style={{ padding: "14px 16px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                            <div style={{ fontSize: 12, color: C.muted }}>{craft.location} · {travelLabel(userCoords, craft.location, craft.travelTime)}{craft.priceNote ? ` · ${craft.priceNote}` : ""}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif", flexShrink: 0 }}>{craft.price || "On request"}</div>
                          </div>
                          <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: craft.gemlyxFind ? 6 : 12 }}>{craft.desc.slice(0, 110)}{craft.desc.length > 110 ? "…" : ""}</div>
                          {craft.gemlyxFind && <div style={{ fontSize: 11.5, color: C.gold, lineHeight: 1.5, marginBottom: 12 }}><b>✦ Gemlyx Find:</b> {craft.gemlyxFind.slice(0, 90)}{craft.gemlyxFind.length > 90 ? "…" : ""}</div>}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            {craft.bookingType === "online" ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5018", border: "1px solid #4CAF5044", padding: "5px 10px", borderRadius: 100 }}>⚡ Book online</span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, background: `${C.border}55`, padding: "5px 10px", borderRadius: 100 }}>Contact to book</span>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 3, color: C.gold, fontSize: 12.5, fontWeight: 700 }}>
                              Details <span style={{ fontSize: 15 }}>›</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── ATTRACTIONS ──────────────────────────────────── */}
          {tab === "attractions" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Free Entrance</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>Genuinely free places worth your time, city by city. Anything ticketed — like Tivoli or Den Gamle By — lives under Booking instead.</div>
              </div>

              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 18 }}>
                {["Copenhagen", "Aarhus", "Aalborg", "🍬 Handmade"].map(c => (
                  <Pill key={c} label={c} active={attractionCity === c} onClick={() => setAttractionCity(c)} color={c === "🍬 Handmade" ? "#E91E63" : undefined} />
                ))}
              </div>

              {attractionCity === "🍬 Handmade" ? (
                <>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Watch it made, buy it warm — no ticket, no booking, just walk in.</div>
                  {handmadeCraftShops.map(shop => (
                    <div key={shop.id} style={{ background: C.surface, borderRadius: 16, padding: "16px", marginBottom: 12, border: `1px solid ${shop.color}33`, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: shop.color, borderRadius: "16px 0 0 16px" }} />
                      <div style={{ paddingLeft: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>{shop.emoji}</span>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{shop.name}</div>
                          {shop.yearRound && (
                            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "3px 8px", borderRadius: 100, flexShrink: 0 }}>◆ Open year-round</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{shop.location}</div>
                        <div style={{ fontSize: 11, color: shop.color, fontWeight: 700, marginBottom: 8 }}>{shop.tag}</div>
                        <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{shop.desc}</div>
                        <div style={{ fontSize: 12, color: C.text, background: C.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 10, lineHeight: 1.5 }}>
                          💡 {shop.highlight}
                        </div>
                        <div style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginBottom: 10 }}>{shop.price}</div>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.mapHint)}`} target="_blank" rel="noreferrer"
                          style={{ display: "block", background: shop.color, color: "#fff", borderRadius: 10, padding: "9px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                          ↗ Get Directions
                        </a>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
              freeEntrance.filter(a => a.city === attractionCity).map(a => (
                <div key={a.id} onClick={() => setFreeDetail(a)} style={{ borderTop: `1px solid ${C.border}`, padding: "16px 0 20px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", background: `${a.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{a.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.15 }}>{a.name}</div>
                        <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={(e) => { e.stopPropagation(); toggleSavePlace("free", a, a.city); }}
                            style={{ background: "none", border: "none", padding: 0, fontSize: 15, cursor: "pointer", color: isPlaceSaved("free", a.id) ? "#E91E63" : C.muted }}>
                            {isPlaceSaved("free", a.id) ? "♥" : "♡"}
                          </button>
                          {a.popularityTag && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: a.popularityTag === "Hidden Gem" ? C.gold : C.muted, background: a.popularityTag === "Hidden Gem" ? `${C.gold}22` : C.bg, padding: "3px 8px", borderRadius: 100 }}>
                              {a.popularityTag === "Hidden Gem" ? "◆ Hidden Gem" : "○ Common Attraction"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: a.color, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>
                        {a.type}
                        {isInDenmark(userCoords) && TOWN_COORDS[a.city] && (() => {
                          const [tLat, tLon] = TOWN_COORDS[a.city];
                          const dLat = (tLat - userCoords.lat) * 111.32;
                          const dLon = (tLon - userCoords.lon) * 62.06;
                          const km = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
                          return ` · ~${km < 2 ? 2 : km} km from you`;
                        })()}
                      </div>
                      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: a.gemlyxFind ? 4 : 10 }}>{a.desc.slice(0, 100)}{a.desc.length > 100 ? "…" : ""}</div>
                      {a.gemlyxFind && <div style={{ fontSize: 11.5, color: C.gold, lineHeight: 1.5, marginBottom: 10 }}><b>✦ Gemlyx Find:</b> {a.gemlyxFind.slice(0, 90)}{a.gemlyxFind.length > 90 ? "…" : ""}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.light, fontSize: 12, fontWeight: 700 }}>
                        Read more <span style={{ fontSize: 14 }}>›</span>
                      </div>
                    </div>
                  </div>
                </div>
              )))}
            </div>
          )}

          {/* ── EVENTS ───────────────────────────────────────── */}
          {tab === "events" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Events</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>Summer means festival season across Denmark. From legendary stages to harbour markets nobody talks about — we guide you to what's worth traveling for, and exactly how far it is from Copenhagen.</div>
              </div>

              <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                {[{ id: "local", label: "🏘 Local" }, { id: "major", label: "🌟 Major" }, { id: "viking", label: "⚔️ Viking" }].map(t => (
                  <button key={t.id} onClick={() => { setEventTab(t.id); setEventMonth(null); setEventType(null); }}
                    style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${eventTab === t.id ? C.accent : "transparent"}`, color: eventTab === t.id ? C.text : C.muted, padding: "12px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Date</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}>
                  {["All", "Jun", "Jul", "Aug", "Sep"].map(m => (
                    <Pill key={m} label={m} active={(m === "All" && !eventMonth) || eventMonth === m} onClick={() => setEventMonth(m === "All" ? null : (eventMonth === m ? null : m))} />
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Type</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                  {(eventTab === "local" ? ["All", "Festival", "Market", "Concert", "Music", "North Zealand"] : eventTab === "viking" ? ["All", "Market", "Battle & Market", "Craftsmen Gathering", "Market & Combat"] : ["All", "Music", "Cultural"]).map(f => (
                    <Pill key={f} label={f} active={(f === "All" && !eventType) || eventType === f} onClick={() => setEventType(f === "All" ? null : (eventType === f ? null : f))} />
                  ))}
                </div>
              </div>
              {filteredEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>No upcoming events — try a different filter</div>
              ) : filteredEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}

          {/* ── TOWNS ────────────────────────────────────────── */}
          {/* ── FOOD ─────────────────────────────────────────── */}
          {tab === "food" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Food</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>From a 1965 hot dog cart to Copenhagen's biggest food market — the everyday spots locals actually eat at, and the bigger names worth the crowd.</div>
              </div>

              <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                {[{ id: "Local", label: "🏘 Local" }, { id: "Major", label: "🌟 Major" }].map(t => (
                  <button key={t.id} onClick={() => setFoodTab(t.id)}
                    style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${foodTab === t.id ? C.accent : "transparent"}`, color: foodTab === t.id ? C.text : C.muted, padding: "12px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {foodSpots.filter(f => f.type === foodTab).map(spot => (
                <div key={spot.id} onClick={() => setFoodDetail(spot)} style={{ borderTop: `1px solid ${C.border}`, padding: "18px 0 22px", cursor: "pointer" }}>
                  {spot.photo && (
                    <div style={{ height: 140, borderRadius: 12, overflow: "hidden", marginBottom: 14, position: "relative", background: `linear-gradient(135deg, ${spot.color}33 0%, #0A0F1E 100%)` }}>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, opacity: 0.25 }}>{spot.emoji}</span>
                      <img src={spot.photo} alt={spot.name} onError={e => { e.target.style.display = "none"; }}
                        style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{spot.emoji}</span>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.15 }}>{spot.name}</div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{spot.category} · {spot.location}</div>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: spot.color, flexShrink: 0 }}>{spot.price}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.light, lineHeight: 1.65, marginBottom: 10, maxWidth: 560 }}>{spot.desc.slice(0, 100)}{spot.desc.length > 100 ? "…" : ""}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.light, fontSize: 13, fontWeight: 700 }}>
                    Read more <span style={{ fontSize: 15 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── NIGHTLIFE ────────────────────────────────────── */}
          {tab === "nightlife" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Nightlife</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>Danes are famously reserved with strangers — but pub culture is where that changes. Below is the honest split: where you'll mostly meet other travelers, and where you'll actually meet Danes.</div>
              </div>
              <PageHero src="/tuborg.jpg" emoji="🍺" color="#C8102E" />

              <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                {[{ id: "Local", label: "🇩🇰 Local" }, { id: "Major", label: "🌍 Major" }].map(t => (
                  <button key={t.id} onClick={() => setNightlifeTab(t.id)}
                    style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${nightlifeTab === t.id ? C.accent : "transparent"}`, color: nightlifeTab === t.id ? C.text : C.muted, padding: "12px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {nightlifeSpots.filter(f => f.type === nightlifeTab).map(spot => (
                <div key={spot.id} onClick={() => setNightlifeDetail(spot)} style={{ borderTop: `1px solid ${C.border}`, padding: "18px 0 22px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{spot.emoji}</span>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.15 }}>{spot.name}</div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{spot.category} · {spot.location}</div>
                    </div>
                  </div>
                  <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: spot.color, background: `${spot.color}18`, padding: "5px 12px", borderRadius: 100, marginBottom: 12 }}>
                    👥 {spot.crowd}
                  </div>
                  <div style={{ fontSize: 13, color: C.light, lineHeight: 1.65, marginBottom: 10, maxWidth: 560 }}>{spot.desc.slice(0, 100)}{spot.desc.length > 100 ? "…" : ""}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.light, fontSize: 13, fontWeight: 700 }}>
                    Read more <span style={{ fontSize: 15 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ROAD TRIPS ───────────────────────────────────── */}
          {tab === "roadtrips" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Road Trips</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>Denmark rewards the drive as much as the destination. These routes turn a transit day into the best part of the trip — real stops, real detours, worth the extra hour.</div>
              </div>

              {savedPlaces.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px", marginBottom: 18 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 4 }}>♥ Your Saved Places</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Saved from Free Entrance and Booking — tap ✕ to remove.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {savedPlaces.map(p => (
                      <span key={`${p.kind}-${p.id}`} style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px" }}>
                        <span style={{ fontSize: 12 }}>{p.emoji}</span>
                        <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{p.name}</span>
                        {p.town && <span style={{ fontSize: 10, color: C.muted }}>{p.town}</span>}
                        <button onClick={() => toggleSavePlace(p.kind, p)} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>✕</button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const list = savedPlaces.map(p => p.town ? `${p.name} (${p.town})` : p.name).join(", ");
                      goTab("ai");
                      sendAI(`Plan me a road trip that includes these places I've saved: ${list}. Suggest a sensible order, roughly how long I need, and one or two things worth seeing along the way.`);
                    }}
                    style={{ width: "100%", background: `linear-gradient(135deg, ${C.gold}22, ${C.accent}22)`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, color: C.gold, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    ✦ Ask Gemlyx for a road trip from these
                  </button>
                </div>
              )}

              <div style={{ background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 16, padding: "18px", marginBottom: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 4 }}>🧭 Build a Route From Here</div>
                {!isInDenmark(userCoords) ? (
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>This builds a real route starting from wherever you are — works once you're in Denmark with location enabled.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 14 }}>Tap towns to add them to your route, in the order you'd visit them — closest to you first.</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: routeStops.length > 0 ? 16 : 0 }}>
                      {nearbyTownsRanked.map(t => (
                        <button key={t.name} onClick={() => toggleRouteStop(t.name)}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: routeStops.includes(t.name) ? C.accent : C.bg, border: `1px solid ${routeStops.includes(t.name) ? C.accent : C.border}`, borderRadius: 100, padding: "7px 13px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          <span style={{ fontSize: 12, color: routeStops.includes(t.name) ? "#fff" : C.text, fontWeight: 600 }}>{t.name}</span>
                          <span style={{ fontSize: 10, color: routeStops.includes(t.name) ? "#ffffffaa" : C.muted }}>~{t.km} km</span>
                        </button>
                      ))}
                    </div>

                    {routeStops.length > 0 && (
                      <div style={{ background: C.bg, borderRadius: 12, padding: "14px", marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Your Route</div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: routeSummary ? 12 : 0 }}>
                          <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>📍 You</span>
                          {routeStops.map((stop, i) => (
                            <span key={stop} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ color: C.muted, fontSize: 12 }}>→</span>
                              <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{stop}</span>
                              <button onClick={() => toggleRouteStop(stop)} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>✕</button>
                            </span>
                          ))}
                        </div>
                        {routeSummary && <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, fontStyle: "italic" }}>{routeSummary}</div>}
                      </div>
                    )}

                    {routeStops.length >= 2 && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={generateRouteSummary} disabled={routeSummaryLoading}
                          style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {routeSummaryLoading ? "Writing..." : "✦ Describe this route"}
                        </button>
                        <button onClick={saveCurrentRoute}
                          style={{ flex: 1, background: C.accent, border: "none", color: "#fff", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          💾 Save Route
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {savedRoutes.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Your Saved Routes</div>
                  {savedRoutes.map(r => (
                    <div key={r.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>📍 You → {r.stops.join(" → ")}</div>
                        <button onClick={() => deleteSavedRoute(r.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>✕</button>
                      </div>
                      {r.summary && <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, fontStyle: "italic" }}>{r.summary}</div>}
                    </div>
                  ))}
                </div>
              )}

              {roadTrips.map(trip => (
                <div key={trip.id} style={{ borderTop: `1px solid ${C.border}`, padding: "22px 0 26px" }}>
                  {trip.photo && (
                    <div style={{ height: 160, borderRadius: 14, overflow: "hidden", marginBottom: 16, position: "relative", background: `linear-gradient(135deg, ${trip.color}33 0%, #0A0F1E 100%)` }}>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, opacity: 0.25 }}>{trip.emoji}</span>
                      <img src={trip.photo} alt={trip.name} onError={e => { e.target.style.display = "none"; }}
                        style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{trip.emoji}</span>
                    <div>
                      <div style={{ fontSize: 23, fontWeight: 600, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.15 }}>{trip.name}</div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{trip.region}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: trip.color, fontWeight: 700 }}>🕐 {trip.duration}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>📍 {trip.distance}</span>
                  </div>
                  <WeatherStrip label={`Weather along the route`} weatherKey={trip.name} lat={trip.lat} lon={trip.lon} weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
                  {trip.vibe && (
                    <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: trip.color, background: `${trip.color}18`, padding: "5px 12px", borderRadius: 100, marginBottom: 14 }}>
                      {trip.vibe}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7, marginBottom: 16, maxWidth: 560 }}>{trip.desc}</div>

                  <div style={{ fontSize: 10, fontWeight: 700, color: trip.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Stops along the way</div>
                  <div style={{ marginBottom: 16 }}>
                    {trip.stops.map((stop, i) => (
                      <div key={stop.name} style={{ display: "flex", gap: 12, marginBottom: i < trip.stops.length - 1 ? 14 : 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: trip.color, marginTop: 4 }} />
                          {i < trip.stops.length - 1 && <div style={{ width: 1, flex: 1, background: C.border, marginTop: 4 }} />}
                        </div>
                        <div style={{ paddingBottom: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{stop.name}</div>
                          <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginTop: 2 }}>{stop.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.mapHint)}`} target="_blank" rel="noreferrer"
                    style={{ color: C.text, fontSize: 13, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "4px" }}>
                    Open Route →
                  </a>
                </div>
              ))}

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 22, marginTop: 4 }}>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, marginBottom: 6 }}>⛺ Camping & Tent Spots</div>
                <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 16, maxWidth: 560 }}>Denmark's shelters and coastal campsites are one of its best-kept secrets — many are completely free. Perfect stops to break up any of the routes above.</div>
                <div className="products-grid">
                  {campingSpots.map(spot => (
                    <div key={spot.id} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.mapHint)}`, "_blank")}
                      style={{ background: C.surface, borderRadius: 16, padding: "14px", border: `1px solid ${C.border}`, cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 20 }}>{spot.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: spot.color, background: `${spot.color}22`, padding: "3px 8px", borderRadius: 100 }}>{spot.type}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 3 }}>{spot.name}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{spot.region} · {spot.travelTime}</div>
                      {spot.vibe && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: spot.color, marginBottom: 8 }}>{spot.vibe}</div>
                      )}
                      <div style={{ fontSize: 12, color: C.light, lineHeight: 1.55 }}>{spot.desc}</div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 700, marginTop: 10, textDecoration: "underline", textUnderlineOffset: "3px" }}>Get Directions →</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {tab === "visits" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Hidden Towns</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>Denmark's most beautiful towns are the ones the guidebooks skip. Cobblestones, smokehouses and family workshops — every one of them visited and verified in person.</div>
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
                {["All", "Copenhagen Area", "Zealand", "Funen", "South Jutland", "North Jutland", "East Jutland", "Bornholm", "Fanø Island"].map(r => (
                  <Pill key={r} label={r} active={(r === "All" && !townFilter) || townFilter === r} onClick={() => setTownFilter(r === "All" ? null : (townFilter === r ? null : r))} />
                ))}
              </div>
              <div className="towns-grid">
                {towns.filter(t => !townFilter || t.region === townFilter).map(town => (
                  <div key={town.id} onClick={() => setTownDetail(town)} style={{ cursor: "pointer" }}>
                    <div style={{ position: "relative", height: 210, borderRadius: 6, overflow: "hidden", background: "linear-gradient(135deg, #16233F 0%, #0A0F1E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 44, opacity: 0.25, position: "absolute" }}>{town.emoji}</span>
                      <img src={town.photo} alt={town.name} onError={e => { e.target.style.display = "none"; }}
                        style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
                      <div style={{ position: "absolute", top: 8, right: 8, width: 68, height: 68, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.4)", pointerEvents: "none" }}>
                        <DKLocator town={town.name} color={C.gold} />
                      </div>
                      {town.nomiPotential === "Very High" && (
                        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(10,15,30,0.8)", color: C.gold, fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 100 }}>⭐ Top Pick</div>
                      )}
                      {town.popularityTag === "Common Attraction" && (
                        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(10,15,30,0.8)", color: C.muted, fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 100 }}>○ Common Attraction</div>
                      )}
                    </div>
                    <div style={{ fontSize: 21, fontWeight: 600, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginTop: 12, lineHeight: 1.1 }}>{town.name}</div>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 }}>{town.region} · {travelLabel(userCoords, town.name, town.travelTime)}</div>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 7 }}>{town.tag}</div>
                    <div style={{ fontSize: 12, color: C.light, lineHeight: 1.65, marginTop: 6 }}>{town.desc.slice(0, 90)}{town.desc.length > 90 ? "…" : ""}</div>
                    {town.gemlyxFind && <div style={{ fontSize: 11, color: C.gold, lineHeight: 1.5, marginTop: 5 }}><b>✦ Gemlyx Find:</b> {town.gemlyxFind.slice(0, 80)}{town.gemlyxFind.length > 80 ? "…" : ""}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.text, fontSize: 12, fontWeight: 700, padding: "10px 0 2px" }}>
                      Read more <span style={{ fontSize: 14 }}>›</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI (dedicated page) ─────────────────────────────── */}
          {tab === "ai" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 22, paddingTop: 8, textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${C.gold}22, ${C.accent}22)`, border: `1px solid ${C.gold}55`, borderRadius: 100, padding: "6px 16px", marginBottom: 16 }}>
                  <span style={{ fontSize: 13 }}>✦</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase" }}>Gemlyx Intelligence</span>
                </div>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Ask Gemlyx</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>Your personal Denmark guide — plans your trip, and can check what's actually happening right now. Live events are tracked in the header on every page.</div>
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Quick start — tap what applies, then let Gemlyx build it</div>

                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Time</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {["A few hours", "One day", "A weekend", "A week or more"].map(t => (
                    <Pill key={t} label={t} active={intakeTime === t} onClick={() => setIntakeTime(intakeTime === t ? null : t)} />
                  ))}
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Budget</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {["Keep it cheap", "Moderate", "Money's not the issue"].map(b => (
                    <Pill key={b} label={b} active={intakeBudget === b} onClick={() => setIntakeBudget(intakeBudget === b ? null : b)} />
                  ))}
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Into</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {["History & culture", "Nature & outdoors", "Food & nightlife", "A bit of everything"].map(i => (
                    <Pill key={i} label={i} active={intakeInterest === i} onClick={() => setIntakeInterest(intakeInterest === i ? null : i)} />
                  ))}
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Getting around</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: intakeTime || intakeBudget || intakeInterest || intakeTransport ? 16 : 0 }}>
                  {["🚗 Car", "🚲 Bike", "🚆 Public transport"].map(tr => (
                    <Pill key={tr} label={tr} active={intakeTransport === tr} onClick={() => setIntakeTransport(intakeTransport === tr ? null : tr)} />
                  ))}
                </div>

                {(intakeTime || intakeBudget || intakeInterest || intakeTransport) && (
                  <button
                    onClick={() => {
                      const parts = [];
                      if (intakeTime) parts.push(`I have ${intakeTime.toLowerCase()}`);
                      if (intakeBudget) parts.push(intakeBudget === "Keep it cheap" ? "on a tight budget" : intakeBudget === "Moderate" ? "with a moderate budget" : "with a flexible budget");
                      if (intakeInterest) parts.push(intakeInterest === "A bit of everything" ? "and I like a bit of everything" : `and I'm mainly into ${intakeInterest.toLowerCase()}`);
                      if (intakeTransport) parts.push(`getting around by ${intakeTransport.replace(/^\S+\s/, "").toLowerCase()}`);
                      setAiInput(parts.join(", ") + ". Plan me something.");
                      setTimeout(() => document.getElementById("ai-helper-anchor")?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
                    }}
                    style={{ display: "block", width: "100%", background: C.accent, border: "none", color: "#fff", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    ✦ Build my plan
                  </button>
                )}
              </div>

              <div style={{ margin: "26px 0 12px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Signature Routes</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text, marginBottom: 4 }}>Three ready-made seasonal trips</div>
                <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.6 }}>Follow one as-is — or have Gemlyx bend it to your dates, transport and pace.</div>
              </div>
              {seasonalItineraries.map(plan => {
                const inSeason = plan.seasons.includes(getSeason());
                const isOpen = expandedPlan === plan.id;
                return (
                  <div key={plan.id} style={{ background: C.surface, borderRadius: 16, marginBottom: 16, border: `1px solid ${inSeason ? plan.color : C.border}`, opacity: inSeason ? 1 : 0.85, overflow: "hidden" }}>
                    <div style={{ padding: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 24 }}>{plan.emoji}</span>
                        <div style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{plan.title}</div>
                        {inSeason && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "3px 9px", borderRadius: 100, flexShrink: 0 }}>● Good now</span>}
                      </div>
                      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: plan.color, fontWeight: 700 }}>📅 {plan.duration}</span>
                        <span style={{ fontSize: 12, color: C.muted }}>👤 {plan.bestFor}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.65, marginBottom: plan.seasonNote ? 10 : 14 }}>{plan.intro}</div>
                      {plan.seasonNote && (
                        <div style={{ fontSize: 12, color: "#FFB347", background: "#3D2A0A", border: "1px solid #FFB347", borderRadius: 10, padding: "10px 12px", marginBottom: 14, lineHeight: 1.55 }}>
                          ◷ {plan.seasonNote}
                        </div>
                      )}
                      <button onClick={() => setExpandedPlan(isOpen ? null : plan.id)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: isOpen ? "transparent" : plan.color, border: isOpen ? `1px solid ${C.border}` : "none", color: isOpen ? C.light : "#fff", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {isOpen ? "Hide day-by-day" : `See all ${plan.days.length} days`} {isOpen ? "▲" : "▼"}
                      </button>
                      <button onClick={() => { sendAI(`Adapt the "${plan.title}" route for me — keep its spirit, but fit it to my dates, transport and interests. Start by asking what you need to know.`); setTimeout(() => document.getElementById("ai-helper-anchor")?.scrollIntoView({ behavior: "smooth", block: "end" }), 150); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "transparent", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8 }}>
                        ✦ Adapt this with Gemlyx
                      </button>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${C.border}`, padding: "6px 18px 18px" }}>
                        {plan.days.map((d, i) => (
                          <div key={d.day} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i < plan.days.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: `${plan.color}22`, color: plan.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>{d.day}</div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{d.title}</div>
                              <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6 }}>{d.activity}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, padding: "16px", margin: "0 0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>💡</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Know a place we're missing?</div>
                    <div style={{ fontSize: 11.5, color: C.muted }}>Tell us — every Gemlyx entry is personally checked, so this helps us find the next one.</div>
                  </div>
                  <button onClick={() => { setSuggestOpen(true); setSuggestStatus(null); }}
                    style={{ background: "none", border: `1px solid ${C.gold}55`, color: C.gold, borderRadius: 100, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Suggest
                  </button>
                </div>
              </div>

              {aiHelperBlock()}
            </div>
          )}

          {/* ── ESSENTIALS ───────────────────────────────────── */}
          {tab === "essentials" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>✓ Travel Essentials</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Everything you need to travel Denmark like a local</div>
              </div>
              <PageHero src="/checklist.jpg" emoji="✓" color="#2E7D32" />

              {/* Fine warning — always first */}
              {essentials.filter(e => e.id === 7).map(item => (
                <div key={item.id} id="ess-safety" style={{ background: "#3D2A0A", borderRadius: 14, padding: "16px", marginBottom: 20, border: "1px solid #FFB347", scrollMarginTop: 90 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{item.emoji}</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#FFB347", fontFamily: "'Cormorant Garamond', serif" }}>{item.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 8 }}>{item.desc}</div>
                  <div style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#FFB347", marginBottom: 3 }}>The 3 mistakes to avoid</div>
                    <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{item.howTo}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>💡 {item.tip}</div>
                </div>
              ))}

              {/* Quick-jump grid — modern icon menu, tap to scroll */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
                {[
                  { id: "ess-weather", icon: "🌤", label: "Weather", color: "#1565C0" },
                  { id: "ess-flights", icon: "✈️", label: "Flights & Buses", color: "#6A1B9A" },
                  { id: "ess-transport", icon: "🚇", label: "Transport", color: "#00838F" },
                  { id: "ess-payments", icon: "💳", label: "Payments", color: "#2E7D32" },
                  { id: "ess-sightseeing", icon: "🎟", label: "Sightseeing", color: C.gold },
                  { id: "ess-connectivity", icon: "📶", label: "Connectivity", color: "#C8102E" },
                  { id: "ess-solo", icon: "🍺", label: "Solo Travel", color: "#8D6E63" },
                  { id: "ess-faq", icon: "❓", label: "FAQ", color: "#455A64" },
                ].map(s => (
                  <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 6px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.text, textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Weather */}
              <div id="ess-weather" style={{ scrollMarginTop: 90 }}>
                {WEATHER_CITIES.map(c => (
                  <WeatherStrip key={c.key} label={`🌤 ${c.label}`} weatherKey={c.key} lat={c.lat} lon={c.lon} weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
                ))}
              </div>

              {[
                { cat: "Flights & Buses", anchor: "ess-flights" },
                { cat: "Transport", anchor: "ess-transport" },
                { cat: "Payments", anchor: "ess-payments" },
                { cat: "Sightseeing", anchor: "ess-sightseeing" },
                { cat: "Connectivity", anchor: "ess-connectivity" },
              ].map(({ cat, anchor }) => (
                <div key={cat} id={anchor} style={{ marginBottom: 20, scrollMarginTop: 90 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>{cat}</div>
                  {essentials.filter(e => e.category === cat && e.id !== 7).map(item => (
                    <div key={item.id} style={{ background: C.surface, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{item.emoji}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{item.price}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 8 }}>{item.desc}</div>
                      <div style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, marginBottom: 3 }}>How to get it</div>
                        <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{item.howTo}</div>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginBottom: item.link ? 8 : 0 }}>💡 {item.tip}</div>
                      {item.link && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {item.linkAndroid ? (
                        <>
                          <StoreBadge type="ios" href={item.link} />
                          <StoreBadge type="android" href={item.linkAndroid} />
                        </>
                      ) : (
                        <a href={item.link} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, color: C.light, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                          🌐 Website ↗
                        </a>
                      )}
                    </div>
                  )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Solo traveller tip */}
              <div id="ess-solo" style={{ marginBottom: 20, scrollMarginTop: 90 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Traveling Solo?</div>
                <div style={{ background: C.surface, borderRadius: 14, padding: "16px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>🍺</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>Find a local, if you can</div>
                  </div>
                  <div style={{ fontSize: 13, color: C.light, lineHeight: 1.65 }}>
                    Danes are famously reserved with strangers — but genuinely warm once you're in. Copenhagen's real culture, especially pub life, is something you mostly experience *with* Danes, not just around them. If you get the chance to join a local for a beer or a bar crawl, take it — it opens up a side of Denmark most tourists never see. Hostels with common bar areas, run clubs, and language exchange meetups (search "language cafe Copenhagen" on Facebook) are the easiest low-pressure ways in.
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div id="ess-faq" style={{ marginBottom: 20, scrollMarginTop: 90 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>FAQ</div>
                {[
                  { q: "Is Gemlyx free?", a: "Yes — completely free for travelers. Browse, save, use the map and discover hidden finds at no cost." },
                  { q: "How do I save a find?", a: "Tap the ♡ heart on any business. It gets saved to your Saved tab instantly." },
                  { q: "How do I get my shop listed?", a: "Send us a message on Instagram or email hello@gemlyx.com. We visit and verify every listing personally." },
                  { q: "Are all finds verified?", a: "Yes — every listing is physically verified by a real person. We show the verification date on each find." },
                  { q: "Which cities are covered?", a: "Currently Copenhagen, Denmark. More Danish cities coming soon." },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.surface, borderRadius: 12, padding: "12px 16px", marginBottom: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.q}</div>
                    <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6 }}>{item.a}</div>
                  </div>
                ))}
                <div style={{ background: C.surface, borderRadius: 12, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Still need help?</div>
                  <a href="mailto:hello@gemlyx.com" style={{ display: "inline-block", background: C.accent, color: "#fff", borderRadius: 100, padding: "6px 14px", fontSize: 11, fontWeight: 700, textDecoration: "none", marginTop: 6 }}>✉ hello@gemlyx.com</a>
                </div>
              </div>
            </div>
          )}

          {/* ── MAP ──────────────────────────────────────────── */}
          {tab === "map" && (
            <div className={pageAnim} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 73px)" }}>
              <div style={{ padding: "12px 16px 8px", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Select a city</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                  {cities.map(city => (
                    <Pill key={city.id} label={`🇩🇰 ${city.name}`} active={mapCity?.id === city.id} onClick={() => { setMapCity(city); setSelectedPin(null); }} color={city.color} />
                  ))}
                </div>
              </div>
              {mapCity ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ height: 220, position: "relative", flexShrink: 0 }}>
                    <LeafletMap
                      center={[55.6761, 12.5683]}
                      zoom={13}
                      overlayLabel={selectedPin ? `${selectedPin.shop} — tap Get Directions for the exact spot` : null}
                    />
                    <a href={selectedPin ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedPin.shop+" Copenhagen")}` : `https://www.google.com/maps/search/?api=1&query=local+shops+Copenhagen`}
                      target="_blank" rel="noreferrer"
                      style={{ position: "absolute", bottom: 8, right: 8, zIndex: 600, background: C.gold, color: "#000", padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                      {selectedPin ? "Get Directions ↗" : "Open in Maps ↗"}
                    </a>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: userLocation ? "#4CAF50" : C.muted }}>{userLocation ? "● Sorted by distance" : "Sort by distance?"}</span>
                      {!userLocation ? (
                        <button onClick={requestLocation} disabled={locationLoading} style={{ background: C.gold, border: "none", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#000", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {locationLoading ? "Locating..." : "Use my location ●"}
                        </button>
                      ) : (
                        <button onClick={() => setUserLocation(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 100, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: C.muted, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Clear</button>
                      )}
                    </div>
                    {[...mapCity.products].sort((a,b) => {
                      if (!userLocation) return 0;
                      const ca = PRODUCT_COORDS[a.id], cb = PRODUCT_COORDS[b.id];
                      if (!ca||!cb) return 0;
                      return getDistanceRaw(userLocation.lat, userLocation.lng, ca[0], ca[1]) - getDistanceRaw(userLocation.lat, userLocation.lng, cb[0], cb[1]);
                    }).map(p => {
                      const c = PRODUCT_COORDS[p.id];
                      const dist = userLocation && c ? getDistance(userLocation.lat, userLocation.lng, c[0], c[1]) : null;
                      return (
                        <div key={p.id} onClick={() => setSelectedPin(selectedPin?.id === p.id ? null : p)}
                          onDoubleClick={() => setSelectedProduct({ ...p, city: mapCity.name, color: mapCity.color })}
                          style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: selectedPin?.id === p.id ? `${mapCity.color}15` : "transparent" }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", background: `${mapCity.color}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            {p.photo ? <img src={p.photo} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : p.emoji}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.shop}</div>
                            {dist && <div style={{ fontSize: 11, color: C.gold, marginTop: 3, fontWeight: 700 }}>● {dist} away</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{p.price}</div>
                            <span style={{ fontSize: 10, color: C.muted }}>{selectedPin?.id === p.id ? "✓ Selected" : "Tap to locate"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: C.muted }}>
                  <div style={{ fontSize: 32 }}>⊙</div>
                  <div style={{ fontSize: 14 }}>Select a city to explore the map</div>
                </div>
              )}
            </div>
          )}
    </>
  );

  return (
    <div className="app-root" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg, width: "100%", color: C.text, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 0; }
        @media (min-width: 900px) {
          ::-webkit-scrollbar { width: 10px; }
          ::-webkit-scrollbar-track { background: #0A0F1E; }
          ::-webkit-scrollbar-thumb { background: #2A3A52; border-radius: 100px; }
          ::-webkit-scrollbar-thumb:hover { background: #6B7A99; }
        }
        .towns-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 14px; }
        @media (min-width: 900px) { .towns-grid { grid-template-columns: repeat(3, 1fr); gap: 34px 22px; } }
        .app-root { height: 100vh; }
        .hero-h { height: calc(100vh - 196px); min-height: 340px; }
        /* ── Leaflet, Gemlyx dark theme ── */
        .gemlyx-tiles { filter: invert(1) hue-rotate(189deg) brightness(0.92) contrast(1.12) saturate(0.35); }
        .gemlyx-map-label { background: #0A0F1E; color: #D4AF37; border: 1px solid #D4AF3766; border-radius: 6px; padding: 2px 7px; font-size: 10px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 2px 6px rgba(0,0,0,0.5); }
        .gemlyx-map-label::before { border-top-color: #D4AF3766 !important; }
        .leaflet-container { background: #0D1526 !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .leaflet-control-zoom { border: 1px solid #1E2A3A !important; border-radius: 10px !important; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.5) !important; }
        .leaflet-control-zoom a { background: rgba(10,15,30,0.92) !important; color: #E8EDF7 !important; border-bottom: 1px solid #1E2A3A !important; width: 30px !important; height: 30px !important; line-height: 30px !important; font-size: 15px !important; }
        .leaflet-control-zoom a:hover { background: #16203A !important; color: #D4AF37 !important; }
        .leaflet-control-attribution { background: rgba(10,15,30,0.78) !important; color: #6B7A99 !important; font-size: 9px !important; padding: 2px 6px !important; border-radius: 8px 0 0 0 !important; }
        .leaflet-control-attribution a { color: #8fa3c7 !important; }
        @supports (height: 100dvh) { .app-root { height: 100dvh; } .hero-h { height: calc(100dvh - 196px); } }
        @media (min-width: 900px) {
          .hero-h { height: calc(100vh - 248px); }
          @supports (height: 100dvh) { .hero-h { height: calc(100dvh - 248px); } }
        }
        .slide-up { animation: slideUp 0.2s ease; }
        .page-enter-next { animation: pageNext 0.32s cubic-bezier(0.2, 0.8, 0.3, 1); }
        .page-enter-prev { animation: pagePrev 0.32s cubic-bezier(0.2, 0.8, 0.3, 1); }
        @keyframes pageNext { from { opacity: 0.3; transform: translateX(64px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pagePrev { from { opacity: 0.3; transform: translateX(-64px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes nudge { 0%, 100% { transform: translateX(0); opacity: 0.6; } 50% { transform: translateX(4px); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(6px); } }
        @media (min-width: 900px) { .mobile-only { display: none !important; } }
        @media (max-width: 899px) { .desktop-only { display: none !important; } }
        @media (min-width: 900px) {
          .gemlyx-search-input { width: 130px !important; font-size: 14px !important; padding: 9px 14px 9px 32px !important; }
          .gemlyx-search-input:focus { width: 210px !important; }
          .gemlyx-search-icon { left: 12px !important; width: 14px !important; height: 14px !important; }
          .gemlyx-burger { padding: 9px 13px !important; }
          .gemlyx-burger-bar { width: 19px !important; }
        }
        .products-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (min-width: 600px) { .products-grid { grid-template-columns: 1fr 1fr 1fr; } }
        @media (min-width: 900px) { .products-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
      `}</style>

      <div style={{ flexShrink: 0, position: "relative", zIndex: 100 }}>
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "calc(14px + env(safe-area-inset-top)) 16px 10px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo */}
          <div onClick={() => goTab("home")} style={{ cursor: "pointer", flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text, letterSpacing: -0.5 }}>◆ Gemlyx</div>
          </div>

          {/* Weather — back to full size (with town labels), same row as logo, truly centered */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            <WeatherHeaderStrip weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
          </div>

          {/* Right: small persistent search pill (always visible, not a toggle) + hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <svg className="gemlyx-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7A99" strokeWidth="2.5" strokeLinecap="round"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.2" y2="16.2" />
              </svg>
              <input className="gemlyx-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
                style={{ width: 104, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "8px 12px 8px 29px", fontSize: 12.5, color: C.text, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "width 0.18s ease" }}
                onFocus={e => { if (window.innerWidth < 900) e.target.style.width = "170px"; }}
                onBlur={e => { if (window.innerWidth < 900) e.target.style.width = "104px"; }} />
            </div>
            {/* Hamburger menu — full navigation on mobile */}
            <button className="gemlyx-burger" onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: "pointer", padding: "7px 11px", borderRadius: 8, display: "flex", gap: 4, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div className="gemlyx-burger-bar" style={{ width: 17, height: 2, background: C.muted, borderRadius: 2 }} />
              <div className="gemlyx-burger-bar" style={{ width: 17, height: 2, background: C.muted, borderRadius: 2 }} />
              <div className="gemlyx-burger-bar" style={{ width: 17, height: 2, background: C.muted, borderRadius: 2 }} />
            </button>
          </div>
        </div>

        {(userCoords === null || userCoords === "denied") && (
          <button onClick={requestLocation}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: userCoords === "denied" ? "#3D2A0A" : `${C.gold}18`, border: `1px solid ${userCoords === "denied" ? "#FFB347" : C.gold}`, borderRadius: 10, padding: "8px 12px", marginBottom: 4, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "left" }}>
            <span style={{ fontSize: 13 }}>📍</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 12, color: userCoords === "denied" ? "#FFB347" : C.gold, fontWeight: 600 }}>
                {userCoords === "denied" ? "Location blocked — tap to try again, or check your browser's site settings" : "Already in Denmark? Tap to calculate distances from you"}
              </span>
              <span onClick={(e) => { e.stopPropagation(); setShowPrivacy(true); }}
                style={{ display: "block", fontSize: 10, color: C.muted, marginTop: 2 }}>
                Only used on your device, never stored · <span style={{ textDecoration: "underline" }}>Privacy</span>
              </span>
            </span>
          </button>
        )}

        <button onClick={() => goTab("essentials")}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: `${C.accent}14`, border: `1px solid ${C.accent}55`, borderRadius: 10, padding: "9px 12px", marginBottom: 4, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "left" }}>
          <span style={{ fontSize: 14 }}>📖</span>
          <span style={{ fontSize: 12, color: "#FF8A8A", fontWeight: 700 }}>Read Essentials before visiting — real tickets, fines and etiquette to know first</span>
          <span style={{ marginLeft: "auto", color: "#FF8A8A", fontSize: 13 }}>→</span>
        </button>
        {userCoords === "requesting" && (
          <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>📍 Getting your location...</div>
        )}
        <LiveEventsHeaderStrip liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} nearYou={nearYou} requestLocation={requestLocation} setEventDetail={setEventDetail} setFreeDetail={setFreeDetail} setFoodDetail={setFoodDetail} userCoords={userCoords} />

        {/* Search results */}
        {search.length > 1 && searchResults.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, borderBottom: `1px solid ${C.border}`, zIndex: 200, maxHeight: 240, overflowY: "auto" }}>
            {searchResults.map(p => (
              <div key={p.id} onClick={() => { setSelectedProduct({ ...p }); setSearch(""); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.shop} · {p.city}</div>
                </div>
                <span style={{ fontWeight: 700, color: C.gold, fontSize: 13 }}>{p.price}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation lives only in the hamburger dropdown now — one nav
          surface for every screen size, instead of duplicating it in a
          separate always-visible tab row that ate a full extra header row. */}
      </div>

      {/* ── DROPDOWN MENU ──────────────────────────────────── */}
      {showMenu && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300 }} onClick={() => setShowMenu(false)}>
          <div style={{ position: "absolute", top: 70, right: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "8px", minWidth: 220, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }`}</style>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", padding: "8px 16px 6px" }}>Navigate</div>
            {NAV_ITEMS.map((item, i) => item.id === "ai" ? (
              <button key={item.id} onClick={() => { setShowMenu(false); goTab("ai"); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: `linear-gradient(135deg, ${C.gold}, ${C.accent})`, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 6, marginBottom: 2, boxShadow: `0 2px 10px ${C.gold}33`, animation: `fadeSlideIn 0.2s ease ${i * 0.04}s both` }}>
                {item.label}
              </button>
            ) : (
              <button key={item.id} onClick={() => { setShowMenu(false); goTab(item.id); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: active === item.id ? `${C.accent}22` : "transparent", color: active === item.id ? C.text : C.light, border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 2, animation: `fadeSlideIn 0.2s ease ${i * 0.04}s both` }}>
                {item.label}
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0" }} />
            {[
              { id: "login", label: "👤 Login", action: "login" },
              { id: "faq", label: "❓ FAQ", action: "faq" },
              { id: "support", label: "✉ Support", action: "mail" },
            ].map((item, i) => (
              <button key={item.id}
                onClick={() => {
                  setShowMenu(false);
                  if (item.action === "faq") setActive("essentials");
                  else if (item.action === "mail") window.open("mailto:hello@gemlyx.com");
                  else if (item.action === "login") { setToast("👤 Login coming soon"); setTimeout(() => setToast(null), 2200); }
                }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "transparent", color: C.light, border: "none", borderRadius: 10, padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 2, animation: `fadeSlideIn 0.2s ease ${(i + 11) * 0.04}s both` }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PAGER ──────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        <div ref={stripRef}
          onTouchStart={onSwipeStart} onTouchMove={onSwipeMove} onTouchEnd={onSwipeEnd}
          style={{ display: "flex", height: "100%", width: `${TAB_ORDER.length * 100}%`, transform: `translateX(${-tabIdx * (100/TAB_ORDER.length)}%)`, transition: "transform 0.32s cubic-bezier(0.2, 0.8, 0.3, 1)", touchAction: "pan-y" }}>
          {TAB_ORDER.map((tabId, i) => (
            <div key={tabId} style={{ width: `${100/TAB_ORDER.length}%`, height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 20 }}>
              {Math.abs(i - tabIdx) <= 1 && renderTab(tabId)}
            </div>
          ))}
        </div>
        {/* Page dots */}
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 60, background: "rgba(10,15,30,0.55)", padding: "7px 12px", borderRadius: 100, backdropFilter: "blur(8px)" }}>
          {TAB_ORDER.map((t, i) => (
            <div key={t} onClick={() => goTab(t)}
              style={{ width: i === tabIdx ? 8 : 6, height: i === tabIdx ? 8 : 6, borderRadius: "50%", background: i === tabIdx ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", transition: "all 0.2s", alignSelf: "center" }} />
          ))}
        </div>
      </div>

      {/* ── FILTER PANEL (Hotels.com style) ──────────────── */}
      {showFilter && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={() => setShowFilter(false)}>
          <div style={{ background: C.surface, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, margin: "0 auto", padding: "20px 20px 40px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Sort & Filter</div>
              <button onClick={() => { setFilterCategories([]); setFilterTypes([]); setPriceMax(5000); setBookableOnly(false); }} style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Reset</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Category</div>
              {["Fashion", "Accessories", "Bags"].map(cat => {
                const checked = filterCategories.includes(cat);
                return (
                  <label key={cat} onClick={() => setFilterCategories(prev => checked ? prev.filter(x => x !== cat) : [...prev, cat])}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <span style={{ fontSize: 14, color: C.text }}>{cat}</span>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? C.accent : C.border}`, background: checked ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                      {checked && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Availability</div>
              {[{ id: "permanent", label: "Permanent shops" }, { id: "seasonal", label: "Seasonal" }, { id: "popup", label: "Pop-up" }].map(opt => {
                const checked = filterTypes.includes(opt.id);
                return (
                  <label key={opt.id} onClick={() => setFilterTypes(prev => checked ? prev.filter(x => x !== opt.id) : [...prev, opt.id])}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <span style={{ fontSize: 14, color: C.text }}>{opt.label}</span>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? C.accent : C.border}`, background: checked ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                      {checked && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Max price</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{priceMax >= 5000 ? "Any price" : `Up to ${priceMax.toLocaleString()} DKK`}</div>
              </div>
              <input type="range" min="50" max="5000" step="50" value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}
                style={{ width: "100%", accentColor: C.accent }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
                <span>50 DKK</span><span>5,000+ DKK</span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label onClick={() => setBookableOnly(v => !v)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>● Bookable online only</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Skip anything needing a request first</div>
                </div>
                <div style={{ width: 44, height: 26, borderRadius: 100, background: bookableOnly ? C.accent : C.border, position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: bookableOnly ? 21 : 3, transition: "all 0.2s" }} />
                </div>
              </label>
            </div>

            <button onClick={() => setShowFilter(false)}
              style={{ width: "100%", background: C.accent, border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Show {displayProducts.length} results
            </button>
            {(filterCategories.length > 0 || filterTypes.length > 0 || priceMax < 5000 || bookableOnly) && (
              <button onClick={() => { setFilterCategories([]); setFilterTypes([]); setPriceMax(5000); setBookableOnly(false); }}
                style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8 }}>
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      <DetailPage item={eventDetail} onClose={() => setEventDetail(null)} kind="event" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={townDetail} onClose={() => setTownDetail(null)} kind="town" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={nightlifeDetail} onClose={() => setNightlifeDetail(null)} kind="nightlife" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={freeDetail} onClose={() => setFreeDetail(null)} kind="free" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={foodDetail} onClose={() => setFoodDetail(null)} kind="food" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />

      {guideModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(5,8,16,0.85)", overflowY: "auto", padding: "60px 16px 40px" }} onClick={() => setGuideModal(null)}>
          <div style={{ maxWidth: 480, margin: "0 auto", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "22px" }} onClick={e => e.stopPropagation()}>
            {guideModal === "loading" ? (
              <div style={{ textAlign: "center", padding: "50px 20px" }}>
                <div style={{ fontSize: 34, marginBottom: 14, animation: "gemlyxPulse 1.6s ease-in-out infinite" }}>📖</div>
                <div style={{ fontSize: 15, color: C.text, fontWeight: 700, marginBottom: 6, fontFamily: "'Cormorant Garamond', serif" }}>Building your guide…</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
                  Checking real places, routes and travel times — this takes a few seconds, not a bug 🙂
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 18 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, animation: `gemlyxDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <style>{`
                  @keyframes gemlyxPulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
                  @keyframes gemlyxDot { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-4px); } }
                `}</style>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg, ${C.gold}22, ${C.accent}22)`, border: `1px solid ${C.gold}55`, borderRadius: 100, padding: "4px 12px" }}>
                    <span style={{ fontSize: 11 }}>✦</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 0.5, textTransform: "uppercase" }}>Your Guide</span>
                  </div>
                  <button onClick={() => setGuideModal(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.1, marginBottom: 4 }}>{guideModal.title}</div>
                {guideModal._grounded && <div style={{ fontSize: 10, color: "#8AB4F8", marginBottom: 14 }}>✦ Place names cross-checked with Google AI</div>}
                {!guideModal._grounded && <div style={{ marginBottom: 18 }} />}
                {guideModal.days.map((day, dayIdx) => (
                  <div key={day.day} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase" }}>Day {day.day}{day.title ? ` — ${day.title}` : ""}</div>
                    {(() => {
                      // If today only has one stop, connect it to yesterday's last stop instead —
                      // that inter-day leg (e.g. Dragør → Køge) IS the actual journey, and without
                      // it a single-stop day would show no map and no travel info at all.
                      if (day.stops.length > 1 || dayIdx === 0) return null;
                      const prevDay = guideModal.days[dayIdx - 1];
                      const prevStop = prevDay?.stops?.[prevDay.stops.length - 1];
                      if (!prevStop) return null;
                      const how = day.glance?.legs?.[0]?.how || "";
                      const mode = /bike|cycl/i.test(how) ? "bicycling" : /drive|car\b/i.test(how) ? "driving" : /walk/i.test(how) ? "walking" : /train|bus|transit/i.test(how) ? "transit"
                        : guideModal._mode === "bike" ? "bicycling" : guideModal._mode === "car" ? "driving" : "transit";
                      const icon = mode === "bicycling" ? "🚲" : mode === "driving" ? "🚗" : mode === "walking" ? "🚶" : "🚆";
                      const a = resolveStopCoords(prevStop.name), b = resolveStopCoords(day.stops[0].name);
                      const km = a && b ? kmBetween(a, b) : null;
                      const exact = exactDurations[`${prevStop.name}|${day.stops[0].name}|${guideModal._mode}`];
                      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(prevStop.name + ", Denmark")}&destination=${encodeURIComponent(day.stops[0].name + ", Denmark")}&travelmode=${mode}`;
                      return (
                        <a href={mapsUrl} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px", marginBottom: 12 }}>
                          <span style={{ fontSize: 12 }}>{icon}</span>
                          <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>
                            {exact ? `${exact.durationText} ${mode === "bicycling" ? "by bike" : mode === "driving" ? "by car" : mode === "walking" ? "on foot" : "by train/bus"}`
                              : km !== null ? `~${Math.round(km)} km ${mode === "bicycling" ? "by bike" : mode === "driving" ? "by car" : mode === "walking" ? "on foot" : "by train/bus"}` : how || "Route from yesterday"}
                          </span>
                          <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>· {exact ? "Google Maps ↗" : "Exact route ↗"}</span>
                        </a>
                      );
                    })()}
                      {day.weather && (
                        <div title="Forecast assumes the trip starts today" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${day.weather.risk === "high" ? "#FFB34766" : C.border}`, borderRadius: 100, padding: "4px 10px", fontSize: 11 }}>
                          <span>{day.weather.icon}</span>
                          <span style={{ color: C.text, fontWeight: 700 }}>{day.weather.temp}°</span>
                          {day.weather.risk === "high" && <span style={{ color: "#FFB347", fontWeight: 700 }}>· rain likely</span>}
                        </div>
                      )}
                    </div>
                    {(() => {
                      const prevDay = dayIdx > 0 ? guideModal.days[dayIdx - 1] : null;
                      const prevStop = prevDay?.stops?.[prevDay.stops.length - 1];
                      const leadIn = day.stops.length === 1 && prevStop ? [prevStop] : [];
                      const routePoints = [...leadIn, ...day.stops].map(s => {
                        const c = resolveStopCoords(s.name);
                        return c ? { name: s.name, ...c } : null;
                      }).filter(Boolean);
                      if (routePoints.length < 2) return null;
                      return (
                        <div style={{ height: 160, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 14 }}>
                          <GuideRouteMap points={routePoints} />
                        </div>
                      );
                    })()}
                    {day.stops.map((stop, i) => {
                      const real = lookupRealPlace(stop.name);
                      const townMatch = towns.find(t => t.name === stop.name)?.name || (real?._src === "town" ? real.name : null) || Object.keys(TOWN_COORDS).find(t => stop.name.includes(t));
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", gap: 12 }}>
                          {real?.photo ? (
                            <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                              <img src={real.photo} alt={stop.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ) : townMatch ? (
                            <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}` }}>
                              <DKLocator town={townMatch} color={C.gold} />
                            </div>
                          ) : (
                            <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, border: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                              {real?.emoji || "📍"}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{stop.name}</div>
                            <div style={{ fontSize: 12, color: C.light, lineHeight: 1.5, marginBottom: real ? 4 : 0 }}>{stop.note}</div>
                            {real && real.name === stop.name && (
                              <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
                                {real.price ? `${real.price}` : real.popularityTag === "Hidden Gem" ? "◆ Free — Hidden Gem" : real._src === "free" ? "Free entry" : ""}
                              </div>
                            )}
                          </div>
                          </div>
                          {i < day.stops.length - 1 ? (() => {
                            const nextStop = day.stops[i + 1];
                            const how = day.glance?.legs?.[i]?.how || "";
                            const mode = /bike|cycl/i.test(how) ? "bicycling" : /drive|car\b/i.test(how) ? "driving" : /walk/i.test(how) ? "walking" : /train|bus|transit/i.test(how) ? "transit"
                              : guideModal._mode === "bike" ? "bicycling" : guideModal._mode === "car" ? "driving" : "transit";
                            const icon = mode === "bicycling" ? "🚲" : mode === "driving" ? "🚗" : mode === "walking" ? "🚶" : /ferry|boat/i.test(how) ? "⛴" : "🚆";
                            const a = resolveStopCoords(stop.name), b = resolveStopCoords(nextStop.name);
                            const km = a && b ? kmBetween(a, b) : null;
                            const exact = exactDurations[`${stop.name}|${nextStop.name}|${guideModal._mode}`];
                            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(stop.name + ", Denmark")}&destination=${encodeURIComponent(nextStop.name + ", Denmark")}&travelmode=${mode}`;
                            return (
                              <div style={{ borderLeft: `2px dashed ${C.border}`, marginLeft: 31, padding: "7px 0 9px 14px", minHeight: 14 }}>
                                {glancePending > 0 && !how ? (
                                  <span style={{ fontSize: 11, color: C.muted }}>✨ checking…</span>
                                ) : (
                                  <a href={mapsUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 100, padding: "6px 12px" }}>
                                    <span style={{ fontSize: 12 }}>{icon}</span>
                                    <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>
                                      {exact
                                        ? `${exact.durationText} ${mode === "bicycling" ? "by bike" : mode === "driving" ? "by car" : mode === "walking" ? "on foot" : "by train/bus"}`
                                        : km !== null
                                        ? `~${Math.round(km)} km ${mode === "bicycling" ? "by bike" : mode === "driving" ? "by car" : mode === "walking" ? "on foot" : "by train/bus"}`
                                        : how || "Route"}
                                    </span>
                                    {exact && <span style={{ fontSize: 9, color: "#4CAF50", fontWeight: 700 }}>✓</span>}
                                    <span style={{ fontSize: 10.5, color: C.light, fontWeight: 700 }}>· Exact route ↗</span>
                                  </a>
                                )}
                              </div>
                            );
                          })() : (
                            <div style={{ height: 12 }} />
                          )}
                        </div>
                      );
                    })}
                    {day.glance?.accommodation ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.surface, border: `1px solid ${C.gold}33`, borderRadius: 10, padding: "10px 12px", marginTop: 2 }}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>🏡</span>
                        <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                          <span style={{ color: C.muted, fontWeight: 700 }}>Where to stay: </span>
                          <span style={{ color: C.light }}>{day.glance.accommodation}</span>
                        </div>
                      </div>
                    ) : glancePending > 0 ? (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>✨ Checking travel times & where to stay…</div>
                    ) : null}
                  </div>
                ))}

                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={saveCurrentGuide}
                    style={{ flex: 1, background: C.accent, border: "none", color: "#fff", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    💾 Save Guide
                  </button>
                  <button onClick={() => setGuideModal(null)}
                    style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PRIVACY & DATA MODAL ──────────────────────────── */}
      {showPrivacy && (
        <div onClick={() => setShowPrivacy(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", padding: "24px 22px 32px", border: `1px solid ${C.border}`, borderBottom: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>Privacy & Data</div>
              <button onClick={() => setShowPrivacy(false)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Close</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Last updated July 2026 · Gemlyx is built in Denmark and designed to collect as little as possible. No accounts, no ads, no tracking cookies, no analytics.</div>

            {[
              ["📍 Your location", "Only requested when you tap the location button — never in the background. Your coordinates are used directly in your browser to calculate distances to towns and events. They are not stored on any server and are not sent to anyone. You can revoke access anytime in your browser's site settings."],
              ["✦ AI chats (Ask Gemlyx & Route Builder)", "When you use the AI Guide, your messages are sent to OpenAI (a US company) to generate the answer, and in some cases to Tavily to search for live information like opening status. Please don't include personal details in your messages — the AI doesn't need your name or contact information to plan a great trip. We don't store your chats on our servers."],
              ["💾 Saved routes & guides", "Guides and road-trip routes you save are stored only in your browser's local storage, on your own device. We never see them. Delete them in the app, or by clearing your browser data for this site."],
              ["◈ Booking requests", "If you send a booking or craft request, the details you enter (name, email, message) are stored in our database (Supabase) so the maker can get back to you. We use them for nothing else. Email hello@gemlyx.com to have a request deleted."],
              ["💡 Suggestions", "If you suggest a place via 'Suggest a Place', what you type is stored so we can review it. We don't ask for your name or contact details — suggestions are anonymous."],
              ["🌦 Weather & maps", "Weather comes from Yr.no (Norwegian Meteorological Institute) and map tiles from OpenStreetMap. Like any website loading content, these services can see your IP address when data loads. Neither is used to track you."],
              ["🇪🇺 Your rights", "Under GDPR you can ask what data we hold about you, and have it corrected or deleted. Since almost everything lives on your own device, this usually means booking requests. Contact: hello@gemlyx.com. Data controller: Gemlyx, Denmark."],
            ].map(([h, body]) => (
              <div key={h} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: 0.5, marginBottom: 5 }}>{h}</div>
                <div style={{ fontSize: 12.5, color: C.light, lineHeight: 1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUGGEST A PLACE MODAL ─────────────────────────── */}
      {suggestOpen && (
        <div onClick={() => setSuggestOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", padding: "24px 22px 32px", border: `1px solid ${C.border}`, borderBottom: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>💡 Suggest a Place</div>
              <button onClick={() => setSuggestOpen(false)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Close</button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>We read every suggestion — nothing goes live automatically. If it's a real, worthwhile find, it'll show up in Gemlyx personally checked, same as everything else.</div>

            {suggestStatus === "sent" ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 700, marginBottom: 4 }}>Thank you!</div>
                <div style={{ fontSize: 12, color: C.muted }}>We'll take a look.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>NAME</div>
                <input value={suggestForm.name} onChange={e => setSuggestForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ringkøbing Harbour Festival"
                  style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none", background: C.surface, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 14, boxSizing: "border-box" }} />

                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>TYPE</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {["Event", "Town", "Free Entrance", "Food", "Nightlife", "Craft"].map(t => (
                    <Pill key={t} label={t} active={suggestForm.type === t} onClick={() => setSuggestForm(f => ({ ...f, type: t }))} />
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>WHY IT'S WORTH INCLUDING (OPTIONAL)</div>
                <textarea value={suggestForm.note} onChange={e => setSuggestForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Anything that helps us find it — town, time of year, what makes it special..."
                  rows={3}
                  style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, outline: "none", background: C.surface, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16, boxSizing: "border-box", resize: "vertical" }} />

                {suggestStatus === "error" && <div style={{ fontSize: 12, color: "#FFB347", marginBottom: 10 }}>Please add a name, or check your connection.</div>}

                <button onClick={sendSuggestion} disabled={suggestStatus === "sending"}
                  style={{ width: "100%", background: C.gold, border: "none", borderRadius: 10, padding: "13px", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {suggestStatus === "sending" ? "Sending…" : "Send suggestion"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BOOKING DETAIL PAGE ───────────────────────────── */}
      {craftDetail && (
        <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 290, overflowY: "auto" }}>
          {/* Hero */}
          <div style={{ height: 200, background: `${craftDetail.color}22`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <span style={{ fontSize: 72 }}>{craftDetail.emoji}</span>
            <button onClick={() => setCraftDetail(null)}
              style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", left: 14, background: "rgba(10,15,30,0.7)", border: "none", color: "#fff", borderRadius: 100, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              ‹ Back
            </button>
            <div style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", right: 14, background: craftDetail.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "5px 11px", borderRadius: 100, textTransform: "uppercase" }}>{craftDetail.type}</div>
          </div>

          <div style={{ padding: "20px 20px 40px", maxWidth: 620, margin: "0 auto" }}>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.1, marginBottom: 6 }}>{craftDetail.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{craftDetail.location} · {travelLabel(userCoords, craftDetail.location, craftDetail.travelTime)}{craftDetail.rating && <span> · <span style={{ color: C.gold, fontWeight: 700 }}>★ {craftDetail.rating}</span></span>}</div>
            {craftDetail.popularityTag && (
              <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: craftDetail.popularityTag === "Hidden Gem" ? C.gold : C.muted, background: craftDetail.popularityTag === "Hidden Gem" ? `${C.gold}22` : C.surface, border: `1px solid ${craftDetail.popularityTag === "Hidden Gem" ? C.gold : C.border}`, padding: "4px 11px", borderRadius: 100, marginBottom: 18 }}>
                {craftDetail.popularityTag === "Hidden Gem" ? "◆ Hidden Gem" : "○ Common Attraction"}
              </span>
            )}

            {/* Price block */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Price</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{craftDetail.price || "Price on request"}</div>
              {craftDetail.priceNote && <div style={{ fontSize: 12, color: C.light, marginTop: 4 }}>{craftDetail.priceNote}</div>}
              <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>Prices are indicative and confirmed with the workshop before you pay. Nothing is charged through Gemlyx.</div>
            </div>

            <AtAGlanceCard rows={[
              { icon: "⏱️", label: "Time Needed", value: craftDetail.timeNeeded },
              { icon: "♿", label: "Accessibility", value: craftDetail.accessibility },
              { icon: "🚆", label: "Nearest Station", value: craftDetail.nearestStation },
            ]} />
            {craftDetail.gemlyxFind && <GemlyxFindCard text={craftDetail.gemlyxFind} />}

            <div style={{ fontSize: 14, color: C.light, lineHeight: 1.75, marginBottom: 22 }}>{craftDetail.desc}</div>

            {craftDetail.blogBody && craftDetail.blogBody.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                {craftDetail.blogBody.map((block, i) => (
                  block.type === "bullets" ? (
                    <ul key={i} style={{ margin: "0 0 16px", paddingLeft: 20, color: C.light, fontSize: 14, lineHeight: 1.75 }}>
                      {block.items.map((it, j) => <li key={j} style={{ marginBottom: 4 }}>{it}</li>)}
                    </ul>
                  ) : block.type === "instagram" ? (
                    <InstagramEmbed key={i} url={block.url} />
                  ) : block.type === "video" ? (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <video src={block.src} controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 14, display: "block", background: "#000" }} />
                      {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
                    </div>
                  ) : block.type === "image" ? (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <img src={block.src} alt={craftDetail.name} onError={e => { e.target.style.display = "none"; }}
                        style={{ width: "100%", borderRadius: 14, display: "block" }} />
                      {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
                    </div>
                  ) : block.type === "heading" ? (
                    <div key={i} style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginTop: 20, marginBottom: 10 }}>{block.content}</div>
                  ) : (
                    <div key={i} style={{ fontSize: 14, color: C.light, lineHeight: 1.8, marginBottom: 14 }}>{block.content}</div>
                  )
                ))}
              </div>
            )}

            {craftDetail.bestTime && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>◷ Best Time to Arrive</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>{craftDetail.bestTime}</div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(craftDetail.mapHint)}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: C.gold, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  Check today's live crowd levels on Google Maps ↗
                </a>
              </div>
            )}

            {craftDetail.transportWarning && (
              <div style={{ background: "#3D2A0A", border: "1px solid #FFB347", borderRadius: 14, padding: "16px", marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>🚲</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#FFB347", letterSpacing: 1, textTransform: "uppercase" }}>No car or bike? Read this</span>
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{craftDetail.transportWarning}</div>
              </div>
            )}

            <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>What you can make</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 26 }}>
              {(craftDetail.what || []).map(w => (
                <span key={w} style={{ fontSize: 12, color: C.text, background: C.surface, border: `1px solid ${C.border}`, padding: "7px 13px", borderRadius: 100 }}>{w}</span>
              ))}
            </div>

            {craftDetail.recommendedPackage && (
              <div style={{ background: `${craftDetail.color}18`, border: `1px solid ${craftDetail.color}`, borderRadius: 14, padding: "16px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>★</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: craftDetail.color, letterSpacing: 1, textTransform: "uppercase" }}>Recommended Package</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 }}>{craftDetail.recommendedPackage.name}</div>
                <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6 }}>{craftDetail.recommendedPackage.reason}</div>
              </div>
            )}

            {craftDetail.ticketOptions && craftDetail.ticketOptions.length > 0 && (
              <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Ticket Options</div>
                {craftDetail.ticketOptions.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: i < craftDetail.ticketOptions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontSize: 13, color: C.text }}>{t.name}</span>
                    <span style={{ fontSize: 13, color: C.gold, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{t.price}</span>
                  </div>
                ))}
              </div>
            )}

            {craftDetail.upcomingEvents && craftDetail.upcomingEvents.length > 0 && (
              <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Upcoming Events This Season</div>
                {craftDetail.upcomingEvents.map((ev, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: i < craftDetail.upcomingEvents.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontSize: 13, color: C.text }}>{ev.name}</span>
                    <span style={{ fontSize: 12, color: C.gold, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{ev.dates}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => checkLiveInfo(craftDetail)} disabled={liveInfoLoading === craftDetail.name}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: liveInfo?.[craftDetail.name] ? 12 : 14 }}>
              {liveInfoLoading === craftDetail.name ? "Checking..." : "🔍 Check live info"}
            </button>
            {liveInfo?.[craftDetail.name] && (
              <div style={{ background: `${craftDetail.color}18`, border: `1px solid ${craftDetail.color}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                {liveInfo[craftDetail.name]}
              </div>
            )}

            {craftDetail.bookingType === "online" ? (
              <>
                <a href={craftDetail.bookingUrl} target="_blank" rel="noreferrer"
                  style={{ display: "block", textAlign: "center", width: "100%", background: C.accent, borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Book Online ↗
                </a>
                <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>Books directly with {craftDetail.name.split(" — ")[0]} — instant confirmation</div>
              </>
            ) : (
              <>
                <button onClick={() => { setCraftModal(craftDetail); setCraftStatus(null); setCraftDetail(null); }}
                  style={{ width: "100%", background: C.accent, border: "none", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Send Booking Request
                </button>
                <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>No online booking here — we'll reach out to confirm with them personally</div>
              </>
            )}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(craftDetail.mapHint || craftDetail.location)}`} target="_blank" rel="noreferrer"
              style={{ display: "block", textAlign: "center", marginTop: 14, color: C.light, fontSize: 13, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "4px" }}>
              Get Directions →
            </a>
            <ReviewsSection itemType="booking" itemName={craftDetail.name} />
          </div>
        </div>
      )}

      {/* ── CRAFT REQUEST MODAL ───────────────────────────── */}
      {craftModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={() => setCraftModal(null)}>
          <div style={{ background: C.bg, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, margin: "0 auto", maxHeight: "88vh", overflowY: "auto", padding: "22px 20px 36px" }} onClick={e => e.stopPropagation()}>
            {craftStatus !== "sent" ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, marginBottom: 2 }}>{craftModal.emoji} {craftModal.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{craftModal.location} · {craftModal.travelTime} from CPH</div>
                <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 18 }}>Tell us what you'd like to book — we'll confirm availability and price with the workshop and reply personally.</div>

                {[
                  { key: "name", label: "Your name", ph: "Anna Schmidt" },
                  { key: "email", label: "Email *", ph: "you@email.com" },
                  { key: "interest", label: "What would you like to book? *", ph: "e.g. blacksmithing workshop for 2, custom ceramics..." },
                  { key: "visit", label: "When are you visiting?", ph: "e.g. mid-August 2026" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.light, marginBottom: 6 }}>{f.label}</div>
                    <input value={craftForm[f.key]} onChange={e => setCraftForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.ph}
                      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 13, color: C.text, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                  </div>
                ))}

                {craftStatus === "invalid" && <div style={{ fontSize: 12, color: "#ff6666", marginBottom: 10 }}>Please fill in your email and what you'd like to book.</div>}
                {craftStatus === "fallback" && (
                  <div style={{ fontSize: 12, color: C.light, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                    Couldn't send directly — <a href={craftMailto()} style={{ color: C.gold, fontWeight: 700 }}>tap here to send via your email app</a> instead.
                  </div>
                )}

                <button onClick={sendCraftRequest} disabled={craftStatus === "sending"}
                  style={{ width: "100%", background: C.accent, border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 4 }}>
                  {craftStatus === "sending" ? "Sending..." : "Send request"}
                </button>
                <button onClick={() => setCraftModal(null)}
                  style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8 }}>
                  Cancel
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "26px 0 10px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, marginBottom: 6 }}>Booking request sent!</div>
                <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 20 }}>We'll connect you with {craftModal.name} and reply to {craftForm.email} personally.</div>
                <button onClick={() => { setCraftModal(null); setCraftForm({ name: "", email: "", interest: "", visit: "" }); }}
                  style={{ background: C.accent, border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL ─────────────────────────────────── */}
      {selectedProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end" }} onClick={() => setSelectedProduct(null)}>
          <div style={{ background: C.bg, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, margin: "0 auto", maxHeight: "88vh", overflowY: "auto", paddingBottom: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ height: 200, background: `${selectedProduct.color}22`, position: "relative", borderRadius: "24px 24px 0 0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64 }}>
              {selectedProduct.photo ? <img src={selectedProduct.photo} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : selectedProduct.emoji}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: selectedProduct.color }} />
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>{selectedProduct.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, textTransform: "uppercase" }}>{selectedProduct.shop}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ background: `${selectedProduct.color}22`, color: selectedProduct.color, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 100 }}>◆ {selectedProduct.exclusive}</span>
                {selectedProduct.trending && <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>↗ TRENDING</span>}
                {selectedProduct.locationType === "popup" && <span style={{ fontSize: 11, fontWeight: 700, color: "#FF9966", background: "#FF996622", padding: "4px 10px", borderRadius: 100 }}>⚠ Pop-up</span>}
                {selectedProduct.locationType === "seasonal" && <span style={{ fontSize: 11, fontWeight: 700, color: "#FFB347", background: "#FFB34722", padding: "4px 10px", borderRadius: 100 }}>◷ Seasonal</span>}
              </div>
              {selectedProduct.verified && <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>✓ Last verified {selectedProduct.verified}</div>}
              <div style={{ fontSize: 26, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif", marginBottom: 12 }}>{selectedProduct.price}</div>
              <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7, marginBottom: 16 }}>{selectedProduct.desc}</div>
              <div style={{ marginBottom: 16, background: C.surface, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Still here?</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {stillHereMap[selectedProduct.id]?.count ? `✓ Confirmed by ${stillHereMap[selectedProduct.id].count} traveler${stillHereMap[selectedProduct.id].count > 1 ? "s" : ""} · ${stillHereMap[selectedProduct.id].date}` : "Be the first to confirm"}
                    </div>
                  </div>
                  <button onClick={() => confirmStillHere(selectedProduct.id)} disabled={stillHereMap[selectedProduct.id]?.userConfirmed}
                    style={{ background: stillHereMap[selectedProduct.id]?.userConfirmed ? "#1A3320" : C.accent, color: stillHereMap[selectedProduct.id]?.userConfirmed ? "#4CAF50" : "#fff", border: "none", borderRadius: 100, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0, marginLeft: 12 }}>
                    {stillHereMap[selectedProduct.id]?.userConfirmed ? "✓ Confirmed!" : "📍 Still here!"}
                  </button>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 700, color: C.muted, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 100, padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
