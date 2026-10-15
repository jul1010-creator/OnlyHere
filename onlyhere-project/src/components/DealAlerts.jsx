// ── DEAL ALERTS: THE BELL, ITS LIST AND THE TICKS ───────────────────
//
// Oliver, 14 Oct 2026: "make a notification system for users, so they can see
// whenever a new discount has popped up. Also a mail one, but make it so people
// can tick off what notifications they want from as well. So they don't get
// tons from museums, which they obviously are not interested in."
//
// For members who are signed in, on the Lithuanian site (15 Oct 2026). A bell
// beside the account picture, with how many new deals there are; tapping it
// opens the list under it on a computer and from the bottom on a phone, calm
// the way the Lidl Plus app lists its messages. Opening it counts as seeing
// them. The settings are the four kinds of place, as on Explore, and one
// switch for mail. A label and a control each, nothing written under them.
//
// Until DEAL_ALERTS_15OCT.sql has run, the tables are not there: the bell is
// not drawn and the settings say "Not available just now".
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { offerTextIn } from "../utils/offer";
import { DEAL_CATEGORIES, newsForMember, unreadCount, agoWords, cleanCats } from "../utils/dealAlerts";
import { ALERTS, ALERTS_CHANGED, readAlerts, readNews, saveAlerts, localSeen, setLocalSeen, laterOf } from "../utils/dealAlertsStore";
import { useKlaipedaDeals } from "../utils/useKlaipedaDeals";
import { CategoryCircle } from "./CategoryFilter";
import { dealPlaceId, leftWords } from "./DealsNearYou";

const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
// Polled on load, when the window comes back into focus, and every five
// minutes while the page is visible.
export const POLL_MS = 5 * 60 * 1000;
// A member with no row and nothing on this device yet sees the last day's
// deals as new, so the bell has something to say on the first visit.
const FIRST_LOOK_MS = 24 * 3600000;
const PHONE_QUERY = "(max-width: 640px)";

