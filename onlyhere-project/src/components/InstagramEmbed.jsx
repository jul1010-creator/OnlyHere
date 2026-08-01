import { useEffect } from "react";
import { C } from "../utils/theme";

// Redesign pass: Instagram's embed itself is always a white iframe we can't
// re-theme (Instagram offers no dark mode for embeds), so the fix is the frame
// around it — before, the raw blockquote sat in a plain bordered box, which is
// exactly the 2015-blog look. Now: a proper media card with a header row (the
// Instagram glyph drawn as an inline SVG, no emoji), the embed clipped inside
// rounded corners so the white iframe reads as intentional media content, and
// a capped width so it never stretches into a wall.
export const InstagramEmbed = ({ url }) => {
  useEffect(() => {
    const process = () => { if (window.instgrm) window.instgrm.Embeds.process(); };
    if (document.getElementById("ig-embed-script")) { process(); return; }
    const s = document.createElement("script");
    s.id = "ig-embed-script";
    s.src = "https://www.instagram.com/embed.js";
    s.async = true;
    s.onload = process;
    document.body.appendChild(s);
  }, [url]);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 16, maxWidth: 420 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.light} strokeWidth="2" strokeLinecap="round">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill={C.light} stroke="none" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: 0.8, textTransform: "uppercase" }}>From Instagram</span>
        <a href={url} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: C.muted, textDecoration: "none" }}>Open ↗</a>
      </div>
      <div style={{ padding: 8, background: C.bg }}>
        <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14"
          style={{ width: "100%", margin: 0, background: C.surface, border: "none", borderRadius: 10, minWidth: 0, overflow: "hidden" }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", padding: 14, fontSize: 12, color: C.light }}>View on Instagram ↗</a>
        </blockquote>
      </div>
    </div>
  );
};
