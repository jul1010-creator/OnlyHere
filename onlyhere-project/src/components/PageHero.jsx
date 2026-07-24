export const PageHero = ({ src, emoji, color }) => (
  <div style={{ height: 130, borderRadius: 14, overflow: "hidden", marginBottom: 18, position: "relative", background: `linear-gradient(135deg, ${color}33 0%, #0A0F1E 100%)` }}>
    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, opacity: 0.22 }}>{emoji}</span>
    <img src={src} alt="" onError={e => { e.target.style.display = "none"; }}
      style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
  </div>
);


