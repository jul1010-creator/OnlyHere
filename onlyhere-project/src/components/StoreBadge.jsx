export const StoreBadge = ({ type, href }) => (
  <a href={href} target="_blank" rel="noreferrer"
    style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#000", border: "1px solid #3a3a3a", borderRadius: 8, padding: "7px 13px", textDecoration: "none" }}>
    {type === "ios" ? (
      <svg width="19" height="22" viewBox="0 0 24 28" fill="#fff"><path d="M19.6 14.7c0-3.2 2.6-4.7 2.7-4.8-1.5-2.2-3.8-2.5-4.6-2.5-2-.2-3.8 1.2-4.8 1.2-1 0-2.5-1.1-4.2-1.1-2.1 0-4.1 1.2-5.2 3.2-2.2 3.8-.6 9.5 1.6 12.6 1.1 1.5 2.3 3.2 4 3.2 1.6-.1 2.2-1 4.1-1 1.9 0 2.5 1 4.2 1 1.7 0 2.8-1.6 3.8-3.1 1.2-1.8 1.7-3.5 1.7-3.6-.1 0-3.3-1.3-3.3-5.1zM16.4 4.9c.9-1.1 1.5-2.5 1.3-4-1.3.1-2.8.9-3.7 1.9-.8 1-1.5 2.5-1.3 3.9 1.4.1 2.8-.7 3.7-1.8z"/></svg>
    ) : (
      <svg width="18" height="20" viewBox="0 0 24 26"><path fill="#00D7FE" d="M1.3.6C1 1 .8 1.5.8 2.2v21.6c0 .7.2 1.2.5 1.6l.1.1L14.6 12.3v-.3L1.4.5l-.1.1z"/><path fill="#FFCE00" d="M19 16.8l-4.4-4.5v-.3L19 7.5l.1.1 5.2 3c1.5.8 1.5 2.2 0 3.1l-5.2 3-.1.1z"/><path fill="#FF3A44" d="M19.1 16.7L14.6 12 1.3 25.4c.5.5 1.3.6 2.2.1l15.6-8.8"/><path fill="#00F076" d="M19.1 7.4L3.5.6C2.6.1 1.8.2 1.3.7L14.6 12l4.5-4.6z"/></svg>
    )}
    <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
      <span style={{ fontSize: 8, color: "#ccc", letterSpacing: 0.4 }}>{type === "ios" ? "Download on the" : "GET IT ON"}</span>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{type === "ios" ? "App Store" : "Google Play"}</span>
    </span>
  </a>
);

