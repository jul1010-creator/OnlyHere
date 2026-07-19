import { useState, useEffect, useRef } from "react";

const craftItemsFallback = [
  { id: 1, name: "Viking Ship Museum", price: "150 DKK", priceNote: "Adult entry online (10 DKK cheaper than at the door)", location: "Roskilde", type: "Major", emoji: "⚓", travelTime: "25min 🚂", photo: "/vikingshipmuseum1.jpg",
    desc: "Watch boatbuilders reconstruct Viking ships using historic techniques. Try rope making, blacksmithing, textile crafts and woodcarving — daily June to September. Sail a real Viking ship replica on Roskilde Fjord, May–September.",
    what: ["Rope making", "Blacksmithing", "Textile crafts", "Woodcarving", "Fjord sailing"], color: "#1565C0", mapHint: "Vikingeskibsmuseet, Vindeboder 12, 4000 Roskilde, Denmark",
    bookingType: "online", bookingUrl: "https://www.vikingeskibsmuseet.dk/koeb/koeb-billet",
    bestTime: "Sailing trips run daily May–Sept and sell out — book the first sailing of the day online to guarantee a spot. Guided tours run hourly, included in entry.",
    ticketOptions: [
      { name: "Adult entry (online)", price: "150 DKK" },
      { name: "Adult entry (at the door)", price: "160 DKK" },
      { name: "Family ticket (2 adults + all kids under 18)", price: "300 DKK" },
      { name: "Children under 18", price: "Free" },
      { name: "Fjord sailing (add-on to entry, May–Sept)", price: "+130 DKK" },
      { name: "Season Pass — unlimited entry, 1 year", price: "200 DKK" },
      { name: "Groups (min. 25 adults)", price: "Contact museum" },
    ],
    recommendedPackage: { name: "Entry + Fjord Sailing", reason: "Reviewers consistently call the Viking ship sailing trip the highlight of the visit — rowing and setting sail on a real reconstructed longship, led by the museum's skipper. Available May–September; book the first sailing of the day online, it sells out." },
    blogBody: [
      { type: "image", src: "/vikingshipmuseum2.jpg", caption: "The boatyard, where craftspeople reconstruct Viking ships using historic techniques throughout the season." },
    ],
    rating: 4.5 },
  { id: 2, name: "Moesgaard Viking Days", price: "180 DKK", priceNote: "Adult ticket · online", location: "Aarhus", type: "Major", emoji: "🛡", travelTime: "3h 🚂",
    desc: "Four days of hands-on Viking craft at Moesgaard Museum. Try blacksmithing, plant dyeing, felting and coin minting.",
    what: ["Blacksmithing", "Plant dyeing", "Felting", "Coin minting"], color: "#6A1B9A", mapHint: "Moesgaard Museum, 8270 Højbjerg, Aarhus, Denmark",
    bookingType: "online", bookingUrl: "https://shop.moesgaardmuseum.dk/en/momuevents" },
  { id: 3, name: "Viking Center Ribe", price: "160 DKK", priceNote: "Adult admission · reduced rates 70–140 DKK · online", location: "Ribe", type: "Local", emoji: "🪖", travelTime: "3h 15min 🚂",
    desc: "Denmark's oldest town has an entire reconstructed Viking settlement — Ripa, 700–980 AD. Daily hands-on activities included in admission: archery, coin making, whittling, warrior training and falconry shows. Craftspeople sell jewellery, leather and metalwork at the marketplace — ask about a custom commission.",
    what: ["Archery", "Coin making", "Whittling", "Falconry show", "Jewellery", "Leather working", "Metalwork"], color: "#C8102E", mapHint: "Viking Center Ribe, Roagervej 129, 6760 Ribe, Denmark",
    bookingType: "online", bookingUrl: "https://www.ribevikingecenter.dk/en/plan-your-visit/opening-hours-and-admission",
    bestTime: "Every day has archery, coin making and whittling included — falconry shows run at 14:00. Saturdays and Sundays in July add extra \"Experience Viking Ripa\" activities.",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "Everything here is designed to recreate Viking life as accurately as possible. Costumed interpreters live and work in reconstructed buildings, demonstrating traditional crafts, cooking over open fires, forging iron and practising archery — you're walking through a village that feels genuinely alive, not observing history from behind glass." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "The centre operates seasonally, generally closed through winter (late April–October). As it's almost entirely outdoors, comfortable footwear and weather-appropriate clothing are essential if you're spending several hours here." },
    ],
    transportWarning: "The center is 3km south of Ribe town — the only bus (417) runs just 4 times a day, weekdays only, and isn't reliable for a spontaneous visit. If you don't have a bike or car, either plan tightly around the bus times or take a taxi (roughly 15 min, ~150 DKK). Skip this one if you're relying purely on walking or infrequent public transport.",
    ticketOptions: [
      { name: "Adult admission", price: "160 DKK" },
      { name: "Activity Card — archery + whittling + coin making", price: "70 DKK" },
      { name: "Each activity separately", price: "30 DKK each (90 DKK for all 3)" },
      { name: "Reduced/child admission", price: "70–140 DKK" },
      { name: "Season ticket — unlimited visits", price: "See website" },
    ],
    recommendedPackage: { name: "Admission + Activity Card", reason: "The Activity Card bundles all 3 hands-on experiences for 70 DKK — buying archery, whittling and coin making separately costs 90 DKK. It's Ribe VikingeCenter's own official recommendation, and the combination visitors do most." },
    upcomingEvents: [
      { name: "Threads, clothing and creed in the Viking Age", dates: "13–17 July 2026" },
      { name: "Viking horses and other animals", dates: "20–24 July 2026" },
      { name: "Viking Warriors", dates: "27 July – 2 August 2026" },
      { name: "The Vikings and White Christ", dates: "3–7 August 2026" },
      { name: "Family friendly campfire cooking (Danish)", dates: "7 August 2026" },
      { name: "Blacksmiths' Gathering", dates: "15–16 August 2026" },
      { name: "The magic of plant dyes (English workshop)", dates: "4 September 2026" },
      { name: "The magic of plant dyes (English workshop)", dates: "11 September 2026" },
    ], rating: 4.6 },
  { id: 4, name: "Bornholm Ceramics — Hjorths Fabrik", price: "225 DKK", priceNote: "45min pottery wheel workshop · online only", location: "Rønne, Bornholm", type: "Local", emoji: "🏺", travelTime: "2h + ferry 🚢",
    desc: "Try throwing your own ceramics on the wheel at the 160-year-old Hjorths Fabrik in Rønne. Instructed by experienced ceramists — take one piece home glazed and fired.",
    what: ["Hand-thrown ceramics", "Glazing", "Firing included"], color: "#E65100", mapHint: "Hjorths Fabrik, Krystalgade 5, 3700 Rønne, Denmark",
    bookingType: "online", bookingUrl: "https://shop.bornholmsmuseum.dk" },
  { id: 6, name: "Glasgalleriet", price: "1,100 DKK", priceNote: "Weekday rate for 1–2 people · 1,300 DKK evenings/weekends", location: "Roskilde", type: "Local", emoji: "🫧", travelTime: "25min 🚂",
    desc: "A working glassblowing studio in Roskilde's former gasworks by the harbour. Glassblower Skak Snitker has run it since 1977 — watching him work is free, but you can also blow your own piece from start to finish under his direct guidance. About an hour, and your finished glasswork is ready to collect the next day.",
    what: ["Glassblowing", "Watch demonstrations", "Blow your own piece", "Gallery & shop"], color: "#00838F", mapHint: "Glasgalleriet, Sankt Ibsvej 12, 4000 Roskilde, Denmark",
    bookingType: "request", bestTime: "Contact ahead to book the hands-on session — only 1-2 people per session, so it fills up. Watching the open workshop needs no booking at all.", rating: 4.5 },
  { id: 7, name: "Tivoli Gardens", popularityTag: "Common Attraction", price: "170–200 DKK", priceNote: "Entry only · ride pass ~190 DKK extra · online", location: "Copenhagen", type: "Major", emoji: "🎡", travelTime: "In Copenhagen 🚇",
    desc: "The world's second-oldest amusement park, open since 1843 — right in the heart of Copenhagen, a 2-minute walk from Central Station. Historic wooden roller coaster, themed gardens, live music and seasonal transformations for Halloween and Christmas.",
    what: ["Roller coasters", "Gardens", "Live music", "Seasonal events"], color: "#C8102E", mapHint: "Tivoli Gardens, Vesterbrogade 3, 1630 København V, Denmark",
    bookingType: "online", bookingUrl: "https://shop.tivoli.dk/en/billetter-og-tivolikort",
    bestTime: "Go early morning for a quieter garden walk, then return after dark — the lit-up gardens at night are Tivoli's most magical side.", rating: 4.5 },
  { id: 8, name: "Den Gamle By", popularityTag: "Common Attraction", price: "See website", priceNote: "Open-air museum · online", location: "Aarhus", type: "Major", emoji: "🏘", travelTime: "3h 🚂",
    desc: "A world-class open-air museum of urban history — over 560,000 guests a year — showcasing Danish town life from the 1500s to the 1970s.",
    what: ["Historic buildings", "Costumed guides", "Old town streets"], color: "#8D6E63", mapHint: "Den Gamle By, Viborgvej 2, 8000 Aarhus, Denmark",
    bookingType: "online", bookingUrl: "https://www.dengamleby.dk/" },
  { id: 9, name: "ARoS Aarhus Art Museum", popularityTag: "Common Attraction", price: "See website", priceNote: "Art museum · online", location: "Aarhus", type: "Major", emoji: "🌈", travelTime: "3h 🚂",
    desc: "One of Scandinavia's largest art museums, internationally known for \"Your Rainbow Panorama\" — a circular rainbow-glass skywalk on the roof.",
    what: ["Rainbow Panorama", "Contemporary art", "Rooftop views"], color: "#8E24AA", mapHint: "ARoS Aarhus Kunstmuseum, Aros Allé 2, 8000 Aarhus, Denmark",
    bookingType: "online", bookingUrl: "https://www.aros.dk/" },
  { id: 10, name: "Aalborg Tower", popularityTag: "Common Attraction", price: "See website", priceNote: "Observation tower · ticket required on-site", location: "Aalborg", type: "Major", emoji: "🗼", travelTime: "3h 🚂",
    desc: "A 105-metre steel tower with an unmatched 360° panoramic view over Aalborg and the Limfjord.",
    what: ["360° views", "Limfjord panorama"], color: "#455A64", mapHint: "Aalborgtårnet, Skovbakken 27, 9000 Aalborg, Denmark",
    bookingType: "online", bookingUrl: "http://www.aalborgtaarnet.dk/" },
  { id: 11, name: "Springeren Marine Experience Centre", popularityTag: "Common Attraction", price: "See website", priceNote: "Maritime museum · online", location: "Aalborg", type: "Major", emoji: "🚢", travelTime: "3h 🚂",
    desc: "Step inside a real submarine, explore torpedo boats and try a professional ship simulator.",
    what: ["Real submarine", "Ship simulator", "Torpedo boats"], color: "#0277BD", mapHint: "Springeren, Vestre Fjordvej, 9000 Aalborg, Denmark",
    bookingType: "online", bookingUrl: "http://springeren-maritimt.dk/" },
  { id: 12, name: "Aalborg Monastery", popularityTag: "Hidden Gem", price: "See website", priceNote: "Indoor access by guided tour only", location: "Aalborg", type: "Local", emoji: "⛪", travelTime: "3h 🚂",
    desc: "A peaceful, highly preserved monastic estate from 1431, with a hidden courtyard garden in the middle of the city. The courtyard is free; indoor access needs a booked guided tour.",
    what: ["Guided tours", "Medieval architecture", "Hidden courtyard"], color: "#8D6E63", mapHint: "Aalborg Kloster, C.W. Obels Plads 4, 9000 Aalborg, Denmark",
    bookingType: "request" },
  { id: 13, name: "The Cisterns (Cisternerne)", popularityTag: "Hidden Gem", price: "See website", priceNote: "Underground art space · online", location: "Copenhagen", type: "Local", emoji: "🕳", travelTime: "In Copenhagen 🚇",
    desc: "A massive former underground water reservoir beneath Søndermarken park, now a dark, atmospheric contemporary art space.",
    what: ["Underground reservoir", "Contemporary art", "Atmospheric"], color: "#37474F", mapHint: "Cisternerne, Søndermarken, 2000 Frederiksberg, Denmark",
    bookingType: "request" },
  { id: 14, name: "Kronborg Castle", popularityTag: "Common Attraction", price: "See website", priceNote: "UNESCO World Heritage Site · online", location: "Helsingør", type: "Major", emoji: "🏰", travelTime: "50min 🚂", photo: "/kronborgslot.jpg",
    desc: "The real-life setting for Shakespeare's Hamlet, guarding the narrowest point of the Øresund strait — close enough to Sweden to see it clearly across the water. A UNESCO World Heritage Site since 2000.",
    what: ["Renaissance castle", "Casemates", "Royal apartments", "Øresund views"], color: "#455A64", mapHint: "Kronborg, 3000 Helsingør, Denmark",
    bookingType: "online", bookingUrl: "https://kronborg.dk/en/" },
];

