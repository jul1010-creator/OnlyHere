// ── THE SHIPS COMING TO KLAIPĖDA ────────────────────────────────────
//
// Oliver, 5 Oct 2026, asking whether Gemlyx could track "expected visitors"
// in Klaipėda, then "Sure" to starting with the cruise ships and the time
// to be back on board.
//
// THE CALLS are the Port of Klaipėda's own schedule of arriving cruise ships,
// copied from its page on 5 Oct 2026 (CRUISE_SOURCE): ship, arrival,
// departure and quay, Klaipėda time, all 58 calls of the 2026 season. The
// port's page sits behind a bot check, so Gemlyx does not fetch it from the
// server; the season is copied here once it is published, and again when
// the port changes it. The 2027 season goes in when the port lists it.
//
// THE GUESTS are each ship's normal passenger count (double occupancy, not
// every berth filled, no crew), from the cruise line's own page where it gives
// one and otherwise CruiseMapper or Wikipedia, read 5 Oct 2026 (source per
// ship below). Where the sources disagree by a few, the line's own figure
// is used. It is how many are on board, not how many come ashore, so every
// figure shown from it is said as "about".
export const CRUISE_SOURCE = "https://portofklaipeda.lt/en/port/schedule-of-arriving-cruise-ships/";
export const CRUISE_ZONE = "Europe/Vilnius";

export const SHIPS = {
  "MS Hamburg": { guests: 394, source: "https://www.cruisemapper.com/ships/MS-Hamburg-1012" },
  "Sapphire Princess": { guests: 2670, source: "https://en.wikipedia.org/wiki/Sapphire_Princess" },
  "CLIO": { guests: 89, source: "https://www.gct.com/grand-circle-difference/our-fleet/mv-clio" },
  "MSC MAGNIFICA": { guests: 2550, source: "https://en.wikipedia.org/wiki/MSC_Magnifica" },
  "Aidabella": { guests: 2050, source: "https://www.cruisemapper.com/ships/AIDAbella-653" },
  "Balmoral": { guests: 1350, source: "https://www.cruisemapper.com/ships/Fred-Olsen-Balmoral-596" },
  "Borealis": { guests: 1360, source: "https://www.cruisemapper.com/ships/Fred-Olsen-Borealis-717" },
  "Spirit of Adventure": { guests: 999, source: "https://www.cruisemapper.com/ships/Spirit-of-Adventure-2140" },
  "MS Europa 2": { guests: 500, source: "https://www.hl-cruises.com/fleet/ms-europa-2" },
  "Norwegian Sun": { guests: 1936, source: "https://www.cruisemapper.com/ships/Norwegian-Sun-735" },
  "Deutschland": { guests: 520, source: "https://www.cruisemapper.com/ships/MS-Deutschland-World-Odyssey-764" },
  "STAR LEGEND": { guests: 343, source: "https://www.cruisemapper.com/ships/Star-Legend-564" },
  "Azamara Journey": { guests: 710, source: "https://www.cruisemapper.com/ships/Azamara-Journey-566" },
  "Mein Schiff 7": { guests: 2534, source: "https://www.cruisemapper.com/ships/Mein-Schiff-7-1570" },
  "MS Marina": { guests: 1258, source: "https://www.cruisemapper.com/ships/Oceania-Marina-606" },
  "Sirena": { guests: 698, source: "https://www.cruisemapper.com/ships/Oceania-Sirena-591" },
  "Ambience": { guests: 1400, source: "https://www.ambassadorcruiseline.com/our-ships/ambience/" },
  "Amera": { guests: 835, source: "https://www.phoenixreisen.com/amera.html" },
  "Le Champlain": { guests: 184, source: "https://www.cruisemapper.com/ships/Le-Champlain-1505" },
  "Spirit of Discovery": { guests: 999, source: "https://www.cruisemapper.com/ships/Spirit-of-Discovery-1829" },
  "Silver Dawn": { guests: 576, source: "https://www.cruisemapper.com/ships/Silver-Dawn-1991" },
  "AIDAMAR": { guests: 2194, source: "https://www.cruisemapper.com/ships/AIDAmar-663" },
  "Europa": { guests: 400, source: "https://www.hl-cruises.com/fleet/ms-europa" },
  "Artania": { guests: 1200, source: "https://www.phoenixreisen.com/artania.html" },
  "Rotterdam": { guests: 2668, source: "https://www.cruisemapper.com/ships/ms-Rotterdam-2166" },
  "Vasco da Gama": { guests: 1000, source: "https://www.nicko-cruises.de/flotte/vasco-da-gama" },
};

