// ── STUDIO FOR THE EXPLORE DEALS ────────────────────────────────────
//
// Oliver, 13 Oct 2026: "Bring in a studio so i can edit", the Explore deals.
// Shown above the deals on /lithuania#studio once he is logged in to Studio,
// and to nobody else. The rules are in utils/dealStudio.js; this is the panel.
//
// A list of the Klaipėda deals in the database, shown and hidden alike, and
// one editor for a new deal or an old one: the place, its spot on the map, the
// offer and when it holds. Saving writes the row and puts it on the page
// without a reload.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../utils/theme";
import { SUPABASE_URL } from "../config";
import { DEAL_PLACE_TYPES, DEAL_FILTERS, DAY_SHORT, WEEK_ORDER, isDealRow, emptyDeal, dealFromRow, dealProblems, payloadFromDeal, dealWhenShort, offerOf } from "../utils/dealStudio";
import { offerWhen, signFor } from "./DealsNearYou";
import { promoCard } from "../utils/promotions";
import { DealCornerMap } from "./DealCornerMap";
import { GOOGLE_MAP_ID, googleMapsReady, loadGoogleMaps } from "../utils/googleMapsLoader";
import { NOW_AREAS } from "../utils/nowPlanner";

const FILTER_LABEL = { "": "Automatic", discounts: "Discounts", entertainment: "Entertainment", activities: "Activities" };
const TYPE_LABEL = Object.fromEntries(DEAL_PLACE_TYPES.map(t => [t.type, t.label]));
const LIST_URL = `${SUPABASE_URL}/rest/v1/gemlyx_content?select=id,type,payload,published&payload->>country=eq.LT&type=in.(${DEAL_PLACE_TYPES.map(t => t.type).join(",")})&order=id.desc`;

