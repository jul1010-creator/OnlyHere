import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZhaGpuZXJra2tvdWVvdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzQ4OTYsImV4cCI6MjA5NTMxMDg5Nn0.-GgXeog0DufIz6WNXn_8pIzxmQfkHRK3Lz8V71O-v_c";

async function sbFetch(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

const COUNTRY_FLAGS = {
  "Denmark": "🇩🇰",
};

const cities = [
  { id: 4, name: "Copenhagen", country: "Denmark", continent: "Europe", emoji: "🇩🇰", flagCode: "dk", color: "#C60C30", items: 54, tag: "Nordic Minimal", vibe: "Quiet luxury, built to last forever", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
    products: [
      { id: 13, verified: "May 2026", locationType: "permanent", name: "Samsøe Samsøe Wool Coat", shop: "Flagship · Strøget", price: "DKK 3,200", category: "Fashion", exclusive: "DK exclusive", emoji: "🧥", trending: false, isNew: false, desc: "Flagship carries colourways never exported abroad. You won't find these online.", mapHint: "Strøget, Copenhagen", photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80" },
      { id: 14, verified: "May 2026", locationType: "permanent", name: "Norse Projects Gore-Tex", shop: "Norse Projects · Pilestræde", price: "DKK 4,800", category: "Fashion", exclusive: "Flagship colourway", emoji: "🧥", trending: true, isNew: false, desc: "Seasonal colourways exclusive to Pilestræde. Never restocked online.", mapHint: "Pilestræde, Copenhagen", photo: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&q=80" },
      { id: 15, verified: "May 2026", locationType: "permanent", name: "Ganni Archive Dress", shop: "Ganni Flagship · Amagertorv", price: "DKK 2,100", category: "Fashion", exclusive: "Archive collection", emoji: "👗", trending: false, isNew: true, desc: "Archive collection only at the Copenhagen flagship. Not available online.", mapHint: "Amagertorv, Copenhagen", photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80" },
      { id: 21, verified: "Jun 2026", locationType: "permanent", name: "Wood Wood Collab Tee", shop: "Wood Wood · Grønnegade", price: "DKK 699", category: "Fashion", exclusive: "Copenhagen only", emoji: "👕", trending: true, isNew: false, desc: "Copenhagen's most respected streetwear label. Collaboration drops only in-store.", mapHint: "Grønnegade, Copenhagen", photo: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80" },
      { id: 22, verified: "Jun 2026", locationType: "permanent", name: "HAY Ceramic Mug Set", shop: "HAY House · Østergade", price: "DKK 450", category: "Accessories", exclusive: "Flagship exclusive colourway", emoji: "🏺", trending: false, isNew: true, desc: "HAY's own flagship carries colourways and sets not sold elsewhere.", mapHint: "Østergade 61, Copenhagen", photo: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80" },
      { id: 23, verified: "Jun 2026", locationType: "permanent", name: "Nørr11 Leather Bag", shop: "Nørr11 · Nørrebro", price: "DKK 3,800", category: "Bags", exclusive: "Made in Copenhagen", emoji: "👜", trending: false, isNew: false, desc: "Small Copenhagen leather atelier. Every bag handmade locally. No webshop.", mapHint: "Nørrebrogade, Copenhagen", photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80" },
    ]
  },
];

const allProducts = cities.flatMap(c => c.products.map(p => ({ ...p, city: c.name, color: c.color })));
const continents = ["Europe"];

function getCountries(cont) {
  return [...new Set(cities.filter(c => c.continent === cont).map(c => c.country))].sort();
}

function FlagImg({ flagCode }) {
  const flags = { kr: "🇰🇷", jp: "🇯🇵", ma: "🇲🇦", dk: "🇩🇰", mx: "🇲🇽", al: "🇦🇱" };
  return <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{flags[flagCode] || ""}</span>;
}

const navItems = [
  { id: "explore", label: "Explore", icon: "⊞" },
  { id: "events", label: "Events", icon: "◈" },
  { id: "visits", label: "Towns", icon: "◉" },
  { id: "essentials", label: "Essentials", icon: "✓" },
  { id: "ai", label: "AI Guide", icon: "✦" },
  { id: "map", label: "Map", icon: "⊙" },
  { id: "saved", label: "Saved", icon: "♡" },
];

const CITY_COORDS = {
  "Copenhagen": [55.6761, 12.5683],
};

const PRODUCT_COORDS = {
  1: [37.5563, 126.9374], 2: [37.5247, 127.0400], 3: [37.5563, 126.9227],
  4: [37.5200, 127.0420], 5: [37.5340, 126.9940], 20: [37.5500, 126.9200],
  6: [35.6654, 139.7107], 7: [35.6702, 139.7026], 8: [35.6488, 139.7026], 9: [35.6654, 139.7200],
  10: [31.6315, -7.9887], 11: [31.6290, -7.9900], 12: [31.6340, -7.9950],
  13: [55.6761, 12.5683], 14: [55.6780, 12.5700], 15: [55.6750, 12.5760],
  16: [19.4284, -99.1276], 17: [19.4180, -99.1620], 18: [19.3980, -99.1200],
  19: [41.3275, 19.8187],
};

function MapEmbed({ city }) {
  const coords = CITY_COORDS[city.name] || [37.5665, 126.9780];
  const markerJS = city.products.map(p => {
    const c = PRODUCT_COORDS[p.id];
    if (!c) return "";
    const n = p.name.replace(/['"]/g, "");
    const s = p.shop.replace(/['"]/g, "");
    return "L.marker([" + c[0] + "," + c[1] + "],{icon:L.divIcon({className:'',html:'<div style=\'background:" + city.color + ";color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.4)\'>" + p.emoji + "</div>',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(map).bindPopup('<b>" + n + "</b><br><small style=\'color:#666\'>" + s + "</small><br><b style=\'color:" + city.color + "\'>" + p.price + "</b>');";
  }).join(" ");

  const parts = [
    "<!DOCTYPE html><html><head>",
    "<meta name='viewport' content='width=device-width,initial-scale=1'>",
    "<link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'/>",
    "<script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'><" + "/script>",
    "<style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%;position:absolute;inset:0}</style>",
    "</head><body><div id='map'></div><script>",
    "var map=L.map('map',{zoomControl:true,dragging:true,touchZoom:true,scrollWheelZoom:false,tap:false}).setView([" + coords[0] + "," + coords[1] + "],14);",
    "L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OSM',maxZoom:19}).addTo(map);",
    markerJS,
    "<" + "/script></body></html>"
  ];

  return (
    <iframe
      key={city.name}
      srcDoc={parts.join("")}
      style={{ width: "100%", height: "220px", border: "none", display: "block" }}
      title="map"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}


const events = [
  { id: 1, name: "Præstø Litteraturfestival", travelTime: "1h 10min 🚂", rating: 4.6, town: "Præstø", type: "Festival", emoji: "📚", date: "2026-06-20", dateEnd: "2026-06-21", desc: "Denmark's cosiest literature festival in the charming harbour town of Præstø. Meet Danish authors, enjoy live music and explore cobblestone streets. Almost entirely unknown to international visitors.", mapHint: "Præstø Torv, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#C60C30", tags: ["Literature", "Music", "Culture"] },
  { id: 2, name: "Sommerdage i Præstø", travelTime: "1h 10min 🚂", rating: 4.4, town: "Præstø", type: "Festival", emoji: "🌿", date: "2026-07-04", dateEnd: "2026-07-06", desc: "Nature and craft festival in Præstø. Plant dyeing workshops, ceramics, intimate concerts under open sky. Slow travel at its finest.", mapHint: "Præstø Havn, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#2E7D32", tags: ["Craft", "Nature", "Workshop"] },
  { id: 3, name: "Gyldne Dage i Præstø", travelTime: "1h 10min 🚂", rating: 4.3, town: "Præstø", type: "Festival", emoji: "🏰", date: "2026-09-12", dateEnd: "2026-09-13", desc: "Annual historical festival in Præstø with period costumes, local food and craft stalls. One of Zealand's best kept secrets.", mapHint: "Præstø Torv, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#C60C30", tags: ["History", "Culture", "Food"] },
  { id: 4, name: "Bondemarked på Oremandsgaard", travelTime: "1h 10min 🚂", rating: 4.5, town: "Præstø", type: "Market", emoji: "🌾", date: "2026-06-06", dateEnd: null, desc: "Farm market at the beautiful Oremandsgaard Estate. Local food producers, organic goods, handmade crafts and the award-winning Radius Distillery on site.", mapHint: "Oremandsgaard, Jungshoved, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#C60C30", tags: ["Food", "Organic", "Market"] },
  { id: 5, name: "Bakkefest", travelTime: "1h 15min 🚂", rating: 4.7, town: "Gilleleje", type: "Festival", emoji: "🎵", date: "2026-07-10", dateEnd: "2026-07-12", desc: "Three days of music overlooking the sea in Gilleleje. Big Danish artists, live DJs, food vendors. Sunday is free entry with a legendary herring table.", mapHint: "Bøgebakken 19, 3250 Gilleleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Food", "Seaside"] },
  { id: 6, name: "Musik i Lejet", travelTime: "1h 20min 🚂", rating: 4.8, town: "Tisvildeleje", type: "Festival", emoji: "🌊", date: "2026-07-17", dateEnd: "2026-07-19", desc: "Intimate music festival in the picturesque coastal village of Tisvildeleje. Music, art and gastronomy in stunning natural surroundings.", mapHint: "Tisvildeleje Strand, 3220 Tisvildeleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Art", "Coastal"] },
  { id: 7, name: "Folkely Festival", travelTime: "1h 30min 🚂", rating: 4.5, town: "Hundested", type: "Festival", emoji: "⚓", date: "2026-08-20", dateEnd: "2026-08-22", desc: "Three days of music, art and inspiring talks in Hundested harbour. Culture in a charming fishing village most tourists never find.", mapHint: "Hundested Havn, 3390 Hundested, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Art", "Harbour"] },
  { id: 8, name: "Fjordlys Festival", travelTime: "1h 25min 🚂", rating: 4.3, town: "Frederiksværk", type: "Festival", emoji: "🎆", date: "2026-07-25", dateEnd: "2026-07-26", desc: "Summer festival by the fjord in Frederiksværk. Live music, local food and sunset views over Isefjord. A hidden gem on the North Zealand coast.", mapHint: "Frederiksværk Havn, 3300 Frederiksværk, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Food", "Fjord"] },
  { id: 9, name: "Haveje Beach Bar Events", travelTime: "1h 20min 🚂", rating: 4.4, town: "Liseleje", type: "Concert", emoji: "🏖", date: "2026-07-14", dateEnd: "2026-07-15", desc: "Live music at Haveje beach bar, 150m from one of Denmark's most beautiful white sand beaches. Local acts, cold drinks and sea views.", mapHint: "Liselejevej, 3360 Liseleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Beach", "Drinks"] },
  { id: 10, name: "Samsø Music Festival", travelTime: "2h 30min 🚢", rating: 4.9, town: "Samsø", type: "Festival", emoji: "🎸", date: "2026-07-13", dateEnd: "2026-07-19", desc: "Since 1990, Denmark's cosiest music festival on the island of Samsø. Located in a forest close to the beach. Swim in the sea between concerts.", mapHint: "Mårup Kildevej 8, 8305 Samsø, Denmark", verified: "Jun 2026", color: "#6A1B9A", tags: ["Music", "Island", "Nature"] },
  { id: 11, name: "Maribo Jazz Festival", travelTime: "1h 45min 🚂", rating: 4.7, town: "Maribo", type: "Festival", emoji: "🎷", date: "2026-07-18", dateEnd: "2026-07-21", desc: "Denmark's friendliest jazz festival in the historic town of Maribo on Lolland-Falster. 120+ musicians across 18 venues. Classic jazz, New Orleans, swing and big band.", mapHint: "Kirkepladsen, 4930 Maribo, Denmark", verified: "Jun 2026", color: "#E65100", tags: ["Jazz", "Music", "Historic"] },
  { id: 12, name: "KirsebærFestival", travelTime: "2h 10min 🚂", rating: 4.6, town: "Kerteminde", type: "Festival", emoji: "🍒", date: "2026-07-17", dateEnd: "2026-07-19", desc: "Cherry festival in Kerteminde, Northeast Funen. A region famous for cherry orchards. Local produce, food and music. The most Danish thing you'll ever experience.", mapHint: "Kerteminde Havn, 5300 Kerteminde, Denmark", verified: "Jun 2026", color: "#B71C1C", tags: ["Food", "Local", "Seasonal"] },
];

const majorEvents = [
  { id: 101, name: "Roskilde Festival", travelTime: "25min 🚂", rating: 4.9, ticketStatus: "sold_out", town: "Roskilde", type: "Music", emoji: "🎸", date: "2026-06-27", dateEnd: "2026-07-04", desc: "Northern Europe's largest music festival. 130,000 attendees, 8 stages, 8 days. Running since 1971. 30 min from Copenhagen by train.", mapHint: "Roskilde Festival, Darupvej 35, 4000 Roskilde, Denmark", verified: "Jun 2026", color: "#E53935", tags: ["Music", "Camping", "International"] },
  { id: 102, name: "Distortion", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "free", town: "Copenhagen", type: "Music", emoji: "🔊", date: "2026-06-03", dateEnd: "2026-06-07", desc: "Copenhagen's legendary street festival. Five days of block parties in different neighbourhoods. Electronic music and 100,000+ people in the streets.", mapHint: "Nørrebrogade, 2200 Copenhagen, Denmark", verified: "Jun 2026", color: "#8E24AA", tags: ["Electronic", "Street", "Urban"] },
  { id: 103, name: "Aalborg Karneval", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aalborg", type: "Cultural", emoji: "🎭", date: "2026-05-20", dateEnd: "2026-05-24", desc: "Scandinavia's largest carnival. 100,000+ participants in costumes parading through Aalborg. Samba, floats and street performances.", mapHint: "Aalborg Centrum, 9000 Aalborg, Denmark", verified: "Jun 2026", color: "#F57F17", tags: ["Carnival", "Parade", "Costume"] },
  { id: 104, name: "Copenhagen Jazz Festival", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "free", town: "Copenhagen", type: "Music", emoji: "🎷", date: "2026-07-03", dateEnd: "2026-07-12", desc: "10 days of jazz across 100+ venues in Copenhagen. Free concerts in squares and parks. One of Europe's most important jazz festivals.", mapHint: "Copenhagen City Hall Square, Denmark", verified: "Jun 2026", color: "#00695C", tags: ["Jazz", "Free", "City-wide"] },
  { id: 105, name: "Smukfest", travelTime: "2h 45min 🚂", rating: 4.9, ticketStatus: "selling_fast", town: "Skanderborg", type: "Music", emoji: "🌲", date: "2026-08-05", dateEnd: "2026-08-09", desc: "Denmark's Most Beautiful Festival in a beech forest near Skanderborg. Rock, pop, folk, hip-hop. 50,000 attendees.", mapHint: "Smukfest, Dyrehaven, 8660 Skanderborg, Denmark", verified: "Jun 2026", color: "#2E7D32", tags: ["Music", "Forest", "Camping"] },
  { id: 106, name: "NorthSide Festival", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aarhus", type: "Music", emoji: "🎪", date: "2026-06-05", dateEnd: "2026-06-07", desc: "Aarhus's biggest music festival with eco-friendly focus. International headliners and Denmark's most sustainable festival setup.", mapHint: "NorthSide Festival, Eskelundsvej, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Eco", "International"] },
  { id: 107, name: "Aarhus Festuge", travelTime: "3h 🚂", rating: 4.6, ticketStatus: "free", town: "Aarhus", type: "Cultural", emoji: "🎨", date: "2026-08-28", dateEnd: "2026-09-06", desc: "One of Scandinavia's largest cultural festivals. 10 days of music, theatre, art and gastronomy. 300+ events, most free.", mapHint: "Aarhus Centrum, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#AD1457", tags: ["Culture", "Art", "Free"] },
  { id: 108, name: "Tønder Festival", travelTime: "3h 30min 🚂", rating: 4.8, ticketStatus: "available", town: "Tønder", type: "Music", emoji: "🎻", date: "2026-08-26", dateEnd: "2026-08-30", desc: "Scandinavia's leading folk and roots festival near the German border. Running since 1975 with an international following.", mapHint: "Tønder Festival Pladsen, 6270 Tønder, Denmark", verified: "Jun 2026", color: "#4E342E", tags: ["Folk", "Roots", "International"] },
  { id: 110, name: "Odense Flower Festival", town: "Odense", type: "Cultural", emoji: "🌸", date: "2026-08-13", dateEnd: "2026-08-16", desc: "200,000+ flowers transform the entire city centre of Odense. Streets, alleys, parks and squares become a floral paradise themed around Hans Christian Andersen's fairy tales. Free entry. Running since 1999.", mapHint: "Flakhaven, 5000 Odense C, Denmark", verified: "Jul 2026", color: "#E91E8C", tags: ["Flowers", "Free", "Family", "Culture"], ticketStatus: "free", travelTime: "1h 30min 🚂", rating: 4.7 },
  { id: 111, name: "H.C. Andersen Festivals", town: "Odense", type: "Cultural", emoji: "📖", date: "2026-08-13", dateEnd: "2026-08-22", desc: "Denmark's largest cultural festival with 500+ events across 10 days in Hans Christian Andersen's hometown. Street theatre, concerts, light shows, puppet shows and the famous Flower Festival — most events completely free.", mapHint: "Odense City Centre, 5000 Odense C, Denmark", verified: "Jul 2026", color: "#7B1FA2", tags: ["Culture", "Free", "Family", "Theatre"], ticketStatus: "free", travelTime: "1h 30min 🚂", rating: 4.8 },
  { id: 109, name: "Triangle Folklore Festival", travelTime: "2h 15min 🚂", rating: 4.5, ticketStatus: "free", town: "Vejle", type: "Cultural", emoji: "🌍", date: "2026-07-26", dateEnd: "2026-08-01", desc: "Denmark's biggest international folklore festival. Groups from 10+ countries perform traditional dance and music in the streets of Vejle. Running since 1995 — completely unknown to most international travelers.", mapHint: "Vejle Centrum, 7100 Vejle, Denmark", verified: "Jul 2026", color: "#1B5E20", tags: ["Folklore", "Dance", "International", "Culture"] },
];

const getEventDate = (dateStr, dateEnd) => {
  const d = new Date(dateStr);
  const opts = { day: "numeric", month: "short" };
  if (dateEnd) {
    const e = new Date(dateEnd);
    return d.toLocaleDateString("en-GB", opts) + " – " + e.toLocaleDateString("en-GB", opts);
  }
  return d.toLocaleDateString("en-GB", { ...opts, weekday: "short" });
};

const isUpcoming = (dateStr) => new Date(dateStr) >= new Date();
const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));


const majorEvents = [
  { id: 101, name: "Roskilde Festival", travelTime: "25min 🚂", rating: 4.9, ticketStatus: "sold_out", town: "Roskilde", type: "Music", emoji: "🎸", date: "2026-06-27", dateEnd: "2026-07-04", desc: "Northern Europe's largest music festival. 130,000 attendees, 8 stages, 8 days. Running since 1971. 30 min from Copenhagen by train.", mapHint: "Roskilde Festival, Darupvej 35, 4000 Roskilde, Denmark", verified: "Jun 2026", color: "#E53935", tags: ["Music", "Camping", "International"] },
  { id: 102, name: "Distortion", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "available", town: "Copenhagen", type: "Music", emoji: "🔊", date: "2026-06-03", dateEnd: "2026-06-07", desc: "Copenhagen's legendary street festival. Five days of block parties in different neighbourhoods. Electronic music and 100,000+ people in the streets.", mapHint: "Nørrebrogade, 2200 Copenhagen, Denmark", verified: "Jun 2026", color: "#8E24AA", tags: ["Electronic", "Street", "Urban"] },
  { id: 103, name: "Aalborg Karneval", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aalborg", type: "Cultural", emoji: "🎭", date: "2026-05-20", dateEnd: "2026-05-24", desc: "Scandinavia's largest carnival. 100,000+ participants in costumes parading through Aalborg. Samba, floats and street performances.", mapHint: "Aalborg Centrum, 9000 Aalborg, Denmark", verified: "Jun 2026", color: "#F57F17", tags: ["Carnival", "Parade", "Costume"] },
  { id: 104, name: "Copenhagen Jazz Festival", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "available", town: "Copenhagen", type: "Music", emoji: "🎷", date: "2026-07-03", dateEnd: "2026-07-12", desc: "10 days of jazz across 100+ venues in Copenhagen. Free concerts in squares and parks. One of Europe's most important jazz festivals.", mapHint: "Copenhagen City Hall Square, Denmark", verified: "Jun 2026", color: "#00695C", tags: ["Jazz", "Free", "City-wide"] },
  { id: 105, name: "Smukfest", travelTime: "2h 45min 🚂", rating: 4.9, ticketStatus: "selling_fast", town: "Skanderborg", type: "Music", emoji: "🌲", date: "2026-08-05", dateEnd: "2026-08-09", desc: "Denmark's Most Beautiful Festival in a beech forest near Skanderborg. Rock, pop, folk, hip-hop. 50,000 attendees.", mapHint: "Smukfest, Dyrehaven, 8660 Skanderborg, Denmark", verified: "Jun 2026", color: "#2E7D32", tags: ["Music", "Forest", "Camping"] },
  { id: 106, name: "NorthSide Festival", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aarhus", type: "Music", emoji: "🎪", date: "2026-06-05", dateEnd: "2026-06-07", desc: "Aarhus's biggest music festival with eco-friendly focus. International headliners and Denmark's most sustainable festival setup.", mapHint: "NorthSide Festival, Eskelundsvej, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Eco", "International"] },
  { id: 107, name: "Aarhus Festuge", travelTime: "3h 🚂", rating: 4.6, ticketStatus: "available", town: "Aarhus", type: "Cultural", emoji: "🎨", date: "2026-08-28", dateEnd: "2026-09-06", desc: "One of Scandinavia's largest cultural festivals. 10 days of music, theatre, art and gastronomy. 300+ events, most free.", mapHint: "Aarhus Centrum, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#AD1457", tags: ["Culture", "Art", "Free"] },
  { id: 108, name: "Tønder Festival", travelTime: "3h 30min 🚂", rating: 4.8, ticketStatus: "available", town: "Tønder", type: "Music", emoji: "🎻", date: "2026-08-26", dateEnd: "2026-08-30", desc: "Scandinavia's leading folk and roots festival near the German border. Running since 1975 with an international following.", mapHint: "Tønder Festival Pladsen, 6270 Tønder, Denmark", verified: "Jun 2026", color: "#4E342E", tags: ["Folk", "Roots", "International"] },
];

const towns = [
  { id: 1, name: "Ribe", region: "South Jutland", emoji: "⛪", tag: "Denmark's oldest town", desc: "Founded around 700 AD — the oldest town in Scandinavia. Medieval cathedral, Viking museum and cobblestone streets unchanged for centuries.", highlight: "Viking Center Ribe — artisans craft authentic Viking jewellery, leather and textiles on site. Buy directly from the maker.", travelTime: "3h 15min 🚂", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Ribe, 6760 Ribe, Denmark", nomiPotential: "High" },
  { id: 2, name: "Dragør", region: "Copenhagen Area", emoji: "⚓", tag: "Fisherman's village", desc: "Just 12km from Copenhagen — yellow ochre houses, a working harbour, cobblestone streets and fishing boats. Feels like another era.", highlight: "The harbour fish stalls sell smoked fish caught the same morning. No menus, no TripAdvisor. Just walk up and point.", travelTime: "30min 🚌", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Dragør Havn, 2791 Dragør, Denmark", nomiPotential: "High" },
  { id: 3, name: "Ærøskøbing", region: "Funen", emoji: "🏡", tag: "Denmark's fairy-tale town", desc: "750-year-old town on the island of Ærø. Half-timbered houses, flower-lined streets, no cars in the centre. One of Europe's best preserved small towns.", highlight: "The local bottle ship museum — a man spent decades making ships inside bottles. Completely unique, completely unknown internationally.", travelTime: "3h + ferry 🚢", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Ærøskøbing, 5970 Ærø, Denmark", nomiPotential: "Very High" },
  { id: 4, name: "Skagen", region: "North Jutland", emoji: "🌊", tag: "Where two seas meet", desc: "Denmark's northernmost town. Where the North Sea and Baltic Sea collide at Grenen. Yellow houses, artist culture and the most dramatic light in Scandinavia.", highlight: "The local fish auction starts at 6am on weekdays. Fresh fish sold direct from boats. Tourists never find this.", travelTime: "4h 🚂", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Skagen, 9990 Skagen, Denmark", nomiPotential: "High" },
  { id: 5, name: "Præstø", region: "Zealand", emoji: "🏘", tag: "Hidden countryside gem", desc: "South of Copenhagen — cobbled streets, old market square, preserved 18th century buildings. The kind of town that makes you wonder why nobody talks about it.", highlight: "Oremandsgaard Estate nearby sells locally produced goods from their own farm and distillery. Not on any tourist map.", travelTime: "1h 10min 🚂", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Præstø Torv, 4720 Præstø, Denmark", nomiPotential: "Very High" },
  { id: 6, name: "Faaborg", region: "Funen", emoji: "🌿", tag: "Old-world harbour charm", desc: "Quiet harbour town on the south coast of Funen. 17th century merchant buildings, cobblestone alleys, local ceramics and a strong local food scene.", highlight: "The local ceramics workshop near the harbour sells pieces made on site. Cash only, no website, no shipping.", travelTime: "2h 30min 🚂", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Faaborg Havn, 5600 Faaborg, Denmark", nomiPotential: "High" },
  { id: 7, name: "Gudhjem", region: "Bornholm", emoji: "🐟", tag: "Baltic island village", desc: "Atmospheric fishing village on Bornholm with half-timbered houses on steep winding streets. Home of the legendary Sol over Gudhjem smoked herring dish.", highlight: "Røgeriet — the old smokehouse. You can watch them smoke herring the traditional way and eat it right there on the harbour.", travelTime: "2h + ferry 🚢", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Gudhjem Havn, 3760 Gudhjem, Bornholm", nomiPotential: "Very High" },
  { id: 8, name: "Sønderho", region: "Fanø Island", emoji: "🌾", tag: "Hidden dune village", desc: "Tucked in the dunes of Fanø island on the west coast. Thatched houses, winding lanes, seals in the Wadden Sea National Park. Almost no tourists.", highlight: "The Fanø Kunstmuseer shows local folk art and crafts that have been made on the island for centuries. Tiny, intimate, extraordinary.", travelTime: "3h + ferry 🚢", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80", mapHint: "Sønderho, 6720 Fanø, Denmark", nomiPotential: "Very High" },
];

const essentials = [
  {
    id: 1,
    name: "Rejsekort",
    category: "Transport",
    emoji: "🚇",
    desc: "Denmark's public transport card — works on trains, buses and metro across the entire country. Much cheaper than buying individual tickets. Pay as you go, just tap in and out.",
    howTo: "Buy at any train station or DSB ticket machine. Costs 80 DKK deposit. Top up with cash or card.",
    price: "80 DKK deposit + top-up",
    link: "https://www.rejsekort.dk/en",
    tip: "Always remember to check OUT when leaving transport — or you get charged max fare.",
    icon: "🟦",
  },
  {
    id: 2,
    name: "Rent a Bike",
    category: "Transport",
    emoji: "🚲",
    desc: "Denmark is the cycling capital of the world. Copenhagen has over 390km of dedicated cycle lanes. Renting a bike is the best way to see the city — and completely normal here.",
    howTo: "Bycyklen electric city bikes are available across Copenhagen via the app. Or rent from local bike shops from around 100 DKK/day.",
    price: "From 100 DKK/day",
    link: "https://bycyklen.dk/en/",
    tip: "Cycle on the right, signal with your arm, and always lock up. Bike theft is common in Copenhagen.",
    icon: "🟩",
  },
  {
    id: 3,
    name: "MobilePay",
    category: "Payments",
    emoji: "📱",
    desc: "Denmark's universal payment app. Almost every market stall, small shop and local vendor accepts MobilePay — even if they don't take cards. Essential for local markets and hidden shops.",
    howTo: "Download the MobilePay app. Requires a Danish phone number or international setup. Link your credit card.",
    price: "Free to use",
    link: "https://www.mobilepay.dk/erhverv/international-customers",
    tip: "Many small Nomi-style businesses ONLY accept MobilePay or cash. Download it before you go.",
    icon: "🟣",
  },
  {
    id: 4,
    name: "DSB App",
    category: "Transport",
    emoji: "🚂",
    desc: "The Danish national railway app. Book train tickets, check schedules and get real-time delays. Essential for getting around Denmark beyond Copenhagen.",
    howTo: "Download the DSB app and create an account. Buy tickets in advance for cheaper prices.",
    price: "Free app, tickets vary",
    link: "https://www.dsb.dk/en/",
    tip: "Buy Orange tickets (Orangebilletter) weeks in advance for up to 50% off standard prices.",
    icon: "🔴",
  },
  {
    id: 5,
    name: "Copenhagen Card",
    category: "Sightseeing",
    emoji: "🎟",
    desc: "All-in-one card covering free entry to 89 attractions, unlimited public transport and discounts across Copenhagen. Worth it if you're staying 2+ days and plan to visit museums.",
    howTo: "Buy online at copenhagencard.com or at the airport. Available for 24h, 48h, 72h or 120h.",
    price: "From 499 DKK (24h)",
    link: "https://www.copenhagencard.com",
    tip: "The Tivoli entry alone is 150 DKK — the card pays for itself quickly if you visit 3+ attractions.",
    icon: "🟡",
  },
  {
    id: 6,
    name: "eSIM or Local SIM",
    category: "Connectivity",
    emoji: "📶",
    desc: "EU roaming covers most European visitors in Denmark. If you're from outside the EU, get a local SIM or eSIM — essential for navigation, MobilePay and finding Nomi hidden spots.",
    howTo: "Buy a SIM at 7-Eleven, Netto or any phone shop. Lebara and Lycamobile work well and are cheap.",
    price: "From 49 DKK",
    link: null,
    tip: "Make sure your phone is unlocked before traveling. Most Danish SIMs work immediately.",
    icon: "🟤",
  },
];


export default function Nomi() {
  const [active, setActive] = useState("explore");
  const [continent, setContinent] = useState(null);
  const [country, setCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [category, setCategory] = useState("All");
  const [savedItems, setSavedItems] = useState([2, 7, 19]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stillHereMap, setStillHereMap] = useState({}); // productId -> {count, userConfirmed}
  const [search, setSearch] = useState("");
  const [mapCity, setMapCity] = useState(null);
  const [eventMonth, setEventMonth] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [eventTab, setEventTab] = useState("local");
  const [townFilter, setTownFilter] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // AI Guide
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your Local Assist ◆ Tell me where you're heading — or what you're after — and I'll find you something that exists nowhere else. Welcome to Nomi." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef(null);

  // Support
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [supportDismissed, setSupportDismissed] = useState(false);
  const [supportMessages, setSupportMessages] = useState([
    { role: "assistant", text: "Hi! 👋 I'm the Nomi support assistant. Ask me anything!" }
  ]);
  const [supportInput, setSupportInput] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [bubblePos, setBubblePos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [dragText, setDragText] = useState("");
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const dragTexts = ["Wii!", "Weee!", "Woop!", "Zoom!", "Yeet!"];

  // Location alert
  const [locationAlert, setLocationAlert] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSupportVisible(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (aiBottomRef.current) aiBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const data = await res.json();
        const userCountry = data.address?.country;
        if (!userCountry) return;
        const match = cities.find(c => userCountry.toLowerCase().includes(c.country.toLowerCase().split(" ")[0].toLowerCase()));
        if (match) { setLocationAlert(match); setAlertVisible(true); setTimeout(() => setAlertVisible(false), 5000); }
      } catch {}
    }, () => {});
  }, []);

  const toggleSave = (id) => setSavedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Products to display
  const displayProducts = selectedCity
    ? (selectedCity.products || []).map(p => ({ ...p, city: selectedCity.name, color: selectedCity.color })).filter(p => category === "All" || p.category === category)
    : allProducts.filter(p => category === "All" || p.category === category);

  const savedProducts = allProducts.filter(p => savedItems.includes(p.id));
  const searchResults = search ? allProducts.filter(p =>
    [p.name, p.city, p.shop, p.category, p.exclusive, p.desc].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  ) : [];

  const accentColor = selectedCity?.color || "#D4B483";

  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", text: msg }]);
    setAiLoading(true);
    try {
      const productList = allProducts.map(p => p.name + " in " + p.city + " (" + p.price + ") - " + p.exclusive).join(", ");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are Local Assist — Nomi's AI guide. Help travelers discover exclusive local finds in Denmark that exist nowhere else — from Copenhagen boutiques to small town events. Be warm, concise and specific. Available products: " + productList },
            ...aiMessages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
            { role: "user", content: msg }
          ],
          max_tokens: 400
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || data.error?.message || "Something went wrong!";
      setAiMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: "assistant", text: "Connection error — try again!" }]);
    }
    setAiLoading(false);
  };

  const sendSupport = async () => {
    if (!supportInput.trim() || supportLoading) return;
    const msg = supportInput.trim();
    setSupportInput("");
    setSupportMessages(prev => [...prev, { role: "user", text: msg }]);
    setSupportLoading(true);
    try {
      const history = supportMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }]
      }));
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + import.meta.env.VITE_GEMINI_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: "You are GoBot — the friendly support assistant for Nomi, an app where travelers discover exclusive things that exist nowhere else. Keep answers short and warm. Cities available: Seoul, Tokyo, Marrakech, Copenhagen, Mexico City, Tirana. The app is free for travelers. Shops can DM us to get listed. Users can save finds with the heart button. AI Guide tab gives recommendations. Map tab shows shop locations." }] },
            contents: [...history, { role: "user", parts: [{ text: msg }] }]
          })
        }
      );
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || data.error?.message
        || "Something went wrong — try again!";
      setSupportMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setSupportMessages(prev => [...prev, { role: "assistant", text: "Connection error — try again!" }]);
    }
    setSupportLoading(false);
  };

  const onDragStart = (e) => {
    e.stopPropagation();
    if (e.touches && e.cancelable) e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const el = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: cx - el.left, y: cy - el.top };
    hasMoved.current = false;
    const onMove = (ev) => {
      if (ev.cancelable) ev.preventDefault();
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
      if (!hasMoved.current) setDragText(dragTexts[Math.floor(Math.random() * dragTexts.length)]);
      hasMoved.current = true;
      setDragging(true);
      setBubblePos({ x: Math.min(Math.max(x - dragOffset.current.x, 0), window.innerWidth - 80), y: Math.min(Math.max(y - dragOffset.current.y, 0), window.innerHeight - 120) });
    };
    const onUp = () => {
      if (!hasMoved.current) setSupportOpen(true);
      setDragging(false);
      setTimeout(() => setDragText(""), 400);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d < 1 ? Math.round(d * 1000) + "m" : d.toFixed(1) + "km";
  };

  const getDistanceRaw = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const requestLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
      () => { setLocationLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const confirmStillHere = (productId, shopLocation) => {
    if (!navigator.geolocation) {
      alert("Location not available on your device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // For now accept any location (in production check distance to shop)
        setStillHereMap(prev => ({
          ...prev,
          [productId]: {
            count: (prev[productId]?.count || 0) + (prev[productId]?.userConfirmed ? 0 : 1),
            userConfirmed: true,
            date: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })
          }
        }));
      },
      () => alert("Please enable location to confirm this find.")
    );
  };

  const ProductCard = ({ product }) => (
    <div className="product-card" style={{ marginBottom: 10 }} onClick={() => setSelectedProduct(product)}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: `${product.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          {product.photo ? <img src={product.photo} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : product.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.25, paddingRight: 8, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>{product.name}</div>
            <button className="save-btn" onClick={e => { e.stopPropagation(); toggleSave(product.id); }}>{savedItems.includes(product.id) ? "♥" : "♡"}</button>
          </div>
          <div style={{ fontSize: 11, color: "#6B5442", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3 }}>{product.shop}</div>
          {product.city && product.city !== selectedCity?.name && (
            <div style={{ fontSize: 10, color: product.color, marginTop: 2, fontWeight: 700 }}>◆ {product.city}</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ background: `${product.color}18`, color: product.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>◆ {product.exclusive}</span>
              {product.trending && <span style={{ fontSize: 10, fontWeight: 700, color: "#D4B483" }}>↗ HOT</span>}
              {product.isNew && <span style={{ fontSize: 10, fontWeight: 700, color: product.color }}>◆ NEW</span>}
              {product.locationType === "popup" && <span style={{ fontSize: 10, fontWeight: 700, color: "#FF9966" }}>⚠ Pop-up</span>}
              {product.locationType === "seasonal" && <span style={{ fontSize: 10, fontWeight: 700, color: "#FFB347" }}>◷ Seasonal</span>}
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#D4B483", fontFamily: "'Cormorant Garamond', serif" }}>{product.price}</span>
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
            {product.verified && (
              <span style={{ fontSize: 10, color: "#6B5442" }}>✓ Verified {product.verified}</span>
            )}
            {stillHereMap[product.id]?.count > 0 && (
              <span style={{ fontSize: 10, color: "#4CAF50", fontWeight: 700 }}>● {stillHereMap[product.id].count} confirmed it</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#16120A", minHeight: "100vh", maxWidth: 430, margin: "0 auto", color: "#EDE0C4", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes slideDown { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @media (min-width: 768px) {
          .nomi-root { display: grid !important; grid-template-columns: 380px 1fr; grid-template-rows: auto 1fr; min-height: 100vh; max-width: 1200px; margin: 0 auto !important; }
          .nomi-header { grid-column: 1 / -1; }
          .nomi-sidebar { grid-column: 1; grid-row: 2; border-right: 1px solid #2A1E10; overflow-y: auto; height: calc(100vh - 148px); position: sticky; top: 148px; }
          .nomi-content { grid-column: 2; grid-row: 2; overflow-y: auto; height: calc(100vh - 148px); }
          .nomi-nav { grid-column: 1; grid-row: 3; position: sticky; bottom: 0; }
          .mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
        }
        .slide-up { animation: slideUp 0.3s ease forwards; }
        .product-card { background:#1E1610;border-radius:16px;padding:14px;border:1px solid #2A1E10;cursor:pointer;transition:all 0.2s; }
        .product-card:active { transform:scale(0.98); }
        .cat-btn { border:1px solid #2A1E10;background:#1E1610;border-radius:100px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;flex-shrink:0;color:#8A7355;transition:all 0.2s; }
        .save-btn { border:none;background:none;cursor:pointer;font-size:18px;padding:4px;color:#8A7355; }
        .save-btn:active { animation:pop 0.3s; }
        .modal-bg { position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100;display:flex;align-items:flex-end;animation:fadeIn 0.2s; }
        .modal-sheet { background:#1A1208;border-radius:24px 24px 0 0;width:100%;max-width:430px;margin:0 auto;padding:20px 20px 44px;animation:slideUp 0.3s;max-height:88vh;overflow-y:auto;color:#EDE0C4; }
      `}</style>

      {/* Header */}
      <div className="nomi-header" style={{ background: "#16120A", borderBottom: "1px solid #2A1E10", padding: "44px 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#D4B483", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>◆ Nomi</div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>Discover wonders.</div>
          </div>

        </div>
        <div style={{ background: "#1E1610", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, border: "1px solid #2A1E10" }}>
          <span style={{ fontSize: 13, color: "#8A7355" }}>◆</span>
          <input value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setActive("search"); else setActive("explore"); }}
            placeholder="Search cities, businesses, finds..."
            style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent", color: "#EDE0C4", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
          {search && <button onClick={() => { setSearch(""); setActive("explore"); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#8A7355", fontSize: 14 }}>✕</button>}
        </div>
      </div>

      {/* Desktop layout wrapper */}
      <div style={{ display: "flex", width: "100%" }}>

      {/* Desktop sidebar */}
      <div className="desktop-only" style={{ width: 300, flexShrink: 0, borderRight: "1px solid #2A1E10", height: "calc(100vh - 120px)", overflowY: "auto", position: "sticky", top: 120, background: "#16120A" }}>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>🇩🇰 Denmark</div>
          {cities.map(city => (
            <div key={city.id} onClick={() => { setContinent(city.continent); setCountry(city.country); setSelectedCity(city); setActive("explore"); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 4, cursor: "pointer", background: selectedCity?.id === city.id ? `${city.color}20` : "transparent", border: `1px solid ${selectedCity?.id === city.id ? city.color : "transparent"}`, transition: "all 0.2s" }}>
              <FlagImg flagCode={city.flagCode} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#EDE0C4" }}>{city.name}</div>
                <div style={{ fontSize: 11, color: "#8A7355" }}>{city.country} · {city.products.length} finds</div>
              </div>
              {selectedCity?.id === city.id && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: city.color }} />}
            </div>
          ))}
        </div>

        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Navigate</div>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setActive(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 4, cursor: "pointer", background: active === item.id ? "#D4B483" : "transparent", transition: "all 0.2s" }}>
              <span style={{ fontSize: 14, color: active === item.id ? "#16120A" : "#8A7355" }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: active === item.id ? "#16120A" : "#8A7355" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, height: "calc(100vh - 120px)", overflowY: active === "ai" ? "hidden" : "auto", paddingBottom: active === "ai" ? 0 : 80, minWidth: 0 }}>

        {/* SEARCH */}
        {active === "search" && (
          <div className="slide-up" style={{ padding: "16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>{searchResults.length} results for "{search}"</div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8A7355" }}>No finds matched</div>
            ) : searchResults.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* EXPLORE */}
        {active === "explore" && (
          <div className="slide-up">
            {/* Simple Denmark city selector */}
            <div style={{ padding: "12px 16px 8px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>🇩🇰 Cities in Denmark</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cities.map(city => (
                  <button key={city.id} onClick={() => setSelectedCity(selectedCity?.id === city.id ? null : city)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 100, background: selectedCity?.id === city.id ? city.color : "#1E1610", color: selectedCity?.id === city.id ? "#fff" : "#8A7355", border: `2px solid ${selectedCity?.id === city.id ? city.color : "#2A1E10"}`, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s" }}>
                    <FlagImg flagCode={city.flagCode} />
                    {city.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Hero */}
            <div style={{ padding: "4px 16px 6px" }}>
              <div style={{ borderRadius: 16, overflow: "hidden", position: "relative", height: 110, background: selectedCity ? selectedCity.color : country ? "#2A1E10" : "#1A1208" }}>
                {selectedCity?.photo && (
                  <img src={selectedCity.photo} alt={selectedCity.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.55 }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.15) 100%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px" }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#fff", fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
                    {selectedCity ? selectedCity.name : country ? country : "World's Merchandise"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
                    {selectedCity ? `◆ ${displayProducts.length} businesses in ${selectedCity.name}` : country ? `◆ ${displayProducts.length} finds across ${country}` : "Select a continent to start exploring"}
                  </div>
                </div>
                {(selectedCity || country) && (
                  <div style={{ position: "absolute", top: 10, left: 12 }}>
                    <span style={{ background: selectedCity ? selectedCity.color : "#D4B483", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 100, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      {selectedCity ? selectedCity.tag : country}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Category filter */}
            {displayProducts.length > 0 && (
              <div style={{ display: "flex", gap: 8, padding: "4px 16px 8px", overflowX: "auto" }}>
                {["All", "Fashion", "Accessories", "Bags"].map(cat => (
                  <button key={cat} className="cat-btn" onClick={() => setCategory(cat)}
                    style={{ background: category === cat ? "#D4B483" : "#1E1610", color: category === cat ? "#16120A" : "#8A7355", border: `1px solid ${category === cat ? "#D4B483" : "#2A1E10"}` }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Products */}
            <div style={{ padding: "0 16px" }} className="products-area">
              {displayProducts.length === 0 && (continent || country) ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#8A7355" }}>
                  {continent && !country ? "Select a country to see finds" : continent && country && !selectedCity ? "Showing all finds in " + country : "No finds in this category"}
                </div>
              ) : (
                <>
                  {displayProducts.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase" }}>{displayProducts.length} Businesses</span>
                      <span style={{ fontSize: 11, color: "#6B5442" }}>{selectedCity ? selectedCity.name : country || ""}</span>
                    </div>
                  )}
                  {displayProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </>
              )}
            </div>
          </div>
        )}

        {/* AI GUIDE */}
        {active === "events" && (
          <div className="slide-up" style={{ padding: "16px" }}>
            {/* Header */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>◈ Events</div>
              <div style={{ fontSize: 12, color: "#8A7355", marginTop: 3 }}>Discover what's happening across Denmark</div>
            </div>

            {/* Major / Local tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setEventTab("local")}
                style={{ flex: 1, background: eventTab === "local" ? "#D4B483" : "#1E1610", color: eventTab === "local" ? "#16120A" : "#8A7355", border: `1px solid ${eventTab === "local" ? "#D4B483" : "#2A1E10"}`, borderRadius: 12, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                🏘 Local Events
              </button>
              <button onClick={() => setEventTab("major")}
                style={{ flex: 1, background: eventTab === "major" ? "#D4B483" : "#1E1610", color: eventTab === "major" ? "#16120A" : "#8A7355", border: `1px solid ${eventTab === "major" ? "#D4B483" : "#2A1E10"}`, borderRadius: 12, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                🌟 Major Events
              </button>
            </div>

                        {/* Filters */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Date</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14 }}>
                {["All", "Jun", "Jul", "Aug", "Sep"].map(m => (
                  <button key={m} onClick={() => setEventMonth(m === "All" ? null : (eventMonth === m ? null : m))}
                    style={{ background: (m === "All" && !eventMonth) || eventMonth === m ? "#D4B483" : "#1E1610", color: (m === "All" && !eventMonth) || eventMonth === m ? "#16120A" : "#8A7355", border: `1px solid ${(m === "All" && !eventMonth) || eventMonth === m ? "#D4B483" : "#2A1E10"}`, borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {m}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Type</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {(eventTab === "local"
                  ? ["All", "Festival", "Market", "Concert", "North Zealand"]
                  : ["All", "Music", "Cultural"]
                ).map(f => (
                  <button key={f} onClick={() => setEventType(f === "All" ? null : (eventType === f ? null : f))}
                    style={{ background: (f === "All" && !eventType) || eventType === f ? "#D4B483" : "#1E1610", color: (f === "All" && !eventType) || eventType === f ? "#16120A" : "#8A7355", border: `1px solid ${(f === "All" && !eventType) || eventType === f ? "#D4B483" : "#2A1E10"}`, borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {(eventTab === "local" ? events : majorEvents)
              .filter(e => isUpcoming(e.date))
              .filter(e => {
                const em = new Date(e.date).toLocaleString("en",{month:"short"});
                const monthOk = !eventMonth || em === eventMonth;
                const typeOk = !eventType || e.type === eventType || (eventType === "North Zealand" && ["Gilleleje","Tisvildeleje","Hundested","Frederiksværk","Liseleje"].includes(e.town));
                return monthOk && typeOk;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map(event => (
                <div key={event.id} style={{ background: "#1E1610", borderRadius: 18, padding: "16px", marginBottom: 12, border: `1px solid ${event.color}33`, position: "relative", overflow: "hidden" }}>
                  {/* Color accent */}
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: event.color, borderRadius: "18px 0 0 18px" }} />

                  <div style={{ paddingLeft: 8 }}>
                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 18 }}>{event.emoji}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#EDE0C4", fontFamily: "'Cormorant Garamond', serif" }}>{event.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: event.color, background: `${event.color}18`, padding: "3px 8px", borderRadius: 100 }}>{event.type}</span>
                          <span style={{ fontSize: 11, color: "#8A7355" }}>{event.town}</span>
                        </div>
                        {/* Rating + Travel time */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ color: "#D4B483", fontSize: 11 }}>★</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#EDE0C4" }}>{event.rating}</span>
                          </div>
                          <span style={{ fontSize: 10, color: "#6B5442" }}>·</span>
                          <span style={{ fontSize: 11, color: "#8A7355" }}>{event.travelTime} from CPH</span>
                          {event.ticketStatus === "sold_out" && <span style={{ fontSize: 10, fontWeight: 700, color: "#ff4444", background: "#ff444422", padding: "2px 8px", borderRadius: 100 }}>🔴 Sold out</span>}
                          {event.ticketStatus === "selling_fast" && <span style={{ fontSize: 10, fontWeight: 700, color: "#FFB347", background: "#FFB34722", padding: "2px 8px", borderRadius: 100 }}>🟡 Selling fast</span>}
                          {event.ticketStatus === "available" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "2px 8px", borderRadius: 100 }}>🟢 Tickets available</span>}
                          {event.ticketStatus === "free" && <span style={{ fontSize: 10, fontWeight: 700, color: "#4CAF50", background: "#4CAF5022", padding: "2px 8px", borderRadius: 100 }}>✓ Free entry</span>}
                        </div>
                      </div>
                      {/* Days until */}
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#D4B483", fontFamily: "'Cormorant Garamond', serif" }}>
                          {daysUntil(event.date) === 0 ? "Today!" : daysUntil(event.date) === 1 ? "Tomorrow" : `${daysUntil(event.date)}d`}
                        </div>
                        <div style={{ fontSize: 10, color: "#8A7355" }}>away</div>
                      </div>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: 12, color: "#D4B483", fontWeight: 600, marginBottom: 8 }}>
                      📅 {getEventDate(event.date, event.dateEnd)}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 12, color: "#8A7355", lineHeight: 1.6, marginBottom: 10 }}>{event.desc}</div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {event.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 10, color: "#6B5442", background: "#2A1E10", padding: "3px 8px", borderRadius: 100 }}>{tag}</span>
                      ))}
                    </div>

                    {/* Distance from user */}
                    {userLocation && (() => {
                      const eventCoords = {
                        "Præstø Litteraturfestival": [55.1167, 12.0500],
                        "Sommerdage i Præstø": [55.1167, 12.0500],
                        "Gyldne Dage i Præstø": [55.1167, 12.0500],
                        "Bondemarked på Oremandsgaard": [55.1200, 12.0600],
                        "Bakkefest": [56.1167, 12.3000],
                        "Musik i Lejet": [56.0500, 12.0667],
                        "Folkely Festival": [55.9667, 11.8500],
                        "Fjordlys Festival": [55.9667, 12.0167],
                        "Haveje Beach Bar Events": [56.0167, 11.9833],
                        "Samsø Music Festival": [55.8833, 10.6167],
                        "Maribo Jazz Festival": [54.7667, 11.5000],
                        "KirsebærFestival": [55.4500, 10.6500],
                        "Hongdae Flea Market": [37.5563, 126.9374],
                        "Marrakech Craft Week": [31.6295, -7.9811],
                      };
                      const ec = eventCoords[event.name];
                      if (!ec) return null;
                      const dist = getDistance(userLocation.lat, userLocation.lng, ec[0], ec[1]);
                      return (
                        <div style={{ fontSize: 12, color: "#D4B483", fontWeight: 700, marginBottom: 8 }}>
                          ● {dist} from you
                        </div>
                      );
                    })()}

                    {/* Denmark overview map with pin */}
                    <div style={{ fontSize: 10, color: "#8A7355", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>📍 Location in Denmark</div>
                    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 10, height: 320 }}>
                      <iframe
                        title={event.name}
                        width="100%"
                        height="320"
                        frameBorder="0"
                        style={{ border: 0, display: "block" }}
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(event.mapHint + ", Denmark")}&zoom=6&maptype=roadmap`}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.mapHint)}`}
                        target="_blank" rel="noreferrer"
                        style={{ flex: 1, background: event.color, color: "#fff", borderRadius: 10, padding: "8px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                        ↗ Get Directions
                      </a>
                      <div style={{ fontSize: 10, color: "#6B5442", display: "flex", alignItems: "center" }}>✓ {event.verified}</div>
                    </div>
                  </div>
                </div>
              ))}

            {/* No events message */}
            {events.filter(e => isUpcoming(e.date)).filter(e => {
                const em = new Date(e.date).toLocaleString("en",{month:"short"});
                const monthOk = !eventMonth || em === eventMonth;
                const typeOk = !eventType || e.type === eventType || (eventType === "North Zealand" && ["Gilleleje","Tisvildeleje","Hundested","Frederiksværk","Liseleje"].includes(e.town));
                return monthOk && typeOk;
              }).length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8A7355" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>◈</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#EDE0C4" }}>No upcoming events</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Check back soon — we add new events weekly</div>
              </div>
            )}
          </div>
        )}

        {active === "visits" && (
          <div className="slide-up" style={{ padding: "16px" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>◉ Local Towns</div>
              <div style={{ fontSize: 12, color: "#8A7355", marginTop: 3 }}>Denmark's most beautiful hidden towns — beyond the capital</div>
            </div>

            {/* Region filter */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
              {["All", "Copenhagen Area", "Zealand", "Funen", "South Jutland", "North Jutland", "Bornholm", "Fanø Island"].map(r => (
                <button key={r} onClick={() => setTownFilter(r === "All" ? null : (townFilter === r ? null : r))}
                  style={{ background: (r === "All" && !townFilter) || townFilter === r ? "#D4B483" : "#1E1610", color: (r === "All" && !townFilter) || townFilter === r ? "#16120A" : "#8A7355", border: `1px solid ${(r === "All" && !townFilter) || townFilter === r ? "#D4B483" : "#2A1E10"}`, borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {r}
                </button>
              ))}
            </div>

            {towns.filter(t => !townFilter || t.region === townFilter).map(town => (
              <div key={town.id} style={{ background: "#1E1610", borderRadius: 18, marginBottom: 12, overflow: "hidden", border: "1px solid #2A1E10" }}>
                {/* Header */}
                <div style={{ padding: "14px 16px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 20 }}>{town.emoji}</span>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#EDE0C4", fontFamily: "'Cormorant Garamond', serif" }}>{town.name}</div>
                          <div style={{ fontSize: 10, color: "#8A7355", textTransform: "uppercase", letterSpacing: 0.5 }}>{town.region}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#D4B483", fontWeight: 700, marginBottom: 6 }}>{town.tag}</div>
                      <div style={{ fontSize: 12, color: "#8A7355", lineHeight: 1.6, marginBottom: 10 }}>{town.desc}</div>

                      {/* Nomi highlight */}
                      <div style={{ background: "#2A1E10", borderRadius: 10, padding: "10px 12px", marginBottom: 10, borderLeft: "3px solid #D4B483" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#D4B483", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>◆ Nomi Find</div>
                        <div style={{ fontSize: 12, color: "#EDE0C4", lineHeight: 1.5 }}>{town.highlight}</div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, color: "#8A7355" }}>{town.travelTime} from CPH</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: town.nomiPotential === "Very High" ? "#4CAF50" : "#D4B483", background: town.nomiPotential === "Very High" ? "#4CAF5022" : "#D4B48322", padding: "2px 8px", borderRadius: 100 }}>
                          {town.nomiPotential === "Very High" ? "⭐ Top Nomi Pick" : "◆ Nomi Pick"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div style={{ height: 160 }}>
                  <iframe title={town.name} width="100%" height="160" frameBorder="0" style={{ border: 0, display: "block" }}
                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(town.mapHint)}&zoom=12`} />
                </div>

                {/* Actions */}
                <div style={{ padding: "10px 16px 14px", display: "flex", gap: 8 }}>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(town.mapHint)}`} target="_blank" rel="noreferrer"
                    style={{ flex: 1, background: "#D4B483", color: "#16120A", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                    ↗ Get Directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {active === "essentials" && (
          <div className="slide-up" style={{ padding: "16px" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>✓ Travel Essentials</div>
              <div style={{ fontSize: 12, color: "#8A7355", marginTop: 3 }}>Everything you need to travel Denmark like a local</div>
            </div>

            {["Transport", "Payments", "Sightseeing", "Connectivity"].map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>{cat}</div>
                {essentials.filter(e => e.category === cat).map(item => (
                  <div key={item.id} style={{ background: "#1E1610", borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: "1px solid #2A1E10" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#EDE0C4", fontFamily: "'Cormorant Garamond', serif" }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "#D4B483", fontWeight: 600 }}>{item.price}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#8A7355", lineHeight: 1.6, marginBottom: 8 }}>{item.desc}</div>
                    <div style={{ background: "#2A1E10", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#D4B483", marginBottom: 3 }}>How to get it</div>
                      <div style={{ fontSize: 11, color: "#EDE0C4", lineHeight: 1.5 }}>{item.howTo}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#6B5442", fontStyle: "italic", marginBottom: item.link ? 8 : 0 }}>💡 {item.tip}</div>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noreferrer"
                        style={{ display: "inline-block", background: "#D4B483", color: "#16120A", borderRadius: 100, padding: "6px 14px", fontSize: 11, fontWeight: 700, textDecoration: "none", marginTop: 4 }}>
                        Learn more ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {active === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ padding: "8px 16px 6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, color: "#D4B483" }}>◆</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>Local Assist</span>
                <span style={{ fontSize: 11, color: "#8A7355", marginLeft: 4 }}>— powered by AI</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 8px", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
              {aiMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #D4B483, #8A7355)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginRight: 8, flexShrink: 0, marginTop: 2 }}>◆</div>
                  )}
                  <div style={{ maxWidth: "78%", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5, background: m.role === "user" ? "#D4B483" : "#1E1610", color: m.role === "user" ? "#16120A" : "#EDE0C4", border: m.role === "user" ? "none" : "1px solid #2A1E10" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #D4B483, #8A7355)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>◆</div>
                  <div style={{ background: "#1E1610", border: "1px solid #2A1E10", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, color: "#8A7355" }}>Thinking...</div>
                </div>
              )}
              <div ref={aiBottomRef} />
            </div>
            <div style={{ flexShrink: 0, padding: "6px 16px 8px", borderTop: "1px solid #2A1E10", background: "#16120A" }}>
              <div style={{ fontSize: 10, color: "#6B5442", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Try asking →</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
                {["Edgy Seoul finds", "Tokyo under ¥20k", "Artisan bags", "Hidden gems"].map(s => (
                  <button key={s} onClick={() => setAiInput(s)} style={{ background: "#1E1610", border: "1px solid #2A1E10", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#8A7355", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAI()}
                  placeholder="Tell me where you're heading..."
                  style={{ flex: 1, border: "1.5px solid #D4B483", borderRadius: 100, padding: "10px 16px", fontSize: 13, outline: "none", background: "#1E1610", color: "#EDE0C4", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                <button onClick={sendAI} disabled={aiLoading || !aiInput.trim()} style={{ background: aiLoading || !aiInput.trim() ? "#2A1E10" : "#D4B483", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", color: aiLoading || !aiInput.trim() ? "#8A7355" : "#16120A", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
              </div>
            </div>
          </div>
        )}

        {/* MAP */}
        {active === "map" && (
          <div className="slide-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 148px)" }}>
            <div style={{ padding: "8px 0 4px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 8, paddingLeft: 16, overflowX: "auto", paddingRight: 16 }}>
                {[...cities].sort((a,b) => a.name.localeCompare(b.name)).map(city => (
                  <button key={city.id} onClick={() => { setMapCity(city); setSelectedPin(null); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 100, background: mapCity?.id === city.id ? city.color : "#1E1610", color: mapCity?.id === city.id ? "#fff" : "#8A7355", border: `1px solid ${mapCity?.id === city.id ? city.color : "#2A1E10"}`, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                    <FlagImg flagCode={city.flagCode} />
                    {city.name}
                  </button>
                ))}
              </div>
            </div>

            {!mapCity ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 24px" }}>
                <div style={{ fontSize: 28, color: "#D4B483" }}>●</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#EDE0C4", fontFamily: "'Cormorant Garamond', serif" }}>Pick a city</div>
                <div style={{ fontSize: 12, color: "#8A7355", textAlign: "center" }}>Select a city above to see its exclusive finds</div>
              </div>
            ) : (
              <div style={{ flex: 1, margin: "8px 16px 0", borderRadius: 16, overflow: "hidden", border: "1px solid #2A1E10", display: "flex", flexDirection: "column" }}>
                <div style={{ height: 220, position: "relative", flexShrink: 0, overflow: "hidden" }}>
                  {(() => {
                    const COORDS = {
                      1:[37.5563,126.9374], 2:[37.5247,127.0400], 3:[37.5563,126.9227],
                      4:[37.5200,127.0420], 5:[37.5340,126.9940], 20:[37.5500,126.9200],
                      6:[35.6654,139.7107], 7:[35.6702,139.7026], 8:[35.6488,139.7026], 9:[35.6654,139.7200],
                      10:[31.6315,-7.9887], 11:[31.6290,-7.9900], 12:[31.6340,-7.9950],
                      13:[55.6761,12.5683], 14:[55.6780,12.5700], 15:[55.6750,12.5760],
                      16:[19.4284,-99.1276], 17:[19.4180,-99.1620], 18:[19.3980,-99.1200],
                      19:[41.3275,19.8187],
                    };
                    const CITY_CENTER = {
                      "Seoul":[37.5665,126.9780], "Tokyo":[35.6762,139.6503],
                      "Marrakech":[31.6295,-7.9811], "Copenhagen":[55.6761,12.5683],
                      "Mexico City":[19.4326,-99.1332], "Tirana":[41.3275,19.8187],
                    };
                    const pinCoords = selectedPin ? COORDS[selectedPin.id] : null;
                    const cityCenter = CITY_CENTER[mapCity.name] || [37.5665,126.9780];
                    const src = selectedPin && pinCoords
                      ? `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(selectedPin.mapHint || selectedPin.shop)}&zoom=17`
                      : userLocation
                      ? `https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&center=${userLocation.lat},${userLocation.lng}&zoom=14&maptype=roadmap`
                      : `https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&center=${cityCenter[0]},${cityCenter[1]}&zoom=14&maptype=roadmap`;
                    return (
                      <iframe
                        key={mapCity.name + (selectedPin?.id || "overview")}
                        title="Google Map"
                        width="100%"
                        height="220"
                        frameBorder="0"
                        style={{ border: 0, display: "block" }}
                        referrerPolicy="no-referrer-when-downgrade"
                        src={src}
                        allowFullScreen
                      />
                    );
                  })()}
                  <div style={{ position: "absolute", bottom: 8, left: 8, pointerEvents: "none" }}>
                    <span style={{ background: mapCity.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 100 }}>{mapCity.name} · {mapCity.products.length} finds</span>
                  </div>
                  {(() => {
                    const COORDS = {
                      1:[37.5563,126.9374], 2:[37.5247,127.0400], 3:[37.5563,126.9227],
                      4:[37.5200,127.0420], 5:[37.5340,126.9940], 20:[37.5500,126.9200],
                      6:[35.6654,139.7107], 7:[35.6702,139.7026], 8:[35.6488,139.7026], 9:[35.6654,139.7200],
                      10:[31.6315,-7.9887], 11:[31.6290,-7.9900], 12:[31.6340,-7.9950],
                      13:[55.6761,12.5683], 14:[55.6780,12.5700], 15:[55.6750,12.5760],
                      16:[19.4284,-99.1276], 17:[19.4180,-99.1620], 18:[19.3980,-99.1200],
                      19:[41.3275,19.8187],
                    };
                    const pinCoords = selectedPin ? COORDS[selectedPin.id] : null;
                    const mapsUrl = selectedPin && pinCoords
                      ? `https://www.google.com/maps/dir/?api=1&destination=${pinCoords[0]},${pinCoords[1]}&destination_place_id=${encodeURIComponent(selectedPin.shop)}`
                      : `https://www.google.com/maps/search/?api=1&query=businesses+${encodeURIComponent(mapCity.name)}`;
                    return (
                      <a href={mapsUrl} target="_blank" rel="noreferrer"
                        style={{ position: "absolute", bottom: 8, right: 8, background: "#D4B483", color: "#16120A", padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                        {selectedPin ? "Get Directions ↗" : "Open in Maps ↗"}
                      </a>
                    );
                  })()}
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {/* Location button */}
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #1E1610", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "#8A7355" }}>
                      {userLocation ? "● Sorted by distance" : "Sort by distance?"}
                    </span>
                    {!userLocation && (
                      <button onClick={requestLocation} disabled={locationLoading}
                        style={{ background: "#D4B483", border: "none", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#16120A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {locationLoading ? "Locating..." : "Use my location ●"}
                      </button>
                    )}
                    {userLocation && (
                      <button onClick={() => setUserLocation(null)}
                        style={{ background: "none", border: "1px solid #2A1E10", borderRadius: 100, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#8A7355", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Clear
                      </button>
                    )}
                  </div>

                  {(() => {
                    const COORDS = {
                      1:[37.5563,126.9374], 2:[37.5247,127.0400], 3:[37.5563,126.9227],
                      4:[37.5200,127.0420], 5:[37.5340,126.9940], 20:[37.5500,126.9200],
                      6:[35.6654,139.7107], 7:[35.6702,139.7026], 8:[35.6488,139.7026], 9:[35.6654,139.7200],
                      10:[31.6315,-7.9887], 11:[31.6290,-7.9900], 12:[31.6340,-7.9950],
                      13:[55.6761,12.5683], 14:[55.6780,12.5700], 15:[55.6750,12.5760],
                      16:[19.4284,-99.1276], 17:[19.4180,-99.1620], 18:[19.3980,-99.1200],
                      19:[41.3275,19.8187],
                    };
                    const sorted = [...mapCity.products].sort((a, b) => {
                      if (!userLocation) return 0;
                      const ca = COORDS[a.id], cb = COORDS[b.id];
                      if (!ca || !cb) return 0;
                      return getDistanceRaw(userLocation.lat, userLocation.lng, ca[0], ca[1]) -
                             getDistanceRaw(userLocation.lat, userLocation.lng, cb[0], cb[1]);
                    });
                    return sorted.map(p => {
                      const c = COORDS[p.id];
                      const dist = userLocation && c ? getDistance(userLocation.lat, userLocation.lng, c[0], c[1]) : null;
                      return (
                        <div key={p.id}
                          onClick={() => setSelectedPin(selectedPin?.id === p.id ? null : p)}
                          onDoubleClick={() => setSelectedProduct({ ...p, city: mapCity.name, color: mapCity.color })}
                          style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #1E1610", cursor: "pointer", background: selectedPin?.id === p.id ? `${mapCity.color}15` : "transparent", transition: "background 0.2s" }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", background: `${mapCity.color}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            {p.photo ? <img src={p.photo} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.emoji}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#EDE0C4", fontFamily: "'Cormorant Garamond', serif" }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: "#8A7355", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>{p.shop}</div>
                            {dist && (
                              <div style={{ fontSize: 11, color: "#D4B483", marginTop: 3, fontWeight: 700 }}>● {dist} away</div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#D4B483", fontFamily: "'Cormorant Garamond', serif" }}>{p.price}</div>
                            {selectedPin?.id === p.id ? (
                              <button onClick={e => { e.stopPropagation(); setSelectedProduct({ ...p, city: mapCity.name, color: mapCity.color }); }}
                                style={{ fontSize: 11, color: "#fff", background: mapCity.color, border: "none", borderRadius: 100, padding: "2px 8px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                                Details ↗
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: "#8A7355" }}>Tap to locate</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAVED */}
        {active === "saved" && (
          <div className="slide-up" style={{ padding: "16px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4", marginBottom: 4 }}>♡ Saved</h2>
            <p style={{ fontSize: 12, color: "#8A7355", marginBottom: 14 }}>{savedProducts.length} businesses saved</p>
            {savedProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>♡</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#8A7355" }}>Nothing saved yet</div>
                <div style={{ fontSize: 12, color: "#6B5442", marginTop: 8 }}>Tap ♡ on any business to save it</div>
              </div>
            ) : savedProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

      </div>

      </div>{/* end desktop layout wrapper */}

      {/* Bottom Nav */}
      <div className="mobile-only" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(22,18,10,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid #2A1E10", padding: "6px 4px 20px", display: "flex", justifyContent: "space-around", zIndex: 50 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "0 8px" }}>
            <div style={{ background: active === item.id ? "#D4B483" : "transparent", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all 0.2s" }}>
              <span style={{ fontSize: 13, fontFamily: "serif", color: active === item.id ? "#16120A" : "#6B5442" }}>{item.icon}</span>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: active === item.id ? "#16120A" : "#6B5442" }}>{item.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Location alert */}
      {alertVisible && locationAlert && (
        <div onClick={() => { setContinent(locationAlert.continent); setCountry(locationAlert.country); setSelectedCity(locationAlert); setActive("explore"); setAlertVisible(false); }}
          style={{ position: "fixed", top: 60, left: 16, right: 16, maxWidth: 398, margin: "0 auto", background: "#1E1610", border: `1.5px solid ${locationAlert.color}`, borderRadius: 16, padding: "12px 16px", zIndex: 300, cursor: "pointer", animation: "slideDown 0.4s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: locationAlert.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{locationAlert.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#EDE0C4" }}>It exists here! ◆</div>
            <div style={{ fontSize: 11, color: "#8A7355", marginTop: 2 }}>You're in {locationAlert.country} — things here exist nowhere else</div>
          </div>
          <button onClick={e => { e.stopPropagation(); setAlertVisible(false); }} style={{ background: "none", border: "none", color: "#8A7355", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Support bubble */}
      {!supportOpen && supportVisible && !supportDismissed && (
        <div onMouseDown={onDragStart} onTouchStart={onDragStart}
          style={{ position: "fixed", bottom: bubblePos.y !== null ? "auto" : 88, right: bubblePos.x !== null ? "auto" : 16, left: bubblePos.x !== null ? bubblePos.x : "auto", top: bubblePos.y !== null ? bubblePos.y : "auto", cursor: dragging ? "grabbing" : "grab", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none", touchAction: "none" }}>
          <div style={{ position: "relative" }}>
            <div style={{ background: dragging ? "#D4B483" : "#1E1610", color: dragging ? "#16120A" : "#D4B483", fontSize: dragging ? 14 : 10, fontWeight: 800, padding: "5px 12px", borderRadius: 100, whiteSpace: "nowrap", marginBottom: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.3)", border: "1px solid #D4B483", paddingRight: dragging ? 12 : 24, transition: "all 0.1s" }}>
              {dragging && dragText ? dragText : "Need help? →"}
            </div>
            {!dragging && (
              <button onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSupportDismissed(true); }}
                style={{ position: "absolute", top: "50%", right: 6, transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8A7355", fontSize: 9, padding: 2, lineHeight: 1 }}>✕</button>
            )}
          </div>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #1E1610, #2A1E10)", border: `2px solid ${accentColor}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", position: "relative" }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect x="6" y="8" width="20" height="16" rx="4" fill="#EDE0C4" opacity="0.9"/>
              <line x1="16" y1="2" x2="16" y2="8" stroke="#EDE0C4" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16" cy="2" r="2" fill={accentColor}/>
              <rect x="9" y="12" width="5" height="4" rx="1.5" fill={accentColor}/>
              <rect x="18" y="12" width="5" height="4" rx="1.5" fill={accentColor}/>
              <path d="M11 20 Q16 23 21 20" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
            <div style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: "#00CC88", border: "2px solid #16120A" }} />
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#6B5442", textTransform: "uppercase", letterSpacing: 0.5 }}>Support</div>
        </div>
      )}

      {/* Support chat */}
      {supportOpen && (
        <div style={{ position: "fixed", bottom: 80, right: 16, left: 16, maxWidth: 398, marginLeft: "auto", background: "#1A1208", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.5)", zIndex: 200, display: "flex", flexDirection: "column", maxHeight: "60vh", overflow: "hidden", border: "1px solid #2A1E10" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #2A1E10", background: "#16120A", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E1610", border: `2px solid ${accentColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                  <rect x="6" y="8" width="20" height="16" rx="4" fill="#EDE0C4" opacity="0.9"/>
                  <rect x="9" y="12" width="5" height="4" rx="1.5" fill={accentColor}/>
                  <rect x="18" y="12" width="5" height="4" rx="1.5" fill={accentColor}/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#EDE0C4" }}>GoBot</div>
                <div style={{ fontSize: 10, color: "#8A7355", display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00CC88" }} />Always online</div>
              </div>
            </div>
            <button onClick={() => setSupportOpen(false)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "#EDE0C4", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          </div>
          <div style={{ padding: "8px 14px 0", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid #2A1E10", paddingBottom: 8 }}>
            {["How does it work?", "Is it free?", "Add my shop?", "Which cities?"].map(q => (
              <button key={q} onClick={() => { setSupportInput(q); }} style={{ background: "#1E1610", border: "1px solid #2A1E10", borderRadius: 100, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#D4B483", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{q}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {supportMessages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "80%", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 12px", fontSize: 13, lineHeight: 1.5, background: m.role === "user" ? "#D4B483" : "#1E1610", color: m.role === "user" ? "#16120A" : "#EDE0C4" }}>{m.text}</div>
              </div>
            ))}
            {supportLoading && <div style={{ background: "#1E1610", borderRadius: "16px 16px 16px 4px", padding: "10px 12px", fontSize: 13, color: "#8A7355", display: "inline-block" }}>Typing...</div>}
          </div>
          <div style={{ padding: "10px 14px 14px", display: "flex", gap: 8, borderTop: "1px solid #2A1E10" }}>
            <input value={supportInput} onChange={e => setSupportInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendSupport()}
              placeholder="Ask anything..."
              style={{ flex: 1, border: "1px solid #2A1E10", borderRadius: 100, padding: "9px 14px", fontSize: 13, outline: "none", background: "#1E1610", color: "#EDE0C4", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
            <button onClick={sendSupport} disabled={supportLoading || !supportInput.trim()} style={{ background: supportLoading || !supportInput.trim() ? "#1E1610" : "#D4B483", border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: supportLoading || !supportInput.trim() ? "#8A7355" : "#16120A", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>
      )}

      {/* Product modal */}
      {selectedProduct && (
        <div className="modal-bg" onClick={() => setSelectedProduct(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8A7355", textTransform: "uppercase", letterSpacing: 0.5 }}>{selectedProduct.city} · {selectedProduct.category}</div>
              <button onClick={() => setSelectedProduct(null)} style={{ background: "#1E1610", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 14, cursor: "pointer", color: "#EDE0C4", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ borderRadius: 18, height: 180, marginBottom: 16, position: "relative", overflow: "hidden", background: selectedProduct.color }}>
              {selectedProduct.photo && <img src={selectedProduct.photo} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: selectedProduct.color }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4", lineHeight: 1.2 }}>{selectedProduct.name}</h2>
            <p style={{ fontSize: 12, color: "#8A7355", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>{selectedProduct.shop}</p>
            <p style={{ fontSize: 13, color: "#A08C6E", marginTop: 10, lineHeight: 1.6 }}>{selectedProduct.desc}</p>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: `${selectedProduct.color}20`, color: selectedProduct.color, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 100 }}>◆ {selectedProduct.exclusive}</span>
              {selectedProduct.trending && <span style={{ fontSize: 11, fontWeight: 700, color: "#D4B483" }}>↗ TRENDING</span>}
              {selectedProduct.isNew && <span style={{ fontSize: 11, fontWeight: 700, color: selectedProduct.color }}>◆ NEW</span>}
              {selectedProduct.locationType === "popup" && <span style={{ fontSize: 11, fontWeight: 700, color: "#FF9966", background: "#FF996622", padding: "4px 10px", borderRadius: 100 }}>⚠ Pop-up — verify before visiting</span>}
              {selectedProduct.locationType === "seasonal" && <span style={{ fontSize: 11, fontWeight: 700, color: "#FFB347", background: "#FFB34722", padding: "4px 10px", borderRadius: 100 }}>◷ Seasonal — may not be available</span>}
            </div>
            {selectedProduct.verified && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#6B5442" }}>✓ Last verified {selectedProduct.verified}</div>
            )}
            {selectedProduct.mapHint && (
              <div style={{ marginTop: 10, background: "#1E1610", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>●</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#8A7355" }}>{selectedProduct.mapHint}</span>
              </div>
            )}

            {/* Still Here confirmation */}
            <div style={{ marginTop: 12, background: "#1E1610", borderRadius: 14, padding: "14px 16px", border: "1px solid #2A1E10" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#EDE0C4" }}>Still here?</div>
                  <div style={{ fontSize: 11, color: "#8A7355", marginTop: 2 }}>
                    {stillHereMap[selectedProduct.id]?.count
                      ? `✓ Confirmed by ${stillHereMap[selectedProduct.id].count} traveler${stillHereMap[selectedProduct.id].count > 1 ? "s" : ""} · ${stillHereMap[selectedProduct.id].date}`
                      : "Be the first to confirm this find is still there"}
                  </div>
                </div>
                <button
                  onClick={() => confirmStillHere(selectedProduct.id, selectedProduct.mapHint)}
                  disabled={stillHereMap[selectedProduct.id]?.userConfirmed}
                  style={{
                    background: stillHereMap[selectedProduct.id]?.userConfirmed ? "#1A3320" : "#D4B483",
                    color: stillHereMap[selectedProduct.id]?.userConfirmed ? "#4CAF50" : "#16120A",
                    border: stillHereMap[selectedProduct.id]?.userConfirmed ? "1px solid #4CAF50" : "none",
                    borderRadius: 100,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: stillHereMap[selectedProduct.id]?.userConfirmed ? "default" : "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    marginLeft: 12,
                  }}>
                  {stillHereMap[selectedProduct.id]?.userConfirmed ? "✓ Confirmed!" : "📍 Still here!"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => toggleSave(selectedProduct.id)} style={{ flex: 1, background: savedItems.includes(selectedProduct.id) ? `${selectedProduct.color}20` : "#1E1610", color: savedItems.includes(selectedProduct.id) ? selectedProduct.color : "#8A7355", border: `1px solid ${savedItems.includes(selectedProduct.id) ? selectedProduct.color : "#2A1E10"}`, borderRadius: 14, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {savedItems.includes(selectedProduct.id) ? "♥ Saved" : "♡ Save"}
              </button>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProduct.shop + " " + selectedProduct.city)}`} target="_blank" rel="noreferrer"
                style={{ flex: 2, background: selectedProduct.color, color: "#fff", border: "none", borderRadius: 14, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Find on Maps ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
