export const roadTrips = [
  { id: 1, name: "Copenhagen to Aalborg", region: "Zealand → Jutland", emoji: "🚗", duration: "4h 30min drive", distance: "330 km", lat: 56.1629, lon: 10.2039, photo: "/roskilde.jpg",
    desc: "The classic cross-country route — but almost nobody stops along the way. This drive passes some of Denmark's most important history within a few minutes of the E45, yet most people drive straight through.",
    stops: [
      { name: "Roskilde", note: "Viking Ship Museum, 25min off route" },
      { name: "Jelling", note: "UNESCO Viking rune stones — where Denmark was named as a nation. 15min detour, extraordinary." },
      { name: "Vejle", note: "Fjord views, a proper coffee stop" },
      { name: "Aarhus", note: "Latin Quarter, Moesgaard Museum just south of the city" },
      { name: "Skanderborg", note: "Lakeside forest, home of Smukfest" },
    ],
    color: "#1565C0", mapHint: "Copenhagen to Aalborg, Denmark", vibe: "🏛 For history that hides in plain sight" },
  { id: 2, name: "The Wadden Sea Coast", region: "South Jutland", emoji: "🌾", duration: "2h drive", distance: "95 km", lat: 55.3297, lon: 8.7671, photo: "/roadtrip.jpg",
    desc: "Denmark's wildest coastline, and a UNESCO World Heritage site most travelers never hear about. Flat marshland, enormous skies, and the best sunsets in the country.",
    stops: [
      { name: "Ribe", note: "Denmark's oldest town, Viking Center on the outskirts" },
      { name: "Mandø", note: "An island you drive to — only at low tide, across the seabed" },
      { name: "Fanø", note: "Ferry crossing, dune villages, Sønderho at the southern tip" },
    ],
    color: "#2E7D32", mapHint: "Wadden Sea Ribe Denmark", vibe: "🌾 Recommended for nature & traditional life" },
  { id: 3, name: "North Zealand Coastal Loop", region: "Zealand", emoji: "🌊", duration: "2h 30min drive", distance: "110 km", lat: 56.1223, lon: 12.3130, photo: "/tisvildevej.jpg",
    desc: "A half-day loop from Copenhagen through fishing villages, royal castles and beach towns — genuinely underrated compared to how much attention Copenhagen itself gets.",
    stops: [
      { name: "Dragør", note: "Yellow ochre fisherman's village, 30min from the city" },
      { name: "Kronborg Castle", note: "Hamlet's Elsinore, right on the sound to Sweden" },
      { name: "Gilleleje", note: "Working fishing harbour, best smoked fish in Zealand" },
      { name: "Tisvildeleje", note: "Forest meets beach, popular with Copenhageners but unknown abroad" },
    ],
    color: "#6A1B9A", mapHint: "North Zealand coast Denmark", vibe: "🔥 Most underrated day trip from Copenhagen" },
];


