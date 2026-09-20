// ── EVERY CROSSING THE NATIONAL TIMETABLE CARRIES ───────────────────
//
// Oliver, 20 Sep 2026, on the Rejseplanen GTFS: "Do it." And then, having
// unzipped it himself: "I unziped it myself into the public folder."
//
// Derived from that file rather than researched, which is the point of it:
// this is Denmark's own national timetable saying which boats exist, who runs
// them, and between which two harbours. Read out of routes.txt, agency.txt and
// trips.txt on 20 September 2026, off the build valid 7 Sep to 2 Dec 2026.
//
// ── ATTRIBUTION IS A LICENCE TERM HERE, NOT A COURTESY ──────────────
//
// Rejseplanen's Labs guidelines put the static data under Creative Commons BY
// 4.0, free and usable commercially, and CC BY requires the creator credited
// and any changes indicated. Both are done: RP_CREDIT below is rendered
// wherever this reaches a reader, and this file is a derived extract rather
// than the dataset, which is the change being declared.
//
// ── WHAT THE FEED ACTUALLY HELD, MEASURED ───────────────────────────
//
// 1,608 routes, of which 1,387 buses, 31 rail, 4 metro, 4 letbane and
// THIRTEEN BOATS. Three of the thirteen are Copenhagen harbour buses rather
// than crossings, which matters: Movia 991, 992 and 993 run Nyhavn to
// Teglholmen and Refshaleøen, and a guide that read them as island ferries
// would be offering somebody a boat to an island that is a dock.
//
// AGAINST THE FIFTEEN ISLANDS GEMLYX PUBLISHES, it covers four: Samsø,
// Bornholm, Ærø and Læsø. Eleven are absent, and they are the small municipal
// ones: Sejerø, Askø, Fejø, Endelave, Lyø, Avernakø, Bjørnø, Christiansø,
// Agersø, Orø. A guess that Movia might be carrying the Zealand island ferries
// under its own agency id was checked here and is wrong; its three boats are
// the harbour buses.
//
// SO THIS DOES NOT REPLACE utils/ferryDoor.js. It fills four of its fifteen
// gaps with an operator URL that came from the national timetable rather than
// from a search, and leaves the other eleven to the island's own page.
//
// ── AND IT IS A SNAPSHOT, WHICH IS WHY IT IS DATED ──────────────────
//
// Rejseplanen rebuilds the feed about every fortnight. Nothing here reads that
// file at runtime and nothing should: the useful half is WHICH CROSSINGS EXIST
// AND WHO RUNS THEM, which changes once a year at most, and the half that goes
// stale in a fortnight is the sailing times, which are deliberately not here.
// A reader wanting a departure is sent to the operator, or to Rejseplanen with
// the leg already filled in. See utils/rejseplanen.js.
export const GTFS_READ_ON = "2026-09-20";
export const GTFS_FEED_RANGE = "2026-09-07 to 2026-12-02";

// The credit CC BY 4.0 asks for, rendered wherever any of this surfaces.
export const RP_CREDIT = "Crossings from Rejseplanen's open timetable data, CC BY 4.0, extracted by Gemlyx.";
export const RP_LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

// ── THE THIRTEEN, AS THE FEED GIVES THEM ────────────────────────────
//
// `ports` are the trip headsigns, which is what the operator calls the two
// ends, so they are the harbour names a traveller will see on a sign rather
// than a town. `island` is Gemlyx's own name for the place, set only where a
// published entry exists, because that is the join this file is for.
//
// `harbourBus` marks the three that are not crossings at all. They stay in the
// list rather than being deleted, because the next person to read the feed
// would find thirteen boats and wonder which three went missing.
export const FERRY_ROUTES = [
  { operator: "Mols-Linien", url: "http://molslinjen.dk", island: "Bornholm", ports: ["Rønne havn", "Ystad havn"] },
  { operator: "NT", url: "https://www.nordjyllandstrafikselskab.dk", island: "Læsø", ports: ["Frederikshavn", "Vesterø Havn"] },
  { operator: "Samsø Rederi", url: "https://www.tilsamsoe.dk", island: "Samsø", ports: ["Aarhus Havn, Dokk1 (færge)", "Sælvig Havn (færge)"] },
  { operator: "Samsø Rederi", url: "https://www.tilsamsoe.dk", island: "Samsø", ports: ["Hou Havn (færge)", "Sælvig Havn (færge)"] },
  { operator: "Ærøfærgerne", url: "https://aeroe-ferry.dk/", island: "Ærø", ports: ["Svendborg Færgehavn", "Ærøskøbing Havn (færge)"] },
  { operator: "Ærøfærgerne", url: "https://aeroe-ferry.dk/", island: "Ærø", ports: ["Faaborg Havn (færge)", "Søby Havn (Ærø Kommune)"] },
  { operator: "Ærøfærgerne", url: "https://aeroe-ferry.dk/", island: "Ærø", ports: ["Fynshav Havn (færge)", "Søby Havn (Ærø Kommune)"] },
  { operator: "ÆrøXpressen A/S", url: "https://www.aeroexpressen.dk", island: "Ærø", ports: ["Marstal Havn (færge)", "Rudkøbing Havn (færge)"] },
  // ── AND THREE SMALL ISLANDS GEMLYX DOES NOT PUBLISH YET ──────────
  // Drejø and Hjortø are in the feed and not in the app. Left here named, with
  // no island set, because a crossing Denmark's own timetable carries to a
  // place with nine residents is a lead rather than a gap.
  { operator: "Svendborg Havn, Færge- og Sundfart", url: "https://www.svendborg-havn.dk/færger-fra-svendborg", island: "", ports: ["Drejø Havn (færge)", "Svendborg Færgehavn"] },
  { operator: "Svendborg Havn, Færge- og Sundfart", url: "https://www.svendborg-havn.dk/færger-fra-svendborg", island: "", ports: ["Svendborg Færgehavn"] },
  // ── AND THE THREE THAT ARE NOT CROSSINGS ────────────────────────
  { operator: "Movia", url: "https://www.moviatrafik.dk", island: "", harbourBus: true, ports: ["Nyhavn", "Operaen, Holmen"] },
  { operator: "Movia", url: "https://www.moviatrafik.dk", island: "", harbourBus: true, ports: ["Nyhavn", "Teglholmen"] },
  { operator: "Movia", url: "https://www.moviatrafik.dk", island: "", harbourBus: true, ports: ["Orientkaj St.", "Refshaleøen"] },
];

// The crossings only, which is what anything asking about an island wants.
export const crossings = () => FERRY_ROUTES.filter(r => !r.harbourBus);

// ── WHAT THE TIMETABLE KNOWS ABOUT ONE ISLAND ───────────────────────
//
// Matched on Gemlyx's own island name, which is why `island` is set by hand
// above rather than parsed out of a harbour name: "Sælvig Havn (færge)" does
// not contain the word Samsø, and guessing an island from a port is how a
// reader ends up on the wrong boat.
export const crossingsTo = (island) => {
  const want = String(island || "").trim().toLowerCase();
  if (!want) return [];
  return crossings().filter(r => r.island.toLowerCase() === want);
};

// The operator's own address, for an island the national timetable carries.
// Empty for the eleven it does not, which is the honest answer and the reason
// ferryDoor still asks for the field by hand.
export const timetableFerryUrl = (island) => crossingsTo(island)[0]?.url || "";
