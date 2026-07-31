import { useEffect } from "react";

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
    <div style={{ background: "#0A0F1E", border: "1px solid #1E2A3A", borderRadius: 16, padding: 10, marginBottom: 16 }}>
      <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14"
        style={{ width: "100%", margin: 0, background: "#111827", border: "1px solid #1E2A3A", borderRadius: 10, minWidth: 0, overflow: "hidden" }}>
        <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", padding: 14, fontSize: 12, color: "#9AA5BE" }}>View on Instagram ↗</a>
      </blockquote>
    </div>
  );
};
