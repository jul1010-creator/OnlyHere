// ── WHERE A BED IS, NOT WHAT IT COSTS ───────────────────────────────
//
// Oliver, 26 Sep 2026: "I think we should program it, so it has awareness of
// where the hostels are located and where summerhouses are located. You'd
// obviously prefer sending a family to a summerhouse near amusement parks on
// Jutland.. And that would also be cheap. However, for young people who want to
// go out, they probably gonna enjoy a hostel at Copenhagen." And then: "Just go
// through it all."
//
// Two lists, both read on 26 Sep 2026, both about LOCATION. Neither carries a
// price, on purpose. A price goes stale in weeks and the app already holds its
// checked prices with their dates (see utils/budgetEstimate.js and
// utils/summerhouse.js). Where a hostel is, and whether it sells a bed in a
// shared room at all, changes in years.
//
// ── THE HOSTELS ─────────────────────────────────────────────────────
//
// Every hostel on danhostel.dk's current list, each one opened on its own page,
// plus the private hostels that sell dorm beds, each one opened on its OWN site
// rather than a booking aggregator. `dorm` is the one field that matters most:
//
//   "dorm"     its own page sells a single bed in a shared room
//   "rooms"    its own page sells whole rooms only (a family room is a room)
//   "unclear"  its own page did not settle it, so the app claims neither
//
// Most of the Danhostel network is "rooms". Danish hostels are largely family
// places with private rooms, which is why a hostel chip cannot promise a cheap
// bunk anywhere but the handful of towns marked "dorm" below.
//
// `dormSays` is the page's own wording, so a row can be checked by reading it.
// `ageSays` is the house rule for dorms where the site states one, and it
// decides a family: most Copenhagen dorms are adults only. `dormAdultsOnly` is
// set on exactly the rows whose own rule keeps a child out of the dorm, so the
// code never has to read the sentence to know.
//
// `season` is set only where the page prints ONE window. A page printing two
// different windows keeps its words in `openSays` and claims no season.
//
// The coordinate is the TOWN's (or the district's), from the Danish state
// place-name register, not the building's. That is enough to say which town
// has a bed and how far it is from a day's stops, which is all it is used for.
//
// ── WHAT WAS LOOKED FOR AND IS NOT HERE ─────────────────────────────
//
// Danhostel Odense City has closed and Odense Kragsbjerggaard has left the
// network, so Gemlyx has no checked hostel in Odense. Bellahøj closed in 2023.
// Køge, Kalundborg, Tisvildeleje, Frederiksværk, Faaborg, Nykøbing Sjælland,
// Nykøbing Falster, Nakskov, Næstved, Langeland, Hasle, Rønne, Svaneke and
// Fredensborg are no longer on danhostel.dk's list. Danhostel Copenhagen Amager
// still has a page but is not on the list and its status could not be settled.
// Woodah is a capsule hotel now, Bedwood is closed, YMCA Interpoint is shut for
// the season. None of them is claimed.
export const STAY_PLACES_CHECKED_AT = "2026-09-26";
export const HOSTEL_LIST_SOURCE = "https://www.danhostel.dk/en/guide-hostels-bornholm";
export const COORD_SOURCE = "https://api.dataforsyningen.dk/steder";
export const DORM = { yes: "dorm", no: "rooms", unclear: "unclear" };

// Town and district centres, [lat, lon], as the register prints them (it
// prints [lon, lat]; they are swapped here once).
export const STAY_TOWN_POINTS = {
  "Frederikshavn": [57.44340551, 10.51694522],
  "Hobro": [56.64367497, 9.79069305],
  "Nykøbing Mors": [56.80100271, 8.86741829],
  "Skørping": [56.8341804, 9.88996643],
  "Skagen": [57.72384166, 10.57757857],
  "Sæby": [57.32764184, 10.50359418],
  "Thyborøn": [56.69727851, 8.21018201],
  "Ranum": [56.89684355, 9.22209864],
  "Risskov": [56.19868054, 10.2472112],
  "Aarhus": [56.15701325, 10.17319421],
  "Brande": [55.94075452, 9.14408287],
  "Fjaltring": [56.47377459, 8.13939838],
  "Gjerrild": [56.50617362, 10.81725519],
  "Horsens": [55.84223668, 9.83145229],
  "Kjellerup": [56.28574856, 9.43246376],
  "Ringkøbing": [56.08710332, 8.26706868],
  "Rønde": [56.30111333, 10.47337512],
  "Silkeborg": [56.18931697, 9.57319465],
  "Skanderborg": [56.04470597, 9.95201897],
  "Vejle": [55.68867666, 9.5447795],
  "Viborg": [56.45251738, 9.38720059],
  "Hedensted": [55.77124833, 9.69769904],
  "Jels": [55.35353696, 9.2075189],
  "Esbjerg": [55.47534192, 8.47376144],
  "Fredericia": [55.57588599, 9.74114059],
  "Haderslev": [55.25664342, 9.48845926],
  "Kolding": [55.50459214, 9.47070748],
  "Ribe": [55.34929374, 8.78129543],
  "Rødding": [55.36517717, 9.05920084],
  "Sønderborg": [54.91323327, 9.80560353],
  "Tønder": [54.93823464, 8.85982712],
  "Vejen": [55.47254522, 9.13646244],
  "Grindsted": [55.75941937, 8.91981692],
  "Skjern": [55.94726836, 8.49882845],
  "Aalborg": [57.03189109, 9.90549995],
  "Nørresundby": [57.0653238, 9.93353309],
  "Indre By": [55.68544929, 12.58794503],
  "Vesterbro": [55.66607449, 12.55179417],
  "Nørrebro": [55.69759421, 12.5552861],
  "Sydhavn": [55.65009536, 12.55210271],
  "Bispebjerg": [55.71033057, 12.53044141],
  "Faxe": [55.25024591, 12.11364366],
  "Helsingør": [56.02966493, 12.58487442],
  "Hillerød": [55.93202436, 12.29686564],
  "Ishøj": [55.61310033, 12.35631599],
  "Maribo": [54.77613191, 11.50681936],
  "Ringsted": [55.44525157, 11.7992951],
  "Roskilde": [55.63659446, 12.08713962],
  "Sakskøbing": [54.79743986, 11.63114645],
  "Store Heddinge": [55.30804025, 12.38268422],
  "Vordingborg": [55.01217411, 11.90764182],
  "Svendborg": [55.05885114, 10.59325557],
  "Sandvig": [55.28717387, 14.78030837],
  "Kerteminde": [55.45452967, 10.65369317],
  "Gudhjem": [55.20669492, 14.972068],
  "Billund": [55.72512858, 9.12230449],
  "Henne Strand": [55.73719928, 8.1820567],
};

