import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { craftItemsFallback } from "./data/craft.js";
import { events } from "./data/events.js";
import { majorEvents } from "./data/majorEvents.js";
import { vikingEvents } from "./data/vikingEvents.js";
import { towns } from "./data/towns.js";
import { freeEntrance } from "./data/freeEntrance.js";
import { nightlifeSpots } from "./data/nightlife.js";
import { foodSpots } from "./data/food.js";
import { essentials } from "./data/essentials.js";
import { handmadeCraftShops } from "./data/handmade.js";
import { roadTrips } from "./data/roadTrips.js";
import { seasonalItineraries } from "./data/seasonalItineraries.js";
import { C } from "./theme.js";
import { getSeason, getEventDate, isUpcoming, isCurrentlyLive } from "./utils/dateHelpers.js";
import { weatherIcon } from "./utils/weatherIcon.js";
import { TOWN_COORDS, DK_SHAPES, dkProject, DK_PATHS } from "./utils/mapGeometry.js";
import { WEATHER_CITIES } from "./data/weatherCities.js";
import { DetailPage } from "./components/DetailPage.jsx";
import { WeatherStrip } from "./components/WeatherStrip.jsx";
import { DKLocator } from "./components/DKLocator.jsx";
import { LeafletMap } from "./components/LeafletMap.jsx";
import { PageHero } from "./components/PageHero.jsx";
import { LiveEventsHeaderStrip } from "./components/LiveEventsHeaderStrip.jsx";
import { WeatherHeaderStrip } from "./components/WeatherHeaderStrip.jsx";
import { StoreBadge } from "./components/StoreBadge.jsx";

const SUPABASE_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZhaGpuZXJra2tvdWVvdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzQ4OTYsImV4cCI6MjA5NTMxMDg5Nn0.-GgXeog0DufIz6WNXn_8pIzxmQfkHRK3Lz8V71O-v_c";

// ─── COLORS ───────────────────────────────────────────────────