const events = [
  { id: 1, name: "Præstø Litteraturfestival", travelTime: "1h 10min 🚂", rating: 4.6, town: "Præstø", type: "Festival", emoji: "📚", date: "2026-06-20", dateEnd: "2026-06-21", photo: "/local1.jpg", desc: "Denmark's cosiest literature festival in the charming harbour town of Præstø.", mapHint: "Præstø Torv, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#C8102E", tags: ["Literature", "Music"] },
  { id: 2, name: "Sommerdage i Præstø", travelTime: "1h 10min 🚂", rating: 4.4, town: "Præstø", type: "Festival", emoji: "🌿", date: "2026-07-04", dateEnd: "2026-07-06", photo: "/local2.jpg", desc: "Nature and craft festival in Præstø. Plant dyeing workshops, ceramics, intimate concerts under open sky.", mapHint: "Præstø Havn, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#2E7D32", tags: ["Craft", "Nature"] },
  { id: 3, name: "Gyldne Dage i Præstø", travelTime: "1h 10min 🚂", rating: 4.3, town: "Præstø", type: "Festival", emoji: "🏰", date: "2026-09-12", dateEnd: "2026-09-13", photo: "/local3.jpg", desc: "Annual historical festival in Præstø with period costumes, local food and craft stalls.", mapHint: "Præstø Torv, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#C8102E", tags: ["History", "Culture"] },
  { id: 4, name: "Bondemarked på Oremandsgaard", travelTime: "1h 10min 🚂", rating: 4.5, town: "Præstø", type: "Market", emoji: "🌾", date: "2026-06-06", dateEnd: null, photo: "/local4.jpg", desc: "Farm market at the beautiful Oremandsgaard Estate. Local food, organic goods and handmade crafts.", mapHint: "Oremandsgaard, Jungshoved, 4720 Præstø, Denmark", verified: "Jun 2026", color: "#C8102E", tags: ["Food", "Market"] },
  { id: 5, name: "Bakkefest", travelTime: "1h 15min 🚂", rating: 4.7, town: "Gilleleje", type: "Festival", emoji: "🎵", date: "2026-07-10", dateEnd: "2026-07-12", photo: "/gilleleje.jpg", desc: "Three days of music overlooking the sea in Gilleleje. Big Danish artists, live DJs, food vendors.", mapHint: "Bøgebakken 19, 3250 Gilleleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Seaside"],
    blogBody: [
      { type: "image", src: "/gillelejenakkehoved.jpg", caption: "Nakkehoved lighthouse, a short walk from town — worth the detour before or after the festival." },
    ] },
  { id: 6, name: "Musik i Lejet", nearestStation: "Vejby Station", ticketInfo: "Extremely limited. Official sales usually sell out within minutes.", accommodationTip: "Book as early as possible.", budgetLevel: "High.", tier: "Recommended", travelTime: "1h 20min 🚂", rating: 4.8, town: "Tisvildeleje", type: "Festival", emoji: "🌊", date: "2026-07-17", dateEnd: "2026-07-19", photo: "/local6.jpg", desc: "Intimate music festival in the picturesque coastal village of Tisvildeleje.", mapHint: "Tisvildeleje Strand, 3220 Tisvildeleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Coastal"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "Expect Danish pop, rock and electronic music rather than international headliners. The setting, food and atmosphere are just as important as the concerts, creating a stylish yet relaxed festival where beach sunsets and long summer evenings become part of the experience." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Popular with Danes in their 20s and 30s — couples, groups of friends and travellers looking for a premium summer weekend." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Tickets are famously difficult to secure and accommodation disappears months in advance. It ranks among Denmark's more expensive festivals, so planning ahead is essential." },
    ] },
  { id: 7, name: "Folkely Festival", travelTime: "1h 30min 🚂", rating: 4.5, town: "Hundested", type: "Festival", emoji: "⚓", date: "2026-08-20", dateEnd: "2026-08-22", photo: "/local7.jpg", desc: "Three days of music, art and talks in Hundested harbour.", mapHint: "Hundested Havn, 3390 Hundested, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Harbour"] },
  { id: 8, name: "Fjordlys Festival", nearestStation: "Frederiksv\u00e6rk Station.", ticketInfo: "Mostly free or inexpensive.", accommodationTip: "Best enjoyed as a day trip.", budgetLevel: "Very Low.", travelTime: "1h 25min 🚂", rating: 4.3, town: "Frederiksværk", type: "Festival", emoji: "🎆", date: "2026-07-25", dateEnd: "2026-07-26", photo: "/local8.jpg", desc: "Summer festival by the fjord in Frederiksværk.", mapHint: "Frederiksværk Havn, 3300 Frederiksværk, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Fjord"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "Expect cover bands, local musicians and a casual atmosphere where families, friends and residents gather to enjoy a summer weekend together. It's small in scale but genuinely welcoming." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "A good choice if you're already staying in North Zealand or travelling with children." },
      { type: "heading", content: "Should You Visit?" },
      { type: "paragraph", content: "If you're nearby, Fjordlys is a lovely way to experience Danish community life. If you're travelling across the country specifically for festivals, there are stronger options to prioritise." },
    ] },
  { id: 9, name: "Haveje Beach Bar Events", travelTime: "1h 20min 🚂", rating: 4.4, town: "Liseleje", type: "Concert", emoji: "🏖", date: "2026-07-14", dateEnd: "2026-07-15", photo: "/local9.jpg", desc: "Live music at Haveje beach bar, 150m from one of Denmark's most beautiful white sand beaches.", mapHint: "Liselejevej, 3360 Liseleje, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Beach"] },
  { id: 10, name: "Samsø Music Festival", travelTime: "2h 30min 🚢", rating: 4.9, town: "Samsø", type: "Festival", emoji: "🎸", date: "2026-07-13", dateEnd: "2026-07-19", photo: "/local10.jpg", desc: "Since 1990, Denmark's cosiest music festival on the island of Samsø.", mapHint: "Mårup Kildevej 8, 8305 Samsø, Denmark", verified: "Jun 2026", color: "#6A1B9A", tags: ["Music", "Island"] },
  { id: 11, name: "Maribo Jazz Festival", nearestStation: "Maribo Station.", ticketInfo: "Wristbands required for main venues; some performances are free.", accommodationTip: "Hotels, inns and holiday cottages around Maribo.", budgetLevel: "Moderate.", tier: "Recommended", travelTime: "1h 45min 🚂", rating: 4.7, town: "Maribo", type: "Festival", emoji: "🎷", date: "2026-07-18", dateEnd: "2026-07-21", photo: "/local11.jpg", desc: "Denmark's friendliest jazz festival in historic Maribo. 120+ musicians across 18 venues.", mapHint: "Kirkepladsen, 4930 Maribo, Denmark", verified: "Jun 2026", color: "#E65100", tags: ["Jazz", "Historic"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "Music spills out from pubs, cafés and festival tents throughout the town, creating a cosy atmosphere that's more about enjoying great performances than chasing headline acts." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Perfect for jazz lovers, mature travellers and anyone looking for a quieter festival experience." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Don't expect modern pop, electronic music or huge festival crowds — Maribo is intentionally low-key." },
    ] },
  { id: 12, name: "KirsebærFestival", nearestStation: "Odense Station, then Bus 151", ticketInfo: "Free entry.", accommodationTip: "Stay in Kerteminde or nearby Odense.", budgetLevel: "Low--Moderate.", tier: "Recommended", travelTime: "2h 10min 🚂", rating: 4.6, town: "Kerteminde", type: "Festival", emoji: "🍒", date: "2026-07-17", dateEnd: "2026-07-19", photo: "/local12.jpg", desc: "Cherry festival in Kerteminde, Northeast Funen.", mapHint: "Kerteminde Havn, 5300 Kerteminde, Denmark", verified: "Jun 2026", color: "#B71C1C", tags: ["Food", "Local"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "The festival is built around local culture rather than big-name performers. Expect open-air concerts, food stalls, family activities and a welcoming atmosphere that feels more like a town celebration than a commercial festival." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Ideal for families, food lovers, couples and slower-paced travellers who enjoy authentic local experiences instead of nightlife." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "The town becomes busy during festival weekend, especially around the harbour, and parking can be frustrating." },
    ] },
  { id: 13, name: "Gyldne Dage i Præstø", tier: "Recommended", travelTime: "1h 30min 🚂", rating: 4.5, town: "Præstø", type: "Cultural", emoji: "🏰", date: "2026-09-12", dateEnd: "2026-09-13",
    desc: "Every September, the historic harbour town of Præstø steps back into the late 1800s — volunteers in period costume, traditional crafts and historical performances transform the streets into one of Denmark's most immersive cultural festivals.",
    mapHint: "Præstø Havn, 4720 Præstø, Denmark", verified: "Jul 2026", color: "#8D6E63", tags: ["History", "Free"],
    blogBody: [
      { type: "heading", content: "History & Atmosphere" },
      { type: "paragraph", content: "Rather than music stages, you'll find historic markets, demonstrations of traditional trades, classical performances and costumed locals bringing the town's history to life. The harbour setting makes it especially enjoyable for photographers." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "History enthusiasts, families, photographers and travellers wanting something different from Denmark's music festivals." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "If you're looking for nightlife or modern entertainment, this probably isn't the right festival — expect a slower pace focused on storytelling, local traditions and community involvement." },
    ] },
];