export const HOSTELS = [
  {"name": "Danhostel Aalborg", "town": "Aalborg", "point": "Aalborg", "lat": 57.03189109, "lon": 9.90549995, "network": "Danhostel", "dorm": "rooms", "dormSays": "Vi har værelser med eget bad samt fællesrum og køkken til rådighed; Antal værelser: 35, med bad og/eller toilet: 35", "source": "https://www.danhostel.dk/hostel/danhostel-aalborg", "note": "Its price page showed no table on 26 Sep 2026, so this rests on the room count and the sentence above."},
  {"name": "Danhostel Frederikshavn City", "town": "Frederikshavn", "point": "Frederikshavn", "lat": 57.44340551, "lon": 10.51694522, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room with shower and toilet", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-frederikshavn-city/prices"},
  {"name": "Danhostel Hobro", "town": "Hobro", "point": "Hobro", "lat": 56.64367497, "lon": 9.79069305, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) to (6 people); 20 modern rooms all with private bathrooms", "openSays": "Hele året", "source": "https://www.danhostel.dk/en/hostel/danhostel-hobro/prices"},
  {"name": "Danhostel Nykøbing Mors", "town": "Nykøbing Mors", "point": "Nykøbing Mors", "lat": 56.80100271, "lon": 8.86741829, "network": "Danhostel", "dorm": "rooms", "dormSays": "28 rooms, all with private bathrooms", "openSays": "15/02 - 30/11", "season": {"from": "02-15", "to": "11-30"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-nykoebing-mors/prices"},
  {"name": "Danhostel Nørresundby", "town": "Nørresundby", "point": "Nørresundby", "lat": 57.0653238, "lon": 9.93353309, "network": "Danhostel", "dorm": "rooms", "dormSays": "Værelse med bad og toilet (1 person) inkl. Linnedpakke to (6 personer)", "openSays": "01/01 - 01/01", "source": "https://www.danhostel.dk/hostel/danhostel-noerresundby/priser"},
  {"name": "Danhostel Rebild", "town": "Skørping", "point": "Skørping", "lat": 56.8341804, "lon": 9.88996643, "network": "Danhostel", "dorm": "rooms", "dormSays": "21 rooms, all with private bathrooms", "openSays": "18/01 - 23/12", "season": {"from": "01-18", "to": "12-23"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-rebild/prices"},
  {"name": "Danhostel Skagen", "town": "Skagen", "point": "Skagen", "lat": 57.72384166, "lon": 10.57757857, "network": "Danhostel", "dorm": "rooms", "dormSays": "single, double, family rooms with four beds", "openSays": "Open from March to December, 01/03 - 01/12", "season": {"from": "03-01", "to": "12-01"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-skagen/prices"},
  {"name": "Danhostel Sæby", "town": "Sæby", "point": "Sæby", "lat": 57.32764184, "lon": 10.50359418, "network": "Danhostel", "dorm": "rooms", "dormSays": "Værelser med bad og toilet (1 pers) / Værelser uden bad og toilet (1 pers) up to 6 pers", "source": "https://www.danhostel.dk/hostel/danhostel-saeby/priser"},
  {"name": "Danhostel Thyborøn", "town": "Thyborøn", "point": "Thyborøn", "lat": 56.69727851, "lon": 8.21018201, "network": "Danhostel", "dorm": "rooms", "dormSays": "thirty-seven beds in fifteen cosy rooms", "openSays": "01/01 - 30/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-thyboroen/prices"},
  {"name": "Danhostel Vitskøl Kloster", "town": "Ranum", "point": "Ranum", "lat": 56.89684355, "lon": 9.22209864, "network": "Danhostel", "dorm": "rooms", "dormSays": "19 rooms with private bathrooms", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-vitskoel-kloster/prices"},
  {"name": "Danhostel Aarhus", "town": "Aarhus", "point": "Risskov", "lat": 56.19868054, "lon": 10.2472112, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms without shower and toilet (1 person) ... Rooms with shower and toilet (6 people)", "openSays": "07/01 - 16/12 and 24/01 - 14/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-aarhus/prices", "note": "In Risskov, north of the centre."},
  {"name": "Danhostel Aarhus City", "town": "Aarhus", "point": "Aarhus", "lat": 56.15701325, "lon": 10.17319421, "network": "Danhostel", "dorm": "dorm", "dormSays": "Large dorms provide space for 6 - 8 backpackers in each room; Bed in shared room without bath and toilet", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-aarhus-city/prices"},
  {"name": "Danhostel Brande", "town": "Brande", "point": "Brande", "lat": 55.94075452, "lon": 9.14408287, "network": "Danhostel", "dorm": "rooms", "dormSays": "Værelse uden/med bad og toilet (1 person) inkl. Linnedpakke to (4 personer)", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/hostel/danhostel-brande/priser"},
  {"name": "Danhostel Fjaltring", "town": "Fjaltring", "point": "Fjaltring", "lat": 56.47377459, "lon": 8.13939838, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room without bath and toilet", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-fjaltring/prices", "note": "Reception open in high season 16.00 to 18.00, otherwise by arrangement."},
  {"name": "Danhostel Gjerrild", "town": "Gjerrild", "point": "Gjerrild", "lat": 56.50617362, "lon": 10.81725519, "network": "Danhostel", "dorm": "rooms", "dormSays": "provides 24 clean, comfortable rooms", "openSays": "01/01 - 23/12", "season": {"from": "01-01", "to": "12-23"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-gjerrild/prices"},
  {"name": "Danhostel Henne Strand", "town": "Henne Strand", "point": "Henne Strand", "lat": 55.73719928, "lon": 8.1820567, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms without shower and toilet (2 people) and (4 people)", "openSays": "open from June 1 to September 15 each year; period listed 03/06 - 28/08", "season": {"from": "06-03", "to": "08-28"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-henne-strand/prices", "note": "Its page gives two different seasons; the narrower is kept."},
  {"name": "Danhostel Horsens", "town": "Horsens", "point": "Horsens", "lat": 55.84223668, "lon": 9.83145229, "network": "Danhostel", "dorm": "unclear", "dormSays": "27 cosy rooms with private bathrooms", "openSays": "02/02 - 01/12", "season": {"from": "02-02", "to": "12-01"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-horsens", "note": "No price table on its page on 26 Sep 2026."},
  {"name": "Danhostel Kjellerup", "town": "Kjellerup", "point": "Kjellerup", "lat": 56.28574856, "lon": 9.43246376, "network": "Danhostel", "dorm": "rooms", "dormSays": "All our nature cabins have private shower/toilet, kitchenette", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-kjellerup/prices", "note": "Six nature cabins rather than hostel rooms."},
  {"name": "Danhostel Ringkøbing", "town": "Ringkøbing", "point": "Ringkøbing", "lat": 56.08710332, "lon": 8.26706868, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) ... Rooms without shower and toilet (3 people)", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-ringkoebing/prices"},
  {"name": "Danhostel Rønde", "town": "Rønde", "point": "Rønde", "lat": 56.30111333, "lon": 10.47337512, "network": "Danhostel", "dorm": "rooms", "dormSays": "15 rooms with private bathrooms", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/hostel/danhostel-roende/priser"},
  {"name": "Danhostel Silkeborg", "town": "Silkeborg", "point": "Silkeborg", "lat": 56.18931697, "lon": 9.57319465, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) to (8 people)", "openSays": "04/02 - 16/12 and 05/01 - 17/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-silkeborg/prices"},
  {"name": "Danhostel Skanderborg", "town": "Skanderborg", "point": "Skanderborg", "lat": 56.04470597, "lon": 9.95201897, "network": "Danhostel", "dorm": "rooms", "dormSays": "16 rooms with private bathrooms and 10 self-contained red log cabins", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-skanderborg/prices"},
  {"name": "Danhostel Vejle", "town": "Vejle", "point": "Vejle", "lat": 55.68867666, "lon": 9.5447795, "network": "Danhostel", "dorm": "rooms", "dormSays": "30 private rooms with toilet and shower", "openSays": "01/01 - 20/12 (Open by agreement)", "source": "https://www.danhostel.dk/en/hostel/danhostel-vejle/prices"},
  {"name": "Danhostel Viborg", "town": "Viborg", "point": "Viborg", "lat": 56.45251738, "lon": 9.38720059, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) to (5 people)", "openSays": "09/01 - 10/12", "season": {"from": "01-09", "to": "12-10"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-viborg/prices"},
  {"name": "Feriehusene Hedensted Centret", "town": "Hedensted", "point": "Hedensted", "lat": 55.77124833, "lon": 9.69769904, "network": "Danhostel", "dorm": "rooms", "dormSays": "Naturhytte med eget bad/toilet og tekøkken (1-2 pers.)", "openSays": "01/05 - 31/12", "season": {"from": "05-01", "to": "12-31"}, "source": "https://www.danhostel.dk/hostel/feriehusene-hedensted-centret-en-del-af-danhostel/priser", "note": "Holiday cabins rather than hostel rooms."},
  {"name": "Danhostel Jels - Thorhallen", "town": "Jels", "point": "Jels", "lat": 55.35353696, "lon": 9.2075189, "network": "Danhostel", "dorm": "rooms", "dormSays": "15 lyse værelser, med eget bad og toilet", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/hostel/danhostel-jels-thorhallen/priser", "note": "No guest kitchen, by its own page."},
  {"name": "Danhostel Esbjerg", "town": "Esbjerg", "point": "Esbjerg", "lat": 55.47534192, "lon": 8.47376144, "network": "Danhostel", "dorm": "unclear", "dormSays": "has 53 rooms - 20 of which have private bathrooms", "openSays": "02/01 - 20/12", "season": {"from": "01-02", "to": "12-20"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-esbjerg", "note": "No price table on its page on 26 Sep 2026."},
  {"name": "Danhostel Fredericia", "town": "Fredericia", "point": "Fredericia", "lat": 55.57588599, "lon": 9.74114059, "network": "Danhostel", "dorm": "rooms", "dormSays": "30 large rooms with private bathrooms", "openSays": "02/01 - 17/12", "season": {"from": "01-02", "to": "12-17"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-fredericia/prices"},
  {"name": "Danhostel Haderslev", "town": "Haderslev", "point": "Haderslev", "lat": 55.25664342, "lon": 9.48845926, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) to (6 people)", "openSays": "01/02 - 17/12", "season": {"from": "02-01", "to": "12-17"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-haderslev/prices"},
  {"name": "Danhostel Kolding", "town": "Kolding", "point": "Kolding", "lat": 55.50459214, "lon": 9.47070748, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms without shower and toilet (1 person) ... Rooms with shower and toilet (8 people)", "openSays": "06/01 - 19/12 and 04/01 - 20/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-kolding/prices"},
  {"name": "Danhostel Ribe", "town": "Ribe", "point": "Ribe", "lat": 55.34929374, "lon": 8.78129543, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room with shower and toilet", "openSays": "06/01 - 22/12", "season": {"from": "01-06", "to": "12-22"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-ribe/prices"},
  {"name": "Danhostel Rødding", "town": "Rødding", "point": "Rødding", "lat": 55.36517717, "lon": 9.05920084, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room without bath and toilet", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-roedding/prices"},
  {"name": "Danhostel Sønderborg-Vollerup", "town": "Sønderborg", "point": "Sønderborg", "lat": 54.91323327, "lon": 9.80560353, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with/without shower and toilet (1 person) to (6 people)", "openSays": "01/01 - 31/10 and 29/02 - 30/11", "source": "https://www.danhostel.dk/en/hostel/danhostel-soenderborg-vollerup/prices"},
  {"name": "Danhostel Tønder", "town": "Tønder", "point": "Tønder", "lat": 54.93823464, "lon": 8.85982712, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room without bath and toilet", "openSays": "02/01 - 22/12", "season": {"from": "01-02", "to": "12-22"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-toender/prices"},
  {"name": "Danhostel Vejen Sport", "town": "Vejen", "point": "Vejen", "lat": 55.47254522, "lon": 9.13646244, "network": "Danhostel", "dorm": "rooms", "dormSays": "8 cabins and 16 rooms - all with private bathrooms", "openSays": "Open all year round", "source": "https://www.danhostel.dk/en/hostel/danhostel-vejen-sport/prices"},
  {"name": "Danhostel Grindsted-Billund", "town": "Grindsted", "point": "Grindsted", "lat": 55.75941937, "lon": 8.91981692, "network": "Danhostel", "dorm": "rooms", "dormSays": "There are 24 rooms with private bathrooms", "openSays": "02/01 - 22/12", "season": {"from": "01-02", "to": "12-22"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-grindsted-billund"},
  {"name": "Danhostel Skjern", "town": "Skjern", "point": "Skjern", "lat": 55.94726836, "lon": 8.49882845, "network": "Danhostel", "dorm": "rooms", "dormSays": "10 hytter, alle med eget bad/toilet + 5 dejlige lyse værelser med eget bad/toilet", "openSays": "Hver dag 21/05 - 31/12", "season": {"from": "05-21", "to": "12-31"}, "source": "https://www.danhostel.dk/hostel/danhostel-skjern/priser"},
  {"name": "Danhostel Copenhagen City", "town": "Copenhagen", "point": "Indre By", "lat": 55.68544929, "lon": 12.58794503, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room with shower and toilet", "openSays": "01/01 - 02/12", "season": {"from": "01-01", "to": "12-02"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-copenhagen-city/prices"},
  {"name": "Danhostel Faxe", "town": "Faxe", "point": "Faxe", "lat": 55.25024591, "lon": 12.11364366, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) ... (5 people)", "openSays": "02/01 - 20/12", "season": {"from": "01-02", "to": "12-20"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-faxe/prices"},
  {"name": "Danhostel Helsingør", "town": "Helsingør", "point": "Helsingør", "lat": 56.02966493, "lon": 12.58487442, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) ... Rooms without shower and toilet (6 people)", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-helsingoer/prices"},
  {"name": "Danhostel Hillerød", "town": "Hillerød", "point": "Hillerød", "lat": 55.93202436, "lon": 12.29686564, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) ... (4 people)", "openSays": "05/01 - 10/12", "season": {"from": "01-05", "to": "12-10"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-hilleroed/prices"},
  {"name": "Danhostel Ishøj Strand", "town": "Ishøj", "point": "Ishøj", "lat": 55.61310033, "lon": 12.35631599, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) ... (6 people)", "openSays": "02/01 - 19/12", "season": {"from": "01-02", "to": "12-19"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-ishoj-strand/prices"},
  {"name": "Danhostel Maribo", "town": "Maribo", "point": "Maribo", "lat": 54.77613191, "lon": 11.50681936, "network": "Danhostel", "dorm": "rooms", "dormSays": "Naturhytte med eget bad/toilet og tekøkken (1-2 pers.)", "source": "https://www.danhostel.dk/hostel/danhostel-maribo/priser"},
  {"name": "Danhostel Ringsted", "town": "Ringsted", "point": "Ringsted", "lat": 55.44525157, "lon": 11.7992951, "network": "Danhostel", "dorm": "rooms", "dormSays": "16 family rooms, all with private bathrooms", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-ringsted/prices"},
  {"name": "Danhostel Roskilde", "town": "Roskilde", "point": "Roskilde", "lat": 55.63659446, "lon": 12.08713962, "network": "Danhostel", "dorm": "rooms", "dormSays": "Værelser med bad og toilet (1 pers) ... ( 6 pers)", "openSays": "We are open all year, also during Christmas and New Year.", "source": "https://www.danhostel.dk/hostel/danhostel-roskilde/priser"},
  {"name": "Danhostel Sakskøbing", "town": "Sakskøbing", "point": "Sakskøbing", "lat": 54.79743986, "lon": 11.63114645, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) ... (6 people)", "openSays": "01/01 - 31/12", "source": "https://www.danhostel.dk/en/hostel/danhostel-sakskoebing/prices"},
  {"name": "Danhostel Stevns", "town": "Store Heddinge", "point": "Store Heddinge", "lat": 55.30804025, "lon": 12.38268422, "network": "Danhostel", "dorm": "unclear", "dormSays": "fire store familieværelser med køjesenge", "openSays": "open all year round", "source": "https://www.danhostel.dk/en/hostel/danhostel-stevns", "note": "Price table did not load on 26 Sep 2026."},
  {"name": "Danhostel Vordingborg", "town": "Vordingborg", "point": "Vordingborg", "lat": 55.01217411, "lon": 11.90764182, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room with shower and toilet", "openSays": "02/01 - 20/12", "season": {"from": "01-02", "to": "12-20"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-vordingborg/prices"},
  {"name": "Danhostel Svendborg", "town": "Svendborg", "point": "Svendborg", "lat": 55.05885114, "lon": 10.59325557, "network": "Danhostel", "dorm": "dorm", "dormSays": "Bed in shared room with shower and toilet", "openSays": "02/01 - 17/12", "season": {"from": "01-02", "to": "12-17"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-svendborg/prices"},
  {"name": "Danhostel Sandvig", "town": "Sandvig", "point": "Sandvig", "lat": 55.28717387, "lon": 14.78030837, "network": "Danhostel", "dorm": "rooms", "dormSays": "Rooms with shower and toilet (1 person) ... (6 people)", "openSays": "18/04 - 27/09", "season": {"from": "04-18", "to": "09-27"}, "source": "https://www.danhostel.dk/en/hostel/danhostel-sandvig/prices", "note": "On Bornholm."},
  {"name": "Generator Copenhagen", "town": "Copenhagen", "point": "Indre By", "lat": 55.68544929, "lon": 12.58794503, "network": "private", "dorm": "dorm", "dormSays": "Book one bed (or more) in this shared room ... Bed in 6-bed Female Dorm", "dormAdultsOnly": true, "ageSays": "Under 18s are considered for private rooms only", "source": "https://staygenerator.com/hostels/copenhagen"},
  {"name": "Steel House Copenhagen", "town": "Copenhagen", "point": "Vesterbro", "lat": 55.66607449, "lon": 12.55179417, "network": "private", "dorm": "dorm", "dormSays": "Choose from our modern 6-bed dorms and 4-bed dorms, or book one of our double rooms or single rooms", "dormAdultsOnly": true, "ageSays": "Guests under 18 years old must stay in private rooms with a parent or guardian", "source": "https://www.steelhousecopenhagen.com/dorms-and-private-rooms"},
  {"name": "Next House Copenhagen", "town": "Copenhagen", "point": "Vesterbro", "lat": 55.66607449, "lon": 12.55179417, "network": "private", "dorm": "dorm", "dormSays": "6-bed Dorms ... 4-bed Dorms (bookable per bed or privately)", "dormAdultsOnly": true, "ageSays": "Anyone under 18 years old must stay in private rooms with a parent or guardian.", "source": "https://www.nexthousecopenhagen.com/dorms-and-beds"},
  {"name": "MEININGER Hotel Copenhagen", "town": "Copenhagen", "point": "Vesterbro", "lat": 55.66607449, "lon": 12.55179417, "network": "private", "dorm": "dorm", "dormSays": "Bed in mixed dorm (max. 6 beds) / Bed in mixed dorm (max. 10 beds) / Bed in female dorm", "dormAdultsOnly": true, "ageSays": "Min. age: 18+", "source": "https://www.meininger-hotels.com/en/hotels/copenhagen/hotel-copenhagen/", "note": "Calls itself a hotel, formerly Urban House, and sells dorm beds."},
  {"name": "Copenhagen Downtown Hostel", "town": "Copenhagen", "point": "Indre By", "lat": 55.68544929, "lon": 12.58794503, "network": "private", "dorm": "dorm", "dormSays": "Choose from shared dorms, private capsules (DreamBoks), or ensuite rooms", "source": "https://www.copenhagendowntown.com/rooms"},
  {"name": "Sleep in Heaven", "town": "Copenhagen", "point": "Nørrebro", "lat": 55.69759421, "lon": 12.5552861, "network": "private", "dorm": "dorm", "dormSays": "Dorms and private rooms at great prices", "dormAdultsOnly": true, "ageSays": "18 to 39 years for dormitories; no age limit for private rooms. Children are not allowed in the dormitories, even when accompanied by adults.", "source": "https://sleepinheaven.com/en/faq"},
  {"name": "Urban Camper Hostel", "town": "Copenhagen", "point": "Bispebjerg", "lat": 55.71033057, "lon": 12.53044141, "network": "private", "dorm": "dorm", "dormSays": "Sleep in a four-bed indoor tent and experience the social side of hostel life", "source": "https://urbancamper.dk/", "note": "In Nordvest; the coordinate is Bispebjerg's, the district Nordvest is part of."},
  {"name": "a&o København Nørrebro", "town": "Copenhagen", "point": "Nørrebro", "lat": 55.69759421, "lon": 12.5552861, "network": "private", "dorm": "dorm", "dormSays": "Shared rooms start from twelve euros", "dormAdultsOnly": true, "ageSays": "Guests under the age of 18 may only stay in private rooms.", "source": "https://www.aohostels.com/en/copenhagen/"},
  {"name": "a&o København Sydhavn", "town": "Copenhagen", "point": "Sydhavn", "lat": 55.65009536, "lon": 12.55210271, "network": "private", "dorm": "dorm", "dormSays": "dorm rooms", "dormAdultsOnly": true, "ageSays": "Guests under the age of 18 may only stay in private rooms.", "source": "https://www.aohostels.com/en/copenhagen/"},
  {"name": "Roberta's Society", "town": "Aarhus", "point": "Aarhus", "lat": 56.15701325, "lon": 10.17319421, "network": "private", "dorm": "dorm", "dormSays": "Single bed in mixed 8-pax dorm / Single bed in mixed 10-pax dorm / Single bed in female-only dorm", "source": "https://robertassociety.com/rooms/"},
  {"name": "Gudhjem Hostel", "town": "Gudhjem", "point": "Gudhjem", "lat": 55.20669492, "lon": 14.972068, "network": "private", "dorm": "unclear", "dormSays": "dormitories for 2-8 people", "source": "https://gudhjemvandrerhjem.dk/en/", "note": "Its site does not say whether a dormitory is sold per bed or as a whole room. On Bornholm."},
  {"name": "Danhostel Kerteminde", "town": "Kerteminde", "point": "Kerteminde", "lat": 55.45452967, "lon": 10.65369317, "network": "unconfirmed", "dorm": "unclear", "dormSays": "køjesengsværelser med 5 køjer ... egen indgang, eget bad & toilet", "source": "https://dkhostel.dk/", "note": "Uses the Danhostel name on its own site but is not in danhostel.dk's current list, so the membership is unconfirmed."},
];

// ── THE SOMMERHUS AREAS ─────────────────────────────────────────────
//
// You cannot list the houses. There are tens of thousands, they are let through
// agencies and what is free changes by the week. What you CAN list is where they
// are: the named stretches of coast a Dane would search. Each row was confirmed
// on a holiday-house agency's own area page (`source`), and `agencies` names
// only the agencies whose own pages showed the area.
//
// `coast` is the water the area faces. Where a source named it, that name is
// used; the agencies call the stretch from Hirtshals to Hanstholm Jammerbugt
// (Wikipedia calls Lønstrup's coast Skagerrak), and Jammerbugt is used here
// because it is the name the agencies and Danes use and it is not in dispute.
// `kmToTown` is set only where the agency page states that distance.
//
// Coordinates are the village's, from the Danish place-name register, except
// Løkken, Lønstrup and Blokhus, which are Wikipedia's.
//
// NOT HERE, AND WHY: what is near each area. That is WORKED OUT from Gemlyx's
// own published places when a guide is built (see utils/stayAwareness.js), so a
// park added to the app tomorrow is near the right coast without anybody
// editing this list.
export const HOUSE_AREAS = [
  {"name": "Kandestederne", "nearTown": "Skagen", "coast": "Skagerrak", "region": "North Jutland", "lat": 57.66280512, "lon": 10.39174181, "agencies": ["Sol og Strand", "Novasol"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/skagen/kandestederne"},
  {"name": "Tversted", "nearTown": "Hirtshals", "coast": "Skagerrak", "region": "North Jutland", "lat": 57.59179746, "lon": 10.19805694, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/tornby-tversted/tversted"},
  {"name": "Skallerup", "nearTown": "Lønstrup", "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.50019952, "lon": 9.86573579, "agencies": ["Sol og Strand"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/lonstrup-norlev/skallerup"},
  {"name": "Lønstrup", "nearTown": "Hjørring", "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.46889, "lon": 9.79917, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/lonstrup-norlev/lonstrup"},
  {"name": "Nørlev Strand", "nearTown": "Lønstrup", "kmToTown": 5, "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.50759655, "lon": 9.86079489, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/lonstrup-norlev/norlev"},
  {"name": "Løkken", "nearTown": "Hjørring", "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.37056, "lon": 9.71667, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/lokken-nr-lyngby/lokken"},
  {"name": "Grønhøj", "nearTown": "Løkken", "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.32606282, "lon": 9.67452226, "agencies": ["Sol og Strand", "Novasol"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/gronhoj/gronhoj"},
  {"name": "Blokhus", "nearTown": "Løkken", "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.25222, "lon": 9.58417, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/blokhus/blokhus"},
  {"name": "Rødhus", "nearTown": "Blokhus", "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.22291646, "lon": 9.55578378, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/rodhus-tranum/rodhus"},
  {"name": "Lild Strand", "nearTown": "Frøstrup", "kmToTown": 7, "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.15197622, "lon": 8.96441011, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/rodhus-tranum/lild-strand"},
  {"name": "Slettestrand", "nearTown": "Fjerritslev", "coast": "Jammerbugt", "region": "North Jutland", "lat": 57.15118765, "lon": 9.37073597, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/rodhus-tranum/slettestrand"},
  {"name": "Klitmøller", "nearTown": "Thisted", "coast": "North Sea", "region": "North Jutland", "lat": 57.03762616, "lon": 8.49954323, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/vorupor-klitmoller/klitmoller"},
  {"name": "Vorupør", "nearTown": "Thisted", "kmToTown": 20, "coast": "North Sea", "region": "North Jutland", "lat": 56.95156817, "lon": 8.37941005, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/vorupor-klitmoller/vorupor"},
  {"name": "Agger", "nearTown": "Thisted", "coast": "North Sea", "region": "North Jutland", "lat": 56.78319767, "lon": 8.24060423, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/nordvestjylland/vorupor-klitmoller/agger"},
  {"name": "Ålbæk", "nearTown": "Skagen", "coast": "Kattegat", "region": "North Jutland", "lat": 57.59344894, "lon": 10.41552174, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/nordostjylland/bratten-frederikshavn/albaek"},
  {"name": "Lyngså", "nearTown": "Sæby", "kmToTown": 10, "coast": "Kattegat", "region": "North Jutland", "lat": 57.24774143, "lon": 10.51455049, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/nordostjylland/lyngsa-saeby/lyngsa"},
  {"name": "Hals", "nearTown": "Aalborg", "coast": "Kattegat", "region": "North Jutland", "lat": 56.9983897, "lon": 10.30458098, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/nordostjylland/hou-hals/hals"},
  {"name": "Hou", "nearTown": "Hals", "coast": "Kattegat", "region": "North Jutland", "lat": 57.05736114, "lon": 10.37038318, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/nordostjylland/hou-hals/hou"},
  {"name": "Øster Hurup", "nearTown": "Hadsund", "coast": "Kattegat", "region": "North Jutland", "lat": 56.81374487, "lon": 10.26661482, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/nordostjylland/oster-hurup/oster-hurup"},
  {"name": "Læsø", "nearTown": "Frederikshavn", "kmToTown": 19, "coast": "Kattegat", "region": "Læsø", "lat": 57.26614235, "lon": 11.0080114, "agencies": ["Sol og Strand"], "source": "https://www.sologstrand.dk/regioner/nordostjylland/laeso"},
  {"name": "Fur", "nearTown": "Skive", "coast": "Limfjord", "region": "Fur", "lat": 56.82523498, "lon": 9.00109574, "agencies": ["Dansommer", "Novasol"], "source": "https://www.dansommer.dk/danmark/nordjylland/fur-limfjorden"},
  {"name": "Vejlby Klit", "nearTown": "Lemvig", "kmToTown": 15, "coast": "North Sea", "region": "West Jutland", "lat": 56.57702102, "lon": 8.13905883, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/vejlby-klit-vrist/vejlby-klit"},
  {"name": "Thorsminde", "nearTown": "Holstebro", "coast": "North Sea", "region": "West Jutland", "lat": 56.3742453, "lon": 8.1222957, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/sdr-nissum-vester-husby/thorsminde"},
  {"name": "Vedersø Klit", "nearTown": "Ringkøbing", "kmToTown": 25, "coast": "North Sea", "region": "West Jutland", "lat": 56.25517079, "lon": 8.14095366, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/sdr-nissum-vester-husby/vederso-klit"},
  {"name": "Søndervig", "nearTown": "Ringkøbing", "coast": "North Sea", "region": "West Jutland", "lat": 56.10042086, "lon": 8.11815923, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/sondervig-houvig/sondervig"},
  {"name": "Hvide Sande", "nearTown": "Ringkøbing", "coast": "North Sea", "region": "West Jutland", "lat": 56.01682272, "lon": 8.12410871, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/hvide-sande/hvide-sande"},
  {"name": "Årgab", "nearTown": "Hvide Sande", "coast": "North Sea", "region": "West Jutland", "lat": 55.95290122, "lon": 8.14967327, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/bjerregaard/argab"},
  {"name": "Bork Havn", "nearTown": "Nørre Nebel", "coast": "Ringkøbing Fjord", "region": "West Jutland", "lat": 55.84415949, "lon": 8.28098395, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/stauning-skaven-bork/bork-havn"},
  {"name": "Nymindegab", "nearTown": "Hvide Sande", "kmToTown": 24, "coast": "North Sea", "region": "West Jutland", "lat": 55.81519153, "lon": 8.20024888, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/bjerregaard/nymindegab"},
  {"name": "Henne Strand", "nearTown": "Nørre Nebel", "coast": "North Sea", "region": "West Jutland", "lat": 55.73719928, "lon": 8.1820567, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/vejers/henne"},
  {"name": "Vejers Strand", "nearTown": "Blåvand", "kmToTown": 15, "coast": "North Sea", "region": "West Jutland", "lat": 55.62773878, "lon": 8.13039715, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/vejers/vejers-strand"},
  {"name": "Houstrup", "nearTown": "Nørre Nebel", "coast": "North Sea", "region": "West Jutland", "lat": 55.76021996, "lon": 8.25286092, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/vejers/houstrup"},
  {"name": "Blåvand", "nearTown": "Esbjerg", "coast": "North Sea", "region": "West Jutland", "lat": 55.55606946, "lon": 8.10760805, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/blavand/blavand"},
  {"name": "Fanø", "nearTown": "Esbjerg", "coast": "Wadden Sea", "region": "Fanø", "lat": 55.40607728, "lon": 8.42104862, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/fano"},
  {"name": "Rømø", "nearTown": "Skærbæk", "coast": "Wadden Sea", "region": "Rømø", "lat": 55.11525744, "lon": 8.51259587, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/jyllands-vestkyst/romo"},
  {"name": "Kegnæs", "nearTown": "Sønderborg", "coast": "Flensborg Fjord", "region": "Als", "lat": 54.87783698, "lon": 9.89734358, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/sydostjylland/als/kegnaes"},
  {"name": "Nordborg", "nearTown": "Sønderborg", "coast": "Little Belt", "region": "Als", "lat": 55.05196767, "lon": 9.75514961, "agencies": ["Dansommer"], "source": "https://www.dansommer.dk/danmark/als/nordborg"},
  {"name": "Hejlsminde", "nearTown": "Christiansfeld", "kmToTown": 10, "coast": "Little Belt", "region": "South Jutland", "lat": 55.3673756, "lon": 9.60064579, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sydostjylland/oestjylland-midt/hejlsminde"},
  {"name": "Juelsminde", "nearTown": "Horsens", "coast": "Kattegat", "region": "East Jutland", "lat": 55.70603616, "lon": 10.0137523, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/sydostjylland/juelsminde/juelsminde"},
  {"name": "Saksild Strand", "nearTown": "Odder", "kmToTown": 6, "coast": "Kattegat", "region": "East Jutland", "lat": 55.98082067, "lon": 10.24873284, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/sydostjylland/odderkysten/saksild-strand"},
  {"name": "Samsø", "nearTown": "Aarhus", "coast": "Kattegat", "region": "Samsø", "lat": 55.80309284, "lon": 10.58614383, "agencies": ["Dansommer", "Novasol", "Feriepartner"], "source": "https://www.dansommer.dk/danmark/oestjylland/samsoe"},
  {"name": "Ebeltoft", "nearTown": "Aarhus", "coast": "Ebeltoft Vig", "region": "Djursland", "lat": 56.21392817, "lon": 10.68468195, "agencies": ["Sol og Strand", "Dansommer", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/djursland-og-mols/ebeltoft/ebeltoft"},
  {"name": "Fjellerup Strand", "nearTown": "Grenaa", "coast": "Kattegat", "region": "Djursland", "lat": 56.51650936, "lon": 10.61441137, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/djursland-og-mols/fjellerup/fjellerup-strand"},
  {"name": "Skødshoved Strand", "nearTown": "Aarhus", "coast": "Kattegat", "region": "Djursland", "lat": 56.17925474, "lon": 10.38129922, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/djursland-og-mols/mols/skodshoved"},
  {"name": "Grenaa Strand", "nearTown": "Grenaa", "coast": "Kattegat", "region": "Djursland", "lat": 56.39627642, "lon": 10.91233906, "agencies": ["Sol og Strand", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/djursland-og-mols/grena-strand/grena-strand"},
  {"name": "Følle Strand", "nearTown": "Rønde", "coast": "Kalø Vig", "region": "Djursland", "lat": 56.29808233, "lon": 10.43152802, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/djursland-og-mols/folle-strand/folle-strand"},
  {"name": "Knebel", "nearTown": "Ebeltoft", "coast": "Kalø Vig", "region": "Djursland", "lat": 56.21308589, "lon": 10.48460011, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/djursland-og-mols/mols/knebel"},
  {"name": "Hasmark Strand", "nearTown": "Otterup", "coast": "Kattegat", "region": "Funen", "lat": 55.55998799, "lon": 10.46291701, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/fyn-og-oer/nordost-fyn/hasmark"},
  {"name": "Bogense", "nearTown": "Odense", "coast": "Kattegat", "region": "Funen", "lat": 55.56424263, "lon": 10.09044839, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/fyn-og-oer/nordvest-fyn/bogense"},
  {"name": "Hou (Langeland)", "nearTown": "Lohals", "kmToTown": 3, "coast": "Great Belt", "region": "Langeland", "lat": 55.15354198, "lon": 10.93303928, "agencies": ["Sol og Strand"], "source": "https://www.sologstrand.dk/regioner/fyn-og-oer/langeland/hov-langeland"},
  {"name": "Spodsbjerg", "nearTown": "Rudkøbing", "kmToTown": 9, "coast": "Langelandsbæltet", "region": "Langeland", "lat": 54.92383451, "lon": 10.82030419, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/fyn-og-oer/langeland/spodsbjerg"},
  {"name": "Ristinge", "nearTown": "Rudkøbing", "coast": "Baltic", "region": "Langeland", "lat": 54.82464735, "lon": 10.6324481, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/fyn-og-oer/langeland/ristinge"},
  {"name": "Bagenkop", "nearTown": "Rudkøbing", "coast": "Baltic", "region": "Langeland", "lat": 54.74901079, "lon": 10.67489525, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/fyn-og-oer/langeland/bagenkop"},
  {"name": "Ærø", "nearTown": "Marstal", "coast": "South Funen Archipelago", "region": "Ærø", "lat": 54.85586896, "lon": 10.39952748, "agencies": ["Sol og Strand", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/fyn-og-oer/sydost-fyn/marstal-aero"},
  {"name": "Hornbæk", "nearTown": "Helsingør", "coast": "Kattegat", "region": "Zealand", "lat": 56.08524852, "lon": 12.43955626, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordost-sjaelland/hornbaek"},
  {"name": "Dronningmølle", "nearTown": "Gilleleje", "coast": "Kattegat", "region": "Zealand", "lat": 56.09443903, "lon": 12.38453404, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordost-sjaelland/dronningmolle"},
  {"name": "Gilleleje", "nearTown": "Helsingør", "coast": "Kattegat", "region": "Zealand", "lat": 56.12167874, "lon": 12.29845218, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordost-sjaelland/gilleleje"},
  {"name": "Vejby Strand", "nearTown": "Helsinge", "coast": "Kattegat", "region": "Zealand", "lat": 56.08222349, "lon": 12.135808, "agencies": ["Sol og Strand"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordost-sjaelland/vejby-strand"},
  {"name": "Tisvildeleje", "nearTown": "Helsinge", "coast": "Kattegat", "region": "Zealand", "lat": 56.05950049, "lon": 12.08271359, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordost-sjaelland/tisvildeleje"},
  {"name": "Liseleje", "nearTown": "Frederiksværk", "coast": "Kattegat", "region": "Zealand", "lat": 56.00540679, "lon": 12.00670363, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordost-sjaelland/liseleje"},
  {"name": "Rørvig", "nearTown": "Nykøbing Sjælland", "coast": "Kattegat", "region": "Zealand", "lat": 55.94279357, "lon": 11.75140132, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordvest-sjaelland/rorvig"},
  {"name": "Sjællands Odde", "nearTown": "Nykøbing Sjælland", "coast": "Kattegat", "region": "Zealand", "lat": 55.94984699, "lon": 11.48755193, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordvest-sjaelland/sjaellands-odde"},
  {"name": "Gudmindrup Lyng", "nearTown": "Nykøbing Sjælland", "coast": "Sejerø Bugt", "region": "Zealand", "lat": 55.90891472, "lon": 11.53658721, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/nordvest-sjaelland/gudmindrup-lyng"},
  {"name": "Drøsselbjerg", "nearTown": "Kalundborg", "coast": "Great Belt", "region": "Zealand", "lat": 55.47081669, "lon": 11.20944454, "agencies": ["Sol og Strand", "Dansommer", "Novasol"], "source": "https://www.sologstrand.dk/regioner/sjaelland/sydvest-sjaelland/drosselbjerg"},
  {"name": "Rødvig", "nearTown": "Store Heddinge", "coast": "Baltic", "region": "Zealand", "lat": 55.25124169, "lon": 12.35793866, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/sjaelland/sydost-sjaelland/rodvig"},
  {"name": "Ulvshale", "nearTown": "Stege", "kmToTown": 6, "coast": "Baltic", "region": "Møn", "lat": 55.04554839, "lon": 12.24927537, "agencies": ["Sol og Strand", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/lolland-falster-og-mon/mon-bogo/ulvshale"},
  {"name": "Marielyst", "nearTown": "Nykøbing Falster", "coast": "Baltic", "region": "Lolland-Falster", "lat": 54.68459427, "lon": 11.95763054, "agencies": ["Sol og Strand", "Dansommer", "Novasol", "Feriepartner"], "source": "https://www.sologstrand.dk/regioner/lolland-falster-og-mon/falster/marielyst"},
  {"name": "Hummingen", "nearTown": "Maribo", "coast": "Baltic", "region": "Lolland-Falster", "lat": 54.71558126, "lon": 11.22180227, "agencies": ["Sol og Strand"], "source": "https://www.sologstrand.dk/regioner/lolland-falster-og-mon/lolland/hummingen"},
  {"name": "Balka", "nearTown": "Nexø", "coast": "Baltic", "region": "Bornholm", "lat": 55.04190022, "lon": 15.10833288, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/bornholm/bornholm-syd-dueodde/balka"},
  {"name": "Dueodde", "nearTown": "Nexø", "kmToTown": 10, "coast": "Baltic", "region": "Bornholm", "lat": 54.99019534, "lon": 15.07675692, "agencies": ["Sol og Strand", "Dansommer"], "source": "https://www.sologstrand.dk/regioner/bornholm/bornholm-syd-dueodde/dueodde"},
];
