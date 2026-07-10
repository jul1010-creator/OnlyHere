import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZhaGpuZXJra2tvdWVvdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzQ4OTYsImV4cCI6MjA5NTMxMDg5Nn0.-GgXeog0DufIz6WNXn_8pIzxmQfkHRK3Lz8V71O-v_c";

// ─── COLORS ───────────────────────────────────────────────────
const C = {
  bg: "#0A0F1E",         // deep navy
  surface: "#111827",    // card background
  border: "#1E2A3A",     // border
  accent: "#C8102E",     // Danish red
  gold: "#D4AF37",       // gold accent
  text: "#F0F4FF",       // primary text
  muted: "#6B7A99",      // muted text
  light: "#9AA5BE",      // light text
};

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

const craftItems = [
  { id: 1, name: "Viking Ship Museum", location: "Roskilde", type: "Major", emoji: "⚓", travelTime: "25min 🚂", desc: "Watch boatbuilders reconstruct Viking ships using historic techniques. Try rope making, blacksmithing, textile crafts and woodcarving — daily June to September.", what: ["Rope making", "Blacksmithing", "Textile crafts", "Woodcarving"], color: "#1565C0", mapHint: "Vikingeskibsmuseet, Vindeboder 12, 4000 Roskilde, Denmark" },
  { id: 2, name: "Moesgaard Viking Days", location: "Aarhus", type: "Major", emoji: "🛡", travelTime: "3h 🚂", desc: "Four days of hands-on Viking craft at Moesgaard Museum. Try blacksmithing, plant dyeing, felting, coin minting and bow shooting.", what: ["Blacksmithing", "Plant dyeing", "Felting", "Coin minting"], color: "#6A1B9A", mapHint: "Moesgaard Museum, 8270 Højbjerg, Aarhus, Denmark" },
  { id: 3, name: "Viking Center Ribe", location: "Ribe", type: "Local", emoji: "🪖", travelTime: "3h 15min 🚂", desc: "Denmark's oldest town has on-site craftspeople making authentic Viking jewellery, leather goods and metalwork. Buy directly or commission something custom.", what: ["Jewellery", "Leather working", "Metalwork", "Textiles"], color: C.accent, mapHint: "Viking Center Ribe, 6760 Ribe, Denmark" },
  { id: 4, name: "Bornholm Ceramics", location: "Bornholm", type: "Local", emoji: "🏺", travelTime: "2h + ferry 🚢", desc: "The island of Bornholm has more ceramics workshops per capita than anywhere in Denmark. Several potters take commissions.", what: ["Hand-thrown ceramics", "Glazed pottery", "Custom commissions"], color: "#E65100", mapHint: "Nexø, 3730 Bornholm, Denmark" },
  { id: 5, name: "Sømods Bolcher", location: "Copenhagen", type: "Local", emoji: "🍬", travelTime: "In Copenhagen 🚇", desc: "Royal Court candy makers since 1891. Watch them pull traditional hard candy by hand at Nørregade 24 — a craft unchanged for 130 years.", what: ["Hand-pulled candy", "Traditional recipes", "Royal Court craft"], color: C.gold, mapHint: "Sømods Bolcher, Nørregade 24, 1165 Copenhagen, Denmark" },
];

