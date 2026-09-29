import { C } from "../utils/theme";
import { COUNTRY_MAPS } from "../data/mapShapes";
import { activeCountry, countryProfile } from "../utils/countries";
import { TOWN_COORDS } from "../data/towns";

// ── AND A PLACE THAT IS NOT IN THE TABLE CAN BRING ITS OWN POINT ────
//
// TOWN_COORDS is keyed by TOWN name, so an island is not in it and never will
// be: the table is the reference frame for entries measured inside a town, and
// an island is not a town. `point` lets a caller hand over the coordinate the
// entry already publishes, which is exactly what the Islands page does.
//
// The name is still passed and still used, for the label a screen reader reads.
// ── AND THE MAP IS THE PAGE'S COUNTRY ───────────────────────────────
// Phase 2 of LITHUANIA_PLAN_29SEP.md. Still named DKLocator, because eleven
// call sites import it by that name, but on a Lithuanian page it draws
// Lithuania. `country` lets a caller ask for one explicitly.
export const DKLocator = ({ town, color, point, country }) => {
  const code = COUNTRY_MAPS[country] ? country : (COUNTRY_MAPS[activeCountry()] ? activeCountry() : "DK");
  const map = COUNTRY_MAPS[code];
  const land = countryProfile(code);
  const coords = Array.isArray(point) && point.length === 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
    ? [Number(point[0]), Number(point[1])]
    : TOWN_COORDS[town];
  const dot = coords ? map.project(coords[0], coords[1]) : null;
  return (
    <svg viewBox={map.viewBox} style={{ width: "100%", height: "100%", display: "block", background: "#0D1526" }} aria-label={town ? `Location of ${town} in ${land.name}` : `Map of ${land.name}`}>
      {map.paths.map((p, i) => <polygon key={i} points={p} fill="#1A2438" stroke="#2A3A55" strokeWidth="3" />)}
      {dot && (
        <>
          <circle cx={dot[0]} cy={dot[1]} r="26" fill={`${color || C.gold}33`} />
          <circle cx={dot[0]} cy={dot[1]} r="11" fill={color || C.gold} stroke="#0D1526" strokeWidth="3" />
        </>
      )}
    </svg>
  );
};


