import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { loadImageCredits, creditFor, licenseUrl } from "../utils/imageCredits";
import { aiLabel, isAiImage } from "../utils/aiImages";

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
// `credit` is for media Oliver uploads through Studio, where the credit is typed
// in rather than recorded at download time. It takes priority over the file
// lookup, because a credit entered by hand for THIS image is more specific than
// anything matched by filename.
export const PhotoCredit = ({ photo, credit, align = "left", style }) => {
  const [, bump] = useState(0);
  useEffect(() => { let alive = true; loadImageCredits().then(() => { if (alive) bump(v => v + 1); }); return () => { alive = false; }; }, []);

  // ── AN AI PICTURE IS A CREDIT EVEN WITH NOTHING ELSE IN IT ───────
  //
  // The old test asked whether any of the four credit strings had content, and
  // a generated picture has none of them: nobody took it, there is no source
  // page and there is no licence. Under that test the disclosure the AI Act
  // asks for would have been dropped for being an empty credit, which is the
  // one case where saying nothing is not an option. See utils/aiImages.js.
  const generated = isAiImage(credit);
  const typed = credit && (generated || credit.photographer || credit.source || credit.license || credit.sourceUrl) ? credit : null;
  const entry = typed || creditFor(photo);
  if (!entry) return null;
  // What is left to say after the chip. On a generated picture `source` is the
  // words "AI image", which the chip has already said better, so it does not
  // count: without this, an uploaded AI picture would print its chip, then the
  // made-with lead, then the words "AI image", all saying one thing three
  // times.
  const said = generated ? entry.photographer : (entry.photographer || entry.source);
  const more = said || entry.license || entry.sourceUrl;

  const url = licenseUrl(entry.license);
  const linkStyle = { color: C.light, textDecoration: "underline" };

  return (
    <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5, textAlign: align, ...style }}>
      {/* ── THE DISCLOSURE, FIRST AND IN ITS OWN CHIP ─────────────────
          Article 50(4) wants it clear and distinguishable, visible without any
          action by the reader, at first exposure. So it leads, it is not folded
          into the credit sentence, and it is drawn as a chip rather than as
          more grey small print that the eye skips with the rest of the
          attribution. */}
      {generated && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4, verticalAlign: "middle",
          background: `${C.gold}1F`, border: `1px solid ${C.gold}66`, color: C.gold,
          borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 700,
          letterSpacing: 0.3, marginRight: said ? 6 : 0,
        }}>✦ {aiLabel(credit)}</span>
      )}
      {/* A generated picture with nothing else on it stops here: there is no
          photographer to credit and "Photo: source" under an invented image
          would be a second claim nobody can check. */}
      {!more ? null : (
        <>
      {generated ? "Made with AI" : "Photo:"}{" "}
      {entry.sourceUrl ? (
        <a href={entry.sourceUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          {said || "source"}
        </a>
      ) : said ? (
        <span>{said}</span>
      ) : null}
      {!generated && entry.photographer && entry.source ? ` / ${entry.source}` : ""}
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
        </>
      )}
    </div>
  );
};