const majorEvents = [
  { id: 101, name: "Roskilde Festival", tier: "Can't miss out", travelTime: "25min 🚂", rating: 4.9, ticketStatus: "sold_out", town: "Roskilde", type: "Music", emoji: "🎸", date: "2026-06-27", dateEnd: "2026-07-04", photo: "/major1.jpg", desc: "Northern Europe's largest music festival. 130,000 attendees, 8 stages, 8 days.", mapHint: "Roskilde Festival, Darupvej 35, 4000 Roskilde, Denmark", verified: "Jun 2026", color: "#E53935", tags: ["Music", "Camping"] },
  { id: 102, name: "Distortion", nearestStation: "N\u00f8rreport Station, Copenhagen Central Station or nearby Metro stations", ticketInfo: "Street parties are free. Distortion X and Distortion \u00d8 require tickets.", accommodationTip: "Stay in central Copenhagen and book several months in advance.", budgetLevel: "Moderate--High.", tier: "Recommended", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "free", town: "Copenhagen", type: "Music", emoji: "🔊", date: "2026-06-03", dateEnd: "2026-06-07", photo: "/major2.jpg", desc: "Copenhagen's legendary street festival. Five days of block parties in different neighbourhoods.", mapHint: "Nørrebrogade, 2200 Copenhagen, Denmark", verified: "Jun 2026", color: "#8E24AA", tags: ["Electronic", "Street"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "Distortion isn't confined to a single festival site. During the week, neighbourhoods like Nørrebro and Vesterbro come alive with DJs, bars, street food and thousands of people celebrating outdoors before everything moves to Refshaleøen for the festival finale." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Perfect for travellers in their 20s and 30s, backpackers, nightlife lovers and anyone who enjoys electronic music. If you like discovering a city's social scene rather than spending all day inside a fenced festival, Distortion is an easy recommendation." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "The streets can become extremely busy, particularly during the free neighbourhood events. Expect crowds, loud music and late nights throughout the city." },
    ] },
  { id: 103, name: "Aalborg Karneval", tier: "Can't miss out", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aalborg", type: "Cultural", emoji: "🎭", date: "2026-05-20", dateEnd: "2026-05-24", photo: "/major3.jpg", desc: "Scandinavia's largest carnival. 100,000+ participants in costumes.", mapHint: "Aalborg Centrum, 9000 Aalborg, Denmark", verified: "Jun 2026", color: "#F57F17", tags: ["Carnival", "Parade"] },
  { id: 104, name: "Copenhagen Jazz Festival", travelTime: "In Copenhagen 🚇", rating: 4.8, ticketStatus: "free", town: "Copenhagen", type: "Music", emoji: "🎷", date: "2026-07-03", dateEnd: "2026-07-12", photo: "/major4.jpg", desc: "10 days of jazz across 100+ venues. Free concerts in squares and parks.", mapHint: "Copenhagen City Hall Square, Denmark", verified: "Jun 2026", color: "#00695C", tags: ["Jazz", "Free"] },
  { id: 105, name: "Smukfest", nearestStation: "Skanderborg Station (festival shuttle buses available)", ticketInfo: "Extremely high demand. Full festival passes usually sell out months in advance.", accommodationTip: "Reserve camping or nearby accommodation as early as possible.", budgetLevel: "Very High.", tier: "Worth it for longer stays", travelTime: "2h 45min 🚂", rating: 4.9, ticketStatus: "selling_fast", town: "Skanderborg", type: "Music", emoji: "🌲", date: "2026-08-05", dateEnd: "2026-08-09", photo: "/major5.jpg", desc: "Denmark's Most Beautiful Festival in a beech forest near Skanderborg.", mapHint: "Smukfest, Dyrehaven, 8660 Skanderborg, Denmark", verified: "Jun 2026", color: "#2E7D32", tags: ["Music", "Forest"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "Few festivals anywhere in Europe can match Smukfest's setting. Concerts take place beneath towering beech trees, with illuminated forest paths creating a magical atmosphere after sunset. Food courts, bars and beautifully designed campsites make it feel more like a temporary woodland village than a traditional campsite." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Attracts everyone from groups of friends and couples to seasoned festival-goers in their 20s through 50s — perfect for travellers who love music but also appreciate good food and a relaxed atmosphere." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "This isn't a budget festival — tickets, accommodation, food and drinks add up quickly, and you'll spend plenty of time walking hilly forest terrain. Tickets are notoriously difficult to secure." },
    ] },
  { id: 106, name: "NorthSide Festival", travelTime: "3h 🚂", rating: 4.7, ticketStatus: "available", town: "Aarhus", type: "Music", emoji: "🎪", date: "2026-06-05", dateEnd: "2026-06-07", photo: "/major6.jpg", desc: "Aarhus's biggest music festival with eco-friendly focus.", mapHint: "NorthSide Festival, Eskelundsvej, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#1565C0", tags: ["Music", "Eco"] },
  { id: 107, name: "Aarhus Festuge", nearestStation: "Aarhus Central Station (Aarhus H)", ticketInfo: "Many outdoor events, concerts and art installations are free. Some theatre performances, concerts, dining experiences and special exhibitions require tickets.", accommodationTip: "Stay in central Aarhus if possible. Booking early is highly recommended.", budgetLevel: "Moderate.", tier: "Worth it for longer stays", travelTime: "3h 🚂", rating: 4.6, ticketStatus: "free", town: "Aarhus", type: "Cultural", emoji: "🎨", date: "2026-08-28", dateEnd: "2026-09-06", photo: "/major7.jpg", desc: "One of Scandinavia's largest cultural festivals. 300+ events, most free.", mapHint: "Aarhus Centrum, 8000 Aarhus, Denmark", verified: "Jun 2026", color: "#AD1457", tags: ["Culture", "Free"],
    blogBody: [
      { type: "heading", content: "Art & Atmosphere" },
      { type: "paragraph", content: "Aarhus Festuge isn't a festival you simply attend — it's one you stumble across as you explore the city. One moment you might discover a giant interactive art installation in a public square, the next you'll hear live music echoing through a side street." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "One of Denmark's most accessible festivals — art lovers, foodies, architecture enthusiasts and families will all find reasons to wander the city." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Events are spread across the city, so comfortable walking shoes are essential. Popular performances often sell out in advance, and hotels become noticeably more expensive during the festival." },
    ] },
  { id: 108, name: "Tønder Festival", nearestStation: "T\u00f8nder Station", ticketInfo: "High demand. Four-day passes and popular day tickets often sell out well before the festival.", accommodationTip: "Book accommodation early or stay at the festival campsite.", budgetLevel: "Moderate--High.", tier: "Worth it for longer stays", travelTime: "3h 30min 🚂", rating: 4.8, ticketStatus: "available", town: "Tønder", type: "Music", emoji: "🎻", date: "2026-08-26", dateEnd: "2026-08-30", photo: "/major8.jpg", desc: "Scandinavia's leading folk and roots festival near the German border.", mapHint: "Tønder Festival Pladsen, 6270 Tønder, Denmark", verified: "Jun 2026", color: "#4E342E", tags: ["Folk", "Roots"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "If you enjoy acoustic music, singer-songwriters, bluegrass, folk or Americana, Tønder is unlike any other festival in Denmark. Audiences are known for listening respectfully, often falling completely silent during quieter performances — and once the official concerts finish, spontaneous jam sessions continue around the campsite late into the night." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Attracts a slightly older audience than many Danish festivals, but music lovers of all ages who value musicianship and intimate settings over mainstream headliners will fit right in." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Hotels in Tønder book out surprisingly early — many experienced visitors choose the festival campsite instead." },
    ] },
  { id: 109, name: "Triangle Folklore Festival", nearestStation: "Vejle Station", ticketInfo: "Outdoor performances are free. Indoor Gala Shows require inexpensive tickets.", accommodationTip: "Stay in central Vejle for easy access to the festival and regional train connections.", budgetLevel: "Low.", travelTime: "2h 15min 🚂", rating: 4.5, ticketStatus: "free", town: "Vejle", type: "Cultural", emoji: "🌍", date: "2026-07-26", dateEnd: "2026-08-01", photo: "/major9.jpg", desc: "Denmark's biggest international folklore festival. Groups from 10+ countries perform in the streets of Vejle.", mapHint: "Vejle Centrum, 7100 Vejle, Denmark", verified: "Jul 2026", color: "#1B5E20", tags: ["Folklore", "Dance"],
    blogBody: [
      { type: "heading", content: "Music & Atmosphere" },
      { type: "paragraph", content: "The festival feels more like travelling the world in a single afternoon than attending a traditional festival. Dance groups from Europe, South America and beyond perform throughout the city, while colourful parades and live music fill pedestrian streets with energy." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Ideal for families, photographers, culture lovers and travellers looking for something different from Denmark's many music festivals." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "If you're looking for major concerts, nightlife or internationally famous bands, this probably isn't the right festival — it's best enjoyed at a slower pace while exploring Vejle on foot." },
    ] },
  { id: 110, name: "Odense Flower Festival", nearestStation: "Odense Station", ticketInfo: "Free.", accommodationTip: "Stay in central Odense or visit as an easy day trip from Copenhagen.", budgetLevel: "Low.", tier: "Recommended", travelTime: "1h 30min 🚂", rating: 4.7, ticketStatus: "free", town: "Odense", type: "Cultural", emoji: "🌸", date: "2026-08-13", dateEnd: "2026-08-16", photo: "/major10.jpg", desc: "200,000+ flowers transform the entire city centre of Odense.", mapHint: "Flakhaven, 5000 Odense C, Denmark", verified: "Jul 2026", color: "#E91E8C", tags: ["Flowers", "Free"],
    blogBody: [
      { type: "heading", content: "Flowers & Atmosphere" },
      { type: "paragraph", content: "The festival is less about organised events and more about wandering through a city that has temporarily become a giant open-air garden. Elaborate flower sculptures and artistic installations appear around every corner." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Perfect for photographers, gardeners, couples, families and anyone who enjoys slow travel over loud concerts or busy nightlife." },
      { type: "heading", content: "Should You Visit?" },
      { type: "paragraph", content: "Definitely. One of Denmark's most beautiful free events — visit early morning or later in the evening for the best light and fewer crowds." },
    ] },
  { id: 111, name: "H.C. Andersen Festivals", nearestStation: "Odense Station", ticketInfo: "Most outdoor performances are free. Some theatre productions, concerts and special events require tickets.", accommodationTip: "Stay in central Odense or use the city's light rail to reach the festival from surrounding neighbourhoods.", budgetLevel: "Low--Moderate.", travelTime: "1h 30min 🚂", rating: 4.8, ticketStatus: "free", town: "Odense", type: "Cultural", emoji: "📖", date: "2026-08-13", dateEnd: "2026-08-22", photo: "/major11.jpg", desc: "Denmark's largest cultural festival. 500+ events across 10 days in H.C. Andersen's hometown.", mapHint: "Odense City Centre, 5000 Odense C, Denmark", verified: "Jul 2026", color: "#7B1FA2", tags: ["Culture", "Free"],
    blogBody: [
      { type: "heading", content: "Theatre & Atmosphere" },
      { type: "paragraph", content: "Rather than revolving around one stage, the H.C. Andersen Festivals take over the entire city. Street performers, musicians, storytellers and actors appear throughout Odense, blending fairy tales with modern theatre, concerts, comedy and interactive performances." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Genuinely has something for everyone — families with young children will love the storytelling and interactive theatre, while culture lovers can wander between performances for hours." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Runs the same time as the Odense Flower Festival, making the city centre particularly busy — walking or public transport is much easier than driving." },
    ] },
  { id: 112, name: "Samsø Food Festival (Råvarefestival)", travelTime: "2h 30min 🚢", rating: 4.5, ticketStatus: "free", tier: "Recommended", town: "Samsø", type: "Cultural", emoji: "🥔", date: "2026-06-13", dateEnd: "2026-06-14", photo: "/major12.jpg", desc: "A cosy weekend celebrating everything Samsø grows and makes — the island is famous nationwide for its potatoes. Free entry, with food workshops, tastings, a communal island dinner and even a tug-of-war championship. Guest chefs join local producers each year, including Anne Hjernøe in 2026.", mapHint: "Onsbjerg Mark, Pillemarksvej 1, 8305 Tranebjerg, Samsø, Denmark", verified: "Jul 2026", color: "#2E7D32", tags: ["Food", "Island", "Family"] },
];

const vikingEvents = [
  { id: 201, name: "Trelleborg Vikingefestival", tier: "Recommended", travelTime: "1h 15min 🚂", rating: 4.8, town: "Slagelse", type: "Battle & Market", emoji: "🛡", date: "2026-07-11", dateEnd: "2026-07-19", photo: "/viking1.jpg",
    desc: "Denmark's largest Viking festival — over 1,000 reenactors camp on the exact UNESCO World Heritage ring fortress Harald Bluetooth built in 980. Nine days of trade, craft and everyday Viking life, building to the Battle of Trelleborg: 250 armoured warriors fighting daily at 13:00 from Thursday to Sunday. A free bus (line 909) runs from Slagelse Station all season.",
    mapHint: "Trelleborg Allé 4, 4200 Slagelse, Denmark", verified: "Jul 2026", color: "#8D6E63", tags: ["Battle Reenactment", "UNESCO Site", "Craft"], price: "150 DKK adult / 50 DKK child" },
  { id: 202, name: "Internationalt Vikingemarked", tier: "Recommended", travelTime: "3h 15min 🚂", rating: 4.6, town: "Ribe", type: "Market", emoji: "⚔️", date: "2026-04-27", dateEnd: "2026-05-03", photo: "/viking2.jpg",
    desc: "Traders and reenactors from across Europe fill Ribe VikingeCenter's marketplace — the same spot that made Ribe a trading town 1,300 years ago. Warriors, riders, archers and musicians throughout. Foreign traders take cash only (DKK/EUR); many Danish traders also accept MobilePay — no cards, no ATM on site.",
    mapHint: "Ribe VikingeCenter, Lustrupvej 4, 6760 Ribe, Denmark", verified: "Jul 2026", color: "#C8102E", tags: ["Viking Market", "Craft", "Family"] },
  { id: 203, name: "Moesgaard Viking Moot", nearestStation: "Aarhus Central Station, then Bus 18 to Moesgaard Beach.", ticketInfo: "Paid entry. Tickets are easy to purchase online and rarely sell out.", accommodationTip: "Stay in central Aarhus and use public transport to the festival.", budgetLevel: "Moderate.", tier: "Can't miss out", travelTime: "3h 🚂", rating: 4.6, town: "Aarhus", type: "Market & Combat", emoji: "🛡", date: "2026-07-24", dateEnd: "2026-07-26", photo: "/viking3.jpg",
    desc: "Denmark's most dramatic Viking market — international warriors, mounted horse combat and craft demonstrations at Moesgaard Museum. See the full Viking Days experience details under Booking.",
    mapHint: "Moesgaard Museum, 8270 Højbjerg, Aarhus, Denmark", verified: "Jul 2026", color: "#6A1B9A", tags: ["Viking Market", "Horse Combat"],
    blogBody: [
      { type: "heading", content: "History & Atmosphere" },
      { type: "paragraph", content: "This isn't a theme park — it's living history. Reenactors fully embrace Viking life, wearing historically accurate clothing and demonstrating ancient crafts. Wander through the sprawling market camp, watch blacksmiths at work, experience falconry displays, or witness dramatic combat demonstrations on the beach." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "Appeals to almost everyone — families, history enthusiasts, photographers and anyone fascinated by Nordic history." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Expect plenty of walking across a large outdoor area. Comfortable footwear is essential, and wet weather can make parts of the grounds muddy." },
    ] },
  { id: 204, name: "Als Vikingemarked", travelTime: "3h 30min 🚂", rating: 4.4, town: "Sønderborg", type: "Market", emoji: "🔨", date: "2026-06-13", dateEnd: "2026-06-14", photo: "/viking4.jpg",
    desc: "A working Viking settlement for a weekend — jewellers, leatherworkers, blacksmiths, weavers and bowyers demonstrate their craft live, alongside daily combat displays, archery and activities for kids.",
    mapHint: "Als Vikingemarked, Skydebanevej, Kær Vestermark, 6400 Sønderborg, Denmark", verified: "Jul 2026", color: "#2E7D32", tags: ["Viking Market", "Craft", "Family"] },
  { id: 205, name: "Vikingemarkedet på Lindholm Høje", travelTime: "3h 🚂", rating: 4.5, town: "Nørresundby (Aalborg)", type: "Market", emoji: "⛰", date: "2026-06-27", dateEnd: "2026-06-28", photo: "/viking5.jpg",
    desc: "Set right on Lindholm Høje — one of Scandinavia's largest Viking burial sites — this market brings reenactors and craftspeople to the very ground where Vikings once lived. Genuinely close to Aalborg, easy to combine with a city visit.",
    mapHint: "Vendilavej 11, 9400 Nørresundby, Denmark", verified: "Jul 2026", color: "#1565C0", tags: ["Viking Market", "Craft"] },
  { id: 206, name: "Ravnens Marked", travelTime: "2h 15min 🚂", rating: 4.4, town: "Jelling", type: "Market", emoji: "🐦", date: "2026-06-27", dateEnd: "2026-06-28", photo: "/jelling.jpg",
    desc: "A Viking market at Jelling — the same town where Denmark was named as a nation on the famous rune stones. Combine with a stop at the UNESCO stones themselves; this event sits right on the Copenhagen–Aalborg road trip route.",
    mapHint: "Fårupvej 25, 7300 Jelling, Denmark", verified: "Jul 2026", color: "#6A1B9A", tags: ["Viking Market", "Craft"] },
  { id: 207, name: "Aggersborg Vikingehåndværkertræf", nearestStation: "Aalborg Station, followed by a regional bus or car journey to Aggersborg.", ticketInfo: "The fortress grounds are generally free to visit, with open access throughout the summer.", accommodationTip: "Stay in L\u00f8gst\u00f8r or Aalborg.", budgetLevel: "Very Low.", tier: "Recommended", travelTime: "3h 30min 🚂", rating: 4.3, town: "Løgstør", type: "Craftsmen Gathering", emoji: "🪓", date: "2026-08-22", dateEnd: "2026-08-23", photo: "/viking7.jpg",
    desc: "A craftsmen-only gathering at Aggersborg — one of Denmark's largest Viking ring fortresses. Less market, more workshop: expect to see smiths, carvers and weavers deep in their process rather than just selling finished goods.",
    mapHint: "Thorupvej 13, Aggersund, 9670 Løgstør, Denmark", verified: "Jul 2026", color: "#E65100", tags: ["Viking Market", "Craft"],
    blogBody: [
      { type: "heading", content: "History & Atmosphere" },
      { type: "paragraph", content: "Unlike Denmark's larger Viking festivals, Aggersborg focuses on craftsmanship, archaeology and quiet reflection — blacksmiths, woodworkers and traditional artisans demonstrating historic techniques inside one of Harald Bluetooth's remarkable ring fortresses." },
      { type: "heading", content: "Who Is It For?" },
      { type: "paragraph", content: "A fantastic stop for archaeology enthusiasts, UNESCO collectors and slow travellers who prefer meaningful conversations over crowds." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Don't expect towering ruins or theatrical battle shows — much of Aggersborg survives as grass-covered earthworks. The location is fairly remote; a car is the easiest way to visit." },
    ] },
];

const towns = [
  { id: 1, name: "Ribe", photo: "/ribe.jpg", region: "South Jutland", emoji: "⛪", tag: "Denmark's oldest town", desc: "Founded around 700 AD — the oldest town in Scandinavia. Medieval cathedral, Viking museum and cobblestone streets.", highlight: "Viking Center Ribe — artisans craft authentic Viking jewellery, leather and textiles on site.", travelTime: "3h 15min 🚂", mapHint: "Ribe, 6760 Ribe, Denmark", nomiPotential: "High" },
  { id: 2, name: "Dragør", photo: "/towns/dragor.jpg", region: "Copenhagen Area", emoji: "⚓", tag: "Fisherman's village", desc: "Just 12km from Copenhagen — yellow ochre houses, a working harbour, cobblestone streets. Feels like another era.", highlight: "The harbour fish stalls sell smoked fish caught the same morning. No menus, no TripAdvisor.", travelTime: "30min 🚌", mapHint: "Dragør Havn, 2791 Dragør, Denmark", nomiPotential: "High" },
  { id: 3, name: "Ærøskøbing", photo: "/towns/aeroskobing.jpg", region: "Funen", emoji: "🏡", tag: "Denmark's fairy-tale town", desc: "750-year-old town on the island of Ærø. Half-timbered houses, flower-lined streets. One of Europe's best preserved small towns.", highlight: "The local bottle ship museum — a man spent decades making ships inside bottles.", travelTime: "3h + ferry 🚢", mapHint: "Ærøskøbing, 5970 Ærø, Denmark", nomiPotential: "Very High" },
  { id: 4, name: "Skagen", photo: "/towns/skagen.jpg", region: "North Jutland", emoji: "🌊", tag: "Where two seas meet", desc: "Denmark's northernmost town. Where the North Sea and Baltic Sea collide. Yellow houses, artist culture.", highlight: "The local fish auction starts at 6am on weekdays. Fresh fish sold direct from boats.", travelTime: "4h 🚂", mapHint: "Skagen, 9990 Skagen, Denmark", nomiPotential: "High" },
  { id: 5, name: "Præstø", photo: "/towns/praesto.jpg", region: "Zealand", emoji: "🏘", tag: "Hidden countryside gem", desc: "South of Copenhagen — cobbled streets, old market square. The kind of town that makes you wonder why nobody talks about it.", highlight: "Oremandsgaard Estate sells locally produced goods from their own farm and distillery.", travelTime: "1h 10min 🚂", mapHint: "Præstø Torv, 4720 Præstø, Denmark", nomiPotential: "Very High" },
  { id: 6, name: "Faaborg", photo: "/towns/faaborg.jpg", region: "Funen", emoji: "🌿", tag: "Old-world harbour charm", desc: "Quiet harbour town on the south coast of Funen. 17th century merchant buildings, cobblestone alleys.", highlight: "The local ceramics workshop near the harbour sells pieces made on site. Cash only, no website.", travelTime: "2h 30min 🚂", mapHint: "Faaborg Havn, 5600 Faaborg, Denmark", nomiPotential: "High" },
  { id: 7, name: "Gudhjem", photo: "/towns/gudhjem.jpg", region: "Bornholm", emoji: "🐟", tag: "Baltic island village", desc: "Atmospheric fishing village on Bornholm. Home of the legendary Sol over Gudhjem smoked herring dish.", highlight: "Røgeriet — the old smokehouse. Watch them smoke herring the traditional way.", travelTime: "2h + ferry 🚢", mapHint: "Gudhjem Havn, 3760 Gudhjem, Bornholm", nomiPotential: "Very High" },
  { id: 8, name: "Sønderho", photo: "/fanø.jpg", region: "Fanø Island", emoji: "🌾", tag: "Hidden dune village", desc: "Tucked in the dunes of Fanø island. Thatched houses, winding lanes, seals in the Wadden Sea National Park.", highlight: "The Fanø Kunstmuseer shows local folk art and crafts made on the island for centuries.", travelTime: "3h + ferry 🚢", mapHint: "Sønderho, 6720 Fanø, Denmark", nomiPotential: "Very High" },
  { id: 9, name: "Mariager", photo: "/towns/mariager.jpg", region: "North Jutland", emoji: "🌹", tag: "The City of Roses", desc: "An 18th-century town of cobblestone streets and half-timbered houses, built around a medieval abbey on the Mariager Fjord.", highlight: "Mariager Saltcenter, a working salt museum nearby, lets you taste local salt variations most Danes have never heard of.", travelTime: "3h 30min 🚂", mapHint: "Mariager, 9550 Mariager, Denmark", nomiPotential: "High" },
  { id: 10, name: "Sæby", photo: "/towns/saeby.jpg", region: "North Jutland", emoji: "⚓", tag: "The Artisans' Coastal Haven", desc: "A quiet coastal town with a historic watermill canal path and yellow timber fishermen's houses along the water.", highlight: "Small amber-carving workshops are tucked along the old streets — genuine local craft, no tour buses.", travelTime: "3h 45min 🚂", mapHint: "Sæby, 9300 Sæby, Denmark", nomiPotential: "High" },
  { id: 11, name: "Thorup Strand", photo: "/towns/thorupstrand.jpg", region: "North Jutland", emoji: "🎣", tag: "The Last Living Fishing Hamlet", desc: "One of Denmark's last true coastal fishing communities — blue wooden cutters are still winched straight onto the beach by hand, the way it's been done for generations.", highlight: "Buy fish straight off the boat at the local beach-side cooperative shop, caught that same morning.", travelTime: "4h drive", mapHint: "Thorup Strand, 9690 Fjerritslev, Denmark", nomiPotential: "Very High" },
  { id: 12, name: "Ebeltoft", photo: "/towns/ebeltoft.jpg", region: "East Jutland", emoji: "🚢", tag: "The Crooked-House Village of Mols", desc: "A perfectly preserved 1789 town hall, cobblestone alleys and one of the world's longest wooden warships moored right in the harbour.", highlight: "Step aboard the Fregatten Jylland, a genuine 19th-century wooden frigate you can walk through deck by deck. Great base for hiking Mols Bjerge National Park.", travelTime: "3h 30min 🚂", mapHint: "Ebeltoft, 8400 Ebeltoft, Denmark", nomiPotential: "High" },
  { id: 13, name: "Nyhavn", popularityTag: "Common Attraction", region: "Copenhagen Area", emoji: "⛵", tag: "Copenhagen's most photographed harbour", desc: "The colourful 17th-century harbour district everyone recognises from postcards — wooden ships, waterfront restaurants, and Copenhagen's most Instagrammed street. Genuinely worth seeing, but this is the opposite of hidden — go in, know it, then find the quieter places nearby.", highlight: "Walk 10 minutes north to the quieter Nyboder district — original 17th-century naval rowhouses, still lived in, almost nobody stops there.", travelTime: "In Copenhagen 🚇", mapHint: "Nyhavn, 1051 København, Denmark", nomiPotential: "Common" },
];

const freeEntrance = [
  // ── AARHUS ──
  { id: 1, name: "The Greenhouses, Botanical Garden", popularityTag: "Hidden Gem", city: "Aarhus", type: "Botanical garden", emoji: "🌿", desc: "Giant glass domes housing four climate zones, exotic plants and free-flying butterflies. Entry is completely free.", website: "https://sciencemuseerne.dk/botanisk-have/", color: "#2E7D32",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "The star attraction is the Tropical Dome, where an elevated wooden walkway takes you above the rainforest canopy. The scenery shifts from lush jungle to Mediterranean gardens and arid desert, feeling like several attractions rolled into one." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "The tropical greenhouse is exactly that — tropical. Expect high humidity and warm temperatures, particularly in summer." },
    ] },
  { id: 2, name: "The Viking Museum", popularityTag: "Hidden Gem", city: "Aarhus", type: "Small basement museum", emoji: "⚔️", desc: "A tiny, easily-missed museum literally underground beneath a bank on the town square, built around the genuine remains of ancient Aros. Around 30 DKK for adults, free under 18.", website: "https://www.nordjyskemuseer.dk/", color: "#1565C0",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "Rather than replicas, the museum is built around genuine archaeological remains discovered beneath the modern city — ancient house foundations, runic carvings and everyday artefacts telling the story of how Aarhus grew from a Viking settlement into Denmark's second-largest city." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "This is a compact museum, with most visits lasting 30–45 minutes. If you're expecting reconstructed Viking ships or a large interactive exhibition, this isn't that — it's a quick, worthwhile stop while exploring the city centre. Generally closed Mondays outside summer season." },
    ] },
  { id: 3, name: "Ole's Garden, University Park", popularityTag: "Hidden Gem", city: "Aarhus", type: "Hidden park", emoji: "🌳", desc: "A serene, secret park hidden inside Aarhus University's yellow-brick campus — largely known only to local students.", website: "https://www.au.dk/", color: "#558B2F" },
  // ── AALBORG ──
  { id: 4, name: "Lindholm Høje", popularityTag: "Common Attraction", city: "Aalborg", type: "Ancient burial site (outdoor)", emoji: "⛰", desc: "A breathtaking ancient Viking burial site with nearly 700 graves, free to walk year-round. The paired indoor museum charges a small entry fee.", website: "https://nordjyskemuseer.dk/u/vikingemuseet-lindholm-hoje/", color: "#1565C0",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "Dating back more than 1,000 years, Lindholm Høje is famous for its hundreds of stone circles and ship-shaped grave markers spread across a windswept hillside, with panoramic views over the Limfjord." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Rather than ropes and glass cases, you're free to walk among the ancient graves while sheep quietly graze the surrounding hills. Sunset is especially popular. The indoor museum typically closes mid-December to early January, though the outdoor burial grounds stay accessible year-round." },
    ] },
  { id: 5, name: "The Singing Trees", popularityTag: "Hidden Gem", city: "Aalborg", type: "Musical park installation", emoji: "🎵", desc: "International stars — Elton John, Sting — have planted trees here. Press the button at each tree to hear their music.", website: "https://akkc.dk/de-syngende-traeer/", color: "#D4AF37",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "Every major artist who performs in Aalborg is invited to plant a tree in Kildeparken, creating a living musical timeline of the city's concerts — from Elton John and Sting to Backstreet Boys and many more." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Best experienced as part of a walk through central Aalborg rather than a destination on its own. During winter or maintenance periods, some speakers may not be operating." },
    ] },
  { id: 6, name: "Franciscan Friary Museum", popularityTag: "Hidden Gem", city: "Aalborg", type: "Subterranean ruins", emoji: "💀", desc: "A fully underground museum reached by glass elevator on a busy shopping street — medieval ruins and skeletons below your feet. Small entry fee may apply.", website: "https://nordjyskemuseer.dk/u/graabroedekloster-museet/", color: "#6D4C41",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "Built around the authentic ruins of a 13th-century Franciscan friary, letting visitors walk through excavated foundations hidden for centuries beneath one of Aalborg's busiest shopping streets." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "A small museum — most visits last 20–40 minutes, focused on archaeological remains rather than interactive exhibits." },
    ] },
  { id: 7, name: "Sohngårdsholmpark", popularityTag: "Hidden Gem", city: "Aalborg", type: "Park & fruit orchard", emoji: "🍎", desc: "A sprawling neighbourhood park around a 19th-century manor — with a public apple orchard anyone can pick from.", website: null, color: "#558B2F",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "Unlike Aalborg's smaller city parks, Sohngårdsholm feels spacious and tranquil — walking paths wind through mature woodland, open grassy areas and past the historic manor house." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "A little outside Aalborg's main tourist area, best combined with other nearby stops. Facilities are limited, so bring water or snacks." },
    ] },
  // ── COPENHAGEN ──
  { id: 9, name: "Amalienborg Palace Courtyard", popularityTag: "Common Attraction", city: "Copenhagen", type: "Royal residence (courtyard)", emoji: "👑", photo: "/amalienborg1.jpg",
    desc: "One of Copenhagen's most iconic landmarks — the official residence of the Danish royal family, and the perfect place to experience Danish royal tradition without spending a krone.",
    website: "https://www.kongernessamling.dk/amalienborg/", color: "#D4AF37",
    blogBody: [
      { type: "paragraph", content: "Unlike many royal palaces in Europe, Amalienborg is still an active royal residence. The elegant octagonal courtyard is framed by four identical palace buildings, with the Marble Church creating one of Copenhagen's most recognisable views. Time your visit for 12:00 PM and you'll also witness the famous Changing of the Guard." },
      { type: "image", src: "/amalienborg2.jpg" },
      { type: "heading", content: "What Travelers Love" },
      { type: "paragraph", content: "Visitors consistently mention how much grander the courtyard feels in person than in photos. The guard ceremony is the biggest draw, but many find themselves just as impressed by the peaceful atmosphere outside ceremony hours and the beautiful symmetry of the palace complex. If you're hoping for the best view of the guards, arriving 15–20 minutes early is well worth it." },
      { type: "image", src: "/amalienborg3.jpg" },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Most of the palace buildings are private royal residences, so the courtyard is the main attraction unless you purchase a museum ticket. Around noon, the square becomes one of Copenhagen's busiest tourist spots, so expect crowds during the guard ceremony." },
      { type: "image", src: "/amalienborg4.jpg" },
    ] },
  { id: 10, name: "The Royal Library Garden", popularityTag: "Hidden Gem", city: "Copenhagen", type: "Hidden courtyard garden", emoji: "📚", photo: "/librarygarden1.jpg",
    desc: "Hidden between Christiansborg Palace and the Black Diamond library, this is one of Copenhagen's best-kept secrets — a peaceful escape from the city's busiest streets.",
    website: null, color: "#2E7D32",
    blogBody: [
      { type: "paragraph", content: "Despite being just steps from Parliament and some of Copenhagen's busiest sights, the garden feels surprisingly secluded. A central fountain, colourful flower beds and the statue of philosopher Søren Kierkegaard create a calm, almost hidden atmosphere that's perfect for slowing down." },
      { type: "image", src: "/librarygarden2.jpg" },
      { type: "heading", content: "What Travelers Love" },
      { type: "paragraph", content: "Many visitors stumble across Bibliotekshaven by accident and end up wishing they'd stayed longer. It's often described as one of Copenhagen's quietest green spaces — a favourite place to enjoy a coffee, read a book or simply escape the crowds for a while." },
      { type: "image", src: "/librarygarden3.jpg" },
      { type: "heading", content: "Best Time to Visit" },
      { type: "paragraph", content: "May–September — the gardens are at their most colourful, with blooming flowers and plenty of sunny spots to relax." },
      { type: "image", src: "/librarygarden4.jpg" },
    ] },
  { id: 11, name: "Medical Herb Garden, Kastellet", popularityTag: "Hidden Gem", city: "Copenhagen", type: "Hidden garden", emoji: "🌱", desc: "A tiny, secluded herb patch inside the star-fortress of Kastellet — bypassed by most tourists rushing to the Little Mermaid.", website: "https://www.kastelletsvenner.dk/", color: "#558B2F" },
  { id: 12, name: "Kastellet", popularityTag: "Common Attraction", city: "Copenhagen", type: "Star fortress & waterfront walk", emoji: "🛡", desc: "One of Europe's best-preserved star fortresses — centuries of military history combined with some of Copenhagen's best waterfront walks. Completely free, and a genuinely better use of your time than just photographing the Little Mermaid next door.", website: null, color: "#455A64",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "Kastellet isn't just a historic fortress — it's an active military site that's also one of Copenhagen's most scenic public spaces. Walk the grassy ramparts, admire the bright red barracks, visit the historic windmill and enjoy panoramic views across the moats and harbour." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "The best views are from the elevated ramparts, reached via gravel paths and grassy slopes that can get slippery after heavy rain or ice. Kastellet remains an active military area — stay within the public sections." },
    ] },
  { id: 13, name: "Øens Have", popularityTag: "Hidden Gem", city: "Copenhagen", type: "Urban farm", emoji: "🌾", desc: "Northern Europe's largest urban farm, set on the creative Refshaleøen peninsula — vegetable gardens, chickens and beehives against the backdrop of Copenhagen's former shipyards. Free to explore the farm itself; the farm-to-table restaurant is a paid, premium experience.", website: null, color: "#2E7D32",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "A unique blend of sustainability, food culture and relaxed outdoor living unlike anywhere else in the city. Most people come for the gardens but stay for the atmosphere — the contrast between lush greenery and the industrial surroundings gives Øens Have a character all its own." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "A seasonal attraction, at its best from late spring through early autumn — during winter, many outdoor areas become quieter and some operations scale back. Book ahead if you're planning to dine, especially in summer." },
    ] },
  { id: 14, name: "Medical Herb Garden (Lægeurtehaven)", popularityTag: "Hidden Gem", city: "Aalborg", type: "Monastery herb garden", emoji: "🌿", desc: "Tucked beside Aalborg's historic monastery, a small peaceful green space inspired by the medicinal gardens once maintained by monks.", website: null, color: "#558B2F",
    blogBody: [
      { type: "heading", content: "What Makes It Special" },
      { type: "paragraph", content: "The garden recreates the type of herb garden that would have supplied medieval monks with plants for cooking and traditional remedies — clearly labelled beds of medicinal and culinary herbs." },
      { type: "heading", content: "Things to Know" },
      { type: "paragraph", content: "Relatively small — most people spend 15–30 minutes here. Works best as a short stop alongside nearby attractions rather than a destination on its own." },
    ] },
];