const field = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, outline: "none", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" };
const label = { display: "block", fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, margin: "14px 0 6px" };
const chip = (on) => ({ background: on ? C.gold : "transparent", color: on ? C.onGold : C.light, border: `1px solid ${on ? C.gold : C.border}`, borderRadius: 100, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" });
const small = (primary) => ({ background: primary ? C.gold : "transparent", color: primary ? C.onGold : C.light, border: `1px solid ${primary ? C.gold : C.border}`, borderRadius: 100, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" });

// ── WHERE THE DOOR IS: TAP THE MAP ──────────────────────────────────
// Google's own map in the guide's style. A tap moves the pin; nothing else on
// the map does anything, so it cannot be dragged into the wrong town.
const SpotMap = ({ lat, lon, onPick }) => {
  const box = useRef(null);
  const map = useRef(null);
  const pin = useRef(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const has = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && lat !== "" && lon !== "";
  useEffect(() => {
    if (!googleMapsReady() || !box.current) return undefined;
    let gone = false;
    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Map } = await maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await maps.importLibrary("marker");
        if (gone || !box.current) return;
        const centre = has ? { lat: Number(lat), lng: Number(lon) } : { lat: NOW_AREAS.LT.lat, lng: NOW_AREAS.LT.lon };
        map.current = new Map(box.current, { mapId: GOOGLE_MAP_ID, center: centre, zoom: has ? 17 : 15, disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: "greedy" });
        pin.current = new AdvancedMarkerElement({ map: has ? map.current : null, position: centre });
        map.current.addListener("click", (e) => {
          const p = { lat: e.latLng.lat(), lon: e.latLng.lng() };
          pin.current.position = { lat: p.lat, lng: p.lon };
          pin.current.map = map.current;
          pick.current(p);
        });
      } catch { /* the number fields still work */ }
    })();
    return () => { gone = true; };
  }, []);
  // A spot found on Google moves the pin and the map with it.
  useEffect(() => {
    if (!has || !map.current || !pin.current) return;
    const at = { lat: Number(lat), lng: Number(lon) };
    pin.current.position = at;
    pin.current.map = map.current;
    map.current.panTo(at);
  }, [lat, lon]);
  if (!googleMapsReady()) return null;
  return <div ref={box} data-testid="deal-studio-map" style={{ width: "100%", height: 220, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: "#0A0F1E" }} />;
};

// ── THE CARD AS EXPLORE WILL SHOW IT ────────────────────────────────
const Preview = ({ f }) => {
  const offer = offerOf(f);
  const at = { lat: Number(f.lat), lon: Number(f.lon) };
  const d = { name: f.name, emoji: f.sign, category: TYPE_LABEL[f.type], __offer: offer, __dealKind: f.dealKind };
  const card = offer ? promoCard({ ...d, country: "LT" }, { today: new Date(), lang: "en" }) : null;
  const when = offer ? offerWhen(offer, card?.timing, { now: new Date(), lang: "en" }) : null;
  return (
    <div data-testid="deal-studio-preview" style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}66`, borderRadius: 14, padding: "13px 15px", display: "flex", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, overflowWrap: "anywhere" }}>{f.name || "The place's name"}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, lineHeight: 1.45, marginTop: 4 }}>{offer?.text || "What a visitor gets"}</div>
        <div style={{ fontSize: 12, color: C.light, marginTop: 4 }}>{when?.text || (card?.timing === "off" ? "Not on today" : card?.timing === "ended" ? "Ended" : "")}</div>
        <span style={{ ...small(true), display: "inline-block", marginTop: 10, cursor: "default" }}>Redeem offer</span>
      </div>
      {Number.isFinite(at.lat) && Number.isFinite(at.lon) && f.lat !== "" && <DealCornerMap lat={at.lat} lon={at.lon} name={f.name} sign={signFor(d)} />}
    </div>
  );
};

const Editor = ({ start, onSave, onClose, busy, error }) => {
  const [f, setF] = useState(start);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const [finding, setFinding] = useState({ busy: false, note: "", list: [] });
  const problems = dealProblems(f);
  const [tried, setTried] = useState(false);

  const find = async () => {
    const q = `${f.name || ""} ${f.street || ""}`.trim();
    if (!q) { setFinding({ busy: false, note: "Write the name or the street first.", list: [] }); return; }
    setFinding({ busy: true, note: "", list: [] });
    try {
      const r = await onSave.locate(`${q}, Klaipėda`);
      const list = (r?.candidates || []).filter(c => Number.isFinite(Number(c.lat))).slice(0, 5);
      setFinding({ busy: false, note: list.length ? "" : "Google did not find it. Tap the map where the door is.", list });
    } catch (e) { setFinding({ busy: false, note: e.message || "The search did not work just now. Tap the map instead.", list: [] }); }
  };
  const take = (c) => {
    setF(x => ({ ...x, lat: c.lat, lon: c.lon, street: x.street || String(c.address || "").split(",")[0] }));
    setFinding({ busy: false, note: `Placed at ${c.name}${c.address ? `, ${c.address}` : ""}.`, list: [] });
  };
  const toggleDay = (d) => set("days", f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d]);
  const save = () => { setTried(true); if (!problems.length) onSave.save(f); };
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-label="Edit deal" data-testid="deal-studio-editor"
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(12px + env(safe-area-inset-top, 0px)) 16px 12px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.gold }}>{start.id ? "Edit deal" : "New deal"}</div>
        <button onClick={onClose} style={small(false)}>Close</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <label style={label}>Name</label>
          <input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Kepyklėlė Rūta" style={field} data-testid="deal-studio-name" />

          <label style={label}>Kind of place</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DEAL_PLACE_TYPES.map(t => (
              <button key={t.type} type="button" disabled={!!start.id && start.type !== t.type} onClick={() => set("type", t.type)} style={{ ...chip(f.type === t.type), opacity: start.id && start.type !== t.type ? 0.35 : 1 }}>{t.label}</button>
            ))}
          </div>

          <label style={label}>Street</label>
          <input value={f.street} onChange={e => set("street", e.target.value)} placeholder="Turgaus g. 7" style={field} />

          <label style={label}>Where it is</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <button type="button" onClick={find} disabled={finding.busy} style={small(true)} data-testid="deal-studio-find">{finding.busy ? "Looking" : "Find on Google"}</button>
            <span style={{ fontSize: 11.5, color: C.muted }}>or tap the map where the door is</span>
          </div>
          {finding.list.length > 0 && (
            <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
              {finding.list.map((c, i) => (
                <button key={i} type="button" onClick={() => take(c)} style={{ ...field, textAlign: "left", cursor: "pointer" }}>
                  <b>{c.name}</b>{c.address ? <span style={{ color: C.muted }}> · {c.address}</span> : null}
                </button>
              ))}
            </div>
          )}
          {finding.note && <div style={{ fontSize: 12, color: C.light, marginBottom: 8 }}>{finding.note}</div>}
          <SpotMap lat={f.lat} lon={f.lon} onPick={(p) => setF(x => ({ ...x, lat: Number(p.lat.toFixed(6)), lon: Number(p.lon.toFixed(6)) }))} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input value={f.lat} onChange={e => set("lat", e.target.value)} placeholder="Latitude" inputMode="decimal" style={field} />
            <input value={f.lon} onChange={e => set("lon", e.target.value)} placeholder="Longitude" inputMode="decimal" style={field} />
          </div>

          <label style={label}>The offer</label>
          <textarea value={f.text} onChange={e => set("text", e.target.value)} rows={2} placeholder="Free refill of filter coffee with any pastry" style={{ ...field, resize: "vertical" }} data-testid="deal-studio-text" />

          <label style={label}>Days</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {WEEK_ORDER.map(d => <button key={d} type="button" onClick={() => toggleDay(d)} style={chip(f.days.includes(d))}>{DAY_SHORT[d]}</button>)}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>None picked means every day.</div>

          <label style={label}>Hours</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="time" value={f.from} onChange={e => set("from", e.target.value)} style={field} aria-label="From" />
            <span style={{ color: C.muted, fontSize: 12 }}>to</span>
            <input type="time" value={f.to} onChange={e => set("to", e.target.value)} style={field} aria-label="To" />
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>Both empty means all day.</div>

          <label style={label}>Last day</label>
          <input type="date" value={f.until} onChange={e => set("until", e.target.value)} style={field} data-testid="deal-studio-until" />

          <label style={label}>Filter on Explore</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DEAL_FILTERS.map(k => <button key={k || "auto"} type="button" onClick={() => set("dealKind", k)} style={chip(f.dealKind === k)}>{FILTER_LABEL[k]}</button>)}
          </div>

          <label style={label}>Book a table</label>
          <input value={f.booking} onChange={e => set("booking", e.target.value)} placeholder="A booking page or +370 600 00000" style={field} />

          <label style={label}>Sign in the map pin</label>
          <input value={f.sign} onChange={e => set("sign", e.target.value)} placeholder="☕" maxLength={4} style={{ ...field, width: 90 }} />

          <label style={label}>On Explore</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => set("published", true)} style={chip(f.published)} data-testid="deal-studio-show">Show</button>
            <button type="button" onClick={() => set("published", false)} style={chip(!f.published)} data-testid="deal-studio-hide">Hidden</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>The made-up example partners show until the first real deal is set to Show, then they all go.</div>

          <label style={label}>Preview</label>
          <Preview f={f} />

          {(tried && problems.length > 0) && (
            <div data-testid="deal-studio-problems" style={{ marginTop: 14, fontSize: 12.5, color: "#FFB347", lineHeight: 1.6, border: "1px solid #FFB34755", borderRadius: 10, padding: "10px 12px" }}>
              {problems.map((p, i) => <div key={i}>{p}</div>)}
            </div>
          )}
          {error && <div style={{ marginTop: 12, fontSize: 12.5, color: "#FF8A80" }}>{error}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${C.border}`, background: C.surface }}>
        <button onClick={save} disabled={busy} data-testid="deal-studio-save" style={{ flex: 1, ...small(true), padding: "12px", fontSize: 14, borderRadius: 14 }}>{busy ? "Saving" : "Save"}</button>
        <button onClick={onClose} style={{ ...small(false), padding: "12px 18px", fontSize: 14, borderRadius: 14 }}>Cancel</button>
      </div>
    </div>,
    document.body,
  );
};

