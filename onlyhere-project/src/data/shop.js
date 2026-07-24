export const cities = [
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


export const allProducts = cities.flatMap(c => c.products.map(p => ({ ...p, city: c.name, color: c.color })));

export const campingSpots = [
  { id: 1, name: "Bøtø Nor Shelter", region: "South Zealand", emoji: "⛺", type: "Free shelter", desc: "Free-to-use wooden shelter right on the coast near Præstø — first come first served, no booking, no fee. Bring your own everything.", travelTime: "1h 20min drive", mapHint: "Bøtø Nor, 4780 Stege, Denmark", color: "#2E7D32", vibe: "🔥 Completely free — locals-only secret" },
  { id: 2, name: "Rørvig Camping", region: "North Zealand", emoji: "🏕", type: "Campsite", desc: "Beachfront campsite near the Odsherred coast — pitch a tent metres from the water. Popular with Danes, almost unknown to tourists.", travelTime: "1h 30min drive", mapHint: "Rørvig Camping, 4581 Rørvig, Denmark", color: "#1565C0", vibe: "🌊 For sleeping to the sound of waves" },
  { id: 3, name: "Skagen Klitplantage", region: "North Jutland", emoji: "🌲", type: "Primitive camping", desc: "Free primitive camping (\"Naturstyrelsen\" spots) in dune forest between Skagen's two seas. Marked pitches, composting toilets, nothing else.", travelTime: "4h drive", mapHint: "Skagen Klitplantage, 9990 Skagen, Denmark", color: "#6A1B9A", vibe: "🌲 Recommended for nature & traditional life" },
  { id: 4, name: "Mols Bjerge Shelters", region: "East Jutland", emoji: "⛰", type: "Free shelter", desc: "Hilltop shelters in Denmark's only \"mountain\" national park. Short hike in, real silence, some of the best stargazing in the country.", travelTime: "3h 15min drive", mapHint: "Mols Bjerge National Park, 8400 Ebeltoft, Denmark", color: "#E65100", vibe: "✨ Best stargazing spot in Denmark" },
];




export const PRODUCT_COORDS = {
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




