// ── ONE BLOG BODY RENDERER, NOT THREE ───────────────────────────────
//
// A published entry's long-form body is an array of blocks, and until 4 Sep
// 2026 two different pieces of code knew how to draw one: DetailPage.jsx, which
// serves the event/town/nightlife/free/food pages, and a copy inlined in the
// workshop page in App.jsx. A third was about to be written for the nightlife
// TOWN page, which had none at all.
//
// That third copy is this file instead. This codebase's oldest and most
// expensive habit is letting the second reader write its own copy: "Four lists,
// one omission, which is not four mistakes. It is one hand-written list copied
// four times." A block type added to the pipeline and drawn by two of three
// renderers is the same shape of bug, and it is invisible, because the page
// that cannot draw it renders nothing rather than failing.
//
// DetailPage keeps its own for now: it is the main reader path and carries
// photo credits, live-info panels and save state that this does not. Reducing
// three to two is the honest step available tonight; the remaining merge is
// still owed.
//
// ── AND A NIGHTLIFE TOWN HAD NO BODY AT ALL ─────────────────────────
//
// The nightTown prompt asks for 230-330 words across Who It's For, After Dark,
// The Reality Check and three What to Be Aware Of bullets. shapeForLive stored
// every one of them. The page drew the photo, the name, the description and the
// Gemlyx Find, and stopped. Roughly four fifths of what the pipeline researched,
// drafted, fact-checked and published for that type reached nobody.
import React from "react";

export default function BlogBody({ blocks, C, name = "", InstagramEmbed = null, style = null }) {
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return null;
  return (
    <div style={style || { marginBottom: 24 }}>
      {list.map((block, i) => (
        block?.type === "bullets" ? (
          <ul key={i} style={{ margin: "0 0 16px", paddingLeft: 20, color: C.light, fontSize: 14, lineHeight: 1.75 }}>
            {(block.items || []).map((it, j) => <li key={j} style={{ marginBottom: 4 }}>{it}</li>)}
          </ul>
        ) : block?.type === "instagram" ? (
          // Passed in rather than imported, so this file has no opinion about
          // where the embed lives and cannot pull App.jsx's tree into a page
          // that does not want it. A page that does not supply one simply does
          // not draw embeds, which is the honest fallback.
          InstagramEmbed ? <InstagramEmbed key={i} url={block.url} /> : null
        ) : block?.type === "video" ? (
          <div key={i} style={{ marginBottom: 16 }}>
            <video src={block.src} controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 14, display: "block", background: "#000" }} />
            {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
          </div>
        ) : block?.type === "image" ? (
          <div key={i} style={{ marginBottom: 16 }}>
            <img src={block.src} alt={name} onError={e => { e.target.style.display = "none"; }}
              style={{ width: "100%", borderRadius: 14, display: "block" }} />
            {block.caption && <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{block.caption}</div>}
          </div>
        ) : block?.type === "heading" ? (
          <div key={i} style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", marginTop: 20, marginBottom: 10 }}>{block.content}</div>
        ) : (
          <div key={i} style={{ fontSize: 14, color: C.light, lineHeight: 1.8, marginBottom: 14 }}>{block.content}</div>
        )
      ))}
    </div>
  );
}