const nightlifeSpots = [
  // ── LOCAL — Danes go here, tourists mostly don't ──
  { id: 1, name: "Toga Vinstue", type: "Local", crowd: "Almost entirely Danish", emoji: "🍺", category: "Brown bar (bodega)", location: "Indre By, Copenhagen", desc: "A classic \"brown bar\" — old wood interior, low light, walls covered in political cartoons. Sits five minutes from the Danish Parliament, and actual lawmakers drink here. Cheap beer (around 45 DKK), smoking still allowed indoors, genuinely local despite the central address.", tip: "Don't expect English menus or tourist-friendly service — this is a real neighbourhood bodega, not a show.", mapHint: "Toga Vinstue, Store Kongensgade, 1264 København K, Denmark", color: "#5D4037" },
  { id: 2, name: "Cirkuskroen", type: "Local", crowd: "Almost entirely Danish", emoji: "🤡", category: "Historic pub, est. mid-1900s", location: "Aarhus", desc: "One of Aarhus's oldest and smallest pubs — walls and ceiling covered in over 500 clown figures, a nod to the circus family that once ran it. A genuine only-in-Aarhus oddity, nominated by locals as one of the city's real hidden places.", tip: "Small and intimate — go early evening on a weekday for the best chance at a seat and an actual conversation with regulars.", mapHint: "Cirkuskroen, Skovvejen 23, 8000 Aarhus, Denmark", color: "#6A1B9A" },
  // ── MAJOR — busy, mixed or mostly international ──
  { id: 3, name: "Strøget (Old Irish & pub strip)", type: "Major", crowd: "Very international", emoji: "🍀", category: "Pub strip", location: "Copenhagen city centre", desc: "Copenhagen's main pedestrian shopping street doubles as a tourist-heavy nightlife strip after dark — Irish pubs like Old Irish anchor it. Fun, easy, English spoken everywhere, but you're mostly meeting other travelers, not Danes.", tip: "Great for an easy first night out — just don't expect to make Danish friends here.", mapHint: "Strøget, 1160 København, Denmark", color: "#2E7D32" },
  { id: 4, name: "Gothersgade", type: "Major", crowd: "Mixed — locals & tourists", emoji: "🍸", category: "Cocktail bars & pub strip", location: "Copenhagen city centre", desc: "Runs from Kongens Nytorv past Rosenborg Castle, packed with cocktail bars, jazz clubs and well-known pubs like The Dubliner and The Globe. Genuinely mixed crowd — busy but not purely a tourist strip.", tip: "Weeknights are noticeably calmer and more local than weekends.", mapHint: "Gothersgade, 1123 København, Denmark", color: "#1565C0" },
  { id: 5, name: "Jomfru Ane Gade", type: "Major", crowd: "Mixed — locals, students & tourists", emoji: "🎉", category: "Denmark's densest bar street", location: "Aalborg", desc: "150 metres, 30+ bars — locals just call it \"Gaden\" (The Street). Fuelled heavily by Aalborg University's 20,000+ students, so it's genuinely local-heavy on weekdays, with tourists joining the mix on weekends. Cheap drinks, loud, unpolished — not classy, but real.", tip: "Head to the far end of the street for the cheaper \"shots bar\" locals actually use — the bars closer to the entrance are pricier.", mapHint: "Jomfru Ane Gade, 9000 Aalborg, Denmark", color: "#C8102E" },
];