// Line drawings, as functions so nothing is drawn when the file is imported.
const BellIcon = ({ size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
const SlidersIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M1 14h6" /><path d="M9 8h6" /><path d="M17 16h6" />
  </svg>
);
const CloseIcon = ({ size = 16, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
);
const BackIcon = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
);

// Styles are functions, because C changes with the theme.
const iconBtn = () => ({
  width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent",
  display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto", padding: 0,
});
const MOTION_CSS = `
@keyframes gxAlertsDrop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes gxAlertsRise { from { transform: translateY(100%); } to { transform: none; } }
@keyframes gxAlertsFade { from { opacity: 0; } to { opacity: 1; } }
.gx-alerts-row:hover { background: rgba(255,255,255,0.035); }
.gx-alerts-row:focus-visible, .gx-alerts-ctl:focus-visible { outline: 2px solid var(--gx-ring); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .gx-alerts-anim { animation: none !important; } .gx-alerts-anim * { transition: none !important; } }
`;

// ── ONE SWITCH ROW: THE KIND OF PLACE, OR MAIL ──────────────────────
// The whole row is the control, so its words are its label and a tap
// anywhere on it switches it.
const SwitchRow = ({ on, onToggle, label, icon = null, testid, disabled = false }) => (
  <button type="button" role="switch" aria-checked={on} onClick={onToggle} disabled={disabled} data-testid={testid} className="gx-alerts-ctl"
    style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", background: "none", border: "none", padding: "11px 0", cursor: disabled ? "default" : "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", borderRadius: 12 }}>
    {icon}
    <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: C.text }}>{label}</span>
    <span aria-hidden="true" style={{ width: 44, height: 26, borderRadius: 100, background: on ? C.gold : C.border, padding: 3, boxSizing: "border-box", flex: "0 0 auto", display: "inline-flex", alignItems: "center", transition: "background .2s ease" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: on ? C.onGold : C.light, transform: `translateX(${on ? 18 : 0}px)`, transition: "transform .2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
    </span>
  </button>
);

// ── THE SETTINGS, IN THE PANEL AND ON THE ACCOUNT PAGE ──────────────
// Saves on every change and says "Saved" for a moment. A change that does not
// save is put back, and says so.
export const DealAlertSettings = ({ session, lang = "en", row = null, state = ALERTS.READY, onSaved = null, testid = "alerts-settings" }) => {
  const [cats, setCats] = useState(() => (row ? cleanCats(row.cats) : [...DEAL_CATEGORIES]));
  const [email, setEmail] = useState(() => row?.email_on === true);
  const [flash, setFlash] = useState("");
  const timer = useRef(null);
  useEffect(() => { if (row) { setCats(cleanCats(row.cats)); setEmail(row.email_on === true); } }, [row?.cats?.join(","), row?.email_on]);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (state !== ALERTS.READY) {
    return <div data-testid={`${testid}-unavailable`} style={{ fontSize: 14, color: C.muted, padding: "6px 0" }}>{uiT("alerts.unavailable", lang)}</div>;
  }
  const save = async (patch, undo) => {
    const r = await saveAlerts(session, { ...patch, lang });
    clearTimeout(timer.current);
    if (r.ok) {
      setFlash("saved");
      onSaved?.(r.row);
      try { window.dispatchEvent(new Event(ALERTS_CHANGED)); } catch { /* no window */ }
    } else { undo(); setFlash("failed"); }
    timer.current = setTimeout(() => setFlash(""), 1800);
  };
  const flip = (k) => {
    const before = cats;
    const next = DEAL_CATEGORIES.filter(c => (c === k ? !before.includes(c) : before.includes(c)));
    setCats(next);
    save({ cats: next }, () => setCats(before));
  };
  const flipEmail = () => {
    const before = email;
    setEmail(!before);
    save({ email_on: !before }, () => setEmail(before));
  };
  return (
    <div data-testid={testid} style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "2px 0 4px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: C.bronze || C.muted }}>{uiT("alerts.kinds", lang)}</div>
        <div role="status" aria-live="polite" data-testid={`${testid}-flash`} style={{ fontSize: 12, fontWeight: 600, color: flash === "failed" ? "#E8A35C" : C.gold, minHeight: 16, opacity: flash ? 1 : 0, transition: "opacity .25s ease" }}>
          {flash === "saved" ? `✓ ${uiT("alerts.saved", lang)}` : flash === "failed" ? uiT("alerts.failed", lang) : ""}
        </div>
      </div>
      {DEAL_CATEGORIES.map(k => (
        <SwitchRow key={k} on={cats.includes(k)} onToggle={() => flip(k)} label={uiT(`explore.cat.${k}`, lang)} testid={`${testid}-cat-${k}`}
          icon={<CategoryCircle k={k} size={38} />} />
      ))}
      <div style={{ height: 1, background: C.border, margin: "10px 0 4px" }} />
      <SwitchRow on={email} onToggle={flipEmail} label={uiT("alerts.email", lang)} testid={`${testid}-email`}
        icon={<span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle at 35% 30%, ${C.surface} 0%, ${C.bg} 100%)`, boxShadow: `inset 0 0 0 1px ${C.gold}66` }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
        </span>} />
    </div>
  );
};

// ── THE SAME, AS A CARD ON THE ACCOUNT PAGE (/me) ───────────────────
// Reads the member's row itself, so the page works whether or not the bell
// has been opened.
export const DealAlertsCard = ({ session, lang = "en" }) => {
  const [state, setState] = useState("loading");
  const [row, setRow] = useState(null);
  useEffect(() => {
    let gone = false;
    readAlerts(session).then(a => { if (gone) return; setRow(a.row); setState(a.state === ALERTS.READY ? ALERTS.READY : ALERTS.MISSING); });
    return () => { gone = true; };
  }, [session?.token]);
  if (state === "loading") return <div style={{ height: 120 }} />;
  return <DealAlertSettings session={session} lang={lang} row={row} state={state} onSaved={setRow} testid="me-alerts" />;
};

// ── ONE NEWS ROW ────────────────────────────────────────────────────
const NewsRow = ({ n, lang, now, onOpen, last }) => {
  const left = n.short && n.ends_at ? Math.ceil((Date.parse(n.ends_at) - now.getTime()) / 60000) : null;
  const ends = left !== null && left > 0 && left <= 24 * 60 ? fill(uiT("badge.endsIn", lang), { t: leftWords(left, lang) }) : "";
  const urgent = ends && left <= 60;
  return (
    <li style={{ listStyle: "none", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <button type="button" onClick={onOpen} className="gx-alerts-row" data-testid="alerts-item" data-unread={n.unread ? "1" : undefined}
        style={{ display: "flex", alignItems: "flex-start", gap: 14, width: "100%", background: "none", border: "none", padding: "15px 20px", cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", transition: "background .15s ease" }}>
        <CategoryCircle k={n.category} size={42} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 650, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</span>
            <span style={{ flex: "0 0 auto", fontSize: 11.5, color: C.muted }}>{agoWords(n.created_at, now, lang)}</span>
          </span>
          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13.5, lineHeight: 1.45, color: C.light, marginTop: 3 }}>{n.text}</span>
          {ends && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 7, fontSize: 12, fontWeight: 650, color: urgent ? "#E8A35C" : C.gold }}>
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: urgent ? "#E8A35C" : C.gold }} />{ends}
            </span>
          )}
        </span>
        <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 6, borderRadius: "50%", flex: "0 0 auto", background: n.unread ? C.gold : "transparent" }} />
      </button>
    </li>
  );
};

// ── THE BELL ────────────────────────────────────────────────────────
// `onOpenDeal(id)` takes the reader to the deal on Explore (App.jsx).
export const DealAlertsBell = ({ session, lang = "en", version = 0, onOpenDeal = null }) => {
  const [state, setState] = useState("loading");
  const [row, setRow] = useState(null);
  const [news, setNews] = useState([]);
  const [seenAt, setSeenAt] = useState(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list");
  // What had been seen before this opening, so the new ones keep their dot
  // while the list is open even though opening it has marked them seen.
  const [shownSeen, setShownSeen] = useState(null);
  const [phone, setPhone] = useState(() => { try { return window.matchMedia(PHONE_QUERY).matches; } catch { return false; } });
  const [spot, setSpot] = useState({ top: 64, right: 16 });
  const [now, setNow] = useState(() => new Date());
  const bell = useRef(null);
  const panel = useRef(null);
  const panelId = useId();
  const uid = session?.userId || "";
  const deals = useKlaipedaDeals(null, version);

  const load = useCallback(async () => {
    if (!session?.token || !uid) return;
    const [a, n] = await Promise.all([readAlerts(session), readNews(session)]);
    if (a.state === ALERTS.MISSING || n.state === ALERTS.MISSING) { setState(ALERTS.MISSING); return; }
    if (a.state !== ALERTS.READY || n.state !== ALERTS.READY) { setState(s => (s === ALERTS.READY ? s : ALERTS.OFFLINE)); return; }
    setRow(a.row);
    setNews(n.rows);
    let seen = laterOf(a.row?.seen_at, localSeen(uid));
    if (!seen) { seen = new Date(Date.now() - FIRST_LOOK_MS).toISOString(); setLocalSeen(uid, seen); }
    setSeenAt(s => laterOf(s, seen));
    setNow(new Date());
    setState(ALERTS.READY);
  }, [session?.token, uid]);

  useEffect(() => {
    load();
    const again = () => load();
    const tick = setInterval(() => { try { if (document.visibilityState === "visible") load(); } catch { /* no document */ } }, POLL_MS);
    window.addEventListener("focus", again);
    window.addEventListener(ALERTS_CHANGED, again);
    return () => { clearInterval(tick); window.removeEventListener("focus", again); window.removeEventListener(ALERTS_CHANGED, again); };
  }, [load]);

  const cats = row ? row.cats : DEAL_CATEGORIES;
  const count = state === ALERTS.READY ? unreadCount(news, { cats, seenAt }, now) : 0;
  // The live deal, when Explore's deals are loaded, gives the offer in the
  // reader's language; the stored English stands in until then.
  const liveById = useMemo(() => new Map((deals.examples ? [] : deals.deals).map(d => [dealPlaceId(d), d])), [deals]);
  const items = useMemo(() => newsForMember(news, { cats, seenAt: shownSeen, now })
    // A deal taken off Explore since is left out, once Explore's list is known.
    .filter(n => !(deals.ready && !deals.examples && liveById.size && !liveById.has(n.deal_id)))
    .map(n => {
      const d = liveById.get(n.deal_id);
      return { ...n, name: d?.name || n.name, text: (d && offerTextIn(d.__offer, lang)) || n.offer };
    }), [news, cats, shownSeen, now, deals, liveById, lang]);

  // Under the bell and clear of the header's own bottom line. The header is
  // the outermost box around the bell that is still header sized, whatever
  // it is called, so its bottom edge is read rather than guessed.
  const place = () => {
    const r = bell.current?.getBoundingClientRect();
    if (!r) return;
    let edge = r.bottom;
    try {
      for (let el = bell.current.parentElement; el && el !== document.body; el = el.parentElement) {
        const box = el.getBoundingClientRect();
        if (box.height >= 160) break;
        edge = Math.max(edge, box.bottom);
      }
    } catch { /* the bell's own edge will do */ }
    setSpot({ top: Math.round(Math.max(r.bottom + 10, edge + 8)), right: Math.max(12, Math.round(window.innerWidth - r.right - 4)) });
  };
  const openPanel = () => {
    try { setPhone(window.matchMedia(PHONE_QUERY).matches); } catch { /* keep */ }
    place();
    setShownSeen(seenAt);
    setView("list");
    setNow(new Date());
    setOpen(true);
    const at = new Date().toISOString();
    setSeenAt(at);
    setLocalSeen(uid, at);
    saveAlerts(session, { seen_at: at, lang }).then(r => { if (r.ok && r.row) setRow(r.row); });
  };
  const close = useCallback(() => {
    setOpen(false);
    setView("list");
    setTimeout(() => bell.current?.focus(), 0);
  }, []);

  // Escape closes, Tab stays inside, and the first control takes the focus.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const f = [...panel.current.querySelectorAll("button:not([disabled]), a[href]")];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const onResize = () => { place(); try { setPhone(window.matchMedia(PHONE_QUERY).matches); } catch { /* keep */ } };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const t = setTimeout(() => panel.current?.querySelector("[data-first-focus]")?.focus(), 30);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); clearTimeout(t); };
  }, [open, close]);
  useEffect(() => { if (open) setTimeout(() => panel.current?.querySelector("[data-first-focus]")?.focus(), 30); }, [view]);

  // Not drawn at all until the tables exist, or while signed out.
  if (!uid || state === ALERTS.MISSING || state === "loading") return null;

  const label = [uiT("alerts.bell", lang), count ? fill(uiT("alerts.newCount", lang), { n: count }) : ""].filter(Boolean).join(", ");
  const openDeal = (id) => { close(); onOpenDeal?.(id); };

  const head = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: phone ? "6px 18px 14px" : "18px 18px 14px 20px", borderBottom: `1px solid ${C.border}` }}>
      {view === "settings" && (
        <button type="button" onClick={() => setView("list")} aria-label={uiT("alerts.back", lang)} data-first-focus="" data-testid="alerts-back" className="gx-alerts-ctl" style={{ ...iconBtn(), border: "none", marginLeft: -8 }}>
          <BackIcon color={C.text} />
        </button>
      )}
      <h2 id={`${panelId}-title`} style={{ flex: 1, margin: 0, fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, letterSpacing: -0.2, color: C.text }}>
        {view === "settings" ? uiT("alerts.bell", lang) : uiT("alerts.title", lang)}
      </h2>
      {view === "list" && (
        <button type="button" onClick={() => setView("settings")} aria-label={uiT("alerts.settings", lang)} title={uiT("alerts.settings", lang)} data-first-focus="" data-testid="alerts-open-settings" className="gx-alerts-ctl" style={iconBtn()}>
          <SlidersIcon color={C.light} />
        </button>
      )}
      {phone && (
        <button type="button" onClick={close} aria-label={uiT("alerts.close", lang)} data-testid="alerts-close" className="gx-alerts-ctl" style={iconBtn()}>
          <CloseIcon color={C.light} />
        </button>
      )}
    </div>
  );

  const body = view === "settings" ? (
    <div style={{ padding: "14px 20px 18px", overflowY: "auto" }}>
      <DealAlertSettings session={session} lang={lang} row={row} state={ALERTS.READY} onSaved={(r) => r && setRow(r)} />
    </div>
  ) : items.length === 0 ? (
    <div data-testid="alerts-empty" style={{ padding: "40px 28px 44px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: `inset 0 0 0 1px ${C.gold}55`, background: `radial-gradient(circle at 35% 30%, ${C.surface} 0%, ${C.bg} 100%)` }}>
        <BellIcon size={22} color={C.gold} />
      </span>
      <span style={{ fontSize: 14, color: C.light, lineHeight: 1.5 }}>{uiT(cats.length ? "alerts.empty" : "alerts.noneTicked", lang)}</span>
    </div>
  ) : (
    <ul data-testid="alerts-list" style={{ margin: 0, padding: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
      {items.map((n, i) => <NewsRow key={n.id} n={n} lang={lang} now={now} last={i === items.length - 1} onOpen={() => openDeal(n.deal_id)} />)}
    </ul>
  );

  const sheet = open && typeof document !== "undefined" && createPortal(
    <div className="gx-alerts-anim" style={{ position: "fixed", inset: 0, zIndex: 1200, "--gx-ring": C.fieldRing || C.gold }}>
      <style>{MOTION_CSS}</style>
      <div onClick={close} data-testid="alerts-scrim" style={{ position: "absolute", inset: 0, background: phone ? C.scrim : "transparent", animation: phone ? "gxAlertsFade .2s ease" : "none" }} />
      <div ref={panel} id={panelId} role="dialog" aria-modal={phone ? "true" : "false"} aria-labelledby={`${panelId}-title`} data-testid="alerts-panel" data-layout={phone ? "sheet" : "dropdown"}
        style={phone ? {
          position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "86vh", display: "flex", flexDirection: "column",
          background: C.surface, borderRadius: "20px 20px 0 0", borderTop: `1px solid ${C.border}`, boxShadow: "0 -18px 50px rgba(0,0,0,0.5)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)", animation: "gxAlertsRise .26s cubic-bezier(.2,.8,.2,1)", fontFamily: "'Inter', sans-serif",
        } : {
          position: "absolute", top: spot.top, right: spot.right, width: 392, maxWidth: "calc(100vw - 24px)", maxHeight: "min(600px, calc(100vh - 90px))",
          display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
          boxShadow: "0 22px 60px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)", overflow: "hidden", animation: "gxAlertsDrop .18s ease-out", fontFamily: "'Inter', sans-serif",
        }}>
        {phone && <div aria-hidden="true" style={{ width: 38, height: 4, borderRadius: 100, background: C.border, margin: "10px auto 6px" }} />}
        {head}
        {body}
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      <button ref={bell} type="button" onClick={() => (open ? close() : openPanel())} aria-label={label} title={uiT("alerts.bell", lang)}
        aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? panelId : undefined} data-testid="alerts-bell" data-count={count}
        style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", background: open ? `${C.gold}1F` : "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s ease" }}>
        <BellIcon size={20} color={open ? C.gold : C.text} />
        {count > 0 && (
          <span aria-hidden="true" data-testid="alerts-badge" style={{
            position: "absolute", top: -5, right: -7, minWidth: 16, height: 16, borderRadius: 100, background: C.gold, color: C.onGold,
            fontSize: 10, fontWeight: 800, lineHeight: "16px", textAlign: "center", padding: "0 4px", fontFamily: "'Inter', sans-serif",
            border: `2px solid ${C.bg}`, boxSizing: "content-box",
          }}>{count > 9 ? "9+" : count}</span>
        )}
      </button>
      {sheet}
    </>
  );
};

export default DealAlertsBell;
