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
  "South Korea": "🇰🇷",
  "Japan": "🇯🇵",
  "Morocco": "🇲🇦",
  "Denmark": "🇩🇰",
  "Mexico": "🇲🇽",
  "Albania": "🇦🇱",
};

const cities = [
  { id: 1, name: "Seoul", country: "South Korea", continent: "Asia", emoji: "🇰🇷", flagCode: "kr", color: "#FF3D9A", items: 124, tag: "K-Fashion Capital", vibe: "Bold neons meet minimalist structure", photo: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80",
    products: [
      { id: 1, name: "Ader Error Oversized Hoodie", shop: "Ader Error Flagship · Sinchon", price: "₩189,000", category: "Fashion", exclusive: "Seoul only", emoji: "👕", trending: false, isNew: false, desc: "Concept-driven Seoul label. Not sold internationally.", mapHint: "Sinchon-ro, Mapo-gu", photo: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80" },
      { id: 2, name: "Gentle Monster Sunglasses", shop: "GM Haus Dosan · Gangnam", price: "₩380,000", category: "Accessories", exclusive: "Seoul exclusive drop", emoji: "🕶️", trending: true, isNew: false, desc: "Avant-garde eyewear. Only in Haus Dosan.", mapHint: "Dosan-daero, Gangnam-gu", photo: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80" },
      { id: 3, name: "Musinsa Standard Denim", shop: "Musinsa Store · Hongdae", price: "₩89,000", category: "Fashion", exclusive: "Korea only", emoji: "👖", trending: false, isNew: false, desc: "Korea's biggest fashion platform in-house label.", mapHint: "Hongdae, Mapo-gu", photo: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80" },
      { id: 4, name: "Kuho Silk Wrap Dress", shop: "Kuho Flagship · Cheongdam", price: "₩420,000", category: "Fashion", exclusive: "Korea flagship only", emoji: "👗", trending: false, isNew: false, desc: "Premium Korean womenswear. Flagship-exclusive colourways.", mapHint: "Cheongdam-dong, Gangnam-gu", photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80" },
      { id: 5, name: "Stussy Seoul Collab Tee", shop: "Stussy Chapter · Itaewon", price: "₩98,000", category: "Fashion", exclusive: "Seoul Chapter exclusive", emoji: "👕", trending: false, isNew: false, desc: "Seoul Chapter-exclusive graphic tee. Never restocked online.", mapHint: "Itaewon-ro, Yongsan-gu", photo: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80" },
      { id: 20, name: "DS Company Oversized Shirt", shop: "DS Company · Seoul", price: "₩85,000", category: "Fashion", exclusive: "Made in Korea only", emoji: "👔", trending: false, isNew: true, desc: "Small Korean label. Barely any online presence.", mapHint: "Seoul, South Korea", photo: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=400&q=80" },
    ]
  },
  { id: 2, name: "Tokyo", country: "Japan", continent: "Asia", emoji: "🇯🇵", flagCode: "jp", color: "#E8001D", items: 98, tag: "Streetwear Paradise", vibe: "Precision craftsmanship meets underground cool", photo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    products: [
      { id: 6, name: "Visvim Hand-dyed Shirt", shop: "Visvim Aoyama · Minami-Aoyama", price: "¥68,000", category: "Fashion", exclusive: "Japan only", emoji: "👔", trending: false, isNew: false, desc: "Hand-crafted in Japan, never sold abroad.", mapHint: "Minami-Aoyama, Minato-ku", photo: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=400&q=80" },
      { id: 7, name: "Neighborhood Collab Cap", shop: "Neighborhood Harajuku", price: "¥12,000", category: "Accessories", exclusive: "Tokyo drop only", emoji: "🧢", trending: true, isNew: false, desc: "Each drop sells out within hours. In-store only.", mapHint: "Harajuku, Shibuya-ku", photo: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80" },
      { id: 8, name: "Kapital Boro Jacket", shop: "Kapital Daikanyama", price: "¥89,000", category: "Fashion", exclusive: "Japan flagship", emoji: "🧥", trending: false, isNew: false, desc: "Traditional Japanese Boro technique. Patchwork one-of-a-kind.", mapHint: "Daikanyama, Shibuya-ku", photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80" },
      { id: 9, name: "Undercover Archive Tee", shop: "Undercover Lab · Minami-Aoyama", price: "¥18,000", category: "Fashion", exclusive: "Lab exclusive", emoji: "👕", trending: false, isNew: true, desc: "Archive reprints. Only available at the Lab store.", mapHint: "Minami-Aoyama, Minato-ku", photo: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80" },
    ]
  },
  { id: 3, name: "Marrakech", country: "Morocco", continent: "Africa", emoji: "🇲🇦", flagCode: "ma", color: "#C1440E", items: 76, tag: "Craft & Colour", vibe: "Ancient craft meets vivid colour", photo: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80",
    products: [
      { id: 10, name: "Hand-tooled Leather Bag", shop: "Souk El Had · Medina", price: "MAD 850", category: "Bags", exclusive: "Made locally", emoji: "👜", trending: true, isNew: false, desc: "Hand-carved in the Medina. Each piece unique.", mapHint: "Souk El Had, Medina", photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80" },
      { id: 11, name: "Babouche Slippers", shop: "Souk des Babouches · Medina", price: "MAD 180", category: "Accessories", exclusive: "Medina crafted", emoji: "🥿", trending: false, isNew: false, desc: "Handmade in the tanneries of Marrakech.", mapHint: "Souk des Babouches, Medina", photo: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80" },
      { id: 12, name: "Kaftan Robe", shop: "Atelier Nihal · Gueliz", price: "MAD 2,200", category: "Fashion", exclusive: "Atelier only", emoji: "👘", trending: false, isNew: true, desc: "Embroidered by hand in Gueliz.", mapHint: "Gueliz, Marrakech", photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80" },
    ]
  },
  { id: 4, name: "Copenhagen", country: "Denmark", continent: "Europe", emoji: "🇩🇰", flagCode: "dk", color: "#C60C30", items: 54, tag: "Nordic Minimal", vibe: "Quiet luxury, built to last forever", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80",
    products: [
      { id: 13, name: "Samsøe Samsøe Wool Coat", shop: "Flagship · Strøget", price: "DKK 3,200", category: "Fashion", exclusive: "DK exclusive", emoji: "🧥", trending: false, isNew: false, desc: "Flagship carries colourways never exported.", mapHint: "Strøget, Copenhagen", photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80" },
      { id: 14, name: "Norse Projects Gore-Tex", shop: "Norse Projects · Pilestræde", price: "DKK 4,800", category: "Fashion", exclusive: "Flagship colourway", emoji: "🧥", trending: true, isNew: false, desc: "Seasonal colourways exclusive to Pilestræde.", mapHint: "Pilestræde, Copenhagen", photo: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&q=80" },
      { id: 15, name: "Ganni Archive Dress", shop: "Ganni Flagship · Amagertorv", price: "DKK 2,100", category: "Fashion", exclusive: "Archive collection", emoji: "👗", trending: false, isNew: true, desc: "Archive collection only at the Copenhagen flagship.", mapHint: "Amagertorv, Copenhagen", photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80" },
    ]
  },
  { id: 5, name: "Mexico City", country: "Mexico", continent: "Americas", emoji: "🇲🇽", flagCode: "mx", color: "#006847", items: 89, tag: "Artisan Culture", vibe: "Vivid folk art meets modern design", photo: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&q=80",
    products: [
      { id: 16, name: "Hand-embroidered Blouse", shop: "Mercado de Artesan\u00EDas · Centro", price: "MXN 680", category: "Fashion", exclusive: "Artisan made", emoji: "👗", trending: false, isNew: false, desc: "Otomi embroidery sold only at the market.", mapHint: "Centro Hist\u00F3rico, CDMX", photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80" },
      { id: 17, name: "Carla Fern\u00E1ndez Jacket", shop: "Carla Fern\u00E1ndez · Roma Norte", price: "MXN 8,400", category: "Fashion", exclusive: "Mexico only", emoji: "🧥", trending: true, isNew: false, desc: "Mexico's most celebrated fashion designer.", mapHint: "Roma Norte, CDMX", photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80" },
      { id: 18, name: "Leather Huarache Sandals", shop: "Taller Flores · Mercado Jamaica", price: "MXN 450", category: "Accessories", exclusive: "Handmade locally", emoji: "🥿", trending: false, isNew: false, desc: "Custom-made by the Flores family since 1963.", mapHint: "Mercado Jamaica, CDMX", photo: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80" },
    ]
  },
  { id: 7, name: "Tirana", country: "Albania", continent: "Europe", emoji: "🇦🇱", flagCode: "al", color: "#E41E20", items: 1, tag: "Hidden Gem", vibe: "Europe's best kept secret", photo: "https://images.unsplash.com/photo-1555990793-da11153b6c0e?w=800&q=80",
    products: [
      { id: 19, name: "Pure Perfume Signature Scent", shop: "Pure Perfume · Bulevardi Bajram Curri", price: "ALL 3,500", category: "Accessories", exclusive: "Only in Tirana", emoji: "🧴", trending: true, isNew: true, desc: "Albania's own luxury perfume house. No international shipping.", mapHint: "Bulevardi Bajram Curri, Tirana", photo: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80" },
    ]
  },
];

const allProducts = cities.flatMap(c => c.products.map(p => ({ ...p, city: c.name, color: c.color })));
const continents = ["Africa", "Americas", "Asia", "Europe"];

function getCountries(cont) {
  return [...new Set(cities.filter(c => c.continent === cont).map(c => c.country))].sort();
}

function FlagImg({ flagCode }) {
  const flags = { kr: "🇰🇷", jp: "🇯🇵", ma: "🇲🇦", dk: "🇩🇰", mx: "🇲🇽", al: "🇦🇱" };
  return <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{flags[flagCode] || ""}</span>;
}

const navItems = [
  { id: "explore", label: "Explore", icon: "◆" },
  { id: "ai", label: "AI Guide", icon: "↗" },
  { id: "map", label: "Map", icon: "●" },
  { id: "saved", label: "Saved", icon: "♡" },
];

const CITY_COORDS = {
  "Seoul": [37.5665, 126.9780],
  "Tokyo": [35.6762, 139.6503],
  "Marrakech": [31.6295, -7.9811],
  "Copenhagen": [55.6761, 12.5683],
  "Mexico City": [19.4326, -99.1332],
  "Tirana": [41.3275, 19.8187],
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


export default function OnlyHere() {
  const [active, setActive] = useState("explore");
  const [continent, setContinent] = useState(null);
  const [country, setCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [category, setCategory] = useState("All");
  const [savedItems, setSavedItems] = useState([2, 7, 19]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [mapCity, setMapCity] = useState(null);
  const [loading, setLoading] = useState(false);

  // AI Guide
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hi! I'm your Local Assist ◆ Tell me where you're heading — or what you're after — and I'll find you something that exists nowhere else." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef(null);

  // Support
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [supportDismissed, setSupportDismissed] = useState(false);
  const [supportMessages, setSupportMessages] = useState([
    { role: "assistant", text: "Hi! 👋 I'm the OnlyHere support assistant. Ask me anything!" }
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
    : country
      ? cities.filter(c => c.country === country).flatMap(c => (c.products || []).map(p => ({ ...p, city: c.name, color: c.color }))).filter(p => category === "All" || p.category === category)
      : [];

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
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: "You are Local Assist — OnlyHere's AI guide. Help travelers find exclusive local finds that exist nowhere else. Products: " + allProducts.map(p => p.name + " in " + p.city + " (" + p.price + ") - " + p.exclusive).join(", ") + ". Be warm and concise. Recommend specific products.",
          messages: aiMessages.concat([{ role: "user", text: msg }]).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }))
        })
      });
      const data = await res.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "Let me find something for you!";
      const clean = text.replace(/\{"ids":\s*\[[\d,\s]*\]\}/, "").trim();
      setAiMessages(prev => [...prev, { role: "assistant", text: clean }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", text: "Something went wrong — try again!" }]);
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
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: "You are the support assistant for OnlyHere — an app where travelers discover things that exist nowhere else. Keep answers short and warm. Cities: Seoul, Tokyo, Marrakech, Copenhagen, Mexico City, Tirana. Free for travelers. Shops DM us to get listed.",
          messages: supportMessages.concat([{ role: "user", text: msg }]).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }))
        })
      });
      const data = await res.json();
      const reply = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "Let me help!";
      setSupportMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setSupportMessages(prev => [...prev, { role: "assistant", text: "Something went wrong!" }]);
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
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <span style={{ background: `${product.color}18`, color: product.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>◆ {product.exclusive}</span>
              {product.trending && <span style={{ fontSize: 10, fontWeight: 700, color: "#D4B483" }}>↗ HOT</span>}
              {product.isNew && <span style={{ fontSize: 10, fontWeight: 700, color: product.color }}>◆ NEW</span>}
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#D4B483", fontFamily: "'Cormorant Garamond', serif" }}>{product.price}</span>
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
      <div style={{ background: "#16120A", borderBottom: "1px solid #2A1E10", padding: "44px 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#D4B483", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>◆ OnlyHere</div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>Discover wonders.</div>
          </div>

        </div>
        <div style={{ background: "#1E1610", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, border: "1px solid #2A1E10" }}>
          <span style={{ fontSize: 13, color: "#8A7355" }}>◆</span>
          <input value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setActive("search"); else setActive("explore"); }}
            placeholder="Search cities, shops, products..."
            style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent", color: "#EDE0C4", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
          {search && <button onClick={() => { setSearch(""); setActive("explore"); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#8A7355", fontSize: 14 }}>✕</button>}
        </div>
      </div>

      {/* Content */}
      <div style={{ height: "calc(100vh - 148px)", overflowY: active === "ai" ? "hidden" : "auto", paddingBottom: active === "ai" ? 0 : 80 }}>

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
            <div style={{ padding: "12px 0 6px" }}>
              {/* Continents */}
              <div style={{ display: "flex", gap: 8, paddingLeft: 16, overflowX: "auto", paddingRight: 16, marginBottom: 10 }}>
                {continents.map(c => (
                  <button key={c} className="cat-btn"
                    onClick={() => { setContinent(continent === c ? null : c); setCountry(null); setSelectedCity(null); }}
                    style={{ background: continent === c ? "#D4B483" : "#1E1610", color: continent === c ? "#16120A" : "#8A7355", border: `1px solid ${continent === c ? "#D4B483" : "#2A1E10"}` }}>
                    {c === "Europe" ? "🇪🇺 " : c === "Asia" ? "🌏 " : c === "Africa" ? "🌍 " : "🌎 "}{c}
                  </button>
                ))}
              </div>

              {/* Countries */}
              {continent && (
                <div style={{ display: "flex", gap: 8, paddingLeft: 16, overflowX: "auto", paddingRight: 16, marginBottom: 10 }}>
                  {getCountries(continent).map(c => (
                    <button key={c} className="cat-btn"
                      onClick={() => { setCountry(country === c ? null : c); setSelectedCity(null); }}
                      style={{ background: country === c ? "#D4B483" : "#1E1610", color: country === c ? "#16120A" : "#8A7355", border: `1px solid ${country === c ? "#D4B483" : "#2A1E10"}`, display: "flex", alignItems: "center", gap: 6 }}>
                      {COUNTRY_FLAGS[c] && <span style={{ fontSize: 14 }}>{COUNTRY_FLAGS[c]}</span>}
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* Cities */}
              {continent && country && (
                <div style={{ display: "flex", gap: 8, paddingLeft: 16, overflowX: "auto", paddingRight: 16, marginBottom: 8 }}>
                  {cities.filter(c => c.continent === continent && c.country === country).sort((a,b) => a.name.localeCompare(b.name)).map(city => (
                    <button key={city.id}
                      onClick={() => setSelectedCity(selectedCity?.id === city.id ? null : city)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 100, background: selectedCity?.id === city.id ? city.color : "#1E1610", color: selectedCity?.id === city.id ? "#fff" : "#8A7355", border: `2px solid ${selectedCity?.id === city.id ? city.color : "#2A1E10"}`, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s" }}>
                      <FlagImg flagCode={city.flagCode} />
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
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
                    {selectedCity ? `◆ ${displayProducts.length} finds in ${selectedCity.name}` : country ? `◆ ${displayProducts.length} finds across ${country}` : "Select a continent to start exploring"}
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
            <div style={{ padding: "0 16px" }}>
              {displayProducts.length === 0 && (continent || country) ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#8A7355" }}>
                  {continent && !country ? "Select a country to see finds" : continent && country && !selectedCity ? "Showing all finds in " + country : "No finds in this category"}
                </div>
              ) : (
                <>
                  {displayProducts.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8A7355", letterSpacing: 1.5, textTransform: "uppercase" }}>{displayProducts.length} Finds</span>
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
        {active === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 148px)" }}>
            <div style={{ padding: "14px 16px 8px", flexShrink: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>◆ Local Assist</h2>
              <p style={{ fontSize: 12, color: "#8A7355", marginTop: 3 }}>Your local guide — powered by AI</p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", minHeight: 0 }}>
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
            <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #2A1E10", background: "#16120A", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
                {["Edgy Seoul finds", "Tokyo under ¥20k", "Artisan bags", "Hidden gems"].map(s => (
                  <button key={s} onClick={() => setAiInput(s)} style={{ background: "#1E1610", border: "1px solid #2A1E10", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#8A7355", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAI()}
                  placeholder="Tell me where you're heading..."
                  style={{ flex: 1, border: "1px solid #2A1E10", borderRadius: 100, padding: "10px 16px", fontSize: 13, outline: "none", background: "#1E1610", color: "#EDE0C4", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
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
                  <button key={city.id} onClick={() => setMapCity(city)}
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
                  <iframe
                    key={mapCity.name}
                    title="Google Map"
                    width="100%"
                    height="220"
                    frameBorder="0"
                    style={{ border: 0, display: "block" }}
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/search?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=fashion+boutiques+in+${encodeURIComponent(mapCity.name)}&zoom=14`}
                    allowFullScreen
                  />
                  <div style={{ position: "absolute", bottom: 8, left: 8, pointerEvents: "none" }}>
                    <span style={{ background: mapCity.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 100 }}>{mapCity.name} · {mapCity.products.length} finds</span>
                  </div>
                  <a href={`https://www.google.com/maps/search/?api=1&query=boutiques+${encodeURIComponent(mapCity.name)}`} target="_blank" rel="noreferrer"
                    style={{ position: "absolute", bottom: 8, right: 8, background: "#D4B483", color: "#16120A", padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                    Open ↗
                  </a>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {mapCity.products.map(p => (
                    <div key={p.id} onClick={() => setSelectedProduct({ ...p, city: mapCity.name, color: mapCity.color })}
                      style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #1E1610", cursor: "pointer" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", background: `${mapCity.color}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        {p.photo ? <img src={p.photo} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#EDE0C4", fontFamily: "'Cormorant Garamond', serif" }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: "#8A7355", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>{p.shop}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#D4B483", fontFamily: "'Cormorant Garamond', serif" }}>{p.price}</div>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.shop + " " + mapCity.name)}`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: mapCity.color, textDecoration: "none", fontWeight: 700 }}>↗ Map</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAVED */}
        {active === "saved" && (
          <div className="slide-up" style={{ padding: "16px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4", marginBottom: 4 }}>♡ Saved</h2>
            <p style={{ fontSize: 12, color: "#8A7355", marginBottom: 14 }}>{savedProducts.length} items saved</p>
            {savedProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>♡</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#8A7355" }}>Nothing saved yet</div>
                <div style={{ fontSize: 12, color: "#6B5442", marginTop: 8 }}>Tap ♡ on any find to save it</div>
              </div>
            ) : savedProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(22,18,10,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid #2A1E10", padding: "6px 4px 20px", display: "flex", justifyContent: "space-around", zIndex: 50 }}>
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
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: `${selectedProduct.color}20`, color: selectedProduct.color, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 100 }}>◆ {selectedProduct.exclusive}</span>
              {selectedProduct.trending && <span style={{ fontSize: 11, fontWeight: 700, color: "#D4B483" }}>↗ TRENDING</span>}
              {selectedProduct.isNew && <span style={{ fontSize: 11, fontWeight: 700, color: selectedProduct.color }}>◆ NEW</span>}
            </div>
            {selectedProduct.mapHint && (
              <div style={{ marginTop: 10, background: "#1E1610", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>●</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#8A7355" }}>{selectedProduct.mapHint}</span>
              </div>
            )}
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