const foodSpots = [
  // ── LOCAL — casual, everyday, no-frills ──
  { id: 1, name: "Harry's Place", type: "Local", emoji: "🌭", category: "Hot dog stand", location: "Nørrebro/Nordvest, Copenhagen", price: "40–70 DKK", photo: "/harrysplace1.jpg",
    desc: "A hot dog cart since 1965, run by the same kind of hands-on owners the whole time. Order the \"Børge med krudt\" — the local's move — or the flæskesteg (roast pork) sandwich. Cash or Dankort only. No frills, no seats, just stand and eat like generations before you.",
    tip: "Ask for it \"the traditional way\" and the person behind the counter will usually tell you exactly how to eat it.", mapHint: "Harry's Place, Nordre Fasanvej 269, 2200 København N, Denmark", color: "#D4AF37" },
  { id: 2, name: "Sankt Peders Bageri", type: "Local", emoji: "🥐", category: "Bakery, est. 1652", location: "Latin Quarter, Copenhagen", price: "20–40 DKK",
    desc: "Copenhagen's oldest working bakery — 370+ years on the same cobbled street. Famous for the \"onsdagssnegl\" (Wednesday snail), a cinnamon roll twice the normal size, sold at a discount only on Wednesdays. About 4,000 sell in a single day.",
    tip: "Arrive by 6:30am on a Wednesday if you want the snail without a long queue — they're known to sell out by mid-morning.", mapHint: "Sankt Peders Stræde 29, 1453 København K, Denmark", color: "#E65100" },
  { id: 3, name: "Vesterbro's Originale Burgerrestaurant", type: "Local", emoji: "🍔", category: "Burgers", location: "Vesterbro, Copenhagen", price: "100–180 DKK",
    desc: "A no-nonsense burger joint on Istedgade since 2012, with a relaxed basement bar downstairs. Ten burger options — try \"the almighty\" if you're hungry: a 300g steak patty, fried egg, bacon and cheddar.",
    tip: "It gets loud and casual on weekend evenings — go earlier if you want an actual conversation over dinner.", mapHint: "Istedgade 36, 1650 København, Denmark", color: "#C8102E" },
  // ── MAJOR — bigger, busier, famous ──
  { id: 4, name: "Torvehallerne", type: "Major", emoji: "🏪", category: "Food market", location: "Nørreport, Copenhagen", price: "Varies by stall",
    desc: "Copenhagen's flagship food market — two glass halls of specialty stalls, fresh produce, cheese, seafood, coffee and prepared food. The go-to for a proper Danish food-market experience, and consistently busy.",
    tip: "Come on a weekday morning to actually get a seat — weekends are genuinely packed.", mapHint: "Torvehallerne, Frederiksborggade 21, 1360 København K, Denmark", color: "#2E7D32" },
  { id: 5, name: "Reffen", type: "Major", emoji: "🔥", category: "Street food market", location: "Refshaleøen, Copenhagen", price: "60–150 DKK per stall",
    desc: "Copenhagen's largest street food market, built from shipping containers on the old harbour. Dozens of vendors, waterfront seating, and a genuinely festival-like atmosphere in summer.",
    tip: "Seasonal — usually open spring through autumn. Go by bike or the harbour bus (line 991/992), parking is limited.", mapHint: "Refshalevej 167A, 1432 København, Denmark", color: "#C8102E" },
  { id: 6, name: "Ida Davidsen", type: "Major", emoji: "🐟", category: "Smørrebrød institution", location: "Store Kongensgade, Copenhagen", price: "150–250 DKK per plate",
    desc: "A fifth-generation smørrebrød restaurant, one of the most famous open-sandwich institutions in Denmark. Menu runs to over 100 varieties — expect a proper sit-down lunch, not a quick bite.",
    tip: "Book ahead if visiting at lunch — it's a well-known stop on the Copenhagen food-tour circuit.", mapHint: "Store Kongensgade 70, 1264 København K, Denmark", color: "#1565C0" },
];

const essentials = [
  { id: 1, name: "DOT Tickets App", category: "Transport", emoji: "🎫", desc: "Buy metro, bus and train tickets for the Copenhagen area straight from your phone. Works with any international card — no Danish accounts needed.", howTo: "Download DOT Tickets, pick your zones and pay with any Visa or Mastercard. Show the ticket on your screen.", price: "From 24 DKK per ticket", link: "https://dinoffentligetransport.dk/en", tip: "A City Pass (24h–120h) gives unlimited travel in Copenhagen including the airport metro — usually the best deal for visitors." },
  { id: 7, name: "Avoid the Transit Fine", category: "Transport", emoji: "⚠️", desc: "Denmark's transport fine (kontrolafgift) is real and common among tourists — issued on the spot for an invalid ticket, even by accident. It's 750 DKK on the Metro and light rail, and 1,000 DKK on DSB trains and Movia buses. The physical Rejsekort card was discontinued on 28 May 2026 — a new \"Basiskort\" now exists for physical-card users, but a digital ticket is far simpler for a short visit.", howTo: "The 3 mistakes that catch tourists most: (1) Installing a ticket app isn't the same as buying a ticket — you must actually purchase and activate it before boarding. (2) If using a check-in/check-out app, forgetting to check OUT at the end is the single most common tourist fine. (3) A dead phone battery mid-journey means no valid ticket — inspectors don't make exceptions.", price: "750–1,000 DKK if fined", link: "https://dinoffentligetransport.dk/en", tip: "Simplest fix for visitors: buy a fixed ticket in the DOT app or Rejsebillet before you travel, rather than a check-in/check-out card — nothing to forget to end." },
  { id: 2, name: "Rent a Bike", category: "Transport", emoji: "🚲", desc: "Copenhagen has 390km of cycle lanes. Renting a bike is the best way to see the city.", howTo: "Bycyklen electric bikes available across Copenhagen via app. Or rent from shops from 100 DKK/day.", price: "From 100 DKK/day", link: "https://apps.apple.com/dk/app/bycyklen/id985075832", linkAndroid: "https://play.google.com/store/apps/details?id=dk.bycyklen.app", tip: "Cycle on the right, signal with your arm, always lock up." },
  { id: 3, name: "Cards & Mobile Pay­ment", category: "Payments", emoji: "💳", desc: "Denmark is one of the world's most cashless countries. Visa and Mastercard — physical or through Apple Pay / Google Pay — work almost everywhere, from cafés to market stalls.", howTo: "Just tap. Contactless is the standard everywhere. Tell your bank you're traveling so nothing gets blocked.", price: "Free", link: null, tip: "A few tiny stalls only take MobilePay (a locals-only Danish app) or cash — carry 100–200 DKK in cash as backup." },
  { id: 12, name: "Tax-Free Shopping (Non-EU Visitors)", category: "Payments", emoji: "🧾", desc: "If you live outside the EU, you can claim back a large part of Denmark's 25% VAT (moms) on things you buy and take home — one of the most overlooked travel savings. It applies in participating shops when you spend at least 300 DKK in the same store, and after operator fees the refund typically works out to roughly 12–19% of the price. The goods must leave the EU unused, normally within 3 months of purchase.", howTo: "(1) In the shop: ask for a tax-free form before paying (Global Blue and Planet are the two big operators) and have your passport ready. (2) At your final departure point from the EU — for most visitors Copenhagen Airport — get the form validated at customs before checking in the goods; many refunds can now be validated at self-service kiosks. (3) Collect your refund at the operator's counter, or have it sent to your card. Leave extra time at the airport — the customs step can queue in summer.", price: "Refund ≈ 12–19% back", link: "https://skat.dk", tip: "The refund follows where you live, not your passport line at the airport — EU residents can't claim it, and special rules apply for residents of Norway, so ask in the shop. Keep receipts and the goods accessible, not buried in checked luggage, in case customs wants to see them." },
  { id: 4, name: "DSB App", category: "Transport", emoji: "🚂", desc: "Danish national railway app. Book tickets, check schedules, get real-time delays.", howTo: "Download DSB app. Buy tickets in advance for cheaper prices.", price: "Free app", link: "https://apps.apple.com/dk/app/dsb/id531645423", linkAndroid: "https://play.google.com/store/apps/details?id=dk.dsb.rejseplanen", tip: "Buy Orange tickets weeks ahead for up to 50% off." },
  { id: 5, name: "Copenhagen Card", category: "Sightseeing", emoji: "🎟", desc: "Free entry to 80+ attractions + unlimited transport across zones 1-99. Worth it for 2+ days.", howTo: "Buy at copenhagencard.com or airport. 24h, 48h, 72h or 120h options.", price: "From 589 DKK", link: "https://www.copenhagencard.com", tip: "Tivoli alone is 190 DKK — card pays for itself with 3+ attractions." },
  { id: 11, name: "Power Adapters & Plugs", category: "Connectivity", emoji: "🔌", desc: "Denmark uses the Type K socket — a Danish design that looks like a smiley face, but takes a standard European two-pin (Type C) plug without any issue.", howTo: "Bring a standard European Type C adapter if you're coming from outside Europe — it fits almost every outlet in the country. Phones, laptops and cameras handle Denmark's 230V automatically with just a plug adapter.", price: "Adapter from ~50 DKK", link: null, tip: "American hair dryers and curling irons are the exception — don't run them through a cheap plastic adapter alone. Denmark's 230V is much stronger than the US's 120V and will burn out a device built only for the lower voltage." },
  { id: 6, name: "eSIM or Local SIM", category: "Connectivity", emoji: "📶", desc: "EU roaming covers most Europeans. Outside EU — get a local SIM or eSIM for maps, tickets and translations on the go.", howTo: "Buy at 7-Eleven, Netto or any phone shop. Lebara and Lycamobile work well.", price: "From 49 DKK", link: null, tip: "Make sure your phone is unlocked before traveling." },
  { id: 8, name: "Skyscanner", category: "Flights & Buses", emoji: "✈️", desc: "A free flight comparison search engine — checks dozens of airlines and booking sites at once to find the cheapest route into Denmark. Doesn't sell tickets itself; it sends you to the airline or agent with the best price.", howTo: "Search your dates on skyscanner.com, or use their \"Whole Month\" or \"Cheapest Month\" view if your travel dates are flexible — often saves the most.", price: "Free to use", link: "https://www.skyscanner.net", tip: "Copenhagen Airport (CPH) is Denmark's main hub, but Billund (BLL) in Jutland is sometimes cheaper and puts you closer to Legoland and central Jutland." },
  { id: 9, name: "FlixBus", category: "Flights & Buses", emoji: "🚌", desc: "A budget long-distance bus network with 7 routes across Denmark, plus international connections to Hamburg, Oslo and Stockholm. Often the cheapest way in if you're already elsewhere in Europe — a Odense–Copenhagen ticket can run under 100 DKK if booked early.", howTo: "Book on flixbus.com or the FlixBus app. Show your e-ticket on your phone — no printing needed.", price: "From ~100 DKK domestic", link: "https://www.flixbus.com/bus/denmark", tip: "Book as early as possible — FlixBus prices rise the closer you get to departure, sometimes tripling." },
  { id: 10, name: "Kombardo Expressen", category: "Flights & Buses", emoji: "🚍", desc: "A Denmark-based budget bus line running direct routes Copenhagen–Aarhus, Copenhagen–Aalborg, and Copenhagen–Rønne (Bornholm) as a single through-ticket — genuinely convenient if you'd rather not book bus and ferry separately.", howTo: "Book on kombardoexpressen.dk. Modern buses, comfortable for the longer Jutland routes.", price: "Varies by route", link: "https://www.kombardoexpressen.dk", tip: "The Rønne route bundles the ferry crossing into one ticket — check the exact itinerary when booking." },
];

const handmadeCraftShops = [
  { id: 1, name: "Blåvand Bolcher", location: "Blåvand, West Jutland", emoji: "🍭", tag: "Denmark's oldest candy recipes — since 1864", price: "Free to watch · make-your-own lollipop typically small fee",
    desc: "Denmark's oldest candy recipes, running since 1864, in a spacious kitchen right on the West Coast. This is the one that matters most for off-season travel: it runs every single weekday, all year round — no summer-only window, no booking. Walk in, watch the candy being made, and make your own lollipop.",
    highlight: "Runs year-round, every weekday — genuinely useful for autumn and winter travelers when most craft experiences in this app are closed for the season.",
    mapHint: "Blåvandvej 17, 6857 Blåvand, Denmark", color: "#00838F", yearRound: true },
  { id: 2, name: "Sømods Bolcher", location: "Copenhagen", emoji: "🍬", tag: "Royal Court Purveyor since 1891",
    price: "Free to watch · candy from 45 DKK",
    desc: "Royal Court candy makers since 1891 — a living-museum atmosphere on Nørregade. Free summer-only hands-on workshops run late June to early August; outside that window, you can still watch hard candy pulled by hand daily.",
    highlight: "Watch a production run at 10:15, 12:00, 13:30 or 15:00 on weekdays — arrive a few minutes early, the shop fills fast right when the pulling starts.",
    mapHint: "Sømods Bolcher, Nørregade 24, 1165 Copenhagen, Denmark", color: "#D4AF37", yearRound: false },
  { id: 3, name: "Almuegaarden", location: "Tivoli Gardens, Copenhagen · also Gudhjem, Bornholm", emoji: "🎪", tag: "Motif candy over an open fire",
    price: "Free to watch · candy for sale, no booking for hands-on",
    desc: "Denmark's most famous motif-candy maker, working from a shop built into Tivoli's \"cheerful corner\" — watch intricate designs get boiled into hard candy live during Tivoli's opening season. Their Gudhjem branch on Bornholm runs genuine hands-on workshops with no booking required, any day the shop is open.",
    highlight: "The Bornholm branch explicitly requires no booking — walk in any time during opening hours and make your own candy.",
    mapHint: "Almuegaarden, Tivoli Gardens, Vesterbrogade 3, 1630 Copenhagen, Denmark", color: "#C8102E", yearRound: false },
];