export const seasonalItineraries = [
  {
    id: "summer-nature", title: "The Great Nature Adventure", emoji: "🌿", color: "#2E7D32",
    seasons: ["summer"], duration: "7 days", bestFor: "Nature lovers, hidden-gem seekers, coastal Denmark",
    intro: "Denmark's summer days stretch to 17 hours of light, and this route is built entirely around it — from a harbour swim in the capital to standing where two seas collide at Denmark's northern tip.",
    days: [
      { day: 1, title: "Copenhagen & Harbour Swim", activity: "Rent a bike, explore Indre By, then swim right in the harbour at Islands Brygge. End with a cold beer at Nyhavn or Reffen Street Food." },
      { day: 2, title: "South Zealand & Møns Klint", activity: "Drive to Møns Klint. Walk the 500 steps down to the beach and see the towering white chalk cliffs rise from turquoise water. Stay in a local B&B." },
      { day: 3, title: "Funen & Odense", activity: "Cross the Storebælt Bridge. Explore the South Funen archipelago or visit the striking H.C. Andersen's House in Odense." },
      { day: 4, title: "Nationalpark Thy — Wild West Jutland", activity: "Head to Jutland's west coast, to \"Cold Hawaii\" in Klitmøller. Experience raw, untouched nature shaped by the North Sea wind." },
      { day: 5, title: "Skagen — Where Two Seas Meet", activity: "Drive to Denmark's northernmost point, Grenen. Stand with one foot in the Skagerrak and the other in the Kattegat. See the buried church and Råbjerg Mile, Denmark's largest migrating dune." },
      { day: 6, title: "Aarhus — Culture & Food", activity: "Drive south to Aarhus. Visit ARoS Art Museum (walk the rainbow-coloured panorama circle) and eat dinner in the cosy Latin Quarter." },
      { day: 7, title: "Silkeborg Lakes on the Way Back", activity: "Walk through Silkeborg's deep forests and lakes before heading to the airport for the trip home." },
    ],
  },
  {
    id: "winter-culture", title: "Culture, History & City Hygge", emoji: "🏰", color: "#6A1B9A",
    seasons: ["winter"], duration: "4 days", bestFor: "History lovers, budget travellers, museum and café people",
    seasonNote: "Danish winter nature is genuinely not recommended — short daylight (dark by 15:30), frequent horizontal rain and wind, and coastal towns partly shut down. This itinerary goes 100% indoor culture, history and food instead.",
    intro: "Denmark's cheapest months to visit, with zero museum queues — this route leans fully into castles, Viking history and warm cafés rather than fighting the weather.",
    days: [
      { day: 1, title: "Royal Copenhagen", activity: "Start indoors and warm at Rosenborg Castle to see the crown jewels. Walk over to Christiansborg Palace and explore the royal reception rooms. In the evening: a lit-up Tivoli in December, or a cosy Nørrebro microbrewery/café in Jan–Feb." },
      { day: 2, title: "Viking Ships & Cathedral in Roskilde", activity: "Take the 30-minute train to Roskilde. Visit the Viking Ship Museum right on the fjord to see original 1,000-year-old ships, then Roskilde Cathedral, resting place of nearly 40 Danish kings and queens." },
      { day: 3, title: "Cultural Capital Aarhus & Den Gamle By", activity: "Take the express train to Aarhus. Spend the morning at Den Gamle By — a living open-air museum, genuinely atmospheric in winter with costumed guides. Evening: Aarhus Street Food for cheap, excellent food from around the world." },
      { day: 4, title: "Moesgaard Museum & Flight Home", activity: "Visit the architectural masterpiece Moesgaard Museum outside Aarhus — home to the Grauballe Man, the best-preserved Iron Age bog body in the world. Head back to the airport." },
    ],
  },
  {
    id: "shoulder-hidden", title: "The Hidden Denmark", emoji: "💎", color: "#D4AF37",
    seasons: ["spring", "autumn"], duration: "5 days", bestFor: "Couples, foodies, and anyone chasing the genuinely unusual",
    intro: "May and September are the sweet spot — good daylight, thin crowds, and this is when Denmark's strangest and most beautiful natural phenomenon, Sort Sol, is actually visible.",
    days: [
      { day: 1, title: "Bornholm — The Rock Island", activity: "Fly or ferry to Bornholm. The island is at its best in May and September. Explore Hammershus, Northern Europe's largest ruined castle, and see the island's unique round churches." },
      { day: 2, title: "Smokehouses & Local Delicacies", activity: "Eat \"Sol over Gudhjem\" (smoked herring with egg yolk and chives) at a traditional smokehouse. Walk the dramatic cliff coast at Helligdomsklipperne." },
      { day: 3, title: "Sort Sol in South Jutland (Autumn only — Sept/Oct)", activity: "Travel to the Wadden Sea in South Jutland. Witness \"Sort Sol\" (Black Sun) — up to a million starlings gathering into vast shifting shapes across the sunset sky. One of Europe's wildest natural phenomena, and genuinely obscure to international travellers." },
      { day: 4, title: "Ribe — Denmark's Oldest Town", activity: "Walk Ribe's cobblestone streets lined with medieval half-timbered houses. Visit Ribe VikingeCenter and climb the storm bell tower at Ribe Cathedral for a view across the flat marshland." },
      { day: 5, title: "Hunting the Forgotten Giants", activity: "Spend the last day in the forests around Copenhagen searching for \"De Glemte Kæmper\" (The Forgotten Giants) — enormous recycled-wood troll sculptures hidden in nature by artist Thomas Dambo — before departure." },
    ],
  },
];