const cities = [
  { id: 4, name: "Copenhagen", country: "Denmark", flagCode: "dk", color: C.accent, tag: "Nordic Minimal", vibe: "Quiet luxury, built to last forever", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
    products: [
      { id: 13, verified: "May 2026", locationType: "permanent", name: "Samsøe Samsøe Wool Coat", shop: "Flagship · Strøget", price: "DKK 3,200", category: "Fashion", exclusive: "DK exclusive", emoji: "🧥", trending: false, isNew: false, desc: "Flagship carries colourways never exported abroad. You won't find these online.", mapHint: "Strøget, Copenhagen", photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80" },
      { id: 14, verified: "May 2026", locationType: "permanent", name: "Norse Projects Gore-Tex", shop: "Norse Projects · Pilestræde", price: "DKK 4,800", category: "Fashion", exclusive: "Flagship colourway", emoji: "🧥", trending: true, isNew: false, desc: "Seasonal colourways exclusive to Pilestræde. Never restocked online.", mapHint: "Pilestræde, Copenhagen", photo: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&q=80" },
      { id: 15, verified: "May 2026", locationType: "permanent", name: "Ganni Archive Dress", shop: "Ganni Flagship · Amagertorv", price: "DKK 2,100", category: "Fashion", exclusive: "Archive collection", emoji: "👗", trending: false, isNew: true, desc: "Archive collection only at the Copenhagen flagship. Not available online.", mapHint: "Amagertorv, Copenhagen", photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80" },
      { id: 21, verified: "Jun 2026", locationType: "permanent", name: "Wood Wood Collab Tee", shop: "Wood Wood · Grønnegade", price: "DKK 699", category: "Fashion", exclusive: "Copenhagen only", emoji: "👕", trending: true, isNew: false, desc: "Copenhagen's most respected streetwear label. Collaboration drops only in-store.", mapHint: "Grønnegade, Copenhagen", photo: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80" },
      { id: 22, verified: "Jun 2026", locationType: "permanent", name: "HAY Ceramic Mug Set", shop: "HAY House · Østergade", price: "DKK 450", category: "Accessories", exclusive: "Flagship colourway", emoji: "🏺", trending: false, isNew: true, desc: "HAY's own flagship carries colourways and sets not sold elsewhere.", mapHint: "Østergade 61, Copenhagen", photo: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80" },
      { id: 23, verified: "Jun 2026", locationType: "permanent", name: "Nørr11 Leather Bag", shop: "Nørr11 · Nørrebro", price: "DKK 3,800", category: "Bags", exclusive: "Made in Copenhagen", emoji: "👜", trending: false, isNew: false, desc: "Small Copenhagen leather atelier. Every bag handmade locally. No webshop.", mapHint: "Nørrebrogade, Copenhagen", photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80" },
    ]
  },
];

const allProducts = cities.flatMap(c => c.products.map(p => ({ ...p, city: c.name, color: c.color })));












const campingSpots = [
  { id: 1, name: "Bøtø Nor Shelter", region: "South Zealand", emoji: "⛺", type: "Free shelter", desc: "Free-to-use wooden shelter right on the coast near Præstø — first come first served, no booking, no fee. Bring your own everything.", travelTime: "1h 20min drive", mapHint: "Bøtø Nor, 4780 Stege, Denmark", color: "#2E7D32", vibe: "🔥 Completely free — locals-only secret" },
  { id: 2, name: "Rørvig Camping", region: "North Zealand", emoji: "🏕", type: "Campsite", desc: "Beachfront campsite near the Odsherred coast — pitch a tent metres from the water. Popular with Danes, almost unknown to tourists.", travelTime: "1h 30min drive", mapHint: "Rørvig Camping, 4581 Rørvig, Denmark", color: "#1565C0", vibe: "🌊 For sleeping to the sound of waves" },
  { id: 3, name: "Skagen Klitplantage", region: "North Jutland", emoji: "🌲", type: "Primitive camping", desc: "Free primitive camping (\"Naturstyrelsen\" spots) in dune forest between Skagen's two seas. Marked pitches, composting toilets, nothing else.", travelTime: "4h drive", mapHint: "Skagen Klitplantage, 9990 Skagen, Denmark", color: "#6A1B9A", vibe: "🌲 Recommended for nature & traditional life" },
  { id: 4, name: "Mols Bjerge Shelters", region: "East Jutland", emoji: "⛰", type: "Free shelter", desc: "Hilltop shelters in Denmark's only \"mountain\" national park. Short hike in, real silence, some of the best stargazing in the country.", travelTime: "3h 15min drive", mapHint: "Mols Bjerge National Park, 8400 Ebeltoft, Denmark", color: "#E65100", vibe: "✨ Best stargazing spot in Denmark" },
];



const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

const PRODUCT_COORDS = {
  13: [55.6761, 12.5683], 14: [55.6780, 12.5700], 15: [55.6750, 12.5760],
  21: [55.6820, 12.5710], 22: [55.6795, 12.5830], 23: [55.6980, 12.5500],
};





// ─── MAPS (Google-free) ──────────────────────────────────────
// Town-centre coordinates (approximate, town-level) for the SVG locator maps.

// Simplified Denmark coastline polygons as [lat, lon] vertices (Jutland, Funen, Zealand, Lolland-Falster, Bornholm)

// Equirectangular projection scaled to km at Denmark's latitude, so proportions stay honest.

// Tiny self-drawn Denmark locator — replaces the old Google mini-map iframes.
// Zero network requests, no API keys, no tile-usage-policy concerns.

// One real interactive map (Explore tab) — Leaflet + OpenStreetMap tiles. Free, no key, no billing account.





const APP_VERSION = "v2.79 — FIX: DetailPage missing getEventDate import (caused blank screen)";

export default function Gemlyx() {
  useEffect(() => { console.log("Gemlyx", APP_VERSION); }, []);
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(item.name + " " + (item.location || item.town || "") + " opening hours events 2026")}`);
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
  const [craftForm, setCraftForm] = useState({ name: "", email: "", interest: "", visit: "" });
  const [craftStatus, setCraftStatus] = useState(null);
  const [emailSignup, setEmailSignup] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your Local Assist ◆ Tell me where you're heading — or what you're after — and I'll find you something that exists nowhere else." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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

  const TAB_ORDER = ["home", "essentials", "plans", "craft", "attractions", "events", "food", "nightlife", "roadtrips", "visits", "ai"];
  // Single source of truth for nav labels — same order as TAB_ORDER, so swipe and nav can never drift apart again.
  const NAV_ITEMS = [
    { id: "home", label: "🧭 Explore" },
    { id: "essentials", label: "✓ Essentials" },
    { id: "plans", label: "🗺 Plans" },
    { id: "craft", label: "◈ Booking" },
    { id: "attractions", label: "🆓 Free Entrance" },
    { id: "events", label: "◈ Events" },
    { id: "food", label: "🍽 Food" },
    { id: "nightlife", label: "🍺 Nightlife" },
    { id: "roadtrips", label: "🚗 Road Trips" },
    { id: "visits", label: "◉ Towns" },
    { id: "ai", label: "✦ Ask AI" },
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

  const requestLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
      () => setLocationLoading(false), { enableHighAccuracy: true }
    );
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

  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput("");
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

      const sysPrompt = `You are Local Assist — Gemlyx's AI trip-planning guide for Denmark. Today is ${monthName} (${season} season in Denmark). Be warm, concise, and specific — recommend real things from the lists below, never invent places. When planning multi-day trips, consider the season: winter (Dec-Feb) favors museums/indoor craft and avoids camping or long bike routes; summer (Jun-Aug) is festival season and best for road trips/camping.

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
            {daysUntil(event.date) <= 0 ? "Happening now" : daysUntil(event.date) === 1 ? "Tomorrow" : `${daysUntil(event.date)} days away`}
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
        <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>★ {event.rating}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{event.travelTime} from CPH</span>
        {event.ticketStatus === "sold_out" && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff4444", background: "#ff444422", padding: "3px 9px", borderRadius: 100 }}>🔴 Sold out</span>}
        {event.ticketStatus === "selling_fast" && <span style={{ fontSize: 10, fontWeight: 700, color: "#FFB347", background: "#FFB34722", padding: "3px 9px", borderRadius: 100 }}>🟡 Selling fast</span>}
        {event.ticketStatus === "available" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "3px 9px", borderRadius: 100 }}>🟢 Available</span>}
        {event.ticketStatus === "free" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "3px 9px", borderRadius: 100 }}>✓ Free entry</span>}
      </div>
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
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>✦ Overwhelmed? Let me help you.</div>
                </div>

                {aiMessages.length > 1 && (
                  <div className="ai-msgs" style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12, WebkitOverflowScrolling: "touch" }}>
                    {aiMessages.slice(1).map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                        <div style={{ maxWidth: "82%", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5, background: m.role === "user" ? C.accent : C.bg, color: "#fff", border: m.role === "user" ? "none" : `1px solid ${C.border}` }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {aiLoading && <div style={{ background: C.bg, borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, display: "inline-block", marginBottom: 10 }}>thinking...</div>}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  {["Plan my 3 days in Denmark", "Exclusive fashion in Copenhagen", "Best craft to commission"].map(s => (
                    <button key={s} onClick={() => setAiInput(s)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", fontSize: 11, color: C.light, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>{s}</button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAI()}
                    placeholder="Ask me anything about Denmark..."
                    style={{ flex: 1, border: `1.5px solid ${C.accent}`, borderRadius: 100, padding: "11px 16px", fontSize: 13, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                  <button onClick={sendAI} disabled={aiLoading} style={{ background: C.accent, border: "none", borderRadius: 100, width: 44, height: 44, cursor: "pointer", fontSize: 16, flexShrink: 0, color: "#fff" }}>↗</button>
                </div>
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
                { id: "plans", img: "/picture4.png", title: "Plans", sub: "Ready-made trips, built from what's actually open right now", icon: "🗺" },
                { id: "food", img: "/picture5.jpg", title: "Food", sub: "From a 1965 hot dog cart to Copenhagen's biggest food market", icon: "🍽" },
                { id: "nightlife", img: "/picture3.png", title: "Nightlife", sub: "Where Danes actually drink, vs. where tourists do", icon: "🍺" },
                { id: "roadtrips", img: "/picture1.jpg", title: "Road Trips", sub: "The drive is half the adventure", icon: "🚗" },
                { id: "visits", img: "/picture4.png", title: "Towns", sub: "Denmark's most beautiful hidden towns", icon: "◉" },
                { id: "craft", img: "/picture9.jpg", title: "Booking", sub: "Book workshops, tickets & commissions", icon: "◈" },
                { id: "attractions", img: "/picture7.jpg", title: "Free Entrance", sub: "Genuinely free places worth your time, city by city", icon: "🆓" },
                { id: "ai", img: "/picture9.jpg", title: "Ask AI", sub: "Your personal Denmark guide — plans trips, checks what's live", icon: "✦" },
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

              {aiHelperBlock()}

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
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6, opacity: 0.6 }}>v2.79 — Jul 2026</div>
              </div>
            </div>
          )}

          {/* ── EXPLORE ──────────────────────────────────────── */}

          {/* ── CRAFT ────────────────────────────────────────── */}
          {tab === "craft" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Booking</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>These are options we highly recommend pre-booking — museums, workshops and tickets that sell out or need advance planning. Prices shown are per person unless noted.</div>
                <div style={{ fontSize: 12, color: "#4CAF50", background: "#4CAF5022", border: "1px solid #4CAF50", borderRadius: 10, padding: "8px 12px", marginTop: 10, display: "inline-block" }}>
                  Looking for something free instead? Check the Free Entrance tab.
                </div>
              </div>

              {/* Filters */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Type</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}>
                  {["All", "Major", "Local"].map(t => (
                    <Pill key={t} label={t} active={(t === "All" && !craftType) || craftType === t} onClick={() => setCraftType(t === "All" ? null : (craftType === t ? null : t))} />
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Craft</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}>
                  {["All", "Blacksmithing", "Ceramics", "Jewellery", "Leather", "Textiles", "Woodwork", "Candy"].map(k => (
                    <Pill key={k} label={k} active={(k === "All" && !craftKind) || craftKind === k} onClick={() => setCraftKind(k === "All" ? null : (craftKind === k ? null : k))} />
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Booking speed</div>
                <Pill label="Bookable online only" active={bookableOnly} onClick={() => setBookableOnly(v => !v)} color="#4CAF50" />
              </div>

              {/* Grid */}
              {(() => {
                const kindKeys = { Blacksmithing: ["blacksmith"], Ceramics: ["ceramic", "pottery"], Jewellery: ["jewellery"], Leather: ["leather"], Textiles: ["textile", "dyeing", "felting"], Woodwork: ["wood"], Candy: ["candy"] };
                const filtered = craftItems.filter(cr => {
                  const typeOk = !craftType || cr.type === craftType;
                  const kindOk = !craftKind || cr.what.some(w => (kindKeys[craftKind] || []).some(k => w.toLowerCase().includes(k)));
                  const bookOk = !bookableOnly || cr.bookingType === "online";
                  return typeOk && kindOk && bookOk;
                }).sort((a, b) => (b.rating || 0) - (a.rating || 0));
                if (craftLoading) return <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>Loading craft spots...</div>;
                if (filtered.length === 0) return <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>No craft spots match — try another filter</div>;
                return (
                  <div>
                    {filtered.map(craft => (
                      <div key={craft.id} onClick={() => setCraftDetail(craft)} style={{ background: C.surface, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 14, cursor: "pointer" }}>
                        <div style={{ height: 160, position: "relative", background: `linear-gradient(135deg, ${craft.color}33 0%, #0A0F1E 100%)` }}>
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, opacity: 0.25 }}>{craft.emoji}</span>
                          {craft.photo && <img src={craft.photo} alt={craft.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />}
                          <div style={{ position: "absolute", top: 10, left: 10, background: craft.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 100, textTransform: "uppercase", letterSpacing: 0.5 }}>{craft.type}</div>
                          {craft.rating && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(10,15,30,0.8)", color: C.gold, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 100 }}>★ {craft.rating}</div>}
                          {craft.popularityTag === "Hidden Gem" && <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(10,15,30,0.85)", color: C.gold, fontSize: 9, fontWeight: 700, padding: "4px 9px", borderRadius: 100 }}>◆ Hidden Gem</div>}
                          {craft.transportWarning && <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(61,42,10,0.9)", color: "#FFB347", fontSize: 13, padding: "4px 7px", borderRadius: 8 }} title="Limited public transport">🚲</div>}
                        </div>
                        <div style={{ padding: "14px 16px 16px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 3 }}>
                            <div style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.15 }}>{craft.name}</div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{craft.price || "On request"}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{craft.location} · {craft.travelTime} from CPH{craft.priceNote ? ` · ${craft.priceNote}` : ""}</div>
                          <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{craft.desc.slice(0, 110)}{craft.desc.length > 110 ? "…" : ""}</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.light, fontSize: 13, fontWeight: 700 }}>
                              Read more <span style={{ fontSize: 15 }}>›</span>
                            </div>
                            {craft.bookingType === "online" && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "4px 9px", borderRadius: 100 }}>● Book online</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {aiHelperBlock()}
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
                        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                          {a.popularityTag && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: a.popularityTag === "Hidden Gem" ? C.gold : C.muted, background: a.popularityTag === "Hidden Gem" ? `${C.gold}22` : C.bg, padding: "3px 8px", borderRadius: 100 }}>
                              {a.popularityTag === "Hidden Gem" ? "◆ Hidden Gem" : "○ Common Attraction"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: a.color, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 8 }}>{a.type}</div>
                      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{a.desc.slice(0, 100)}{a.desc.length > 100 ? "…" : ""}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.light, fontSize: 12, fontWeight: 700 }}>
                        Read more <span style={{ fontSize: 14 }}>›</span>
                      </div>
                    </div>
                  </div>
                </div>
              )))}
              {aiHelperBlock()}
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
                  {(eventTab === "local" ? ["All", "Festival", "Market", "Concert", "North Zealand"] : eventTab === "viking" ? ["All", "Market", "Battle & Market", "Craftsmen Gathering", "Market & Combat"] : ["All", "Music", "Cultural"]).map(f => (
                    <Pill key={f} label={f} active={(f === "All" && !eventType) || eventType === f} onClick={() => setEventType(f === "All" ? null : (eventType === f ? null : f))} />
                  ))}
                </div>
              </div>
              {filteredEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>No upcoming events — try a different filter</div>
              ) : filteredEvents.map(e => <EventCard key={e.id} event={e} />)}
              {aiHelperBlock()}
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
              {aiHelperBlock()}
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
              {aiHelperBlock()}
            </div>
          )}

          {/* ── ROAD TRIPS ───────────────────────────────────── */}
          {tab === "roadtrips" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Road Trips</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>Denmark rewards the drive as much as the destination. These routes turn a transit day into the best part of the trip — real stops, real detours, worth the extra hour.</div>
              </div>

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

              {aiHelperBlock()}
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
                    <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 }}>{town.region} · {town.travelTime}</div>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 7 }}>{town.tag}</div>
                    <div style={{ fontSize: 12, color: C.light, lineHeight: 1.65, marginTop: 6 }}>{town.desc.slice(0, 90)}{town.desc.length > 90 ? "…" : ""}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.text, fontSize: 12, fontWeight: 700, padding: "10px 0 2px" }}>
                      Read more <span style={{ fontSize: 14 }}>›</span>
                    </div>
                  </div>
                ))}
              </div>
              {aiHelperBlock()}
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
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Ask AI</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>Your personal Denmark guide — plans your trip, and can check what's actually happening right now. Live events are tracked in the header on every page.</div>
              </div>

              {aiHelperBlock()}
            </div>
          )}

          {/* ── PLANS ────────────────────────────────────────── */}
          {tab === "plans" && (
            <div className={pageAnim} style={{ padding: "16px" }}>
              <div style={{ marginBottom: 18, paddingTop: 8 }}>
                <div style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.05, marginBottom: 10 }}>Recommendations</div>
                <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560 }}>
                  Three complete, day-by-day routes across Denmark's seasons. It's {new Date().toLocaleString("en", { month: "long" })} — the one that fits right now is marked, the rest are here for whenever you're planning ahead.
                </div>
              </div>
              <PageHero src="/plans.jpg" emoji="🗺" color={C.accent} />

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

              <div style={{ background: C.surface, borderRadius: 16, padding: "18px", border: `1px solid ${C.accent}`, marginBottom: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 }}>✦ Want something more specific?</div>
                <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 12 }}>Tell the AI Guide below your dates, how you're travelling and what you're into — it'll build a real day-by-day plan from everything currently in Gemlyx.</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["Plan me 3 days, no car", "I have a bike, what's best in " + new Date().toLocaleString("en", { month: "long" }), "Plan a family weekend with kids"].map(s => (
                    <button key={s} onClick={() => { setAiInput(s); goTab("ai"); }}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "7px 14px", fontSize: 12, color: C.light, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {s}
                    </button>
                  ))}
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
              {aiHelperBlock()}
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
        .products-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (min-width: 600px) { .products-grid { grid-template-columns: 1fr 1fr 1fr; } }
        @media (min-width: 900px) { .products-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
      `}</style>

      <div style={{ flexShrink: 0, position: "relative", zIndex: 100 }}>
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "calc(14px + env(safe-area-inset-top)) 16px 10px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo */}
          <div onClick={() => goTab("home")} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text, letterSpacing: -0.5 }}>◆ Gemlyx</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>It exists nowhere else</div>
          </div>

          {/* Right icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Search */}
            
            {/* Login (mobile only — sits next to hamburger nav) */}
            <button className="mobile-only" onClick={() => { setToast("👤 Login coming soon"); setTimeout(() => setToast(null), 2200); }}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 8 }} title="Login">
              👤
            </button>
            {/* Hamburger menu — full navigation on mobile */}
            <button onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: "pointer", padding: "6px 10px", borderRadius: 8, display: "flex", gap: 4, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 16, height: 2, background: C.muted, borderRadius: 2 }} />
              <div style={{ width: 16, height: 2, background: C.muted, borderRadius: 2 }} />
              <div style={{ width: 16, height: 2, background: C.muted, borderRadius: 2 }} />
            </button>
          </div>
        </div>

        {/* Search bar — always visible */}
        <div style={{ marginTop: 12, position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.2" y2="16.2" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cities, businesses, finds..."
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px 12px 40px", fontSize: 14, color: C.text, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>

        {/* Weather — always visible, multiple cities, auto-loads */}
        <WeatherHeaderStrip weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
        <LiveEventsHeaderStrip liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} />

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

      {/* ── TOP NAV TABS (desktop only — mobile uses hamburger) ──── */}
      {(
        <div className="desktop-only" style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, position: "relative" }}>
          <div onScroll={e => setTabArrow(e.target.scrollLeft + e.target.clientWidth < e.target.scrollWidth - 8)}
            style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", padding: "0 8px", minWidth: "max-content", alignItems: "center" }}>
            {NAV_ITEMS.map(item => item.id === "ai" ? (
              <button key={item.id} onClick={() => goTab("ai")}
                style={{ background: active === "ai" ? "#fff" : `linear-gradient(135deg, ${C.gold}, ${C.accent})`, border: "none", color: active === "ai" ? C.accent : "#fff", padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", borderRadius: 100, margin: "8px", boxShadow: active === "ai" ? "none" : `0 2px 10px ${C.gold}44` }}>
                {item.label}
              </button>
            ) : (
              <button key={item.id} onClick={() => goTab(item.id)}
                style={{ background: "none", border: "none", borderBottom: `2px solid ${active === item.id ? C.accent : "transparent"}`, color: active === item.id ? C.text : C.muted, padding: "12px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {item.label}
              </button>
            ))}
          </div>
          </div>
          {tabArrow && (
            <div className="mobile-only" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 56, background: `linear-gradient(to right, transparent, ${C.bg} 70%)`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10, pointerEvents: "none" }}>
              <span style={{ color: C.light, fontSize: 18, fontWeight: 700, animation: "nudge 1.4s ease-in-out infinite" }}>›</span>
            </div>
          )}
        </div>
      )}
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

      <DetailPage item={eventDetail} onClose={() => setEventDetail(null)} kind="event" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} />
      <DetailPage item={townDetail} onClose={() => setTownDetail(null)} kind="town" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} />
      <DetailPage item={nightlifeDetail} onClose={() => setNightlifeDetail(null)} kind="nightlife" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} />
      <DetailPage item={freeDetail} onClose={() => setFreeDetail(null)} kind="free" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} />
      <DetailPage item={foodDetail} onClose={() => setFoodDetail(null)} kind="food" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} />

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
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{craftDetail.location} · {craftDetail.travelTime} from CPH{craftDetail.rating && <span> · <span style={{ color: C.gold, fontWeight: 700 }}>★ {craftDetail.rating}</span></span>}</div>
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

            <div style={{ fontSize: 14, color: C.light, lineHeight: 1.75, marginBottom: 22 }}>{craftDetail.desc}</div>

            {craftDetail.blogBody && craftDetail.blogBody.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                {craftDetail.blogBody.map((block, i) => (
                  block.type === "image" ? (
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