const roadTrips = [
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

const seasonalItineraries = [
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


const getSeason = () => {
  const m = new Date().getMonth(); // 0=Jan
  if ([11, 0, 1].includes(m)) return "winter";
  if ([2, 3, 4].includes(m)) return "spring";
  if ([5, 6, 7].includes(m)) return "summer";
  return "autumn";
};

const getEventDate = (dateStr, dateEnd) => {
  const d = new Date(dateStr);
  const opts = { day: "numeric", month: "short" };
  if (dateEnd) return d.toLocaleDateString("en-GB", opts) + " – " + new Date(dateEnd).toLocaleDateString("en-GB", opts);
  return d.toLocaleDateString("en-GB", { ...opts, weekday: "short" });
};

const isUpcoming = (d) => new Date(d) >= new Date();

const isCurrentlyLive = (start, end) => {
  const now = new Date();
  const s = new Date(start);
  const e = end ? new Date(end) : s;
  return s <= now && now <= e;
};


const weatherIcon = (code) => {
  if (!code) return "🌤";
  if (code.includes("rain") || code.includes("sleet")) return "🌧";
  if (code.includes("snow")) return "❄️";
  if (code.includes("thunder")) return "⛈";
  if (code.includes("cloudy") || code.includes("fog")) return "☁️";
  if (code.includes("clearsky") || code.includes("fair")) return "☀️";
  return "⛅";
};


const TOWN_COORDS = {
  "Copenhagen": [55.676, 12.568], "Aarhus": [56.157, 10.210], "Aalborg": [57.048, 9.919],
  "Nørresundby (Aalborg)": [57.059, 9.922], "Odense": [55.396, 10.389], "Roskilde": [55.642, 12.088],
  "Gilleleje": [56.126, 12.310], "Tisvildeleje": [56.043, 12.078], "Liseleje": [56.076, 11.964],
  "Hundested": [55.964, 11.851], "Frederiksværk": [55.971, 12.022], "Kerteminde": [55.449, 10.658],
  "Maribo": [54.777, 11.500], "Præstø": [55.123, 12.045], "Jelling": [55.756, 9.420],
  "Skanderborg": [56.036, 9.926], "Vejle": [55.709, 9.536], "Tønder": [54.933, 8.864],
  "Slagelse": [55.403, 11.354], "Samsø": [55.836, 10.604], "Løgstør": [56.964, 9.256],
  "Sønderborg": [54.909, 9.792], "Ribe": [55.328, 8.765], "Dragør": [55.593, 12.669],
  "Ærøskøbing": [54.888, 10.411], "Skagen": [57.720, 10.590], "Faaborg": [55.095, 10.243],
  "Gudhjem": [55.214, 14.972], "Sønderho": [55.337, 8.474], "Mariager": [56.649, 9.977],
  "Sæby": [57.331, 10.519], "Thorup Strand": [57.143, 9.106], "Ebeltoft": [56.195, 10.679],
  "Nyhavn": [55.680, 12.590],
};

const DK_SHAPES = [
  [[54.90,8.65],[55.10,8.60],[55.35,8.45],[55.56,8.08],[55.90,8.12],[56.30,8.10],[56.70,8.21],[57.00,8.40],[57.12,8.62],[57.45,9.60],[57.60,10.10],[57.73,10.60],[57.44,10.54],[57.33,10.52],[56.90,10.30],[56.70,10.35],[56.50,10.85],[56.42,10.95],[56.25,10.80],[56.15,10.25],[55.85,10.05],[55.70,9.75],[55.55,9.72],[55.30,9.70],[55.05,9.90],[54.91,9.79],[54.85,9.40]],
  [[55.50,9.80],[55.60,10.10],[55.62,10.32],[55.50,10.62],[55.30,10.80],[55.05,10.68],[55.02,10.25],[55.18,9.90]],
  [[55.97,11.28],[56.05,11.65],[56.10,12.05],[56.13,12.31],[55.95,12.55],[55.68,12.65],[55.45,12.50],[55.28,12.45],[55.15,12.20],[54.96,11.85],[55.10,11.35],[55.20,11.08],[55.45,11.05],[55.70,11.10]],
  [[54.83,11.05],[54.95,11.50],[54.90,11.90],[54.70,12.00],[54.56,11.93],[54.65,11.35]],
  [[55.30,14.68],[55.30,15.15],[55.06,15.19],[54.99,14.90],[55.15,14.68]],
];

const dkProject = (lat, lon) => [(lon - 8.0) * 62.06, (57.85 - lat) * 111.32];

const DK_PATHS = DK_SHAPES.map(shape => shape.map(([la, lo]) => dkProject(la, lo).map(n => n.toFixed(1)).join(",")).join(" "));


const WEATHER_CITIES = [
  { key: "copenhagen", label: "Copenhagen", lat: 55.6761, lon: 12.5683 },
  { key: "aarhus", label: "Aarhus", lat: 56.1629, lon: 10.2039 },
  { key: "aalborg", label: "Aalborg", lat: 57.0488, lon: 9.9217 },
  { key: "odense", label: "Odense", lat: 55.4038, lon: 10.4024 },
];



const isInDenmark = (coords) => coords && typeof coords === "object" &&
  coords.lat >= 54.4 && coords.lat <= 57.9 && coords.lon >= 7.9 && coords.lon <= 15.3;

// Straight-line km distance from the user to a named town, falling back to the
// existing "from Copenhagen" travel-time string whenever it can't be resolved.
const travelLabel = (userCoords, townName, fallbackTravelTime) => {
  if (isInDenmark(userCoords) && townName && TOWN_COORDS[townName]) {
    const [tLat, tLon] = TOWN_COORDS[townName];
    const dLat = (tLat - userCoords.lat) * 111.32;
    const dLon = (tLon - userCoords.lon) * 62.06;
    const km = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
    return km < 2 ? "~2 km from you" : `~${km} km from you`;
  }
  return `${fallbackTravelTime} from CPH`;
};

const stripMarkdown = (text) => {
  if (!text) return text;
  return text
    .replace(/^#{1,6}\s+/gm, "")       // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")    // bold
    .replace(/\*(.+?)\*/g, "$1")        // italics
    .replace(/^[-•]\s+/gm, "")          // bullet dashes
    .replace(/^\d+\.\s+/gm, "");        // numbered lists
};

const DetailPage = ({ item, onClose, kind, liveInfo, liveInfoLoading, checkLiveInfo, userCoords }) => {
  if (!item) return null;
  const color = item.color || C.accent;
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 290, overflowY: "auto" }}>
      <div style={{ height: 190, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <span style={{ fontSize: 64, opacity: item.photo ? 0.25 : 1, position: item.photo ? "absolute" : "static" }}>{item.emoji}</span>
        {item.photo && (
          <img src={item.photo} alt={item.name} onError={e => { e.target.style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
        )}
        <button onClick={onClose}
          style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", left: 14, background: "rgba(10,15,30,0.7)", border: "none", color: "#fff", borderRadius: 100, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          ‹ Back
        </button>
        {item.type && <div style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", right: 14, background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "5px 11px", borderRadius: 100, textTransform: "uppercase" }}>{item.type}</div>}
      </div>
      <div style={{ padding: "20px 20px 40px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          {kind === "event" ? `${item.town}` : kind === "nightlife" ? item.location : kind === "free" ? item.city : kind === "food" ? item.location : item.region}
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.1, marginBottom: 8 }}>{item.name}</div>

        {kind === "nightlife" && item.crowd && (
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "5px 12px", borderRadius: 100, marginBottom: 18 }}>
            👥 {item.crowd}
          </div>
        )}
        {kind === "free" && item.popularityTag && (
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: item.popularityTag === "Hidden Gem" ? C.gold : C.muted, background: item.popularityTag === "Hidden Gem" ? `${C.gold}22` : C.surface, border: `1px solid ${item.popularityTag === "Hidden Gem" ? C.gold : C.border}`, padding: "5px 12px", borderRadius: 100, marginBottom: 18 }}>
            {item.popularityTag === "Hidden Gem" ? "◆ Hidden Gem" : "○ Common Attraction"} · FREE
          </div>
        )}
        {kind === "food" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "5px 12px", borderRadius: 100 }}>{item.category}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: `${C.gold}18`, padding: "5px 12px", borderRadius: 100 }}>{item.price}</span>
          </div>
        )}

        {kind === "event" && (
          <div style={{ marginBottom: 12 }}>
            {item.tier && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 100, marginRight: 8, display: "inline-block", marginBottom: 8,
                color: item.tier === "Can't miss out" ? "#0A0F1E" : item.tier === "Worth it for longer stays" ? "#FFB347" : "#4CAF50",
                background: item.tier === "Can't miss out" ? C.gold : item.tier === "Worth it for longer stays" ? "#FFB34722" : "#4CAF5022",
              }}>
                {item.tier === "Can't miss out" ? "⭐ Can't miss out" : item.tier === "Worth it for longer stays" ? "◷ Worth it for longer stays" : "👍 Recommended"}
              </span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{getEventDate(item.date, item.dateEnd)}</span>
              <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>★ {item.rating}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{travelLabel(userCoords, item.town, item.travelTime)}</span>
            </div>
          </div>
        )}
        {kind === "event" && (item.nearestStation || item.ticketInfo || item.accommodationTip || item.budgetLevel) && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>📍 At a Glance</div>
            {item.nearestStation && (
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <span style={{ flexShrink: 0, width: 20 }}>🚆</span>
                <div><span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Nearest Station: </span><span style={{ fontSize: 12, color: C.light }}>{item.nearestStation}</span></div>
              </div>
            )}
            {item.ticketInfo && (
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <span style={{ flexShrink: 0, width: 20 }}>🎟️</span>
                <div><span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Tickets: </span><span style={{ fontSize: 12, color: C.light }}>{item.ticketInfo}</span></div>
              </div>
            )}
            {item.accommodationTip && (
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <span style={{ flexShrink: 0, width: 20 }}>🏡</span>
                <div><span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Accommodation: </span><span style={{ fontSize: 12, color: C.light }}>{item.accommodationTip}</span></div>
              </div>
            )}
            {item.budgetLevel && (
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ flexShrink: 0, width: 20 }}>💰</span>
                <div><span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Budget: </span><span style={{ fontSize: 12, color: C.light }}>{item.budgetLevel}</span></div>
              </div>
            )}
          </div>
        )}
        {kind === "town" && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>{travelLabel(userCoords, item.name, item.travelTime)}</div>
        )}

        <div style={{ fontSize: 14, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>{item.desc}</div>

        {item.blogBody && item.blogBody.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {item.blogBody.map((block, i) => (
              block.type === "image" ? (
                <div key={i} style={{ marginBottom: 16 }}>
                  <img src={block.src} alt={block.caption || item.name} onError={e => { e.target.style.display = "none"; }}
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

        {kind === "town" && item.highlight && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>◆ Gemlyx Find</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>{item.highlight}</div>
          </div>
        )}
        {kind === "event" && item.tags && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 26 }}>
            {item.tags.map(t => <span key={t} style={{ fontSize: 12, color: C.text, background: C.surface, border: `1px solid ${C.border}`, padding: "7px 13px", borderRadius: 100 }}>{t}</span>)}
          </div>
        )}
        {(kind === "nightlife" || kind === "food") && item.tip && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 22, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            💡 {item.tip}
          </div>
        )}

        <button onClick={() => checkLiveInfo(item)} disabled={liveInfoLoading === item.name}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: liveInfo?.[item.name] ? 12 : 14 }}>
          {liveInfoLoading === item.name ? "Checking..." : "🔍 Check live info"}
        </button>
        {liveInfo?.[item.name] && (
          <div style={{ background: `${color}18`, border: `1px solid ${color}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            {liveInfo[item.name]}
          </div>
        )}

        {kind === "free" && item.website && (
          <a href={item.website} target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 10 }}>
            🌐 Visit website
          </a>
        )}

        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.mapHint || `${item.name} ${item.city || item.location || ""} Denmark`)}`} target="_blank" rel="noreferrer"
          style={{ display: "block", textAlign: "center", background: color, color: "#fff", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          ↗ Get Directions
        </a>
      </div>
    </div>
  );
};



const WeatherStrip = ({ label, weatherKey, lat, lon, weather, weatherLoading, checkWeather }) => {
  const data = weather[weatherKey];
  useEffect(() => {
    if (!data && weatherLoading !== weatherKey) checkWeather(weatherKey, lat, lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherKey]);

  return (
    <div style={{ background: C.surface, borderRadius: 16, padding: "16px", border: `1px solid ${C.border}`, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{label}</div>
        {weatherLoading === weatherKey && <span style={{ fontSize: 11, color: C.muted }}>Loading...</span>}
      </div>

      {data && !data.error ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 40 }}>{weatherIcon(data.condition)}</span>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>{Math.round(data.temperature_c)}°C</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Wind {data.wind_speed_ms} m/s · Humidity {data.humidity_percent}%</div>
            </div>
          </div>

          {data.warnings?.length > 0 && data.warnings.map((w, i) => (
            <div key={i} style={{ background: "#3D2A0A", border: "1px solid #FFB347", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#FFB347", lineHeight: 1.5 }}>
              ◷ {w.type}: {w.detaljer}
            </div>
          ))}

          {data.forecast?.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {data.forecast.map((day, i) => {
                const d = new Date(day.date);
                const label = i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" });
                return (
                  <div key={day.date} style={{ flexShrink: 0, background: C.bg, borderRadius: 10, padding: "8px 10px", textAlign: "center", minWidth: 56 }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{weatherIcon(day.condition)}</div>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{Math.round(day.temperature_c)}°</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : data?.error ? (
        <div style={{ fontSize: 12, color: C.muted }}>Couldn't fetch weather — check /api/weather.js is deployed with a working User-Agent.</div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted }}>Loading forecast...</div>
      )}
    </div>
  );
};



const DKLocator = ({ town, color }) => {
  const coords = TOWN_COORDS[town];
  const dot = coords ? dkProject(coords[0], coords[1]) : null;
  return (
    <svg viewBox="-12 -12 477 397" style={{ width: "100%", height: "100%", display: "block", background: "#0D1526" }} aria-label={town ? `Location of ${town} in Denmark` : "Map of Denmark"}>
      {DK_PATHS.map((p, i) => <polygon key={i} points={p} fill="#1A2438" stroke="#2A3A55" strokeWidth="3" />)}
      {dot && (
        <>
          <circle cx={dot[0]} cy={dot[1]} r="26" fill={`${color || C.gold}33`} />
          <circle cx={dot[0]} cy={dot[1]} r="11" fill={color || C.gold} stroke="#0D1526" strokeWidth="3" />
        </>
      )}
    </svg>
  );
};



const LeafletMap = ({ center, zoom, overlayLabel }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  useEffect(() => {
    if (!holderRef.current || mapRef.current) return;
    const map = L.map(holderRef.current, { zoomControl: false }).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "gemlyx-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={holderRef} style={{ width: "100%", height: "100%" }} />
      {overlayLabel && (
        <div style={{ position: "absolute", top: 8, left: 8, right: 8, zIndex: 500, background: "rgba(10,15,30,0.88)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.text, fontWeight: 600, pointerEvents: "none" }}>
          📍 {overlayLabel}
        </div>
      )}
    </div>
  );
};



const PageHero = ({ src, emoji, color }) => (
  <div style={{ height: 130, borderRadius: 14, overflow: "hidden", marginBottom: 18, position: "relative", background: `linear-gradient(135deg, ${color}33 0%, #0A0F1E 100%)` }}>
    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, opacity: 0.22 }}>{emoji}</span>
    <img src={src} alt="" onError={e => { e.target.style.display = "none"; }}
      style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
  </div>
);



const LiveEventsHeaderStrip = ({ liveInfo, liveInfoLoading, checkLiveInfo, nearYou, requestLocation, setEventDetail, setFreeDetail, setFoodDetail }) => {
  const [openEvent, setOpenEvent] = useState(null);
  const allTracked = [...events, ...majorEvents, ...vikingEvents];
  const currentlyLive = allTracked.filter(e => isCurrentlyLive(e.date, e.dateEnd));
  const comingSoon = allTracked.filter(e => isUpcoming(e.date) && !isCurrentlyLive(e.date, e.dateEnd)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const showList = currentlyLive.length > 0 ? currentlyLive : comingSoon.slice(0, 6);
  const isLive = currentlyLive.length > 0;

  return (
    <div style={{ marginTop: 4, marginBottom: 2 }}>
      {showList.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLive ? "#4CAF50" : C.gold, flexShrink: 0, boxShadow: isLive ? "0 0 6px #4CAF50" : "none" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isLive ? "#4CAF50" : C.gold, textTransform: "uppercase", letterSpacing: 0.5 }}>{isLive ? "Live Events" : "Coming Events"}</span>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 8 }}>
            {showList.map(e => (
              <button key={e.name} onClick={() => setOpenEvent(e)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span style={{ fontSize: 13 }}>{e.emoji}</span>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{e.name}</span>
                <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{getEventDate(e.date, e.dateEnd)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!nearYou && (
        <button onClick={requestLocation} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span style={{ fontSize: 12, color: C.light, fontWeight: 600 }}>📍 What's closest to me?</span>
        </button>
      )}
      {nearYou === "loading" && <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>Finding your location...</div>}
      {nearYou === "denied" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Couldn't get your location.</span>
          <button onClick={requestLocation} style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Try again</button>
        </div>
      )}
      {nearYou && typeof nearYou === "object" && (
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 6 }}>📍 Events near you{nearYou.matches.length > 0 ? ` — ${nearYou.matches.length} upcoming within ~30 km` : ""}</div>
          {nearYou.matches.length === 0 && (
            <div style={{ fontSize: 11, color: C.muted }}>No upcoming events near {nearYou.town} right now — browse all under Events.</div>
          )}
          {nearYou.matches.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {nearYou.matches.map(item => (
                <button key={`${item._kind}-${item.name}`}
                  onClick={() => { item._kind === "event" ? setEventDetail(item) : item._kind === "free" ? setFreeDetail(item) : setFoodDetail(item); }}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <span style={{ fontSize: 13 }}>{item.emoji}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{item.name}</span>
                  <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{item._kind === "event" ? getEventDate(item.date, item.dateEnd) : `~${Math.round(item._km)} km`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {openEvent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(5,8,16,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "70px 16px" }} onClick={() => setOpenEvent(null)}>
          <div style={{ width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif" }}>{openEvent.emoji} {openEvent.name}</div>
              <button onClick={() => checkLiveInfo(openEvent)} disabled={liveInfoLoading === openEvent.name}
                style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 100, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>
                {liveInfoLoading === openEvent.name ? "Checking..." : "🔍 Check"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginBottom: liveInfo?.[openEvent.name] ? 12 : 4 }}>{getEventDate(openEvent.date, openEvent.dateEnd)}</div>
            {liveInfo?.[openEvent.name] && <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 14 }}>{liveInfo[openEvent.name]}</div>}
            <button onClick={() => setOpenEvent(null)} style={{ display: "block", width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};



const WeatherHeaderStrip = ({ weather, weatherLoading, checkWeather }) => {
  const [openCity, setOpenCity] = useState(null);
  useEffect(() => {
    WEATHER_CITIES.forEach(c => { if (!weather[c.key] && weatherLoading !== c.key) checkWeather(c.key, c.lat, c.lon); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCityData = WEATHER_CITIES.find(c => c.key === openCity);

  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "10px 0", marginTop: 4 }}>
      {WEATHER_CITIES.map(c => {
        const d = weather[c.key];
        return (
          <button key={c.key} onClick={() => setOpenCity(c.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span style={{ fontSize: 15 }}>{d && !d.error ? weatherIcon(d.condition) : "⏳"}</span>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{c.label}</span>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{d && !d.error ? `${Math.round(d.temperature_c)}°` : "--"}</span>
          </button>
        );
      })}

      {openCityData && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(5,8,16,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "70px 16px" }} onClick={() => setOpenCity(null)}>
          <div style={{ width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <WeatherStrip label={`🌤 ${openCityData.label}`} weatherKey={openCityData.key} lat={openCityData.lat} lon={openCityData.lon} weather={weather} weatherLoading={weatherLoading} checkWeather={checkWeather} />
            <button onClick={() => setOpenCity(null)} style={{ display: "block", width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


const StoreBadge = ({ type, href }) => (
  <a href={href} target="_blank" rel="noreferrer"
    style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#000", border: "1px solid #3a3a3a", borderRadius: 8, padding: "7px 13px", textDecoration: "none" }}>
    {type === "ios" ? (
      <svg width="19" height="22" viewBox="0 0 24 28" fill="#fff"><path d="M19.6 14.7c0-3.2 2.6-4.7 2.7-4.8-1.5-2.2-3.8-2.5-4.6-2.5-2-.2-3.8 1.2-4.8 1.2-1 0-2.5-1.1-4.2-1.1-2.1 0-4.1 1.2-5.2 3.2-2.2 3.8-.6 9.5 1.6 12.6 1.1 1.5 2.3 3.2 4 3.2 1.6-.1 2.2-1 4.1-1 1.9 0 2.5 1 4.2 1 1.7 0 2.8-1.6 3.8-3.1 1.2-1.8 1.7-3.5 1.7-3.6-.1 0-3.3-1.3-3.3-5.1zM16.4 4.9c.9-1.1 1.5-2.5 1.3-4-1.3.1-2.8.9-3.7 1.9-.8 1-1.5 2.5-1.3 3.9 1.4.1 2.8-.7 3.7-1.8z"/></svg>
    ) : (
      <svg width="18" height="20" viewBox="0 0 24 26"><path fill="#00D7FE" d="M1.3.6C1 1 .8 1.5.8 2.2v21.6c0 .7.2 1.2.5 1.6l.1.1L14.6 12.3v-.3L1.4.5l-.1.1z"/><path fill="#FFCE00" d="M19 16.8l-4.4-4.5v-.3L19 7.5l.1.1 5.2 3c1.5.8 1.5 2.2 0 3.1l-5.2 3-.1.1z"/><path fill="#FF3A44" d="M19.1 16.7L14.6 12 1.3 25.4c.5.5 1.3.6 2.2.1l15.6-8.8"/><path fill="#00F076" d="M19.1 7.4L3.5.6C2.6.1 1.8.2 1.3.7L14.6 12l4.5-4.6z"/></svg>
    )}
    <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
      <span style={{ fontSize: 8, color: "#ccc", letterSpacing: 0.4 }}>{type === "ios" ? "Download on the" : "GET IT ON"}</span>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{type === "ios" ? "App Store" : "Google Play"}</span>
    </span>
  </a>
);


import L from "leaflet";
import "leaflet/dist/leaflet.css";

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





const APP_VERSION = "v2.87 — AI plans become saveable guides with real data + mini-maps";

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

  // ── Founder studio (visible only at /#studio): Tavily+OpenAI drafts complete
  // entries — card + long-form blogBody — for any content type, following the
  // Gemlyx editorial documents. Output is paste-ready code the founder verifies
  // before committing, keeping "never invented content" true.
  const isStudio = typeof window !== "undefined" && window.location.hash === "#studio";
  const [studioTown, setStudioTown] = useState("");
  const [studioType, setStudioType] = useState("town");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioResult, setStudioResult] = useState(null);
  const [studioError, setStudioError] = useState(null);

  const STUDIO_VOICE = 'Voice rules from Gemlyx editorial docs: concrete facts over adjectives — dates, prices, distances, names, materials. Generic words like "charming", "picturesque", "rich history", "beautiful", "known for" are BANNED unless immediately followed by the specific thing that makes them true. Address the reader as "you". Warm but honest: every "Things to Know" section must include at least one real downside. NEVER invent facts, prices, dates, ratings or websites — write "See website" or "Check locally" when the search context does not clearly support a claim. Each section 2-4 full sentences.';

  const slugify = (s) => s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "aa").replace(/[^a-z0-9]/g, "");
  const J = (v) => JSON.stringify(v ?? "");
  const bb = (pairs) => pairs.filter(([, body]) => body).map(([h, body]) => `      { type: "heading", content: ${J(h)} },\n      { type: "paragraph", content: ${J(body)} },`).join("\n");

  const generateArea = async () => {
    const name = studioTown.trim();
    if (!name || studioLoading) return;
    setStudioLoading(true); setStudioResult(null); setStudioError(null);
    try {
      const cfg = {
        town: { queries: [`${name} Denmark travel guide history attractions what makes it special`, `${name} Denmark getting there by train best time to visit where to stay what travelers say`] },
        festival: { queries: [`${name} festival Denmark 2026 dates tickets prices lineup`, `${name} festival Denmark atmosphere who goes accommodation nearest station`] },
        free: { queries: [`${name} free entry what makes it special opening hours`, `${name} Denmark visitor tips things to know`] },
        food: { queries: [`${name} Denmark what to order prices history reviews`, `${name} Denmark local tips address`] },
        night: { queries: [`${name} Denmark bar atmosphere crowd prices reviews`, `${name} Denmark local tips address`] },
      }[studioType];
      let context = "";
      for (const q of cfg.queries) {
        try {
          const sRes = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          const sData = await sRes.json();
          context = (context + " " + (sData.answer || "") + " " + (sData.results || []).map(r => r.snippet || r.content || "").filter(Boolean).slice(0, 6).join(" ")).trim();
        } catch { /* continue with what we have */ }
      }

      const prompts = {
        town: `Draft a complete Gemlyx town entry for ${name}, Denmark, matching this REAL card example: {"name": "Ribe", "region": "South Jutland", "emoji": "⛪", "tag": "Denmark's oldest town", "desc": "Founded around 700 AD — the oldest town in Scandinavia. Medieval cathedral, Viking museum and cobblestone streets.", "highlight": "Viking Center Ribe — artisans craft authentic Viking jewellery, leather and textiles on site.", "travelTime": "3h 15min 🚂"}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "region": "...", "emoji": "one emoji", "tag": "3-5 word hook", "desc": "two card sentences in the voice above", "highlight": "one specific real place/experience with a concrete detail, or empty string", "travelTime": "EXACT format like '3h 15min 🚂' or '45min 🚌' or '2h + ferry 🚢' — duration + one emoji, NO other words", "mapHint": "Town, postcode Town, Denmark", "lat": 56.09, "lon": 8.24, "nomiPotential": "High / Very High / Medium", "tier": "Can't Miss Out / Highly Recommended / Worth Considering / Best If You're Already Nearby", "gettingThere": "how to arrive, which station, connections", "recommendedStay": "half day / full day / overnight, with reason", "bestTime": "months + why", "accommodation": "day trip vs overnight advice", "budget": "level + what costs money vs what's free", "special": "What Makes This Town Special — the honest core of why it's worth it", "travelersLove": "what visitors consistently praise", "thingsToKnow": "practical caveats incl. at least one downside", "shouldYouVisit": "honest verdict: who should come, who should skip"}`,
        festival: `Draft a complete Gemlyx festival entry for ${name}, Denmark, matching this REAL example: {"name": "Distortion", "town": "Copenhagen", "nearestStation": "Nørreport Station, Copenhagen Central Station or nearby Metro stations", "ticketInfo": "Street parties are free. Distortion X and Distortion Ø require tickets.", "accommodationTip": "Stay in central Copenhagen and book several months in advance.", "budgetLevel": "Moderate–High.", "desc": "Copenhagen's legendary street festival. Five days of block parties in different neighbourhoods."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "town": "host town", "type": "Music / Festival / Market / Culture", "emoji": "one emoji", "dateStart": "YYYY-MM-DD or empty if not in context", "dateEnd": "YYYY-MM-DD or empty", "tier": "Can't miss out / Highly Recommended / Worth Considering / Best If You're Already Nearby", "nearestStation": "...", "ticketInfo": "one sentence — never invent prices", "accommodationTip": "one sentence", "budgetLevel": "Very Low / Low / Moderate / High (ranges ok)", "travelTime": "from Copenhagen like '1h 10min 🚂', or 'In Copenhagen 🚇'", "ticketStatus": "free / on_sale / limited / sold_out", "desc": "two At-a-Glance sentences", "mapHint": "Venue/street, postcode Town, Denmark", "tags": ["two", "tags"], "color": "#hex fitting the vibe", "atmosphere": "Music & Atmosphere section", "whoFor": "Who Is It For? section", "thingsToKnow": "incl. at least one downside", "shouldYouVisit": "honest verdict"} Dates: ONLY from the context — empty string beats a guess.`,
        free: `Draft a complete Gemlyx free-entrance entry for ${name}, matching this REAL example: {"name": "The Greenhouses, Botanical Garden", "city": "Aarhus", "type": "Botanical garden", "popularityTag": "Hidden Gem", "desc": "Giant glass domes housing four climate zones, exotic plants and free-flying butterflies. Entry is completely free."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "city": "which Danish city", "type": "short category", "emoji": "one emoji", "popularityTag": "Hidden Gem / Local Favourite / Popular", "desc": "two card sentences — say clearly what is free", "website": "official URL ONLY if present in context, else empty string", "color": "#hex", "special": "What Makes It Special section", "thingsToKnow": "incl. at least one downside"}`,
        food: `Draft a complete Gemlyx food entry for ${name}, matching this REAL example: {"name": "Harry's Place", "type": "Local", "category": "Hot dog stand", "location": "Nørrebro/Nordvest, Copenhagen", "price": "40–70 DKK", "desc": "A hot dog cart since 1965, run by the same kind of hands-on owners the whole time. Order the \\"Børge med krudt\\" — the local's move — or the flæskesteg (roast pork) sandwich. Cash or Dankort only. No frills, no seats, just stand and eat like generations before you.", "tip": "Ask for it \\"the traditional way\\" and the person behind the counter will usually tell you exactly how to eat it."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "type": "Local / Major", "category": "e.g. Bakery, est. 1652", "location": "Neighbourhood, City", "price": "range like '40–70 DKK' ONLY from context, else 'See website'", "emoji": "one emoji", "desc": "3-4 sentences in the voice above — what to order, history, quirks", "tip": "one insider tip a local would give", "mapHint": "Name, street, postcode City, Denmark", "color": "#hex"}`,
        night: `Draft a complete Gemlyx nightlife entry for ${name}, matching this REAL example: {"name": "Toga Vinstue", "type": "Local", "crowd": "Almost entirely Danish", "category": "Brown bar (bodega)", "location": "Indre By, Copenhagen", "desc": "A classic \\"brown bar\\" — old wood interior, low light, walls covered in political cartoons. Sits five minutes from the Danish Parliament, and actual lawmakers drink here. Cheap beer (around 45 DKK), smoking still allowed indoors, genuinely local despite the central address.", "tip": "Don't expect English menus or tourist-friendly service — this is a real neighbourhood bodega, not a show."}
${STUDIO_VOICE}
Respond with ONLY strict JSON: {"name": ${J(name)}, "type": "Local / Major", "crowd": "who actually drinks here", "category": "short category", "location": "Neighbourhood, City", "emoji": "one emoji", "desc": "3-4 sentences in the voice above", "tip": "one insider tip", "mapHint": "Name, street, postcode City, Denmark", "color": "#hex"}`,
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: prompts[studioType] },
            { role: "user", content: context || "No search context found — use only well-established knowledge, leave uncertain fields empty, and use 'See website' / 'Check locally' fallbacks." },
          ],
          max_tokens: 1400,
        }),
      });
      const data = await res.json();
      const t = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      if (!t.name || !t.desc) throw new Error("empty");
      if (t.travelTime) t.travelTime = t.travelTime.replace(/approx\.?( from)?( Copenhagen)?:?\s*/gi, "").trim();
      const slug = slugify(name);
      const stamp = new Date().toLocaleString("en-GB", { month: "short", year: "numeric" });
      let code = "";
      if (studioType === "town") {
        const nextId = Math.max(...towns.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const towns = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, photo: "/towns/${slug}.jpg", region: ${J(t.region)}, emoji: ${J(t.emoji || "📍")}, tag: ${J(t.tag)}, desc: ${J(t.desc)}, highlight: ${J(t.highlight)}, travelTime: ${J(t.travelTime)}, mapHint: ${J(t.mapHint || t.name + ", Denmark")}, nomiPotential: ${J(t.nomiPotential || "Medium")}, tier: ${J(t.tier || "Worth Considering")},\n  blogBody: [\n${bb([["Getting There", t.gettingThere], ["Recommended Stay", t.recommendedStay], ["Best Time to Visit", t.bestTime], ["Accommodation", t.accommodation], ["Budget", t.budget], ["What Makes This Town Special?", t.special], ["What Travelers Love", t.travelersLove], ["Things to Know", t.thingsToKnow], ["Should You Visit?", t.shouldYouVisit]])}\n  ] },\n\n// 2) Ctrl+F for \`const TOWN_COORDS\` and paste right after the { :\n${J(t.name)}: [${Number(t.lat)?.toFixed(3) || "??"}, ${Number(t.lon)?.toFixed(3) || "??"}],\n\n// 3) Add a photo at public/towns/${slug}.jpg\n// 4) VERIFY every fact before committing — especially highlight, travelTime, dates and coordinates.`;
      } else if (studioType === "festival") {
        const nextId = Math.max(...majorEvents.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const majorEvents = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, tier: ${J(t.tier || "Worth Considering")}, nearestStation: ${J(t.nearestStation)}, ticketInfo: ${J(t.ticketInfo)}, accommodationTip: ${J(t.accommodationTip)}, budgetLevel: ${J(t.budgetLevel)}, travelTime: ${J(t.travelTime)}, rating: 4.5, ticketStatus: ${J(t.ticketStatus || "on_sale")}, town: ${J(t.town)}, type: ${J(t.type || "Festival")}, emoji: ${J(t.emoji || "🎪")}, date: ${J(t.dateStart)}, dateEnd: ${J(t.dateEnd)}, photo: "/events/${slug}.jpg", desc: ${J(t.desc)}, mapHint: ${J(t.mapHint)}, verified: ${J(stamp)}, color: ${J(t.color || "#8E24AA")}, tags: ${JSON.stringify(Array.isArray(t.tags) ? t.tags.slice(0, 3) : [])},\n  blogBody: [\n${bb([["Music & Atmosphere", t.atmosphere], ["Who Is It For?", t.whoFor], ["Things to Know", t.thingsToKnow], ["Should You Visit?", t.shouldYouVisit]])}\n  ] },\n\n// 2) Add a photo at public/events/${slug}.jpg\n// 3) rating is set to 4.5 — adjust it yourself.\n// 4) VERIFY dates, station and ticket info before committing. Empty date fields mean the research couldn't confirm them.`;
      } else if (studioType === "free") {
        const nextId = Math.max(...freeEntrance.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const freeEntrance = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, popularityTag: ${J(t.popularityTag || "Hidden Gem")}, city: ${J(t.city)}, type: ${J(t.type)}, emoji: ${J(t.emoji || "✨")}, desc: ${J(t.desc)}, website: ${J(t.website)}, color: ${J(t.color || "#2E7D32")},\n  blogBody: [\n${bb([["What Makes It Special", t.special], ["Things to Know", t.thingsToKnow]])}\n  ] },\n\n// 2) VERIFY the website URL and that entry is genuinely free before committing.`;
      } else if (studioType === "food") {
        const nextId = Math.max(...foodSpots.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const foodSpots = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, type: ${J(t.type || "Local")}, emoji: ${J(t.emoji || "🍽")}, category: ${J(t.category)}, location: ${J(t.location)}, price: ${J(t.price || "See website")}, photo: "/food/${slug}.jpg",\n  desc: ${J(t.desc)},\n  tip: ${J(t.tip)}, mapHint: ${J(t.mapHint)}, color: ${J(t.color || "#D4AF37")} },\n\n// 2) Add a photo at public/food/${slug}.jpg (or remove the photo field)\n// 3) VERIFY prices, address and that it still exists before committing.`;
      } else {
        const nextId = Math.max(...nightlifeSpots.map(x => x.id)) + 1;
        code = `// 1) Ctrl+F for \`const nightlifeSpots = [\` and paste right after the [ :\n{ id: ${nextId}, name: ${J(t.name)}, type: ${J(t.type || "Local")}, crowd: ${J(t.crowd)}, emoji: ${J(t.emoji || "🍺")}, category: ${J(t.category)}, location: ${J(t.location)}, desc: ${J(t.desc)}, tip: ${J(t.tip)}, mapHint: ${J(t.mapHint)}, color: ${J(t.color || "#5D4037")} },\n\n// 2) VERIFY address, crowd and that it still exists before committing.`;
      }
      setStudioResult(code);
    } catch {
      setStudioError("Couldn't draft that — try again, or check the name.");
    }
    setStudioLoading(false);
  };

  // For each guide day: one Tavily search for live facts, then OpenAI distills them into
  // (a) how to travel between consecutive stops and (b) where to stay. Never invents —
  // falls back to "Check Rejseplanen" wording when the context doesn't support a claim.
  const enrichGuideDays = (days, gid) => {
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
{"legs": [${names.length > 1 ? `exactly ${names.length - 1} objects, where legs[0] is how to get from stop 1 to stop 2, legs[1] from stop 2 to stop 3, and so on` : "empty array"}, each: {"how": "e.g. '~10 min by bus' or '~25 min walk' or '~1h by train via Odense'"}], "accommodation": "One short sentence on where to base yourself for this day, e.g. 'Best as a day trip from Copenhagen' or 'Stay overnight in Ribe's old town'"}
Rules: always prefix times with ~. If two stops are in the same town or area, walking is usually right. If a leg is genuinely unclear, use "Check Rejseplanen for this leg" — never invent a confident time. Each value under 12 words.` },
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
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_OPENAI_KEY },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `Turn the trip plan discussed in this conversation into strict JSON, no markdown, no commentary — respond with ONLY the JSON object in this exact shape:
{"title": "Short evocative title for this trip", "days": [{"day": 1, "title": "Short day title", "stops": [{"name": "Real place name exactly as mentioned", "note": "2-3 vivid sentences that paint a picture of this place — what it looks and feels like to be there, what makes it special, and one concrete thing to do or notice. Write like a well-travelled friend, not a brochure."}]}]}
If the conversation only covers a single day or a few stops with no explicit day breakdown, use one day. Use only real place names actually mentioned in the conversation — never invent new ones, and never invent facts, prices or opening hours in the notes; describe atmosphere and experience instead.` },
            { role: "user", content: convoText }
          ],
          max_tokens: 1800,
        }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      if (!parsed.days || parsed.days.length === 0) throw new Error("empty");
      const gid = Date.now();
      setGuideModal({ _gid: gid, title: parsed.title || "Your Custom Route", days: parsed.days });
      enrichGuideDays(parsed.days, gid);
    } catch {
      setGuideModal(null);
      setGuideError("Couldn't build a guide from that yet — try asking for a fuller plan first.");
      setTimeout(() => setGuideError(null), 3500);
    }
  };

  const saveCurrentGuide = () => {
    if (!guideModal || guideModal === "loading") return;
    const newGuide = { id: Date.now(), title: guideModal.title, days: guideModal.days, savedAt: new Date().toISOString() };
    const updated = [newGuide, ...savedGuides].slice(0, 20);
    setSavedGuides(updated);
    try { localStorage.setItem("gemlyx_saved_guides", JSON.stringify(updated)); } catch { /* ignore */ }
    setToast("📖 Guide saved");
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
    { id: "craft", label: "◈ Booking" },
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
Transport matters: if the person hasn't said how they're getting around, ask — car, bike, or public transport — before proposing a route, since it changes everything. Tailor plans to the answer: public transport → chain towns along direct train and bus lines and suggest checking Rejseplanen for times; bike → keep daily distances realistic (under ~50 km) and favor flat or coastal stretches; car → flexible road trips across regions are fine.

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
                        <div style={{ maxWidth: "82%", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5, background: m.role === "user" ? C.accent : C.bg, color: "#fff", border: m.role === "user" ? "none" : `1px solid ${C.border}`, borderLeft: m.role === "user" ? "none" : `2px solid ${C.gold}` }}>
                          {m.role === "assistant" ? stripMarkdown(m.text) : m.text}
                        </div>
                      </div>
                    ))}
                    {aiLoading && <div style={{ background: C.bg, borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, color: C.muted, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.gold}`, display: "inline-block", marginBottom: 10, fontStyle: "italic" }}>✦ Gemlyx is thinking…</div>}
                  </div>
                )}

                {aiMessages.length > 2 && !aiLoading && (
                  <button onClick={generateGuide}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: `linear-gradient(135deg, ${C.gold}22, ${C.accent}22)`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, color: C.gold, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 12 }}>
                    📖 Turn this into a guide
                  </button>
                )}
                {guideError && (
                  <div style={{ fontSize: 12, color: "#FFB347", textAlign: "center", marginBottom: 12 }}>{guideError}</div>
                )}

                <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  {["Plan my 3 days in Denmark", "Exclusive fashion in Copenhagen", "Best craft to commission"].map(s => (
                    <button key={s} onClick={() => setAiInput(s)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 100, padding: "6px 12px", fontSize: 11, color: C.light, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>{s}</button>
                  ))}
                </div>

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
                {isStudio && (
                  <div style={{ background: C.surface, border: `1px dashed ${C.gold}66`, borderRadius: 14, padding: "16px", marginTop: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif", marginBottom: 4 }}>🛠 Content Studio — founder tool</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>Drafts a complete entry — card + full detail page — via Tavily + OpenAI, following the Gemlyx editorial docs. Output is paste-ready code — verify every fact before committing. Not visible to users.</div>
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
                        placeholder={{ town: "Town name, e.g. Ringkøbing", festival: "Festival name, e.g. Tønder Festival", free: "Place name + city, e.g. Rundetaarn Copenhagen", food: "Place name + city, e.g. Gasoline Grill Copenhagen", night: "Bar name + city, e.g. Mikkeller Bar Viktoriagade" }[studioType]}
                        style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                      <button onClick={generateArea} disabled={studioLoading}
                        style={{ background: C.gold, border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>
                        {studioLoading ? "Researching…" : "Draft it"}
                      </button>
                    </div>
                    {studioError && <div style={{ fontSize: 12, color: "#FFB347", marginBottom: 8 }}>{studioError}</div>}
                    {studioResult && (
                      <>
                        <pre style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", fontSize: 10.5, color: C.light, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6, maxHeight: 260, overflowY: "auto", fontFamily: "monospace", margin: "0 0 10px" }}>{studioResult}</pre>
                        <button onClick={() => { try { navigator.clipboard.writeText(studioResult); setToast("📋 Copied"); setTimeout(() => setToast(null), 1800); } catch { /* ignore */ } }}
                          style={{ width: "100%", background: "none", border: `1px solid ${C.gold}55`, borderRadius: 10, padding: "9px", fontSize: 12, fontWeight: 700, color: C.gold, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          📋 Copy code
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
                { id: "craft", img: "/picture9.jpg", title: "Booking", sub: "Book workshops, tickets & commissions", icon: "◈" },
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
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", margin: "12px 0 8px" }}>Sort</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Pill label="★ Recommended" active={craftSort === "recommended"} onClick={() => setCraftSort("recommended")} />
                  <Pill label="📍 Closest to you" active={craftSort === "near"} color={C.gold}
                    onClick={() => { setCraftSort("near"); if (!isInDenmark(userCoords)) requestLocation(); }} />
                </div>
                {craftSort === "near" && !isInDenmark(userCoords) && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Works once you're in Denmark with location enabled — showing recommended order for now.</div>
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
                          <button onClick={(e) => { e.stopPropagation(); toggleSavePlace("craft", craft, craft.location); }}
                            style={{ position: "absolute", top: craft.rating ? 38 : 10, right: 10, background: "rgba(10,15,30,0.8)", border: "none", borderRadius: 100, padding: "4px 9px", fontSize: 13, cursor: "pointer", color: isPlaceSaved("craft", craft.id) ? "#E91E63" : "#ffffff88" }}>
                            {isPlaceSaved("craft", craft.id) ? "♥" : "♡"}
                          </button>
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
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{craft.location} · {travelLabel(userCoords, craft.location, craft.travelTime)}{craft.priceNote ? ` · ${craft.priceNote}` : ""}</div>
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
                      <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{a.desc.slice(0, 100)}{a.desc.length > 100 ? "…" : ""}</div>
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
                  {(eventTab === "local" ? ["All", "Festival", "Market", "Concert", "North Zealand"] : eventTab === "viking" ? ["All", "Market", "Battle & Market", "Craftsmen Gathering", "Market & Combat"] : ["All", "Music", "Cultural"]).map(f => (
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
        {userCoords === "requesting" && (
          <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>📍 Getting your location...</div>
        )}
        <LiveEventsHeaderStrip liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} nearYou={nearYou} requestLocation={requestLocation} setEventDetail={setEventDetail} setFreeDetail={setFreeDetail} setFoodDetail={setFoodDetail} />

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

      <DetailPage item={eventDetail} onClose={() => setEventDetail(null)} kind="event" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={townDetail} onClose={() => setTownDetail(null)} kind="town" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={nightlifeDetail} onClose={() => setNightlifeDetail(null)} kind="nightlife" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={freeDetail} onClose={() => setFreeDetail(null)} kind="free" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />
      <DetailPage item={foodDetail} onClose={() => setFoodDetail(null)} kind="food" liveInfo={liveInfo} liveInfoLoading={liveInfoLoading} checkLiveInfo={checkLiveInfo} userCoords={userCoords} />

      {guideModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(5,8,16,0.85)", overflowY: "auto", padding: "60px 16px 40px" }} onClick={() => setGuideModal(null)}>
          <div style={{ maxWidth: 480, margin: "0 auto", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "22px" }} onClick={e => e.stopPropagation()}>
            {guideModal === "loading" ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📖</div>
                <div style={{ fontSize: 14, color: C.muted }}>Building your guide...</div>
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
                <div style={{ fontSize: 26, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.1, marginBottom: 18 }}>{guideModal.title}</div>

                {guideModal.days.map(day => (
                  <div key={day.day} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Day {day.day}{day.title ? ` — ${day.title}` : ""}</div>
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
                            {real && (
                              <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
                                {real.price ? `${real.price}` : real.popularityTag === "Hidden Gem" ? "◆ Free — Hidden Gem" : real._src === "free" ? "Free entry" : ""}
                                {real.travelTime ? ` · ${real.travelTime} from CPH` : ""}
                              </div>
                            )}
                          </div>
                          </div>
                          {i < day.stops.length - 1 ? (
                            <div style={{ borderLeft: `2px dashed ${C.border}`, marginLeft: 31, padding: "7px 0 9px 14px", minHeight: 14 }}>
                              {day.glance?.legs?.[i]?.how ? (
                                <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>🚆 {day.glance.legs[i].how}</span>
                              ) : glancePending > 0 ? (
                                <span style={{ fontSize: 11, color: C.muted }}>✨ checking…</span>
                              ) : null}
                            </div>
                          ) : (
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
