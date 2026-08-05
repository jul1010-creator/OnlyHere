import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { loadImageCredits, creditFor, licenseUrl } from "../utils/imageCredits";

// The caption that sits under a photo: who took it, where it came from, and
// under what licence, with the licence name linked to its real deed.
//
// Renders nothing at all when there is no credit on file for that image, so it
// can be dropped under any photo in the app without checking first. The credits
// file is fetched once per session and cached in the module, so this costs one
// request no matter how many photos are on screen.
//
// SOURCE NAMES ARE SHOWN AS WRITTEN in image-credits.json ("wikimedia",
// "pexels"). Deliberately not prettified into a fake proper noun: the value in
// the file is what was actually recorded at download time, and rewriting it in
// the UI would make the on-screen credit and the audit trail disagree.
export const PhotoCredit = ({ photo, align = "left", style }) => {
  const [, bump] = useState(0);
  useEffect(() => { let alive = true; loadImageCredits().then(() => { if (alive) bump(v => v + 1); }); return () => { alive = false; }; }, []);

  const entry = creditFor(photo);
  if (!entry) return null;

  const url = licenseUrl(entry.license);
  const linkStyle = { color: C.light, textDecoration: "underline" };

  return (
    <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, textAlign: align, ...style }}>
      Photo:{" "}
      {entry.sourceUrl ? (
        <a href={entry.sourceUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          {entry.photographer || entry.source || "source"}
        </a>
      ) : (
        <span>{entry.photographer || entry.source || "source"}</span>
      )}
      {entry.photographer && entry.source ? ` / ${entry.source}` : ""}
      {entry.license ? (
        <>
          {" · "}
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>{entry.license}</a>
          ) : (
            <span>{entry.license}</span>
          )}
        </>
      ) : null}
    </div>
  );
};
