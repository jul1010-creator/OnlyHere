// ── "A RECENTLY USED FINISHED TRIP SYSTEM" ───────────────────────────
//
// Oliver, 19 Sep 2026: "So when someone used a guide, it will be published."
//
// This is the reading half. Every trip on this page was built for somebody
// else, kept by them, and then stripped of them: utils/tripLibrary.js decides
// what travels, and it is an allowlist, so a field nobody thought about does
// not end up here by default.
//
// ── THE SAME SHELL AS THE OTHER DOCUMENTS ───────────────────────────
// One back button, one column, real headings, nothing to interact with beyond
// opening a trip. AffiliatesPage and SupportPage read this way for a reason and
// a third layout would be a third thing to learn.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";
import { GemlyxLogo } from "./GemlyxLogo";
import { GuidePage } from "../pages/GuidePage";
import { libraryCard, LIBRARY_TABLE, LIBRARY_PATH } from "../utils/tripLibrary";
import { DETOUR_PATH } from "../utils/tabUrl";

const LIST_CAP = 24;

// ── ONE TRIP, RENDERED BY THE PAGE THAT RENDERS TRIPS ───────────────
//
// A second renderer for the same object is this project's signature bug, and
// GuidePage already takes a guide as a prop: that is how /example works. So a
// published trip opens in the real thing, with the personal half absent rather
// than hidden, which is the difference this whole module exists to make.
const OneTrip = ({ id }) => {
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    fetch(`${SUPABASE_URL}/rest/v1/${LIBRARY_TABLE}?select=payload&id=eq.${encodeURIComponent(id)}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("read failed"))))
      .then(rows => {
        if (!alive) return;
        const found = Array.isArray(rows) && rows[0]?.payload ? rows[0].payload : null;
        setTrip(found);
        setState(found ? "ready" : "missing");
      })
      .catch(() => { if (alive) setState("missing"); });
    return () => { alive = false; };
  }, [id]);

  if (state === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: C.muted }}>Opening the trip…</div>
      </div>
    );
  }
  if (state === "missing") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>That trip is not here</div>
        <button onClick={() => navigate(LIBRARY_PATH)}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 100, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          See the other trips
        </button>
      </div>
    );
  }
  // onBack goes to the list rather than to the chat: this trip came from the
  // list, and the chat is where you go to build one of your own.
  return <GuidePage guide={trip} onBack={() => navigate(LIBRARY_PATH)} />;
};

const Card = ({ row, onOpen }) => (
  <button onClick={onOpen}
    style={{ display: "block", width: "100%", textAlign: "left", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 17px", marginBottom: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
    <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>{row.title}</div>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{libraryCard(row)}</div>
    {row.mode && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>Planned around {row.mode}</div>}
  </button>
);

export const TripLibraryPage = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (tripId) return undefined;
    let alive = true;
    fetch(`${SUPABASE_URL}/rest/v1/${LIBRARY_TABLE}?select=id,title,days,stops,towns,mode&order=created_at.desc&limit=${LIST_CAP}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("read failed"))))
      .then(list => { if (alive) setRows(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) { setRows([]); setFailed(true); } });
    return () => { alive = false; };
  }, [tripId]);

  if (tripId) return <OneTrip id={tripId} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 64px" }}>
        {/* Back to the chat, because a list of other people's trips is a thing
            you read on the way to making your own. */}
        <button onClick={() => navigate(DETOUR_PATH)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 22 }}>
          <GemlyxLogo size={22} />
          <span style={{ fontSize: 13, color: C.muted }}>Back to the chat</span>
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", fontFamily: "'Fraunces', serif" }}>Trips people kept</h1>
        {/* ── WHAT A READER IS OWED ABOUT WHOSE TRIP THIS IS ────────
            These were built for real travellers, so the page says so, and says
            what was taken out before it went up. A public page made from
            somebody else's trip that does not mention either would be the kind
            of quiet thing this codebase spends most of its comments avoiding. */}
        <p style={{ fontSize: 13.5, color: C.light, lineHeight: 1.7, margin: "0 0 22px" }}>
          Real trips Gemlyx built for other travellers, kept by the people who asked for them. The days, the stops and the notes are theirs. The dates, who was coming, what they were spending and the conversation it came out of are not here: those belong to them and were removed before the trip went on this page.
        </p>

        {rows === null && <div style={{ fontSize: 13, color: C.muted }}>Looking…</div>}
        {rows !== null && rows.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 17px" }}>
            <div style={{ fontSize: 13.5, color: C.light, lineHeight: 1.65 }}>
              {failed
                ? "This list is not reachable right now. Nothing is wrong with your own trips."
                : "No trips here yet. The first one turns up when somebody keeps a guide Gemlyx built them."}
            </div>
            <button onClick={() => navigate(DETOUR_PATH)}
              style={{ marginTop: 12, background: `${C.gold}1a`, border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 100, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              Build one
            </button>
          </div>
        )}
        {(rows || []).map(row => (
          <Card key={row.id} row={row} onOpen={() => navigate(`${LIBRARY_PATH}/${row.id}`)} />
        ))}
      </div>
    </div>
  );
};
