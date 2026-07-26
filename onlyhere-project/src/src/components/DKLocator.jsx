import { C } from "../utils/theme";
import { DK_PATHS, dkProject } from "../data/mapShapes";
import { TOWN_COORDS } from "../data/towns";

export const DKLocator = ({ town, color }) => {
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


