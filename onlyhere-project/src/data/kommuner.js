// ── THE 98 KOMMUNER, SO A COORDINATE CAN NAME ITS OWN CORNER ────────
//
// Oliver, 13 Aug 2026, from notes taken at work: "We need to have regions of
// Denmark in 'specific' regions. So I can put 'visitsønderjylland.dk' as a
// source for Sønderjylland."
//
// The source panel already scopes a source to a TOWN or to one of five
// landmasses, and neither answers him. Scoped to Jutland, VisitSønderjylland
// fires on a Skagen draft, three hundred kilometres away. Scoped to a town, it
// fires on Tønder and not on Sønderborg, Aabenraa, Haderslev, Rømø or
// Møgeltønder, so he would need one row per town and would still miss the next
// one he publishes. What is missing is the tier in between.
//
// ── WHY KOMMUNER AND NOT HAND-DRAWN REGION OUTLINES ─────────────────
// Because a region border is a FACT and I should not be the one inventing it.
// Destination Sønderjylland's own site names the four kommuner it covers:
// Haderslev, Aabenraa, Sønderborg and Tønder. That sentence is the border. A
// coarse polygon I drew by eye would be my guess at the same line, it would be
// wrong by a few kilometres somewhere along the Kongeå, and nothing in the app
// would ever say so.
//
// So a region is a LIST OF KOMMUNER, and the only geography here is the
// kommune map, which is not mine and does not move.
//
// ── WHERE THESE NUMBERS CAME FROM ───────────────────────────────────
// api.dataforsyningen.dk/kommuner, the Danish state's own address register,
// fetched 13 Aug 2026. Two things per kommune:
//
//   lat, lon    the "visuelt center", which is a point the register guarantees
//               is INSIDE the kommune. Not a centroid: the centroid of a
//               C-shaped kommune can fall outside it, and several Danish
//               kommuner are that shape.
//   bbox        south, west, north, east
//
// Rounded to five decimals, which is about a metre, because more digits than
// the answer deserves is its own small lie.
//
// ── THE BBOX IS THE FILTER, THE CENTRE IS THE TIE-BREAK ─────────────
// Nearest-centre alone is a Voronoi diagram, and Danish kommuner are nowhere
// near equal in size: Ringkøbing-Skjern is forty times København. Voronoi puts
// the Sønderjylland border about fifteen kilometres south of the Kongeå,
// which would quietly file Christiansfeld under the wrong tourist board.
//
// Filtering by bbox first fixes the cases that matter, because a bbox is real
// data rather than an inference. Boxes overlap, so it narrows rather than
// decides, and the centre distance settles it among whatever is left. Checked
// by hand on the awkward ones before it shipped: Christiansfeld resolves to
// Kolding, Ribe to Esbjerg, Rømø to Tønder, Skagen to Frederikshavn.
//
// ── FOURTEEN KOMMUNER HAVE NO REGION, DELIBERATELY ──────────────────
// Funen, Lolland-Falster and Bornholm are already answered by the landmass
// they sit on, and inventing "Nordfyn" as a scope nobody asked for would be a
// pill that returns nothing, which is the exact failure the towns page shipped
// once. Regions subdivide Jutland and Zealand, because those are the two big
// enough to need it. See utils/regions.js for the twelve and for why they are
// the everyday areas rather than the five administrative ones.
//
// ── AND THE LANDMASS, WHICH THE FIVE OUTLINES GET WRONG ─────────────
// Found 13 Aug 2026 by a test asserting the region and the landmass could not
// disagree. They did, twice, and both were already live.
//
// SAMSØ ANSWERED DIFFERENTLY DEPENDING ON WHERE ON IT YOU STOOD. Measured
// against DK_SHAPES: the north tip is 23.0 km from Jutland, the centre is
// 26.2 km from FUNEN, the south tip 23.7 km from Funen. One island, three
// points twenty-six kilometres apart, two different answers, and the towns
// page was showing Samsø under the Funen pill. Samsø Kommune is in Region
// Midtjylland and its ferry runs from Hou in Jutland.
//
// ANHOLT HAD NO LANDMASS AT ALL. geography.js says in its own comment that
// Anholt "sits around 40 km from the Jutland coast" and sizes MAX_OFFSHORE_KM
// at 45 on the strength of it. It measures 49.7 km. So the cap was set from an
// estimate ten kilometres short, Anholt fell past it, and the island was
// invisible in every geography filter and counted as unplaced.
//
// Both are the same thing: five coarse hand-drawn outlines being asked a
// question they cannot answer about an offshore island. A kommune knows which
// landmass it is on, so it says, and partOfCountry asks here first.
//
// kode, name, lat, lon, south, west, north, east, region, part
export const KOMMUNER = [
  ["0101", "København", 55.70409, 12.49391, 55.60647, 12.44441, 55.73588, 12.73659, "Storkøbenhavn", "Zealand"],
  ["0147", "Frederiksberg", 55.67937, 12.52373, 55.66557, 12.49028, 55.69897, 12.55874, "Storkøbenhavn", "Zealand"],
  ["0151", "Ballerup", 55.72707, 12.36852, 55.69631, 12.25959, 55.76439, 12.43016, "Storkøbenhavn", "Zealand"],
  ["0153", "Brøndby", 55.64504, 12.40438, 55.60626, 12.35917, 55.67369, 12.46197, "Storkøbenhavn", "Zealand"],
  ["0155", "Dragør", 55.59381, 12.65023, 55.53632, 12.55362, 55.61098, 12.71833, "Storkøbenhavn", "Zealand"],
  ["0157", "Gentofte", 55.75098, 12.55072, 55.72128, 12.49621, 55.78205, 12.60726, "Storkøbenhavn", "Zealand"],
  ["0159", "Gladsaxe", 55.73987, 12.4762, 55.71507, 12.41269, 55.77743, 12.52568, "Storkøbenhavn", "Zealand"],
  ["0161", "Glostrup", 55.69596, 12.40923, 55.65733, 12.36701, 55.71057, 12.43413, "Storkøbenhavn", "Zealand"],
  ["0163", "Herlev", 55.74142, 12.42582, 55.70677, 12.38949, 55.7599, 12.4624, "Storkøbenhavn", "Zealand"],
  ["0165", "Albertslund", 55.68497, 12.35232, 55.64055, 12.30671, 55.71188, 12.39868, "Storkøbenhavn", "Zealand"],
  ["0167", "Hvidovre", 55.63137, 12.46855, 55.59723, 12.42234, 55.6675, 12.51012, "Storkøbenhavn", "Zealand"],
  ["0169", "Høje-Taastrup", 55.66696, 12.25783, 55.60097, 12.14527, 55.71114, 12.35246, "Storkøbenhavn", "Zealand"],
  ["0173", "Lyngby-Taarbæk", 55.78319, 12.51127, 55.75671, 12.41201, 55.81406, 12.59889, "Storkøbenhavn", "Zealand"],
  ["0175", "Rødovre", 55.68181, 12.44866, 55.66409, 12.42246, 55.71569, 12.48267, "Storkøbenhavn", "Zealand"],
  ["0183", "Ishøj", 55.62238, 12.33446, 55.59303, 12.20777, 55.6412, 12.40354, "Storkøbenhavn", "Zealand"],
  ["0185", "Tårnby", 55.59508, 12.55128, 55.56413, 12.50577, 55.68026, 12.82943, "Storkøbenhavn", "Zealand"],
  ["0187", "Vallensbæk", 55.63854, 12.36572, 55.60935, 12.33871, 55.65683, 12.40868, "Storkøbenhavn", "Zealand"],
  ["0190", "Furesø", 55.7854, 12.37121, 55.75164, 12.29188, 55.85335, 12.44537, "Nordsjælland", "Zealand"],
  ["0201", "Allerød", 55.85193, 12.31518, 55.80974, 12.20603, 55.90345, 12.4294, "Nordsjælland", "Zealand"],
  ["0210", "Fredensborg", 55.94249, 12.44709, 55.88299, 12.34086, 56.01533, 12.55163, "Nordsjælland", "Zealand"],
  ["0217", "Helsingør", 56.04907, 12.48168, 55.97299, 12.38517, 56.09798, 12.62943, "Nordsjælland", "Zealand"],
  ["0219", "Hillerød", 55.93428, 12.25951, 55.84073, 12.07305, 56.01043, 12.40267, "Nordsjælland", "Zealand"],
  ["0223", "Hørsholm", 55.88879, 12.51146, 55.8518, 12.39488, 55.91685, 12.56686, "Nordsjælland", "Zealand"],
  ["0230", "Rudersdal", 55.83467, 12.4757, 55.79046, 12.38898, 55.88014, 12.58857, "Storkøbenhavn", "Zealand"],
  ["0240", "Egedal", 55.7861, 12.21451, 55.69289, 12.10266, 55.83077, 12.35203, "Nordsjælland", "Zealand"],
  ["0250", "Frederikssund", 55.78186, 11.97283, 55.70924, 11.84323, 55.93903, 12.23827, "Nordsjælland", "Zealand"],
  ["0253", "Greve", 55.58551, 12.24574, 55.55029, 12.13562, 55.62562, 12.36543, "Storkøbenhavn", "Zealand"],
  ["0259", "Køge", 55.4573, 12.07254, 55.36451, 11.90061, 55.53656, 12.24028, "Midt- og Vestsjælland", "Zealand"],
  ["0260", "Halsnæs", 55.99571, 12.0027, 55.87735, 11.6539, 56.2052, 12.14478, "Nordsjælland", "Zealand"],
  ["0265", "Roskilde", 55.62237, 12.10731, 55.51075, 11.96846, 55.78354, 12.25656, "Midt- og Vestsjælland", "Zealand"],
  ["0269", "Solrød", 55.53274, 12.17912, 55.50684, 12.0924, 55.56922, 12.25588, "Storkøbenhavn", "Zealand"],
  ["0270", "Gribskov", 56.0644, 12.28643, 55.96222, 12.00419, 56.13737, 12.41973, "Nordsjælland", "Zealand"],
  ["0306", "Odsherred", 55.85125, 11.60074, 55.72537, 11.26094, 56.01064, 11.79587, "Midt- og Vestsjælland", "Zealand"],
  ["0316", "Holbæk", 55.6701, 11.54591, 55.505, 11.34355, 55.81899, 11.87587, "Midt- og Vestsjælland", "Zealand"],
  ["0320", "Faxe", 55.27387, 12.09363, 55.12861, 11.81971, 55.40819, 12.29735, "Sydsjælland og Møn", "Zealand"],
  ["0326", "Kalundborg", 55.65988, 11.229, 55.45596, 10.85523, 55.92302, 11.48251, "Midt- og Vestsjælland", "Zealand"],
  ["0329", "Ringsted", 55.46909, 11.81511, 55.34902, 11.62791, 55.56821, 11.99178, "Midt- og Vestsjælland", "Zealand"],
  ["0330", "Slagelse", 55.36607, 11.34509, 55.13308, 10.93617, 55.51866, 11.53687, "Midt- og Vestsjælland", "Zealand"],
  ["0336", "Stevns", 55.32521, 12.34416, 55.23274, 12.09732, 55.43018, 12.46639, "Sydsjælland og Møn", "Zealand"],
  ["0340", "Sorø", 55.52484, 11.55925, 55.35963, 11.30868, 55.59563, 11.72059, "Midt- og Vestsjælland", "Zealand"],
  ["0350", "Lejre", 55.60545, 11.9168, 55.52343, 11.77003, 55.749, 12.08612, "Midt- og Vestsjælland", "Zealand"],
  ["0360", "Lolland", 54.80031, 11.29887, 54.5919, 10.94398, 55.04719, 11.62864, "", "Lolland-Falster"],
  ["0370", "Næstved", 55.29533, 11.68266, 55.11025, 11.42474, 55.4152, 12.06513, "Sydsjælland og Møn", "Zealand"],
  ["0376", "Guldborgsund", 54.82373, 11.96187, 54.55467, 11.51839, 54.97797, 12.17587, "", "Lolland-Falster"],
  ["0390", "Vordingborg", 55.06464, 11.97379, 54.86839, 11.60397, 55.1624, 12.56852, "Sydsjælland og Møn", "Zealand"],
  ["0400", "Bornholm", 55.12789, 14.88368, 54.98372, 14.66821, 55.3022, 15.18773, "", "Bornholm"],
  ["0410", "Middelfart", 55.45747, 9.90786, 55.33764, 9.65612, 55.55587, 10.09388, "", "Funen"],
  ["0411", "Christiansø", 55.31982, 15.18903, 55.31682, 15.17199, 55.33081, 15.19914, "", "Bornholm"],
  ["0420", "Assens", 55.30087, 10.04121, 55.11801, 9.76251, 55.43509, 10.29772, "", "Funen"],
  ["0430", "Faaborg-Midtfyn", 55.21254, 10.36605, 55.00006, 10.05646, 55.34823, 10.66675, "", "Funen"],
  ["0440", "Kerteminde", 55.39108, 10.5712, 55.32023, 10.47502, 55.62193, 10.80539, "", "Funen"],
  ["0450", "Nyborg", 55.27681, 10.6782, 55.17105, 10.5286, 55.42672, 10.8622, "", "Funen"],
  ["0461", "Odense", 55.3917, 10.29848, 55.2849, 10.1737, 55.48396, 10.58221, "", "Funen"],
  ["0479", "Svendborg", 55.09621, 10.52327, 54.93841, 10.35954, 55.22806, 10.8898, "", "Funen"],
  ["0480", "Nordfyns", 55.50599, 10.16779, 55.40123, 9.97691, 55.64846, 10.56686, "", "Funen"],
  ["0482", "Langeland", 54.81987, 10.70871, 54.71828, 10.52602, 55.17036, 10.95659, "", "Funen"],
  ["0492", "Ærø", 54.85587, 10.39953, 54.81472, 10.19979, 54.97185, 10.5505, "", "Funen"],
  ["0510", "Haderslev", 55.24462, 9.29762, 55.12417, 8.88446, 55.38256, 9.78105, "Sønderjylland", "Jutland"],
  ["0530", "Billund", 55.69766, 9.00651, 55.59328, 8.74657, 55.89567, 9.20004, "Sydvestjylland", "Jutland"],
  ["0540", "Sønderborg", 54.94264, 9.94829, 54.83227, 9.46136, 55.08527, 10.07704, "Sønderjylland", "Jutland"],
  ["0550", "Tønder", 55.04436, 8.85683, 54.88033, 8.46049, 55.24477, 9.25031, "Sønderjylland", "Jutland"],
  ["0561", "Esbjerg", 55.46179, 8.72095, 55.21869, 8.29242, 55.59857, 8.939, "Sydvestjylland", "Jutland"],
  ["0563", "Fanø", 55.40608, 8.42105, 55.33805, 8.32758, 55.47482, 8.53503, "Sydvestjylland", "Jutland"],
  ["0573", "Varde", 55.68693, 8.60623, 55.47534, 8.06576, 55.85062, 8.91478, "Sydvestjylland", "Jutland"],
  ["0575", "Vejen", 55.49286, 9.05024, 55.2891, 8.76176, 55.62773, 9.30438, "Sydvestjylland", "Jutland"],
  ["0580", "Aabenraa", 54.95857, 9.27705, 54.7991, 9.00494, 55.16837, 9.63422, "Sønderjylland", "Jutland"],
  ["0607", "Fredericia", 55.56444, 9.65517, 55.50773, 9.55675, 55.62963, 9.85982, "Sydøstjylland", "Jutland"],
  ["0615", "Horsens", 55.90695, 9.79924, 55.74087, 9.45942, 56.07069, 10.3738, "Østjylland", "Jutland"],
  ["0621", "Kolding", 55.42633, 9.40398, 55.30751, 9.2144, 55.63058, 9.69638, "Sydøstjylland", "Jutland"],
  ["0630", "Vejle", 55.6996, 9.36402, 55.56518, 9.05449, 55.9568, 9.75605, "Sydøstjylland", "Jutland"],
  ["0657", "Herning", 56.21557, 8.89416, 55.87838, 8.43128, 56.4139, 9.18963, "Midtjylland", "Jutland"],
  ["0661", "Holstebro", 56.43, 8.82846, 56.22607, 8.10909, 56.56633, 9.00269, "Vestjylland", "Jutland"],
  ["0665", "Lemvig", 56.47239, 8.28873, 56.34631, 8.10933, 56.71215, 8.52717, "Vestjylland", "Jutland"],
  ["0671", "Struer", 56.45534, 8.57606, 56.38698, 8.38804, 56.69364, 8.71303, "Vestjylland", "Jutland"],
  ["0706", "Syddjurs", 56.35749, 10.51127, 56.09022, 10.15322, 56.45257, 10.85446, "Djursland", "Jutland"],
  ["0707", "Norddjurs", 56.4648, 10.75849, 56.28091, 10.21228, 56.75999, 11.65849, "Djursland", "Jutland"],
  ["0710", "Favrskov", 56.29368, 9.91776, 56.18512, 9.65853, 56.45097, 10.24503, "Østjylland", "Jutland"],
  ["0727", "Odder", 55.94116, 10.14601, 55.83339, 10.00989, 56.02631, 10.4664, "Østjylland", "Jutland"],
  ["0730", "Randers", 56.53737, 10.08976, 56.36615, 9.7746, 56.718, 10.36496, "Østjylland", "Jutland"],
  ["0740", "Silkeborg", 56.20903, 9.56059, 55.99187, 9.22087, 56.37012, 9.8654, "Midtjylland", "Jutland"],
  ["0741", "Samsø", 55.80308, 10.58612, 55.76204, 10.51207, 56.00287, 10.79651, "Østjylland", "Jutland"],
  ["0746", "Skanderborg", 56.0871, 9.84908, 55.9522, 9.63068, 56.21829, 10.09705, "Østjylland", "Jutland"],
  ["0751", "Aarhus", 56.15511, 10.10361, 55.99249, 9.94494, 56.3328, 10.39098, "Østjylland", "Jutland"],
  ["0756", "Ikast-Brande", 56.14494, 9.2311, 55.82939, 8.95732, 56.27619, 9.56458, "Midtjylland", "Jutland"],
  ["0760", "Ringkøbing-Skjern", 56.02238, 8.54072, 55.77099, 8.09289, 56.26529, 8.86543, "Vestjylland", "Jutland"],
  ["0766", "Hedensted", 55.73776, 9.82272, 55.66668, 9.38385, 55.9259, 10.10466, "Østjylland", "Jutland"],
  ["0773", "Morsø", 56.75309, 8.70784, 56.66822, 8.49851, 56.98466, 9.01229, "Nordjylland", "Jutland"],
  ["0779", "Skive", 56.61999, 8.91331, 56.48878, 8.6725, 56.8463, 9.29748, "Midtjylland", "Jutland"],
  ["0787", "Thisted", 56.89372, 8.47287, 56.66934, 8.20277, 57.15903, 9.09627, "Nordjylland", "Jutland"],
  ["0791", "Viborg", 56.47081, 9.5498, 56.21609, 8.97157, 56.68427, 9.79887, "Midtjylland", "Jutland"],
  ["0810", "Brønderslev", 57.1799, 10.27822, 57.06945, 9.73561, 57.34353, 10.44883, "Nordjylland", "Jutland"],
  ["0813", "Frederikshavn", 57.32317, 10.41374, 57.16784, 10.17723, 57.7572, 10.65246, "Nordjylland", "Jutland"],
  ["0820", "Vesthimmerlands", 56.81544, 9.38375, 56.636, 9.06789, 57.03085, 9.66293, "Nordjylland", "Jutland"],
  ["0825", "Læsø", 57.26614, 11.00801, 57.17081, 10.85363, 57.36572, 11.20274, "Nordjylland", "Jutland"],
  ["0840", "Rebild", 56.86904, 9.76038, 56.64719, 9.51711, 56.97248, 10.23384, "Nordjylland", "Jutland"],
  ["0846", "Mariagerfjord", 56.73357, 9.92558, 56.54612, 9.52628, 56.86569, 10.33975, "Nordjylland", "Jutland"],
  ["0849", "Jammerbugt", 57.16564, 9.62199, 57.00445, 9.02987, 57.35758, 9.92424, "Nordjylland", "Jutland"],
  ["0851", "Aalborg", 56.98087, 9.9971, 56.80925, 9.38902, 57.23315, 10.39466, "Nordjylland", "Jutland"],
  ["0860", "Hjørring", 57.4684, 10.07791, 57.30159, 9.68891, 57.62306, 10.41718, "Nordjylland", "Jutland"],
];

// Column positions, named once. Reading these by index in three files is how a
// single reordering silently relabels the country, which is the trap
// PART_ANCHORS in utils/geography.js already documents.
export const K = { kode: 0, name: 1, lat: 2, lon: 3, south: 4, west: 5, north: 6, east: 7, region: 8, part: 9 };
