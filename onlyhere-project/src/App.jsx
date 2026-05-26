import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZhaGpuZXJra2tvdWVvdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzQ4OTYsImV4cCI6MjA5NTMxMDg5Nn0.-GgXeog0DufIz6WNXn_8pIzxmQfkHRK3Lz8V71O-v_c";

async function sbFetch(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

const cities = [
  {
    id: 1, name: "Seoul", photo: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80", country: "South Korea", emoji: "🇰🇷", color: "#FF3D9A", items: 124, tag: "K-Fashion Capital",
    continent: "Asia", flagCode: "kr",
    vibe: "Bold neons meet minimalist structure",
    products: [
      { id: 1, photo: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80", name: "Ader Error Oversized Hoodie", shop: "Ader Error Flagship · Sinchon", price: "₩189,000", category: "Fashion", exclusive: "Seoul only", emoji: "👕", desc: "Concept-driven Seoul label known for deconstructed basics. Not sold internationally.", mapHint: "Sinchon-ro, Mapo-gu" },
      { id: 2, photo: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80", name: "Gentle Monster Sunglasses", shop: "GM Haus Dosan · Gangnam", price: "₩380,000", category: "Accessories", exclusive: "Seoul exclusive drop", emoji: "🕶️", desc: "Avant-garde eyewear brand with installations you can only experience in Haus Dosan.", mapHint: "Dosan-daero, Gangnam-gu" },
      { id: 3, photo: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80", name: "Musinsa Standard Denim", shop: "Musinsa Store · Hongdae", price: "₩89,000", category: "Fashion", exclusive: "Korea only", emoji: "👖", desc: "Korea's biggest fashion platform's in-house label. Ships within Korea only.", mapHint: "Hongdae, Mapo-gu" },
      { id: 4, photo: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=400&q=80", name: "Kuho Silk Wrap Dress", shop: "Kuho Flagship · Cheongdam", price: "₩420,000", category: "Fashion", exclusive: "Korea flagship only", emoji: "👗", desc: "Premium Korean womenswear. Flagship-exclusive colourways.", mapHint: "Cheongdam-dong, Gangnam-gu" },
      { id: 5, photo: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80", name: "Stussy Seoul Collab Tee", shop: "Stussy Chapter · Itaewon", price: "₩98,000", category: "Fashion", exclusive: "Seoul Chapter exclusive", emoji: "👕", desc: "Seoul Chapter-exclusive graphic tee. Never restocked online.", mapHint: "Itaewon-ro, Yongsan-gu" },
      { id: 20, photo: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80", name: "DS Company Oversized Shirt", shop: "DS Company · Seoul", price: "₩85,000", category: "Fashion", exclusive: "Made in Korea only", emoji: "👔", desc: "Small Korean label making oversized, open-collar shirts entirely in Korea. Barely any online presence — the kind of find you only stumble upon in person.", mapHint: "Seoul, South Korea" },
    ]
  },
  {
    id: 2, name: "Tokyo", photo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80", country: "Japan", emoji: "🇯🇵", color: "#E8001D", items: 98, tag: "Streetwear Paradise",
    continent: "Asia", flagCode: "jp",
    vibe: "Precision craftsmanship meets underground cool",
    products: [
      { id: 6, photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80", name: "Visvim Hand-dyed Shirt", shop: "Visvim Aoyama · Minami-Aoyama", price: "¥68,000", category: "Fashion", exclusive: "Japan only", emoji: "👔", desc: "Hiroki Nakamura's cult label. Hand-crafted in Japan, never sold abroad.", mapHint: "Minami-Aoyama, Minato-ku" },
      { id: 7, photo: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80", name: "Neighborhood Collab Cap", shop: "Neighborhood Harajuku", price: "¥12,000", category: "Accessories", exclusive: "Tokyo drop only", emoji: "🧢", desc: "Harajuku staple. Each drop sells out within hours. In-store only.", mapHint: "Harajuku, Shibuya-ku" },
      { id: 8, photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80", name: "Kapital Boro Jacket", shop: "Kapital Daikanyama", price: "¥89,000", category: "Fashion", exclusive: "Japan flagship", emoji: "🧥", desc: "Reconstructed denim using traditional Japanese Boro technique. Patchwork one-of-a-kind.", mapHint: "Daikanyama, Shibuya-ku" },
      { id: 9, photo: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80", name: "Undercover Archive Tee", shop: "Undercover Lab · Minami-Aoyama", price: "¥18,000", category: "Fashion", exclusive: "Lab exclusive", emoji: "👕", desc: "Jun Takahashi archive reprints. Only available at the Lab store.", mapHint: "Minami-Aoyama, Minato-ku" },
    ]
  },
  {
    id: 3, name: "Marrakech", photo: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80", country: "Morocco", emoji: "🇲🇦", color: "#C1440E", items: 76, tag: "Craft & Colour",
    continent: "Africa", flagCode: "ma",
    vibe: "Ancient craft meets vivid colour",
    products: [
      { id: 10, photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80", name: "Hand-tooled Leather Bag", shop: "Souk El Had · Medina", price: "MAD 850", category: "Bags", exclusive: "Made locally", emoji: "👜", desc: "Hand-carved by craftsmen in the Medina. Each piece unique, no two alike.", mapHint: "Souk El Had, Medina" },
      { id: 11, photo: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80", name: "Babouche Slippers", shop: "Souk des Babouches · Medina", price: "MAD 180", category: "Accessories", exclusive: "Medina crafted", emoji: "🥿", desc: "Traditional Moroccan leather slippers, handmade in the tanneries of Marrakech.", mapHint: "Souk des Babouches, Medina" },
      { id: 12, photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80", name: "Kaftan Robe", shop: "Atelier Nihal · Gueliz", price: "MAD 2,200", category: "Fashion", exclusive: "Atelier only", emoji: "👘", desc: "Contemporary Moroccan kaftan by designer Nihal. Embroidered by hand in Gueliz.", mapHint: "Gueliz, Marrakech" },
    ]
  },
  {
    id: 4, name: "Copenhagen", photo: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80", country: "Denmark", emoji: "🇩🇰", color: "#C60C30", items: 54, tag: "Nordic Minimal",
    continent: "Europe", flagCode: "dk",
    vibe: "Quiet luxury, built to last forever",
    products: [
      { id: 13, photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80", name: "Samsøe Samsøe Wool Coat", shop: "Flagship · Strøget", price: "DKK 3,200", category: "Fashion", exclusive: "DK exclusive", emoji: "🧥", desc: "Copenhagen's beloved label. Their flagship carries colourways never exported.", mapHint: "Strøget, Copenhagen" },
      { id: 14, photo: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&q=80", name: "Norse Projects Gore-Tex", shop: "Norse Projects · Pilestræde", price: "DKK 4,800", category: "Fashion", exclusive: "Flagship colourway", emoji: "🧥", desc: "Seasonal colourways exclusive to the Pilestræde flagship store.", mapHint: "Pilestræde, Copenhagen" },
      { id: 15, photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80", name: "Ganni Archive Dress", shop: "Ganni Flagship · Amagertorv", price: "DKK 2,100", category: "Fashion", exclusive: "Archive collection", emoji: "👗", desc: "Ganni's archive collection — only at the Copenhagen flagship.", mapHint: "Amagertorv, Copenhagen" },
    ]
  },
  {
    id: 5, name: "Mexico City", photo: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&q=80", country: "Mexico", emoji: "🇲🇽", color: "#006847", items: 89, tag: "Artisan Culture",
    continent: "Americas", flagCode: "mx",
    vibe: "Vivid folk art meets modern design",
    products: [
      { id: 16, photo: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80", name: "Hand-embroidered Blouse", shop: "Mercado de Artesanías · Centro", price: "MXN 680", category: "Fashion", exclusive: "Artisan made", emoji: "👗", desc: "Otomi embroidery from Tenango de Doria artisans. Sold only at the market.", mapHint: "Centro Histórico, CDMX" },
      { id: 17, photo: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=400&q=80", name: "Carla Fernández Jacket", shop: "Carla Fernández · Roma Norte", price: "MXN 8,400", category: "Fashion", exclusive: "Mexico only", emoji: "🧥", desc: "Mexico's most celebrated fashion designer. Works with indigenous communities.", mapHint: "Roma Norte, CDMX" },
      { id: 18, photo: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=400&q=80", name: "Leather Huarache Sandals", shop: "Taller Flores · Mercado Jamaica", price: "MXN 450", category: "Accessories", exclusive: "Handmade locally", emoji: "🥿", desc: "Traditional huarache woven sandals, custom-made by the Flores family since 1963.", mapHint: "Mercado Jamaica, CDMX" },
    ]
  },
  {
    id: 7, name: "Tirana", photo: "https://images.unsplash.com/photo-1555990793-da11153b6c0e?w=800&q=80", country: "Albania", emoji: "🇦🇱", color: "#E41E20", items: 1, tag: "Hidden Gem",
    continent: "Europe", flagCode: "al",
    vibe: "Europe's best kept secret",
    products: [
      { id: 19, photo: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80", name: "Pure Perfume Signature Scent", shop: "Pure Perfume · Bulevardi Bajram Curri", price: "ALL 3,500", category: "Accessories", exclusive: "Only in Tirana", emoji: "🧴", desc: "Albania's own luxury perfume house. Locally produced signature scents you won't find anywhere else in the world. No international shipping, no global retailers.", mapHint: "Bulevardi Bajram Curri, Pallatet Agimi, Tirana" },
    ]
  },
];

const continents = ["All", "Europe", "Asia", "Africa", "Americas"];

const COUNTRY_FLAGS = {
  "South Korea": "🇰🇷",
  "Japan": "🇯🇵",
  "Morocco": "🇲🇦",
  "Denmark": "🇩🇰",
  "Mexico": "🇲🇽",
  "Albania": "🇦🇱",
};

const getCountries = (selectedContinent) => {
  const filtered = selectedContinent === "All" ? cities : cities.filter(c => c.continent === selectedContinent);
  const countries = [...new Set(filtered.map(c => c.country))];
  return ["All", ...countries];
};

const allProducts = cities.flatMap(c => c.products.map(p => ({ ...p, city: c.name, color: c.color })));

const navItems = [
  { id: "explore", label: "Explore", icon: "◆" },
  { id: "ai", label: "Discover", icon: "✦" },
  { id: "map", label: "Map", icon: "●" },
  { id: "saved", label: "Saved", icon: "♡" },
];

function FlagBg({ flagCode }) {
  const flags = {
    kr: "🇰🇷",
    jp: "🇯🇵",
    ma: "🇲🇦",
    dk: "🇩🇰",
    mx: "🇲🇽",
    al: "🇦🇱",
  };
  return (
    <div style={{
      position:"absolute", inset:0, display:"flex",
      alignItems:"center", justifyContent:"center", overflow:"hidden",
      fontSize:180, lineHeight:1, opacity:0.25, pointerEvents:"none",
    }}>
      <span>{flags[flagCode]}</span>
    </div>
  );
}

function FlagImg({ flagCode }) {
  const flags = {
    kr: "🇰🇷",
    jp: "🇯🇵",
    ma: "🇲🇦",
    dk: "🇩🇰",
    mx: "🇲🇽",
    al: "🇦🇱",
  };
  return (
    <span style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>{flags[flagCode]}</span>
  );
}

// Inline AI chat component
function AIRecommender({ cities, allProducts, savedItems, toggleSave, setSelectedProduct }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your OnlyHere style guide 🌍 Tell me what you're looking for — a vibe, a city, a style, a budget — and I'll find you something you can only get there." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    setRecommended([]);

    const productList = allProducts.map(p =>
      `ID:${p.id} | ${p.name} | ${p.city} | ${p.category} | ${p.price} | ${p.exclusive} | ${p.desc}`
    ).join("\n");

    const cityList = cities.map(c => `${c.name} (${c.tag}): ${c.vibe}`).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are OnlyHere's AI style guide. You help travelers discover exclusive local finds — fashion, accessories, and merchandise that can ONLY be found in specific cities around the world.

Here are the cities available:
${cityList}

Here are all available products:
${productList}

Rules:
- Be warm, fun, and concise. Max 2-3 sentences of chat.
- Always recommend 1-3 specific products by their ID in a JSON block at the end like: {"recommended_ids": [1, 3]}
- Match vibe, budget, style, or city to what the user describes
- If they mention a city, prioritize that city's products
- Highlight what makes the find exclusive and special`,
          messages: [
            ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
            { role: "user", content: userMsg }
          ]
        })
      });
      const data = await res.json();
      const fullText = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "Let me find something for you!";

      // Extract JSON recommended IDs
      const jsonMatch = fullText.match(/\{"recommended_ids":\s*\[[\d,\s]+\]\}/);
      let ids = [];
      if (jsonMatch) {
        try { ids = JSON.parse(jsonMatch[0]).recommended_ids; } catch {}
      }
      const cleanText = fullText.replace(/\{"recommended_ids":\s*\[[\d,\s]+\]\}/, "").trim();

      setMessages(prev => [...prev, { role: "assistant", text: cleanText }]);
      if (ids.length > 0) {
        setRecommended(allProducts.filter(p => ids.includes(p.id)));
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong — try again!" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
      <div style={{ padding: "20px 24px 8px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>◆ Style Guide</h2>
        <p style={{ fontSize: 13, color: "#8A7355", marginTop: 3, fontWeight: 500 }}>Powered by Claude · Finds what only exists there</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 12,
          }}>
            {m.role === "assistant" && (
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #FF3D9A, #7B61FF)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2,
              }}>◆</div>
            )}
            <div style={{
              maxWidth: "75%",
              background: m.role === "user" ? "#D4B483" : "#231A0D",
              color: m.role === "user" ? "#16120A" : "#EDE0C4",
              borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
              padding: "12px 16px",
              fontSize: 14,
              lineHeight: 1.5,
              border: m.role === "user" ? "none" : "1.5px solid #362819",
              fontWeight: 500,
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #FF3D9A, #7B61FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◆</div>
            <div style={{ background: "#231A0D", border: "1px solid #3D2E18", borderRadius: "20px 20px 20px 4px", padding: "12px 18px" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#DDD",
                    animation: "bounce 1s ease infinite",
                    animationDelay: `${i * 0.15}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {recommended.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7355", marginBottom: 10, marginLeft: 38, textTransform: "uppercase", letterSpacing: 0.5 }}>
              ✦ Recommended finds
            </div>
            {recommended.map(p => (
              <div key={p.id} onClick={() => setSelectedProduct(p)}
                style={{
                  background: "#1E1610",
                  border: "1.5px solid #3D2E18",
                  borderRadius: 18,
                  padding: "14px",
                  marginBottom: 8,
                  marginLeft: 38,
                  cursor: "pointer",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  transition: "transform 0.15s",
                }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                  {p.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#8A7355", marginTop: 2 }}>{p.city} · {p.exclusive}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: p.color, marginTop: 4 }}>{p.price}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleSave(p.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
                  {savedItems.includes(p.id) ? "♥" : "♡"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 24px 16px", borderTop: "1.5px solid #3D2E18", background: "#16120A" }}>
        <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Try: edgy Seoul finds under ₩100k..."
            style={{
              flex: 1, border: "1.5px solid #3D2E18", borderRadius: 100,
              padding: "12px 18px", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif",
              outline: "none", background: "#1E1610", color: "#EDE0C4",
            }}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{
            background: loading || !input.trim() ? "#EEE" : "#EDE0C4",
            border: "none", borderRadius: "50%",
            width: 46, height: 46, cursor: loading ? "not-allowed" : "pointer",
            fontSize: 18, flexShrink: 0, transition: "all 0.2s",
          }}>→</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {["Edgy Seoul finds", "Tokyo under ¥20k", "Artisan bags", "Nordic minimal coat"].map(s => (
            <button key={s} onClick={() => { setInput(s); }} style={{
              background: "#231A0D", border: "none", borderRadius: 100,
              padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              color: "#8A7355", fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Map view
function MapView({ cities, allProducts, savedItems, toggleSave, setSelectedProduct }) {
  const [mapCity, setMapCity] = useState(cities[0]);
  const [selectedPin, setSelectedPin] = useState(null);
  const cityProds = allProducts.filter(p => p.city === mapCity.name);

  const cityCoords = {
    "Seoul": { lat: 37.5665, lng: 126.9780 },
    "Tokyo": { lat: 35.6762, lng: 139.6503 },
    "Marrakech": { lat: 31.6295, lng: -7.9811 },
    "Copenhagen": { lat: 55.6761, lng: 12.5683 },
    "Mexico City": { lat: 19.4326, lng: -99.1332 },
    "Tirana": { lat: 41.3275, lng: 19.8187 },
  };

  const productCoords = {
    1: { lat: 37.5563, lng: 126.9374 },
    2: { lat: 37.5247, lng: 127.0400 },
    3: { lat: 37.5563, lng: 126.9227 },
    4: { lat: 37.5200, lng: 127.0420 },
    5: { lat: 37.5340, lng: 126.9940 },
    20: { lat: 37.5500, lng: 126.9200 },
    6: { lat: 35.6654, lng: 139.7107 },
    7: { lat: 35.6702, lng: 139.7026 },
    8: { lat: 35.6488, lng: 139.7026 },
    9: { lat: 35.6654, lng: 139.7200 },
    10: { lat: 31.6315, lng: -7.9887 },
    11: { lat: 31.6290, lng: -7.9900 },
    12: { lat: 31.6340, lng: -7.9950 },
    13: { lat: 55.6761, lng: 12.5683 },
    14: { lat: 55.6780, lng: 12.5700 },
    15: { lat: 55.6750, lng: 12.5760 },
    16: { lat: 19.4284, lng: -99.1276 },
    17: { lat: 19.4180, lng: -99.1620 },
    18: { lat: 19.3980, lng: -99.1200 },
    19: { lat: 41.3275, lng: 19.8187 },
  };

  const coords = cityCoords[mapCity.name] || { lat: 37.5665, lng: 126.9780 };

  const openInMaps = (p) => {
    const c = productCoords[p.id];
    if (!c) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.shop + " " + mapCity.name)}&center=${c.lat},${c.lng}`;
    window.open(url, "_blank");
  };

  return (
    <div className="slide-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>

      {/* City selector */}
      <div style={{ padding: "12px 0 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, paddingLeft: 24, overflowX: "auto", paddingRight: 24 }}>
          {cities.map(city => (
            <button key={city.id} className="city-pill" onClick={() => { setMapCity(city); setSelectedPin(null); }}
              style={{ background: mapCity.id === city.id ? city.color : "#fff", color: mapCity.id === city.id ? "#fff" : "#C4A97D", border: `2px solid ${mapCity.id === city.id ? city.color : "#362819"}` }}>
              <span>{city.emoji}</span><span>{city.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Static map image with pins overlay */}
      <div style={{ flex: 1, margin: "0 24px", borderRadius: 20, overflow: "hidden", border: "1.5px solid #3D2E18", position: "relative", background: "#E8F0F8", minHeight: 200 }}>
        {/* OpenStreetMap static tile */}
        <img
          src={`https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lng}&zoom=13&size=400x300&maptype=mapnik`}
          alt="map"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={e => { e.target.style.display = "none"; }}
        />

        {/* Fallback background if image fails */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(135deg, #1A1208 0%, #2A1F0F 50%, #1F1508 100%)`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: -1,
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#8A7355" }}>{mapCity.name}</div>
          <div style={{ fontSize: 12, color: "#8A7355", marginTop: 4 }}>{cityProds.length} exclusive finds</div>
        </div>

        {/* City label */}
        <div style={{
          position: "absolute", top: 12, left: 12,
          background: mapCity.color, color: "#fff",
          padding: "6px 14px", borderRadius: 100,
          fontSize: 12, fontWeight: 700,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          {mapCity.emoji} {mapCity.name} · {cityProds.length} finds
        </div>

        {/* Open in Google Maps button */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=fashion+boutiques+${encodeURIComponent(mapCity.name)}`}
          target="_blank"
          rel="noreferrer"
          style={{
            position: "absolute", bottom: 12, right: 12,
            background: "#1E1610", color: "#EDE0C4",
            padding: "8px 14px", borderRadius: 100,
            fontSize: 12, fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
          🗺️ Open in Maps
        </a>
      </div>

      {/* Products list */}
      <div style={{ flexShrink: 0, padding: "12px 24px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7355", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {cityProds.length} finds in {mapCity.name}
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {cityProds.map(p => (
            <div key={p.id}
              style={{
                background: "#1E1610", border: `1.5px solid ${selectedPin === p.id ? mapCity.color : "#362819"}`,
                borderRadius: 18, padding: "14px", cursor: "pointer",
                flexShrink: 0, minWidth: 150, transition: "all 0.2s",
              }}
              onClick={() => setSelectedPin(selectedPin === p.id ? null : p.id)}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{p.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#8A7355", marginTop: 4 }}>{p.shop}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: mapCity.color, marginTop: 6 }}>{p.price}</div>

              {/* Expanded actions */}
              {selectedPin === p.id && (
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexDirection: "column" }}>
                  <button onClick={() => openInMaps(p)} style={{
                    background: mapCity.color, color: "#fff", border: "none",
                    borderRadius: 10, padding: "8px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    📍 Find on Maps
                  </button>
                  <button onClick={() => setSelectedProduct({...p, city: mapCity.name, color: mapCity.color})} style={{
                    background: "#231A0D", color: "#EDE0C4", border: "none",
                    borderRadius: 10, padding: "8px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    View Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function OnlyHere() {
  const [active, setActive] = useState("explore");
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [continent, setContinent] = useState("All");
  const [country, setCountry] = useState("All");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dbCities, setDbCities] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);
  const [bubblePos, setBubblePos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const [dragText, setDragText] = useState("");
  const dragTexts = ["Wii!", "Weee!", "Woop!", "Zoom!", "Yeet!", "Brrr!", "Zap!"];

  const onDragStart = (e) => {
    e.stopPropagation();
    if (e.touches && e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const el = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: clientX - el.left, y: clientY - el.top };
    hasMoved.current = false;

    const onMove = (ev) => {
      ev.stopPropagation();
      if (ev.cancelable) ev.preventDefault();
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      if (!hasMoved.current) {
        setDragText(dragTexts[Math.floor(Math.random() * dragTexts.length)]);
      }
      hasMoved.current = true;
      setDragging(true);
      setBubblePos({
        x: Math.min(Math.max(cx - dragOffset.current.x, 0), window.innerWidth - 80),
        y: Math.min(Math.max(cy - dragOffset.current.y, 0), window.innerHeight - 120),
      });
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
  const [supportMessages, setSupportMessages] = useState([
    { role: "assistant", text: "Hi! 👋 I'm the OnlyHere support assistant. Ask me anything about the app, how to find exclusive items, or how shops can get listed!" }
  ]);
  const [supportInput, setSupportInput] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [citiesData, productsData] = await Promise.all([
          sbFetch("cities", "order=name"),
          sbFetch("products", "order=city_name"),
        ]);
        if (citiesData.length > 0) {
          // Map Supabase data to app format
          const mapped = citiesData.map(c => ({
            ...c,
            flagCode: c.flag_code,
            photo: cities.find(x => x.name === c.name)?.photo || "",
            products: productsData
              .filter(p => p.city_name === c.name)
              .map(p => ({ ...p, desc: p.description, mapHint: p.map_hint })),
          }));
          setDbCities(mapped);
          setSelectedCity(mapped[0]);
        }
      } catch (e) {
        console.error("Supabase error:", e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const activeCities = dbCities.length > 0 ? dbCities : cities;
  const activeAllProducts = dbCities.length > 0
    ? dbCities.flatMap(c => c.products.map(p => ({ ...p, city: c.name, color: c.color })))
    : allProducts;
  const [savedItems, setSavedItems] = useState([2, 7, 16]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const toggleSave = (id) => setSavedItems(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const categories = ["All", "Fashion", "Accessories", "Bags"];
  const cityProducts = (selectedCity.products || []).map(p => ({ ...p, city: selectedCity.name, color: selectedCity.color }))
    .filter(p => category === "All" || p.category === category);
  const savedProducts = activeAllProducts.filter(p => savedItems.includes(p.id));

  const sendSupport = async () => {
    if (!supportInput.trim() || supportLoading) return;
    const userMsg = supportInput.trim();
    setSupportInput("");
    setSupportMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setSupportLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `You are the friendly support assistant for OnlyHere — an app that helps travelers discover exclusive local fashion and merchandise that can only be found in specific cities around the world. Keep answers short, warm and helpful. Current cities: Seoul, Tokyo, Marrakech, Copenhagen, Mexico City, Tirana. The app is free for travelers. Shops can contact us to get listed. Users can save finds with the heart button. The AI Style Guide tab gives personalized recommendations. The Map tab shows shop locations.`,
          messages: supportMessages
            .concat([{ role: "user", text: userMsg }])
            .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }))
        })
      });
      const data = await res.json();
      const reply = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "Let me help you with that!";
      setSupportMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setSupportMessages(prev => [...prev, { role: "assistant", text: "Something went wrong — try again!" }]);
    }
    setSupportLoading(false);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#16120A" }}>
      <div style={{ fontSize: 40, marginBottom: 16, animation: "float 1.5s ease-in-out infinite" }}>●</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#D4B483", letterSpacing: 2 }}>OnlyHere</div>
      <div style={{ fontSize: 13, color: "#8A7355", marginTop: 6 }}>Loading exclusive finds...</div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: "#16120A",
      minHeight: "100vh",
      maxWidth: 430,
      margin: "0 auto",
      position: "relative",
      color: "#EDE0C4",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        .slide-up { animation: slideUp 0.35s ease forwards; }
        .city-pill { display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:100px;cursor:pointer;font-size:14px;font-weight:600;white-space:nowrap;flex-shrink:0;border:2px solid transparent;transition:all 0.2s;font-family:'Plus Jakarta Sans',sans-serif; }
        .city-pill:active { transform:scale(0.95); }
        .product-card { background:#241A0A;border-radius:20px;padding:16px;border:1.5px solid #3D2E18;cursor:pointer;transition:all 0.2s;position:relative; }
        .product-card:active { transform:scale(0.98); }
        .cat-btn { border:1.5px solid #3D2E18;background:#241A0A;border-radius:100px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;flex-shrink:0;color:#A08C6E; }
        .save-btn { border:none;background:none;cursor:pointer;font-size:20px;line-height:1;padding:4px; }
        .save-btn:active { animation:pop 0.3s ease; }
        .nav-btn { display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;padding:8px 16px;border-radius:16px;transition:all 0.15s; }
        .exclusive-badge { display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:0.5px;padding:4px 10px;border-radius:100px;letter-spacing:0.3px; }
        .modal-bg { position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100;display:flex;align-items:flex-end;animation:fadeIn 0.2s ease; }
        .modal-sheet { background:#1F1508; color:#F5ECD7;border-radius:28px 28px 0 0;width:100%;max-width:430px;margin:0 auto;padding:24px 24px 48px;animation:slideUp 0.3s ease;max-height:88vh;overflow-y:auto; }
        .stat-box { background:#2A1F0F;border-radius:14px;padding:14px;text-align:center;flex:1; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "52px 24px 0", background: "#16120A", borderBottom: "1px solid #3D2E18" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 20, animation: "float 3s ease-in-out infinite", display: "inline-block" }}>●</span>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, fontFamily: "'Cormorant Garamond', serif", color: "#D4B483" }}>OnlyHere</span>
            </div>
            <p style={{ fontSize: 13, color: "#8A7355", marginTop: 2, fontWeight: 500 }}>
              It exists <span style={{ color: "#D4B483", fontWeight: 600, fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif" }}>nowhere else.</span>
            </p>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${selectedCity.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {selectedCity.emoji}
          </div>
        </div>
        <div style={{ marginTop: 16, background: "#1E1610", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #3D2E18" }}>
          <span style={{ fontSize: 16 }}>/</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (e.target.value) setActive("search"); else setActive("explore"); }}
            placeholder="Search exclusive finds..."
            style={{ border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent", color: "#EDE0C4", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {search && <button onClick={() => { setSearch(""); setActive("explore"); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "#8A7355" }}>✕</button>}
        </div>
      </div>

      {/* Content */}
      <div style={{ height: "calc(100vh - 180px)", overflowY: active === "ai" ? "hidden" : "auto", paddingBottom: active === "ai" ? 0 : 100 }}>


        {/* SEARCH RESULTS */}
        {active === "search" && (
          <div className="slide-up" style={{ padding: "16px 24px" }}>
            {(() => {
              const q = search.toLowerCase();
              const results = activeAllProducts.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.city.toLowerCase().includes(q) ||
                p.shop.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.exclusive.toLowerCase().includes(q) ||
                p.desc.toLowerCase().includes(q)
              );
              return (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8A7355", letterSpacing: 1, textTransform: "uppercase", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {results.length} results for "{search}"
                  </div>
                  {results.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>/</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#8A7355" }}>No finds matched</div>
                      <div style={{ fontSize: 13, color: "#8A7355", marginTop: 8 }}>Try a city, category or product name</div>
                    </div>
                  ) : results.map(product => (
                    <div key={product.id} className="product-card" style={{ marginBottom: 12 }} onClick={() => setSelectedProduct(product)}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${product.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>
                          {product.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3, paddingRight: 8 }}>{product.name}</div>
                            <button className="save-btn" onClick={e => { e.stopPropagation(); toggleSave(product.id); }}>{savedItems.includes(product.id) ? "♥" : "♡"}</button>
                          </div>
                          <div style={{ fontSize: 12, color: "#8A7355", marginTop: 3 }}>{product.city} · {product.shop}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                            <span className="exclusive-badge" style={{ background: `${product.color}15`, color: product.color }}>◆ {product.exclusive}</span>
                            <span style={{ fontWeight: 800, fontSize: 15, color: "#EDE0C4" }}>{product.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        )}
        {/* EXPLORE */}
        {active === "explore" && (
          <div className="slide-up">
            <div style={{ padding: "18px 0 4px" }}>
              {/* Continent filter */}
              <div style={{ display: "flex", gap: 8, paddingLeft: 24, overflowX: "auto", paddingRight: 24, marginBottom: 14 }}>
                {continents.map(c => (
                  <button key={c} className="cat-btn" onClick={() => { setContinent(c); setCountry('All'); }}
                    style={{ background: continent === c ? "#EDE0C4" : "#fff", color: continent === c ? "#fff" : "#8A7355", border: `1.5px solid ${continent === c ? "#EDE0C4" : "#362819"}` }}>
                    {c === "All" ? "🌍 All" : c === "Europe" ? "🇪🇺 Europe" : c === "Asia" ? "🌏 Asia" : c === "Africa" ? "🌍 Africa" : "🌎 Americas"}
                  </button>
                ))}
              </div>
              {/* Country filter */}
              <div style={{ display: "flex", gap: 8, paddingLeft: 24, overflowX: "auto", paddingRight: 24, marginBottom: 10 }}>
                {getCountries(continent).map(c => (
                  <button key={c} className="cat-btn" onClick={() => { setCountry(c); }}
                    style={{
                      background: country === c ? '#D4B483' : '#231A0D',
                      color: country === c ? '#16120A' : '#8A7355',
                      border: `1.5px solid ${country === c ? '#D4B483' : '#362819'}`,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    {COUNTRY_FLAGS[c] && <span style={{ fontSize: 14 }}>{COUNTRY_FLAGS[c]}</span>}
                    {c}
                  </button>
                ))}
              </div>

              {/* City grid */}
              <div style={{ display: "flex", gap: 10, paddingLeft: 24, paddingRight: 24, flexWrap: "wrap" }}>
                {activeCities.filter(c => (continent === "All" || c.continent === continent) && (country === "All" || c.country === country)).map(city => (
                  <button key={city.id} onClick={() => { setSelectedCity(city); setCategory("All"); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 16px", borderRadius: 100,
                      background: selectedCity.id === city.id ? city.color : "#fff",
                      color: selectedCity.id === city.id ? "#fff" : "#C4A97D",
                      border: `2px solid ${selectedCity.id === city.id ? city.color : "#362819"}`,
                      fontWeight: 600, fontSize: 14, cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: "all 0.2s", whiteSpace: "nowrap",
                    }}>
                    <FlagImg flagCode={city.flagCode} />
                    {city.name}
                  </button>
                ))}
              </div>
            </div>

            {/* City hero with authentic pattern */}
            <div style={{ padding: "12px 24px" }}>
              <div style={{ background: selectedCity.color, borderRadius: 24, padding: "22px", position: "relative", overflow: "hidden", minHeight: 140 }}>
                
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 36, marginBottom: 6 }}>{selectedCity.emoji}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", fontFamily: "'Cormorant Garamond', serif" }}>{selectedCity.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: 600 }}>{selectedCity.tag}</div>
                  <div style={{ marginTop: 14, background: "rgba(255,255,255,0.2)", borderRadius: 100, padding: "6px 14px", display: "inline-flex", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>◆ {selectedCity.items} exclusive finds</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category filter */}
            <div style={{ display: "flex", gap: 8, padding: "4px 24px 12px", overflowX: "auto" }}>
              {categories.map(cat => (
                <button key={cat} className="cat-btn" onClick={() => setCategory(cat)}
                  style={{ background: category === cat ? "#EDE0C4" : "#fff", color: category === cat ? "#fff" : "#8A7355", border: `1.5px solid ${category === cat ? "#EDE0C4" : "#362819"}` }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Products */}
            <div style={{ padding: "0 24px" }}>
              <div style={{ marginBottom: 14, fontSize: 14, fontWeight: 700, color: "#EDE0C4" }}>
                {cityProducts.length} finds in {selectedCity.name}
              </div>
              {cityProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#8A7355" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>/</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>No finds in this category</div>
                </div>
              ) : cityProducts.map(product => (
                <div key={product.id} className="product-card" style={{ marginBottom: 12 }} onClick={() => setSelectedProduct(product)}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 70, height: 70, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: `${product.color}22`, position: "relative" }}>
                      {product.photo ? (
                        <img src={product.photo} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{product.emoji}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3, paddingRight: 8 }}>{product.name}</div>
                        <button className="save-btn" onClick={e => { e.stopPropagation(); toggleSave(product.id); }}>{savedItems.includes(product.id) ? "♥" : "♡"}</button>
                      </div>
                      <div style={{ fontSize: 12, color: "#8A7355", marginTop: 3, fontWeight: 500 }}>{product.shop}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                        <span className="exclusive-badge" style={{ background: `${product.color}15`, color: product.color }}>◆ {product.exclusive}</span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#EDE0C4" }}>{product.price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI */}
        {active === "ai" && (
          <AIRecommender cities={activeCities} allProducts={activeAllProducts} savedItems={savedItems} toggleSave={toggleSave} setSelectedProduct={setSelectedProduct} />
        )}

        {/* MAP */}
        {active === "map" && (
          <MapView cities={activeCities} allProducts={activeAllProducts} savedItems={savedItems} toggleSave={toggleSave} setSelectedProduct={setSelectedProduct} />
        )}

        {/* SAVED */}
        {active === "saved" && (
          <div className="slide-up" style={{ padding: "20px 24px" }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#EDE0C4" }}>❤️ Saved Finds</h2>
              <p style={{ fontSize: 14, color: "#8A7355", marginTop: 4, fontWeight: 500 }}>
                {savedProducts.length} items · {[...new Set(savedProducts.map(p => p.city))].length} cities
              </p>
            </div>
            {savedProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>♡</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#8A7355" }}>Nothing saved yet</div>
                <div style={{ fontSize: 14, color: "#8A7355", marginTop: 8 }}>Tap ❤️ on any find to save it</div>
              </div>
            ) : savedProducts.map(product => (
              <div key={product.id} className="product-card" style={{ marginBottom: 12 }} onClick={() => setSelectedProduct(product)}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: `${product.color}22` }}>
                    {product.photo ? (
                      <img src={product.photo} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{product.emoji}</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: "#8A7355", marginTop: 2 }}>{product.city} · {product.shop}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span className="exclusive-badge" style={{ background: `${product.color}15`, color: product.color }}>◆ {product.exclusive}</span>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{product.price}</span>
                    </div>
                  </div>
                  <button className="save-btn" onClick={e => { e.stopPropagation(); toggleSave(product.id); }}>♡</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(250,250,250,0.96)", backdropFilter: "blur(20px)", borderTop: "1.5px solid #3D2E18", padding: "10px 8px 28px", display: "flex", justifyContent: "space-around", zIndex: 50 }}>
        {navItems.map(item => (
          <button key={item.id} className="nav-btn" onClick={() => setActive(item.id)} style={{ color: active === item.id ? "#16120A" : "#6B5A42" }}>
            <div style={{
              background: active === item.id ? "#D4B483" : "transparent",
              borderRadius: 12,
              padding: active === item.id ? "6px 14px" : "6px 14px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 16, fontFamily: "serif", color: active === item.id ? "#16120A" : "#6B5A42" }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: active === item.id ? "#16120A" : "#6B5A42" }}>{item.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Product Modal */}

      {/* Support avatar bubble — draggable */}
      {!supportOpen && (
        <div
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          
          style={{
            position: "fixed",
            bottom: bubblePos.y !== null ? "auto" : 88,
            right: bubblePos.x !== null ? "auto" : 16,
            left: bubblePos.x !== null ? bubblePos.x : "auto",
            top: bubblePos.y !== null ? bubblePos.y : "auto",
            cursor: dragging ? "grabbing" : "grab",
            zIndex: 200,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            userSelect: "none",
          }}>
          {/* Speech bubble */}
          <div style={{
            background: dragging ? "#D4B483" : "#EDE0C4",
            color: "#16120A", fontSize: dragging ? 15 : 11, fontWeight: 800,
            padding: "6px 14px", borderRadius: 100,
            whiteSpace: "nowrap", marginBottom: 2,
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            fontFamily: dragging ? "'Cormorant Garamond', serif" : "'Plus Jakarta Sans', sans-serif",
            letterSpacing: dragging ? 1 : 0,
            transition: "all 0.1s",
          }}>{dragging && dragText ? dragText : "Need help? →"}</div>

          {/* Robot avatar */}
          <div style={{
            width: 58, height: 58, borderRadius: "50%",
            background: "linear-gradient(135deg, #111 60%, #333)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            border: `3px solid ${selectedCity.color}`,
            position: "relative",
          }}>
            {/* Robot face */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              {/* Head */}
              <rect x="6" y="8" width="20" height="16" rx="4" fill="#fff" opacity="0.95"/>
              {/* Antenna */}
              <line x1="16" y1="2" x2="16" y2="8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16" cy="2" r="2" fill={selectedCity.color}/>
              {/* Eyes */}
              <rect x="9" y="12" width="5" height="4" rx="1.5" fill={selectedCity.color}/>
              <rect x="18" y="12" width="5" height="4" rx="1.5" fill={selectedCity.color}/>
              {/* Mouth */}
              <path d="M11 20 Q16 23 21 20" stroke={selectedCity.color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              {/* Neck */}
              <rect x="13" y="24" width="6" height="3" rx="1" fill="#fff" opacity="0.6"/>
            </svg>
            {/* Online dot */}
            <div style={{
              position: "absolute", bottom: 2, right: 2,
              width: 12, height: 12, borderRadius: "50%",
              background: "#00CC88", border: "2px solid #111",
            }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7355" }}>Support</div>
        </div>
      )}

      {/* Support chat */}
      {supportOpen && (
        <div style={{
          position: "fixed", bottom: 80, right: 16, left: 16,
          maxWidth: 398, marginLeft: "auto",
          background: "#1E1610", borderRadius: 24,
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          zIndex: 200, display: "flex", flexDirection: "column",
          maxHeight: "60vh", overflow: "hidden",
          border: "1.5px solid #3D2E18",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 18px", borderBottom: "1.5px solid #3D2E18",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#EDE0C4", borderRadius: "22px 22px 0 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#222", border: `2px solid ${selectedCity.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <rect x="6" y="8" width="20" height="16" rx="4" fill="#fff" opacity="0.95"/>
                  <line x1="16" y1="2" x2="16" y2="8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="16" cy="2" r="2" fill={selectedCity.color}/>
                  <rect x="9" y="12" width="5" height="4" rx="1.5" fill={selectedCity.color}/>
                  <rect x="18" y="12" width="5" height="4" rx="1.5" fill={selectedCity.color}/>
                  <path d="M11 20 Q16 23 21 20" stroke={selectedCity.color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>GoBot</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00CC88" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Always online</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSupportOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            </div>
          </div>

          {/* Quick questions */}
          <div style={{ padding: "10px 16px 0", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1.5px solid #3D2E18", paddingBottom: 10 }}>
            {["How does it work?", "Is it free?", "Add my shop?", "Which cities?"].map(q => (
              <button key={q} onClick={() => { setSupportInput(q); sendSupport(); }} style={{
                background: "#231A0D", border: "none", borderRadius: 100,
                padding: "8px 14px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", color: "#EDE0C4", whiteSpace: "nowrap",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                flexShrink: 0,
              }}>{q}</button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {supportMessages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "80%", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "10px 14px", fontSize: 13, lineHeight: 1.5, fontWeight: 500,
                  background: m.role === "user" ? "#EDE0C4" : "#231A0D",
                  color: m.role === "user" ? "#fff" : "#EDE0C4",
                }}>{m.text}</div>
              </div>
            ))}
            {supportLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ background: "#231A0D", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, color: "#8A7355" }}>Typing...</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "10px 16px 16px", display: "flex", gap: 8 }}>
            <input
              value={supportInput}
              onChange={e => setSupportInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendSupport()}
              placeholder="Ask anything..."
              style={{
                flex: 1, border: "1.5px solid #3D2E18", borderRadius: 100,
                padding: "10px 16px", fontSize: 13, outline: "none",
                fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#1E1610", color: "#EDE0C4",
              }}
            />
            <button onClick={sendSupport} disabled={supportLoading || !supportInput.trim()} style={{
              background: supportLoading || !supportInput.trim() ? "#EEE" : "#EDE0C4",
              border: "none", borderRadius: "50%", width: 40, height: 40,
              cursor: "pointer", color: "#fff", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>→</button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-bg" onClick={() => setSelectedProduct(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7355", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {selectedProduct.city} · {selectedProduct.category}
              </div>
              <button onClick={() => setSelectedProduct(null)} style={{ background: "#231A0D", border: "none", borderRadius: "50%", width: 34, height: 34, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            {/* Modal hero with city pattern */}
            <div style={{ background: selectedProduct.color, borderRadius: 24, height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, marginBottom: 20, position: "relative", overflow: "hidden" }}>
              
              <span style={{ position: "relative" }}>{selectedProduct.emoji}</span>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, fontFamily: "'Cormorant Garamond', serif", color: '#EDE0C4' }}>{selectedProduct.name}</h2>
            <p style={{ fontSize: 14, color: "#8A7355", marginTop: 6, fontWeight: 500 }}>{selectedProduct.shop}</p>
            <p style={{ fontSize: 14, color: "#EDE0C4", marginTop: 10, lineHeight: 1.6 }}>{selectedProduct.desc}</p>

            <span className="exclusive-badge" style={{ background: `${selectedProduct.color}15`, color: selectedProduct.color, fontSize: 12, padding: "6px 14px", marginTop: 14, display: "inline-flex" }}>
              ◆ {selectedProduct.exclusive}
            </span>

            {selectedProduct.mapHint && (
              <div style={{ marginTop: 12, background: "#231A0D", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>●</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#EDE0C4" }}>{selectedProduct.mapHint}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {[["🏷️", "Category", selectedProduct.category], ["💰", "Price", selectedProduct.price]].map(([icon, label, value]) => (
                <div key={label} className="stat-box">
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 11, color: "#8A7355", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => toggleSave(selectedProduct.id)} style={{
                flex: 1, background: savedItems.includes(selectedProduct.id) ? "#FFF0F6" : "#231A0D",
                color: savedItems.includes(selectedProduct.id) ? "#FF3D9A" : "#8A7355",
                border: `1.5px solid ${savedItems.includes(selectedProduct.id) ? "#FF3D9A44" : "#362819"}`,
                borderRadius: 16, padding: "14px", fontWeight: 600, fontSize: 15, cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s",
              }}>
                {savedItems.includes(selectedProduct.id) ? "♥ Saved" : "♡ Save"}
              </button>
              <button style={{ flex: 2, background: selectedProduct.color, color: "#fff", border: "none", borderRadius: 16, padding: "14px", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Visit Shop →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
