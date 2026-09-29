import { activeCountry } from "../utils/countries";
export const DK_SHAPES = [
  [[54.90,8.65],[55.10,8.60],[55.35,8.45],[55.56,8.08],[55.90,8.12],[56.30,8.10],[56.70,8.21],[57.00,8.40],[57.12,8.62],[57.45,9.60],[57.60,10.10],[57.73,10.60],[57.44,10.54],[57.33,10.52],[56.90,10.30],[56.70,10.35],[56.50,10.85],[56.42,10.95],[56.25,10.80],[56.15,10.25],[55.85,10.05],[55.70,9.75],[55.55,9.72],[55.30,9.70],[55.05,9.90],[54.91,9.79],[54.85,9.40]],
  [[55.50,9.80],[55.60,10.10],[55.62,10.32],[55.50,10.62],[55.30,10.80],[55.05,10.68],[55.02,10.25],[55.18,9.90]],
  [[55.97,11.28],[56.05,11.65],[56.10,12.05],[56.13,12.31],[55.95,12.55],[55.68,12.65],[55.45,12.50],[55.28,12.45],[55.15,12.20],[54.96,11.85],[55.10,11.35],[55.20,11.08],[55.45,11.05],[55.70,11.10]],
  [[54.83,11.05],[54.95,11.50],[54.90,11.90],[54.70,12.00],[54.56,11.93],[54.65,11.35]],
  [[55.30,14.68],[55.30,15.15],[55.06,15.19],[54.99,14.90],[55.15,14.68]],
];

export const dkProject = (lat, lon) => [(lon - 8.0) * 62.06, (57.85 - lat) * 111.32];

export const DK_PATHS = DK_SHAPES.map(shape => shape.map(([la, lo]) => dkProject(la, lo).map(n => n.toFixed(1)).join(",")).join(" "));


const DK_WEATHER_CITIES = [
  { key: "copenhagen", label: "Copenhagen", lat: 55.6761, lon: 12.5683 },
  { key: "aarhus", label: "Aarhus", lat: 56.1629, lon: 10.2039 },
  { key: "aalborg", label: "Aalborg", lat: 57.0488, lon: 9.9217 },
  { key: "odense", label: "Odense", lat: 55.4038, lon: 10.4024 },
];

// ── AND LITHUANIA, FOR NOW ONE TOWN ─────────────────────────────────
// Phase 2 of LITHUANIA_PLAN_29SEP.md. Klaipėda is the only town Gemlyx covers
// there, so it is the only weather on a Lithuanian page. The outline is
// Natural Earth's (via datasets/geo-countries), simplified to what a 68 pixel
// card map can show, with the Curonian Spit as its own shape.
const LT_WEATHER_CITIES = [
  { key: "klaipeda", label: "Klaipėda", lat: 55.7033, lon: 21.1443 },
];
export const WEATHER_CITIES = activeCountry() === "LT" ? LT_WEATHER_CITIES : DK_WEATHER_CITIES;

export const LT_SHAPES = [[[55.67, 26.59], [55.59, 26.61], [55.33, 26.45], [55.27, 26.8], [55.22, 26.66], [55.12, 26.6], [55.14, 26.26], [54.97, 26.14], [54.94, 25.87], [54.87, 25.78], [54.77, 25.72], [54.57, 25.74], [54.51, 25.63], [54.32, 25.53], [54.32, 25.7], [54.24, 25.79], [54.16, 25.76], [54.14, 25.52], [54.22, 25.5], [54.23, 25.55], [54.3, 25.46], [54.25, 25.37], [54.26, 25.21], [54.13, 25.07], [54.13, 24.82], [54.09, 24.78], [54.02, 24.82], [53.97, 24.79], [53.99, 24.67], [53.89, 24.38], [53.89, 24.26], [53.96, 24.17], [53.9, 23.63], [53.94, 23.49], [54.11, 23.47], [54.22, 23.35], [54.29, 23.05], [54.38, 22.96], [54.4, 22.84], [54.36, 22.77], [54.42, 22.71], [54.49, 22.67], [54.68, 22.7], [54.81, 22.85], [54.89, 22.82], [54.96, 22.63], [55.07, 22.57], [55.03, 22.08], [55.09, 22.0], [55.19, 21.5], [55.29, 21.37], [55.25, 21.27], [55.37, 21.26], [55.35, 21.18], [55.42, 21.25], [55.52, 21.22], [55.79, 21.06], [56.07, 21.05], [56.08, 21.19], [56.22, 21.33], [56.42, 22.09], [56.35, 22.67], [56.41, 22.92], [56.3, 23.06], [56.37, 23.29], [56.33, 23.48], [56.35, 23.71], [56.26, 24.14], [56.3, 24.32], [56.27, 24.48], [56.44, 24.87], [56.2, 25.07], [56.14, 25.66], [55.85, 26.18], [55.74, 26.28], [55.67, 26.59]], [[55.27, 20.99], [55.28, 20.92], [55.36, 21.0], [55.5, 21.08], [55.6, 21.1], [55.72, 21.09], [55.7, 21.12], [55.66, 21.13], [55.49, 21.12], [55.44, 21.09], [55.42, 21.11], [55.33, 21.04], [55.29, 20.99], [55.27, 20.99]]];
// Same idea as dkProject: degrees to a flat plane at this latitude.
export const ltProject = (lat, lon) => [(lon - 20.8) * 63.3, (56.5 - lat) * 111.32];
export const LT_PATHS = LT_SHAPES.map(shape => shape.map(([la, lo]) => ltProject(la, lo).map(n => n.toFixed(1)).join(",")).join(" "));

// The card map for each country: its shapes, its projection and the box to
// draw it in.
export const COUNTRY_MAPS = {
  DK: { paths: DK_PATHS, project: dkProject, viewBox: "-12 -12 477 397" },
  LT: { paths: LT_PATHS, project: ltProject, viewBox: "-12 -12 405 315" },
};

// ── THE PROJECTION THESE SHAPES ARE DRAWN IN ────────────────────────
// Kilometres per degree at Danish latitudes. Lives beside the shapes rather
// than in one of the two files that measure against them, because BOTH do:
// geography.js for the five landmasses and regions.js for the kommune boxes.
// A second copy of these two numbers would be a third instrument quietly
// answering "how far is that" slightly differently, which is how resolveLegMode
// and lookupRealPlace each came to exist twice with different rules.
export const KM_LAT = 111.32, KM_LON = 62.06;