const events = [
  { id: 1, name: "Præstø Litteraturfestival", travelTime: "1h 10min 🚂", rating: 4.6, town: "Præstø", type: "Festival", emoji: "📚", date: "2026-06-20", dateEnd: "2026-06-21", desc: "Denmark's cosiest literature festival in the charming harbour town of Præstø.", mapHint: "Præstø Torv, 4720 Præstø, Denmark", verified: "Jun 2026", color: C.accent, tags: ["Literature", "Music"] },
  { id: 2, name: "Sommerdage i Præstø", travelTime: "1h 10min 🚂", rating: 4.4, town: "Præstø", type: "Festival", emoji: "🌿", date: "2026-07-04", dateEnd: "2026-07-06", desc: "Nature and craft festival in Præstø. Plant dyeing workshops, ceramics, intimate concerts under open sky.", mapHint: "Præstø Havn, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#2E7D32", tags: ["Craft", "Nature"] },
  { id: 3, name: "Gyldne Dage i Præstø", travelTime: "1h 10min 🚂", rating: 4.3, town: "Præstø", type: "Festival", emoji: "🏰", date: "2026-09-12", dateEnd: "2026-09-13", desc: "Annual historical festival in Præstø with period costumes, local food and craft stalls.", mapHint: "Præstø Torv, 4720 Præstø, Denmark", verified: "Jun 2026", color: C.accent, tags: ["History", "Culture"] },
  { id: 4, name: "Bondemarked på Oremandsgaard", travelTime: "1h 10min 🚂", rating: 4.5, town: "Præstø", type: "Market", emoji: "🌾", date: "2026-06-06", dateEnd: null, desc: "Farm market at the beautiful Oremandsgaard Estate. Local food, organic goods and handmade crafts.", mapHint: "Oremandsgaard, Jungshoved, 4720 Præstø, Denmark", verified: "Jun 2026", color: C.accent, tags: ["Food", "Market"] },
  { id: 5, name: "Bakkefest", travelTime: "1h 15min 🚂", rating: 4.7, town: "Gilleleje", type: "Festival", emoji: "🎵", date: "2026-07-10", dateEnd: "2026-07-12", desc: "Three days of music overlooking the sea in Gilleleje. Big Danish artists, live DJs, food vendors.", mapHint: "Bøgebakken 19, 3250 Gilleleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Seaside"] },
  { id: 6, name: "Musik i Lejet", travelTime: "1h 20min 🚂", rating: 4.8, town: "Tisvildeleje", type: "Festival", emoji: "🌊", date: "2026-07-17", dateEnd: "2026-07-19", desc: "Intimate music festival in the picturesque coastal village of Tisvildeleje.", mapHint: "Tisvildeleje Strand, 3220 Tisvildeleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Coastal"] },
  { id: 7, name: "Folkely Festival", travelTime: "1h 30min 🚂", rating: 4.5, town: "Hundested", type: "Festival", emoji: "⚓", date: "2026-08-20", dateEnd: "2026-08-22", desc: "Three days of music, art and talks in Hundested harbour.", mapHint: "Hundested Havn, 3390 Hundested, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Harbour"] },
  { id: 8, name: "Fjordlys Festival", travelTime: "1h 25min 🚂", rating: 4.3, town: "Frederiksværk", type: "Festival", emoji: "🎆", date: "2026-07-25", dateEnd: "2026-07-26", desc: "Summer festival by the fjord in Frederiksværk.", mapHint: "Frederiksværk Havn, 3300 Frederiksværk, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Fjord"] },
  { id: 9, name: "Haveje Beach Bar Events", travelTime: "1h 20min 🚂", rating: 4.4, town: "Liseleje", type: "Concert", emoji: "🏖", date: "2026-07-14", dateEnd: "2026-07-15", desc: "Live music at Haveje beach bar, 150m from one of Denmark's most beautiful white sand beaches.", mapHint: "Liselejevej, 3360 Liseleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Beach"] },
  { id: 10, name: "Samsø Music Festival", travelTime: "2h 30min 🚢", rating: 4.9, town: "Samsø", type: "Festival", emoji: "🎸", date: "2026-07-13", dateEnd: "2026-07-19", desc: "Since 1990, Denmark's cosiest music festival on the island of Samsø.", mapHint: "Mårup Kildevej 8, 8305 Samsø, Denmark", verified: "Jun 2026", color: "#6A1B9A", tags: ["Music", "Island"] },
  { id: 11, name: "Maribo Jazz Festival", travelTime: "1h 45min 🚂", rating: 4.7, town: "Maribo", type: "Festival", emoji: "🎷", date: "2026-07-18", dateEnd: "2026-07-21", desc: "Denmark's friendliest jazz festival in historic Maribo. 120+ musicians across 18 venues.", mapHint: "Kirkepladsen, 4930 Maribo, Denmark", verified: "Jun 2026", color: "#E65100", tags: ["Jazz", "Historic"] },
  { id: 12, name: "KirsebærFestival", travelTime: "2h 10min 🚂", rating: 4.6, town: "Kerteminde", type: "Festival", emoji: "🍒", date: "2026-07-17", dateEnd: "2026-07-19", desc: "Cherry festival in Kerteminde, Northeast Funen.", mapHint: "Kerteminde Havn, 5300 Kerteminde, Denmark", verified: "Jun 2026", color: "#B71C1C", tags: ["Food", "Local"] },
];

