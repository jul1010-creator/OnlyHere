import { C } from "../utils/theme";
import { getEventDate, travelLabel } from "../utils/helpers";
import { AtAGlanceCard } from "./AtAGlanceCard";
import { GemlyxFindCard } from "./GemlyxFindCard";
import { InstagramEmbed } from "./InstagramEmbed";
import { ReviewsSection } from "./ReviewsSection";

export const DetailPage = ({ item, onClose, kind, liveInfo, liveInfoLoading, checkLiveInfo, userCoords }) => {
  if (!item) return null;
  const color = item.color || C.accent;
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 290, overflowY: "auto" }}>
      <div style={{ height: 190, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <span style={{ fontSize: 64, opacity: item.photo ? 0.25 : 1, position: item.photo ? "absolute" : "static" }}>{item.emoji}</span>
        {item.photo && (
          <img src={item.photo} alt={item.name} onError={e => { e.target.style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
        )}
        <button onClick={onClose}
          style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", left: 14, background: "rgba(10,15,30,0.7)", border: "none", color: "#fff", borderRadius: 100, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          ‹ Back
        </button>
        {item.type && <div style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top))", right: 14, background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "5px 11px", borderRadius: 100, textTransform: "uppercase" }}>{item.type}</div>}
      </div>
      <div style={{ padding: "20px 20px 40px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          {kind === "event" ? `${item.town}` : kind === "nightlife" ? item.location : kind === "free" ? item.city : kind === "food" ? item.location : item.region}
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: C.text, lineHeight: 1.1, marginBottom: 8 }}>{item.name}</div>

        {kind === "nightlife" && item.crowd && (
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "5px 12px", borderRadius: 100, marginBottom: 18 }}>
            👥 {item.crowd}
          </div>
        )}
        {kind === "free" && item.popularityTag && (
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: item.popularityTag === "Hidden Gem" ? C.gold : C.muted, background: item.popularityTag === "Hidden Gem" ? `${C.gold}22` : C.surface, border: `1px solid ${item.popularityTag === "Hidden Gem" ? C.gold : C.border}`, padding: "5px 12px", borderRadius: 100, marginBottom: 18 }}>
            {item.popularityTag === "Hidden Gem" ? "◆ Hidden Gem" : "○ Common Attraction"} · FREE
          </div>
        )}
        {kind === "food" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "5px 12px", borderRadius: 100 }}>{item.category}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: `${C.gold}18`, padding: "5px 12px", borderRadius: 100 }}>{item.price}</span>
          </div>
        )}

        {kind === "event" && (
          <div style={{ marginBottom: 12 }}>
            {item.tier && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 100, marginRight: 8, display: "inline-block", marginBottom: 8,
                color: item.tier === "Can't miss out" ? "#0A0F1E" : item.tier === "Worth it for longer stays" ? "#FFB347" : "#4CAF50",
                background: item.tier === "Can't miss out" ? C.gold : item.tier === "Worth it for longer stays" ? "#FFB34722" : "#4CAF5022",
              }}>
                {item.tier === "Can't miss out" ? "⭐ Can't miss out" : item.tier === "Worth it for longer stays" ? "◷ Worth it for longer stays" : "👍 Recommended"}
              </span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{getEventDate(item.date, item.dateEnd)}</span>
              <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>★ {item.rating}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{travelLabel(userCoords, item.town, item.travelTime)}</span>
            </div>
          </div>
        )}
        {kind === "event" && (
          <AtAGlanceCard rows={[
            { icon: "🚆", label: "Nearest Station", value: item.nearestStation },
            { icon: "🎟️", label: "Tickets", value: item.ticketInfo },
            { icon: "⛺", label: "Camping", value: item.camping },
            { icon: "🏡", label: "Accommodation", value: item.accommodationTip },
            { icon: "💰", label: "Budget", value: item.budgetLevel },
          ]} />
        )}
        {kind === "town" && (
          <>
            <AtAGlanceCard rows={[
              { icon: "🚆", label: "Nearest Station", value: item.nearestStation },
              { icon: "🛏️", label: "Recommended Stay", value: item.recommendedStayGlance },
              { icon: "☀️", label: "Best Time", value: item.bestTimeGlance },
              { icon: "🏡", label: "Accommodation", value: item.accommodationGlance },
              { icon: "💰", label: "Budget", value: item.budgetGlance },
            ]} />
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>{travelLabel(userCoords, item.name, item.travelTime)}</div>
          </>
        )}
        {(kind === "free" || kind === "attraction") && (
          <AtAGlanceCard rows={[
            { icon: "🎟️", label: "Tickets", value: item.ticketsGlance },
            { icon: "⏱️", label: "Time Needed", value: item.timeNeeded },
            { icon: "💰", label: "Budget", value: item.budgetGlance },
            { icon: "♿", label: "Accessibility", value: item.accessibility },
            { icon: "🚆", label: "Nearest Station", value: item.nearestStation },
          ]} />
        )}
        {item.gemlyxFind && <GemlyxFindCard text={item.gemlyxFind} />}

        <div style={{ fontSize: 14, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>{item.desc}</div>

        {item.blogBody && item.blogBody.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {item.blogBody.map((block, i) => (
              block.type === "bullets" ? (
                <ul key={i} style={{ margin: "0 0 16px", paddingLeft: 20, color: C.light, fontSize: 14, lineHeight: 1.75 }}>
                  {block.items.map((it, j) => <li key={j} style={{ marginBottom: 4 }}>{it}</li>)}
                </ul>
              ) : block.type === "instagram" ? (
                <InstagramEmbed key={i} url={block.url} />
              ) : block.type === "video" ? (
                <div key={i} style={{ marginBottom: 16 }}>
                  <video src={block.src} controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 14, display: "block", background: "#000" }} />
                  {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
                </div>
              ) : block.type === "image" ? (
                <div key={i} style={{ marginBottom: 16 }}>
                  <img src={block.src} alt={block.caption || item.name} onError={e => { e.target.style.display = "none"; }}
                    style={{ width: "100%", borderRadius: 14, display: "block" }} />
                  {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
                </div>
              ) : block.type === "heading" ? (
                <div key={i} style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginTop: 20, marginBottom: 10 }}>{block.content}</div>
              ) : (
                <div key={i} style={{ fontSize: 14, color: C.light, lineHeight: 1.8, marginBottom: 14 }}>{block.content}</div>
              )
            ))}
          </div>
        )}

        {kind === "town" && item.highlight && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>◆ Gemlyx Find</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65 }}>{item.highlight}</div>
          </div>
        )}
        {kind === "event" && item.tags && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 26 }}>
            {item.tags.map(t => <span key={t} style={{ fontSize: 12, color: C.text, background: C.surface, border: `1px solid ${C.border}`, padding: "7px 13px", borderRadius: 100 }}>{t}</span>)}
          </div>
        )}
        {(kind === "nightlife" || kind === "food") && item.tip && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 22, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            💡 {item.tip}
          </div>
        )}

        <button onClick={() => checkLiveInfo(item)} disabled={liveInfoLoading === item.name}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: liveInfo?.[item.name] ? 12 : 14 }}>
          {liveInfoLoading === item.name ? "Checking..." : "🔍 Check live info"}
        </button>
        {liveInfo?.[item.name] && (
          <div style={{ background: `${color}18`, border: `1px solid ${color}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            {liveInfo[item.name]}
          </div>
        )}

        {kind === "free" && item.website && (
          <a href={item.website} target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", background: C.surface, border: `1px solid ${C.border}`, color: C.light, borderRadius: 12, padding: "13px", fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 10 }}>
            🌐 Visit website
          </a>
        )}

        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.mapHint || `${item.name} ${item.city || item.location || ""} Denmark`)}`} target="_blank" rel="noreferrer"
          style={{ display: "block", textAlign: "center", background: color, color: "#fff", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          ↗ Get Directions
        </a>

        <ReviewsSection itemType={kind} itemName={item.name} />
      </div>
    </div>
  );
};