export const DealStudio = ({ supaFetch, studioFetch, onChanged }) => {
  const [rows, setRows] = useState(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [links, setLinks] = useState({});

  const load = async () => {
    setNote("");
    try {
      const r = await supaFetch(LIST_URL);
      if (!r.ok) throw new Error(`The deals could not be read (${r.status}).`);
      const list = await r.json();
      setRows((Array.isArray(list) ? list : []).filter(isDealRow));
    } catch (e) { setRows([]); setNote(e.message || "The deals could not be read just now."); }
  };
  useEffect(() => { load(); }, []);

  const locate = async (q) => {
    const r = await studioFetch(`/api/places-locate?name=${encodeURIComponent(q)}&country=LT`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `The search did not work (${r.status}).`);
    return j.found ? j : { candidates: [] };
  };

  const save = async (f) => {
    setBusy(true); setError("");
    try {
      const before = f.id ? rows.find(x => x.id === f.id) : null;
      const payload = payloadFromDeal(f, before?.payload);
      if (!f.id) {
        // One row per name and type: the site keeps the first it meets and a
        // second renders nowhere (see publishDraft, step 5).
        const dup = await supaFetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?select=id&type=eq.${f.type}&payload->>name=ilike.${encodeURIComponent(payload.name)}`);
        const had = dup.ok ? await dup.json() : [];
        if (Array.isArray(had) && had.length) throw new Error(`"${payload.name}" is already in the database as ${TYPE_LABEL[f.type]}. Edit that one instead.`);
        const r = await supaFetch(`${SUPABASE_URL}/rest/v1/gemlyx_content`, {
          method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ type: f.type, payload, published: !!f.published }),
        });
        if (!r.ok) throw new Error(`Not saved (${r.status}): ${(await r.text()).slice(0, 160)}`);
        const made = (await r.json().catch(() => []))?.[0] || { id: null, type: f.type, payload, published: !!f.published };
        setRows(xs => [made, ...(xs || [])]);
        await onChanged?.({ before: null, after: made });
      } else {
        const r = await supaFetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?id=eq.${f.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ payload, published: !!f.published }),
        });
        if (!r.ok) throw new Error(`Not saved (${r.status}): ${(await r.text()).slice(0, 160)}`);
        const after = { ...before, payload, published: !!f.published };
        setRows(xs => (xs || []).map(x => (x.id === f.id ? after : x)));
        await onChanged?.({ before, after });
      }
      setEditing(null);
    } catch (e) { setError(e.message || "Not saved."); }
    setBusy(false);
  };

  const flip = async (row) => {
    const after = { ...row, published: !row.published };
    setNote("");
    try {
      const r = await supaFetch(`${SUPABASE_URL}/rest/v1/gemlyx_content?id=eq.${row.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ published: after.published }),
      });
      if (!r.ok) throw new Error(`Not changed (${r.status}).`);
      setRows(xs => xs.map(x => (x.id === row.id ? after : x)));
      await onChanged?.({ before: row, after });
    } catch (e) { setNote(e.message || "Not changed."); }
  };

  // The partner's own numbers page, the same link as in the full Studio.
  const partnerLink = async (row) => {
    setLinks(l => ({ ...l, [row.id]: "Making the link." }));
    try {
      const r = await studioFetch("/api/partner-stats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make: { id: `${row.type}:${row.id}`, name: row.payload?.name || "" } }),
      });
      const j = await r.json().catch(() => ({}));
      setLinks(l => ({ ...l, [row.id]: r.ok && j.path ? `${window.location.origin}${j.path}` : (j.error || `The link could not be made (${r.status}).`) }));
    } catch { setLinks(l => ({ ...l, [row.id]: "The link could not be made just now." })); }
  };

  const shown = (rows || []).filter(r => r.published).length;
  return (
    <section data-testid="deal-studio" style={{ background: C.surface, border: `1px dashed ${C.gold}66`, borderRadius: 14, padding: "14px 15px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "'Fraunces', serif" }}>Studio: Explore deals</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{rows === null ? "Loading" : `${rows.length} in the database, ${shown} showing`}</div>
        </div>
        <button onClick={() => { setError(""); setEditing(emptyDeal()); }} style={small(true)} data-testid="deal-studio-new">+ New deal</button>
      </div>
      {note && <div style={{ fontSize: 12, color: "#FFB347", marginTop: 10 }}>{note}</div>}
      {rows && rows.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {rows.map(row => {
            const f = dealFromRow(row);
            return (
              <div key={row.id} data-testid="deal-studio-row" style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", background: C.bg }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{f.name}</div>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: row.published ? C.gold : C.muted, border: `1px solid ${row.published ? C.gold : C.border}`, borderRadius: 100, padding: "2px 8px", whiteSpace: "nowrap" }}>{row.published ? "SHOWING" : "HIDDEN"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.gold, marginTop: 3 }}>{f.text}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{dealWhenShort(f)}, until {f.until}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <button onClick={() => { setError(""); setEditing(f); }} style={small(false)}>Edit</button>
                  <button onClick={() => flip(row)} style={small(false)}>{row.published ? "Hide" : "Show"}</button>
                  <button onClick={() => partnerLink(row)} style={small(false)}>Partner link</button>
                </div>
                {links[row.id] && <div style={{ fontSize: 11.5, color: C.light, marginTop: 6, wordBreak: "break-all", userSelect: "all" }}>{links[row.id]}</div>}
              </div>
            );
          })}
        </div>
      )}
      {rows && rows.length === 0 && !note && (
        <div style={{ fontSize: 12.5, color: C.light, marginTop: 10, lineHeight: 1.55 }}>No real deals yet, so Explore shows the made-up examples. Add the first with New deal.</div>
      )}
      {editing && <Editor key={editing.id ?? "new"} start={editing} busy={busy} error={error} onClose={() => setEditing(null)} onSave={{ save, locate }} />}
    </section>
  );
};

export default DealStudio;