const majorEvents = [
  { id: 101, name: "Roskilde Festival", travelTime: "25min 🚂", rating: 4.9, ticketStatus: "sold_out", town: "Roskilde", type: "Music", emoji: "🎸", date: "2026-06-27", dateEnd: "2026-07-04", desc: "Northern Europe's largest music festival. 130,000 attendees, 8 stages, 8 days.", mapHint: "Roskilde Festival, Darupvej 35, 4000 Roskilde, Denmark", verified: "Jun 2026", color: "#E53935", tags: ["Music", "Camping"] },
  { id: 102, name: "Distortion", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "free", town: "Copenhagen", type: "Music", emoji: "🔊", date: "2026-06-03", dateEnd: "2026-06-07", desc: "Copenhagen's legendary street festival. Five days of block parties in different neighbourhoods.", mapHint: "Nørrebrogade, 2200 Copenhagen, Denmark", verified: "Jun 2026", color: "#8E24AA", tags: ["Electronic", "Street"] },
  { id: 103, name: "Aalborg Karneval", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aalborg", type: "Cultural", emoji: "🎭", date: "2026-05-20", dateEnd: "2026-05-24", desc: "Scandinavia's largest carnival. 100,000+ participants in costumes.", mapHint: "Aalborg Centrum, 9000 Aalborg, Denmark", verified: "Jun 2026", color: "#F57F17", tags: ["Carnival", "Parade"] },
  { id: 104, name: "Copenhagen Jazz Festival", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "free", town: "Copenhagen", type: "Music", emoji: "🎷", date: "2026-07-03", dateEnd: "2026-07-12", desc: "10 days of jazz across 100+ venues. Free concerts in squares and parks.", mapHint: "Copenhagen City Hall Square, Denmark", verified: "Jun 2026", color: "#00695C", tags: ["Jazz", "Free"] },
  { id: 105, name: "Smukfest", travelTime: "2h 45min 🚂", rating: 4.9, ticketStatus: "selling_fast", town: "Skanderborg", type: "Music", emoji: "🌲", date: "2026-08-05", dateEnd: "2026-08-09", desc: "Denmark's Most Beautiful Festival in a beech forest near Skanderborg.", mapHint: "Smukfest, Dyrehaven, 8660 Skanderborg, Denmark", verified: "Jun 2026", color: "#2E7D32", tags: ["Music", "Forest"] },
  { id: 106, name: "NorthSide Festival", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aarhus", type: "Music", emoji: "🎪", date: "2026-06-05", dateEnd: "2026-06-07", desc: "Aarhus's biggest music festival with eco-friendly focus.", mapHint: "NorthSide Festival, Eskelundsvej, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Eco"] },
  { id: 107, name: "Aarhus Festuge", travelTime: "3h 🚂", rating: 4.6, ticketStatus: "free", town: "Aarhus", type: "Cultural", emoji: "🎨", date: "2026-08-28", dateEnd: "2026-09-06", desc: "One of Scandinavia's largest cultural festivals. 300+ events, most free.", mapHint: "Aarhus Centrum, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#AD1457", tags: ["Culture", "Free"] },
  { id: 108, name: "Tønder Festival", travelTime: "3h 30min 🚂", rating: 4.8, ticketStatus: "available", town: "Tønder", type: "Music", emoji: "🎻", date: "2026-08-26", dateEnd: "2026-08-30", desc: "Scandinavia's leading folk and roots festival near the German border.", mapHint: "Tønder Festival Pladsen, 6270 Tønder, Denmark", verified: "Jun 2026", color: "#4E342E", tags: ["Folk", "Roots"] },
  { id: 109, name: "Triangle Folklore Festival", travelTime: "2h 15min 🚂", rating: 4.5, ticketStatus: "free", town: "Vejle", type: "Cultural", emoji: "🌍", date: "2026-07-26", dateEnd: "2026-08-01", desc: "Denmark's biggest international folklore festival. Groups from 10+ countries perform in the streets of Vejle.", mapHint: "Vejle Centrum, 7100 Vejle, Denmark", verified: "Jul 2026", color: "#1B5E20", tags: ["Folklore", "Dance"] },
  { id: 110, name: "Odense Flower Festival", travelTime: "1h 30min 🚂", rating: 4.7, ticketStatus: "free", town: "Odense", type: "Cultural", emoji: "🌸", date: "2026-08-13", dateEnd: "2026-08-16", desc: "200,000+ flowers transform the entire city centre of Odense.", mapHint: "Flakhaven, 5000 Odense C, Denmark", verified: "Jul 2026", color: "#E91E8C", tags: ["Flowers", "Free"] },
  { id: 111, name: "H.C. Andersen Festivals", travelTime: "1h 30min 🚂", rating: 4.8, ticketStatus: "free", town: "Odense", type: "Cultural", emoji: "📖", date: "2026-08-13", dateEnd: "2026-08-22", desc: "Denmark's largest cultural festival. 500+ events across 10 days in H.C. Andersen's hometown.", mapHint: "Odense City Centre, 5000 Odense C, Denmark", verified: "Jul 2026", color: "#7B1FA2", tags: ["Culture", "Free"] },
];

const towns = [
  { id: 1, name: "Ribe", region: "South Jutland", emoji: "⛪", tag: "Denmark's oldest town", desc: "Founded around 700 AD — the oldest town in Scandinavia. Medieval cathedral, Viking museum and cobblestone streets.", highlight: "Viking Center Ribe — artisans craft authentic Viking jewellery, leather and textiles on site.", travelTime: "3h 15min 🚂", mapHint: "Ribe, 6760 Ribe, Denmark", nomiPotential: "High" },
  { id: 2, name: "Dragør", region: "Copenhagen Area", emoji: "⚓", tag: "Fisherman's village", desc: "Just 12km from Copenhagen — yellow ochre houses, a working harbour, cobblestone streets. Feels like another era.", highlight: "The harbour fish stalls sell smoked fish caught the same morning. No menus, no TripAdvisor.", travelTime: "30min 🚌", mapHint: "Dragør Havn, 2791 Dragør, Denmark", nomiPotential: "High" },
  { id: 3, name: "Ærøskøbing", region: "Funen", emoji: "🏡", tag: "Denmark's fairy-tale town", desc: "750-year-old town on the island of Ærø. Half-timbered houses, flower-lined streets. One of Europe's best preserved small towns.", highlight: "The local bottle ship museum — a man spent decades making ships inside bottles.", travelTime: "3h + ferry 🚢", mapHint: "Ærøskøbing, 5970 Ærø, Denmark", nomiPotential: "Very High" },
  { id: 4, name: "Skagen", region: "North Jutland", emoji: "🌊", tag: "Where two seas meet", desc: "Denmark's northernmost town. Where the North Sea and Baltic Sea collide. Yellow houses, artist culture.", highlight: "The local fish auction starts at 6am on weekdays. Fresh fish sold direct from boats.", travelTime: "4h 🚂", mapHint: "Skagen, 9990 Skagen, Denmark", nomiPotential: "High" },
  { id: 5, name: "Præstø", region: "Zealand", emoji: "🏘", tag: "Hidden countryside gem", desc: "South of Copenhagen — cobbled streets, old market square. The kind of town that makes you wonder why nobody talks about it.", highlight: "Oremandsgaard Estate sells locally produced goods from their own farm and distillery.", travelTime: "1h 10min 🚂", mapHint: "Præstø Torv, 4720 Præstø, Denmark", nomiPotential: "Very High" },
  { id: 6, name: "Faaborg", region: "Funen", emoji: "🌿", tag: "Old-world harbour charm", desc: "Quiet harbour town on the south coast of Funen. 17th century merchant buildings, cobblestone alleys.", highlight: "The local ceramics workshop near the harbour sells pieces made on site. Cash only, no website.", travelTime: "2h 30min 🚂", mapHint: "Faaborg Havn, 5600 Faaborg, Denmark", nomiPotential: "High" },
  { id: 7, name: "Gudhjem", region: "Bornholm", emoji: "🐟", tag: "Baltic island village", desc: "Atmospheric fishing village on Bornholm. Home of the legendary Sol over Gudhjem smoked herring dish.", highlight: "Røgeriet — the old smokehouse. Watch them smoke herring the traditional way.", travelTime: "2h + ferry 🚢", mapHint: "Gudhjem Havn, 3760 Gudhjem, Bornholm", nomiPotential: "Very High" },
  { id: 8, name: "Sønderho", region: "Fanø Island", emoji: "🌾", tag: "Hidden dune village", desc: "Tucked in the dunes of Fanø island. Thatched houses, winding lanes, seals in the Wadden Sea National Park.", highlight: "The Fanø Kunstmuseer shows local folk art and crafts made on the island for centuries.", travelTime: "3h + ferry 🚢", mapHint: "Sønderho, 6720 Fanø, Denmark", nomiPotential: "Very High" },
];

const essentials = [
  { id: 1, name: "Rejsekort", category: "Transport", emoji: "🚇", desc: "Denmark's public transport card — trains, buses and metro nationwide. Much cheaper than individual tickets.", howTo: "Buy at any train station. 80 DKK deposit. Top up with cash or card.", price: "80 DKK deposit + top-up", link: "https://www.rejsekort.dk/en", tip: "Always check OUT when leaving — or you get charged max fare." },
  { id: 2, name: "Rent a Bike", category: "Transport", emoji: "🚲", desc: "Copenhagen has 390km of cycle lanes. Renting a bike is the best way to see the city.", howTo: "Bycyklen electric bikes available across Copenhagen via app. Or rent from shops from 100 DKK/day.", price: "From 100 DKK/day", link: "https://apps.apple.com/dk/app/bycyklen/id985075832", linkAndroid: "https://play.google.com/store/apps/details?id=dk.bycyklen.app", tip: "Cycle on the right, signal with your arm, always lock up." },
  { id: 3, name: "MobilePay", category: "Payments", emoji: "📱", desc: "Denmark's universal payment app. Almost every market stall and local vendor accepts it.", howTo: "Download MobilePay app. Requires Danish phone number or international setup.", price: "Free", link: "https://apps.apple.com/dk/app/mobilepay/id624499138", linkAndroid: "https://play.google.com/store/apps/details?id=dk.danskebank.mobilepay", tip: "Many Gemlyx businesses ONLY accept MobilePay or cash." },
  { id: 4, name: "DSB App", category: "Transport", emoji: "🚂", desc: "Danish national railway app. Book tickets, check schedules, get real-time delays.", howTo: "Download DSB app. Buy tickets in advance for cheaper prices.", price: "Free app", link: "https://apps.apple.com/dk/app/dsb/id531645423", linkAndroid: "https://play.google.com/store/apps/details?id=dk.dsb.rejseplanen", tip: "Buy Orange tickets weeks ahead for up to 50% off." },
  { id: 5, name: "Copenhagen Card", category: "Sightseeing", emoji: "🎟", desc: "Free entry to 89 attractions + unlimited transport. Worth it for 2+ days.", howTo: "Buy at copenhagencard.com or airport. 24h, 48h, 72h or 120h options.", price: "From 499 DKK", link: "https://www.copenhagencard.com", tip: "Tivoli alone is 150 DKK — card pays for itself with 3+ attractions." },
  { id: 6, name: "eSIM or Local SIM", category: "Connectivity", emoji: "📶", desc: "EU roaming covers most Europeans. Outside EU — get a local SIM for navigation and MobilePay.", howTo: "Buy at 7-Eleven, Netto or any phone shop. Lebara and Lycamobile work well.", price: "From 49 DKK", link: null, tip: "Make sure your phone is unlocked before traveling." },
];

const getEventDate = (dateStr, dateEnd) => {
  const d = new Date(dateStr);
  const opts = { day: "numeric", month: "short" };
  if (dateEnd) return d.toLocaleDateString("en-GB", opts) + " – " + new Date(dateEnd).toLocaleDateString("en-GB", opts);
  return d.toLocaleDateString("en-GB", { ...opts, weekday: "short" });
};
const isUpcoming = (d) => new Date(d) >= new Date();
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

const PRODUCT_COORDS = {
  13: [55.6761, 12.5683], 14: [55.6780, 12.5700], 15: [55.6750, 12.5760],
  21: [55.6820, 12.5710], 22: [55.6795, 12.5830], 23: [55.6980, 12.5500],
};

const APP_VERSION = "v2.5 — simpler AI + pro footer";

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
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterTypes, setFilterTypes] = useState([]);
  const [mapCity, setMapCity] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [eventMonth, setEventMonth] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [eventTab, setEventTab] = useState("local");
  const [townFilter, setTownFilter] = useState(null);
  const [emailSignup, setEmailSignup] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your Local Assist ◆ Tell me where you're heading — or what you're after — and I'll find you something that exists nowhere else." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (aiMessages.length > 1 && aiBottomRef.current) aiBottomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [aiMessages]);

  const toggleSave = (id) => setSavedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const savedProducts = allProducts.filter(p => savedItems.includes(p.id));

  const displayProducts = (selectedCity
    ? selectedCity.products.map(p => ({ ...p, city: selectedCity.name, color: selectedCity.color }))
    : allProducts
  ).filter(p => {
    const catOk = filterCategories.length === 0 || filterCategories.includes(p.category);
    const typeOk = filterTypes.length === 0 || filterTypes.includes(p.locationType);
    return catOk && typeOk;
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

  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", text: msg }]);
    setAiLoading(true);
    try {
      const productList = allProducts.map(p => `${p.name} in ${p.city} (${p.price}) - ${p.exclusive}`).join(", ");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are Local Assist — Gemlyx's AI guide. Help travelers discover exclusive local finds in Denmark. Be warm, concise and specific. Available: " + productList },
            ...aiMessages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
            { role: "user", content: msg }
          ], max_tokens: 400
        })
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: "assistant", text: data.choices?.[0]?.message?.content || data.error?.message || "Something went wrong!" }]);
    } catch { setAiMessages(prev => [...prev, { role: "assistant", text: "Connection error — try again!" }]); }
    setAiLoading(false);
  };

  // ── PILL BUTTON ───────────────────────────────────────────────
  const Pill = ({ label, active, onClick, color }) => (
    <button onClick={onClick} style={{ background: active ? (color||C.accent) : C.surface, color: active ? "#fff" : C.muted, border: `1px solid ${active ? (color||C.accent) : C.border}`, borderRadius: 100, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s" }}>
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
    <div style={{ background: C.surface, borderRadius: 16, padding: "16px", marginBottom: 10, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: event.color }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{event.emoji}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{event.name}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: event.color, background: `${event.color}22`, padding: "3px 8px", borderRadius: 100 }}>{event.type}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{event.town}</span>
              <span style={{ fontSize: 11, color: C.gold }}>★ {event.rating}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{event.travelTime} from CPH</span>
            </div>
            {event.ticketStatus && (
              <div style={{ marginTop: 6 }}>
                {event.ticketStatus === "sold_out" && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff4444", background: "#ff444422", padding: "2px 8px", borderRadius: 100 }}>🔴 Sold out</span>}
                {event.ticketStatus === "selling_fast" && <span style={{ fontSize: 10, fontWeight: 700, color: "#FFB347", background: "#FFB34722", padding: "2px 8px", borderRadius: 100 }}>🟡 Selling fast</span>}
                {event.ticketStatus === "available" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "2px 8px", borderRadius: 100 }}>🟢 Available</span>}
                {event.ticketStatus === "free" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "2px 8px", borderRadius: 100 }}>✓ Free entry</span>}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>
              {daysUntil(event.date) <= 0 ? "Now!" : daysUntil(event.date) === 1 ? "Tmrw" : `${daysUntil(event.date)}d`}
            </div>
            <div style={{ fontSize: 9, color: C.muted }}>away</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginBottom: 6 }}>📅 {getEventDate(event.date, event.dateEnd)}</div>
        <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{event.desc}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {event.tags.map(t => <span key={t} style={{ fontSize: 10, color: C.muted, background: C.bg, padding: "3px 8px", borderRadius: 100 }}>{t}</span>)}
        </div>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>📍 Location in Denmark</div>
        <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 10, height: 260 }}>
          <iframe title={event.name} width="100%" height="260" frameBorder="0" style={{ border: 0, display: "block" }} referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(event.mapHint)}&zoom=7&maptype=roadmap`} />
        </div>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.mapHint)}`} target="_blank" rel="noreferrer"
          style={{ display: "block", background: event.color, color: "#fff", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
          ↗ Get Directions
        </a>
      </div>
    </div>
  );

  const filteredEvents = (eventTab === "local" ? events : majorEvents)
    .filter(e => isUpcoming(e.date))
    .filter(e => {
      const em = new Date(e.date).toLocaleString("en", { month: "short" });
      return (!eventMonth || em === eventMonth) && (!eventType || e.type === eventType || (eventType === "North Zealand" && ["Gilleleje","Tisvildeleje","Hundested","Frederiksværk","Liseleje"].includes(e.town)));
    })
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg, minHeight: "100vh", width: "100%", color: C.text, position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 0; }
        .slide-up { animation: slideUp 0.2s ease; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(6px); } }
        @media (min-width: 900px) { .mobile-only { display: none !important; } }
        @media (max-width: 899px) { .desktop-only { display: none !important; } }
        .products-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (min-width: 600px) { .products-grid { grid-template-columns: 1fr 1fr 1fr; } }
        @media (min-width: 900px) { .products-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "44px 16px 10px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo */}
          <div onClick={() => setActive("home")} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text, letterSpacing: -0.5 }}>◆ Gemlyx</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>It exists nowhere else</div>
          </div>

          {/* Right icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Search */}
            <button onClick={() => setShowSearch(!showSearch)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 8 }}>🔍</button>
            {/* Saved */}
            <button onClick={() => setActive("explore")} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 8, position: "relative" }} title="Saved">
              ♡
              {savedItems.length > 0 && <span style={{ position: "absolute", top: 4, right: 4, background: C.accent, color: "#fff", fontSize: 9, fontWeight: 700, width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{savedItems.length}</span>}
            </button>
            {/* Hamburger menu */}
            <button onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, cursor: "pointer", padding: "6px 10px", borderRadius: 8, display: "flex", gap: 4, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 16, height: 2, background: C.muted, borderRadius: 2 }} />
              <div style={{ width: 16, height: 2, background: C.muted, borderRadius: 2 }} />
              <div style={{ width: 16, height: 2, background: C.muted, borderRadius: 2 }} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{ marginTop: 10, position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cities, businesses, finds..." autoFocus
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 16px", fontSize: 13, color: C.text, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
          </div>
        )}

        {/* Search results */}
        {search.length > 1 && searchResults.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, borderBottom: `1px solid ${C.border}`, zIndex: 200, maxHeight: 240, overflowY: "auto" }}>
            {searchResults.map(p => (
              <div key={p.id} onClick={() => { setSelectedProduct({ ...p }); setSearch(""); setShowSearch(false); }}
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

      {/* ── TOP NAV TABS ───────────────────────────────────── */}
      {(
        <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 73, zIndex: 90, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", padding: "0 8px", minWidth: "max-content" }}>
            {[
              { id: "home", label: "🧭 Explore" },
              { id: "explore", label: "🏪 Merchandise" },
              { id: "events", label: "◈ Events" },
              { id: "visits", label: "◉ Towns" },
              { id: "essentials", label: "✓ Essentials" },
            ].map(item => (
              <button key={item.id} onClick={() => setActive(item.id)}
                style={{ background: "none", border: "none", borderBottom: `2px solid ${active === item.id ? C.accent : "transparent"}`, color: active === item.id ? C.text : C.muted, padding: "12px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── DROPDOWN MENU ──────────────────────────────────── */}
      {showMenu && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300 }} onClick={() => setShowMenu(false)}>
          <div style={{ position: "absolute", top: 90, right: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "8px", minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
            <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }`}</style>
            {[
              { id: "home", label: "🧭 Explore", action: "nav" },
              { id: "login", label: "👤 Login", action: "login" },
              { id: "faq", label: "❓ FAQ", action: "faq" },
              { id: "support", label: "✉ Support", action: "mail" },
            ].map((item, i) => (
              <button key={item.id}
                onClick={() => {
                  setShowMenu(false);
                  if (item.action === "nav") setActive("home");
                  else if (item.action === "faq") setActive("essentials");
                  else if (item.action === "mail") window.open("mailto:hello@gemlyx.com");
                  else if (item.action === "login") { setToast("👤 Login coming soon"); setTimeout(() => setToast(null), 2200); }
                }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "transparent", color: C.light, border: "none", borderRadius: 10, padding: "13px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 2, animation: `fadeSlideIn 0.2s ease ${i * 0.06}s both` }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── LAYOUT ─────────────────────────────────────────── */}
      <div style={{ display: "flex", width: "100%" }}>

        {/* Desktop sidebar */}
        <div className="desktop-only" style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${C.border}`, height: "calc(100vh - 73px)", overflowY: "auto", position: "sticky", top: 73, background: C.bg, padding: "16px 12px" }}>
          {[
            { id: "home", label: "Explore", icon: "🧭" },
            { id: "explore", label: "Merchandise", icon: "🏪" },
            { id: "events", label: "Events", icon: "◈" },
            { id: "visits", label: "Towns", icon: "◉" },
            { id: "essentials", label: "Essentials", icon: "✓" },
          ].map(item => (
            <button key={item.id} onClick={() => setActive(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: active === item.id ? C.accent : "transparent", color: active === item.id ? "#fff" : C.muted, border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4, textAlign: "left", transition: "all 0.2s" }}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 16 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>🇩🇰 Denmark</div>
            {cities.map(city => (
              <button key={city.id} onClick={() => { setSelectedCity(city); setActive("explore"); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: selectedCity?.id === city.id ? `${city.color}22` : "transparent", color: selectedCity?.id === city.id ? city.color : C.muted, border: `1px solid ${selectedCity?.id === city.id ? city.color : "transparent"}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4, textAlign: "left" }}>
                🇩🇰 {city.name}
                <span style={{ marginLeft: "auto", fontSize: 11 }}>{city.products.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, height: "calc(100vh - 73px)", overflowY: "auto", paddingBottom: 20 }}>


          {/* ── HOME LANDING ─────────────────────────────────── */}
          {active === "home" && (
            <div className="slide-up" style={{ margin: "-0px -0px" }}>
              {/* Hero */}
              <div style={{ height: "calc(100vh - 73px)", position: "relative", overflow: "hidden" }}>
                <img src="/picture1.jpg" alt="Denmark" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                { id: "explore", img: "/picture2.png", title: "Merchandise", sub: "Exclusive finds that exist nowhere else", icon: "🏪" },
                { id: "events", img: "/picture3.png", title: "Events", sub: "Festivals, markets & hidden happenings", icon: "◈" },
                { id: "visits", img: "/picture4.png", title: "Towns", sub: "Denmark's most beautiful hidden towns", icon: "◉" },
                { id: "craft", img: "/picture5.jpg", title: "Local Craft", sub: "Commission something made by hand", icon: "🔨" },
              ].map((section, i) => (
                <div key={section.id} onClick={() => { if (section.id === "craft") { setActive("explore"); setShopTab("craft"); } else { setActive(section.id); } window.scrollTo(0,0); }}
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

              {/* AI at the end of the journey */}
              <div style={{ padding: "36px 20px 28px", borderTop: `1px solid ${C.border}`, background: C.surface }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>✦ Overwhelmed? Let me help you.</div>
                </div>

                {aiMessages.length > 1 && (
                  <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12, WebkitOverflowScrolling: "touch" }}>
                    {aiMessages.slice(1).map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                        <div style={{ maxWidth: "82%", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5, background: m.role === "user" ? C.accent : C.bg, color: "#fff", border: m.role === "user" ? "none" : `1px solid ${C.border}` }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {aiLoading && <div style={{ background: C.bg, borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, display: "inline-block", marginBottom: 10 }}>thinking...</div>}
                    <div ref={aiBottomRef} />
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
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6, opacity: 0.6 }}>v2.5 — Jul 2026</div>
              </div>
            </div>
          )}

          {/* ── EXPLORE ──────────────────────────────────────── */}
          {active === "explore" && (
            <div className="slide-up">
              {/* Sub tabs */}
              <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}` }}>
                {[
                  { id: "shops", label: "🏪 Shops" },
                  { id: "craft", label: "🔨 Craft" },
                  { id: "saved", label: `♡ Saved${savedItems.length > 0 ? ` (${savedItems.length})` : ""}` },
                ].map(t => (
                  <button key={t.id} onClick={() => setShopTab(t.id)}
                    style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${shopTab === t.id ? C.accent : "transparent"}`, color: shopTab === t.id ? C.text : C.muted, padding: "14px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* SHOPS */}
              {shopTab === "shops" && (
                <div style={{ padding: "14px 16px" }}>
                  {/* City + Filter row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                      {cities.map(city => (
                        <Pill key={city.id} label={`🇩🇰 ${city.name}`} active={selectedCity?.id === city.id} onClick={() => setSelectedCity(selectedCity?.id === city.id ? null : city)} color={city.color} />
                      ))}
                    </div>
                    <button onClick={() => setShowFilter(true)}
                      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.light, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, flexShrink: 0, marginLeft: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      ⊟ Filter
                    </button>
                  </div>

                  {/* Hero */}
                  {selectedCity && (
                    <div style={{ borderRadius: 16, overflow: "hidden", position: "relative", height: 100, background: selectedCity.color, marginBottom: 14 }}>
                      {selectedCity.photo && <img src={selectedCity.photo} alt={selectedCity.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 100%)" }} />
                      <div style={{ position: "absolute", bottom: 10, left: 14 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Cormorant Garamond', serif" }}>{selectedCity.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>◆ {displayProducts.length} finds</div>
                      </div>
                      <div style={{ position: "absolute", top: 10, left: 14, background: selectedCity.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 100, textTransform: "uppercase" }}>{selectedCity.tag}</div>
                    </div>
                  )}

                  {/* Products grid */}
                  <div className="products-grid">
                    {displayProducts.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
                  {displayProducts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>No businesses found</div>
                  )}
                </div>
              )}

              {/* CRAFT */}
              {shopTab === "craft" && (
                <div style={{ padding: "16px" }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>🔨 Local Craft</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Commission something made by hand — before or during your visit</div>
                  </div>
                  {craftItems.map(craft => (
                    <div key={craft.id} style={{ background: C.surface, borderRadius: 16, padding: "16px", marginBottom: 12, border: `1px solid ${C.border}`, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: craft.color, borderRadius: "16px 0 0 16px" }} />
                      <div style={{ paddingLeft: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 20 }}>{craft.emoji}</span>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{craft.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{craft.location} · {craft.travelTime} from CPH</div>
                          </div>
                          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: craft.color, background: `${craft.color}22`, padding: "3px 8px", borderRadius: 100 }}>{craft.type}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{craft.desc}</div>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>What you can make</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {craft.what.map(w => <span key={w} style={{ fontSize: 10, color: C.light, background: C.bg, padding: "3px 8px", borderRadius: 100 }}>{w}</span>)}
                          </div>
                        </div>
                        <div style={{ height: 130, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
                          <iframe title={craft.name} width="100%" height="130" frameBorder="0" style={{ border: 0, display: "block" }} referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(craft.mapHint)}&zoom=13`} />
                        </div>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(craft.mapHint)}`} target="_blank" rel="noreferrer"
                          style={{ display: "block", background: craft.color, color: "#fff", borderRadius: 10, padding: "8px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                          ↗ Get Directions
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SAVED */}
              {shopTab === "saved" && (
                <div style={{ padding: "16px" }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>♡ Saved Finds</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{savedProducts.length} businesses saved</div>
                  </div>
                  {savedProducts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "50px 0" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>♡</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>Nothing saved yet</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Tap ♡ on any find to save it</div>
                    </div>
                  ) : (
                    <div className="products-grid">
                      {savedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── EVENTS ───────────────────────────────────────── */}
          {active === "events" && (
            <div className="slide-up" style={{ padding: "16px" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>◈ Events</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Discover what's happening across Denmark</div>
              </div>
              <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                {[{ id: "local", label: "🏘 Local" }, { id: "major", label: "🌟 Major" }].map(t => (
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
                  {(eventTab === "local" ? ["All", "Festival", "Market", "Concert", "North Zealand"] : ["All", "Music", "Cultural"]).map(f => (
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
          {active === "visits" && (
            <div className="slide-up" style={{ padding: "16px" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>◉ Local Towns</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Denmark's most beautiful hidden towns</div>
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
                {["All", "Copenhagen Area", "Zealand", "Funen", "South Jutland", "North Jutland", "Bornholm", "Fanø Island"].map(r => (
                  <Pill key={r} label={r} active={(r === "All" && !townFilter) || townFilter === r} onClick={() => setTownFilter(r === "All" ? null : (townFilter === r ? null : r))} />
                ))}
              </div>
              {towns.filter(t => !townFilter || t.region === townFilter).map(town => (
                <div key={town.id} style={{ background: C.surface, borderRadius: 16, marginBottom: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  <div style={{ padding: "14px 16px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>{town.emoji}</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{town.name}</div>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{town.region}</div>
                      </div>
                      <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: town.nomiPotential === "Very High" ? "#4CAF50" : C.gold, background: town.nomiPotential === "Very High" ? "#4CAF5022" : `${C.gold}22`, padding: "3px 8px", borderRadius: 100 }}>
                        {town.nomiPotential === "Very High" ? "⭐ Top Pick" : "◆ Pick"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 6 }}>{town.tag}</div>
                    <div style={{ fontSize: 12, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{town.desc}</div>
                    <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px", marginBottom: 10, borderLeft: `3px solid ${C.gold}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>◆ Gemlyx Find</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{town.highlight}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>{town.travelTime} from CPH</div>
                  </div>
                  <div style={{ height: 150 }}>
                    <iframe title={town.name} width="100%" height="150" frameBorder="0" style={{ border: 0, display: "block" }} referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(town.mapHint)}&zoom=12`} />
                  </div>
                  <div style={{ padding: "10px 16px 14px" }}>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(town.mapHint)}`} target="_blank" rel="noreferrer"
                      style={{ display: "block", background: C.accent, color: "#fff", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                      ↗ Get Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ESSENTIALS ───────────────────────────────────── */}
          {active === "essentials" && (
            <div className="slide-up" style={{ padding: "16px" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: C.text }}>✓ Travel Essentials</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Everything you need to travel Denmark like a local</div>
              </div>
              {["Transport", "Payments", "Sightseeing", "Connectivity"].map(cat => (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>{cat}</div>
                  {essentials.filter(e => e.category === cat).map(item => (
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={item.link} target="_blank" rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#000", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                        🍎 App Store
                      </a>
                      {item.linkAndroid && (
                        <a href={item.linkAndroid} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#01875F", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                          🤖 Google Play
                        </a>
                      )}
                      {!item.linkAndroid && (
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
              {/* FAQ */}
              <div style={{ marginBottom: 20 }}>
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
          {active === "map" && (
            <div className="slide-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 73px)" }}>
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
                    {(() => {
                      const src = selectedPin
                        ? `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(selectedPin.shop)}&zoom=17`
                        : `https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&center=55.6761,12.5683&zoom=14&maptype=roadmap`;
                      return <iframe key={mapCity.name + (selectedPin?.id||"")} title="Map" width="100%" height="220" frameBorder="0" style={{ border: 0, display: "block" }} referrerPolicy="no-referrer-when-downgrade" src={src} allowFullScreen />;
                    })()}
                    <a href={selectedPin ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedPin.shop+" Copenhagen")}` : `https://www.google.com/maps/search/?api=1&query=local+shops+Copenhagen`}
                      target="_blank" rel="noreferrer"
                      style={{ position: "absolute", bottom: 8, right: 8, background: C.gold, color: "#000", padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
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

        </div>
      </div>

      {/* ── FILTER PANEL (Hotels.com style) ──────────────── */}
      {showFilter && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={() => setShowFilter(false)}>
          <div style={{ background: C.surface, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, margin: "0 auto", padding: "20px 20px 40px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Sort & Filter</div>
              <button onClick={() => { setFilterCategory("All"); setFilterType("All"); }} style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }} onClick={() => { setFilterCategories([]); setFilterTypes([]); }}>Reset</button>
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

            <button onClick={() => setShowFilter(false)}
              style={{ width: "100%", background: C.accent, border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Show {displayProducts.length} results
            </button>
            {(filterCategories.length > 0 || filterTypes.length > 0) && (
              <button onClick={() => { setFilterCategories([]); setFilterTypes([]); }}
                style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px", fontSize: 13, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8 }}>
                Clear all filters
              </button>
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