// [ship, arrives, leaves, quay], Klaipėda time, as the port lists them.
const C = (ship, arrive, leave, quay = "28-33") => ({ ship, arrive, leave, quay });
export const CRUISE_CALLS = [
  C("MS Hamburg", "2026-05-02 07:30", "2026-05-02 13:00"),
  C("Sapphire Princess", "2026-05-08 07:00", "2026-05-08 16:00"),
  C("CLIO", "2026-05-10 06:00", "2026-05-10 13:30", "80"),
  C("Sapphire Princess", "2026-05-18 07:00", "2026-05-18 16:00"),
  C("CLIO", "2026-05-24 13:00", "2026-05-24 21:00"),
  C("MS Hamburg", "2026-05-28 07:00", "2026-05-28 13:00"),
  C("MSC MAGNIFICA", "2026-05-29 09:00", "2026-05-29 17:00"),
  C("Sapphire Princess", "2026-06-03 11:00", "2026-06-03 20:00"),
  C("Aidabella", "2026-06-04 10:30", "2026-06-04 20:00"),
  C("Balmoral", "2026-06-05 09:00", "2026-06-05 19:00"),
  C("Borealis", "2026-06-10 09:00", "2026-06-10 18:00", "KLR"),
  C("Spirit of Adventure", "2026-06-12 09:00", "2026-06-12 18:00"),
  C("MS Europa 2", "2026-06-17 07:00", "2026-06-17 19:00"),
  C("CLIO", "2026-06-17 13:00", "2026-06-17 21:00", "KLASCO"),
  C("Norwegian Sun", "2026-06-20 10:00", "2026-06-20 17:30"),
  C("MSC MAGNIFICA", "2026-06-23 07:00", "2026-06-23 16:00"),
  C("Sapphire Princess", "2026-06-27 11:00", "2026-06-27 20:00"),
  C("Deutschland", "2026-07-01 08:00", "2026-07-01 20:00"),
  C("Sapphire Princess", "2026-07-05 07:00", "2026-07-05 16:00"),
  C("STAR LEGEND", "2026-07-10 10:00", "2026-07-10 16:00"),
  C("Azamara Journey", "2026-07-12 07:30", "2026-07-12 14:00"),
  C("Mein Schiff 7", "2026-07-16 07:00", "2026-07-16 17:30"),
  C("MS Marina", "2026-07-17 07:00", "2026-07-17 15:00"),
  C("Deutschland", "2026-07-18 08:00", "2026-07-18 17:00"),
  C("Sirena", "2026-07-20 12:00", "2026-07-20 20:00"),
  C("Sapphire Princess", "2026-07-21 11:00", "2026-07-21 20:00"),
  C("Norwegian Sun", "2026-07-22 10:00", "2026-07-22 17:30"),
  C("Balmoral", "2026-07-25 07:30", "2026-07-25 16:30"),
  C("Ambience", "2026-07-26 08:00", "2026-07-26 19:00"),
  C("Norwegian Sun", "2026-07-30 10:00", "2026-07-30 18:00"),
  C("Sapphire Princess", "2026-07-31 11:00", "2026-07-31 20:00"),
  C("Amera", "2026-08-03 08:00", "2026-08-03 15:00"),
  C("MSC MAGNIFICA", "2026-08-04 07:00", "2026-08-04 16:00"),
  C("Le Champlain", "2026-08-07 12:00", "2026-08-07 18:15"),
  C("CLIO", "2026-08-08 06:00", "2026-08-08 13:30"),
  C("Sapphire Princess", "2026-08-10 07:00", "2026-08-10 16:00"),
  C("Spirit of Discovery", "2026-08-13 08:00", "2026-08-13 17:00"),
  C("Silver Dawn", "2026-08-15 12:00", "2026-08-15 23:00"),
  C("Mein Schiff 7", "2026-08-16 07:00", "2026-08-16 17:30"),
  C("Norwegian Sun", "2026-08-17 10:00", "2026-08-17 18:00"),
  C("MSC MAGNIFICA", "2026-08-18 07:00", "2026-08-18 16:00"),
  C("CLIO", "2026-08-22 13:00", "2026-08-22 21:00"),
  C("Norwegian Sun", "2026-08-26 10:00", "2026-08-26 17:30"),
  C("CLIO", "2026-08-28 06:00", "2026-08-28 13:30"),
  C("AIDAMAR", "2026-08-31 10:00", "2026-08-31 20:00"),
  C("MSC MAGNIFICA", "2026-09-01 07:00", "2026-09-01 15:30"),
  C("Europa", "2026-09-03 08:00", "2026-09-03 19:00"),
  C("CLIO", "2026-09-11 13:00", "2026-09-11 21:00"),
  C("MSC MAGNIFICA", "2026-09-15 09:00", "2026-09-15 17:00"),
  C("Artania", "2026-09-16 14:00", "2026-09-16 21:00"),
  C("Norwegian Sun", "2026-09-18 10:00", "2026-09-18 18:00"),
  C("Rotterdam", "2026-09-22 07:00", "2026-09-22 16:00"),
  C("Vasco da Gama", "2026-09-23 11:00", "2026-09-23 20:00"),
  C("MS Hamburg", "2026-09-25 09:00", "2026-09-25 17:00"),
  C("MSC MAGNIFICA", "2026-09-26 09:00", "2026-09-26 17:00"),
  C("Norwegian Sun", "2026-09-28 10:00", "2026-09-28 17:30"),
  C("Norwegian Sun", "2026-10-06 10:00", "2026-10-06 18:00"),
  C("Vasco da Gama", "2026-10-14 07:00", "2026-10-14 16:00"),
];
