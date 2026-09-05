import { useState, useEffect } from "react";
import Ico from "./Icon";
import { C } from "../utils/theme";
// ── THE ACCOUNT FACE ────────────────────────────────────────────────
//
// Oliver, 5 Sep 2026: "a golden person inside a white circle (like the Gemlyx
// symbol) if no profile picture. But if you got a profile picture, then a
// circle like Facebook."
//
// ── THE GLYPH IS UNDERNEATH, NOT INSTEAD ────────────────────────────
//
// The obvious build is `url ? <img> : <glyph>`, and it has a hole in it that
// only shows up on somebody else's connection: between the render and the load
// there is nothing in the circle, and if the picture 404s or the provider's CDN
// is blocked there is nothing in it forever. An empty ring in a header reads as
// a broken page rather than as a slow one.
//
// So the glyph is always drawn and the picture covers it. Nothing to swap in,
// no loading state to get wrong, and a failed load is a circle with a person in
// it rather than a hole. Studio's photo publish path made the same call in the
// other direction on 10 Aug: a monogram plate under every card, with the
// photograph laid over it.
//
// ── AND THE PERSON IS Ico's, NOT A SECOND COPY OF ONE ───────────────
//
// components/Icon.jsx has carried `user` since the icon set replaced the emoji,
// drawn on the same 24 grid with the same 2px round stroke as everything else
// in the chrome. A hand-drawn path here would be a second person glyph that
// drifts from the first the day either is touched, which is the failure this
// codebase has catalogued more than any other.
export default function AccountAvatar({ url = "", size = 32, alt = "", title = "" }) {
  const [broken, setBroken] = useState(false);
  // A new address deserves a new attempt. Without this, one failed picture
  // would keep the glyph showing after a sign-out and back in with a working
  // one, because `broken` would still be true from the last account.
  useEffect(() => { setBroken(false); }, [url]);
  const show = url && !broken;
  return (
    <span
      title={title || undefined}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        // White, as asked, and a thin gold ring because the brand mark has one
        // and because a white disc butted straight against a dark header has no
        // edge of its own. See components/GemlyxLogo.jsx.
        background: "#FFFFFF",
        border: `1px solid ${C.gold}66`,
        boxSizing: "border-box",
      }}>
      <Ico name="user" size={Math.round(size * 0.56)} color={C.gold} />
      {show && (
        <img
          src={url}
          alt={alt}
          onError={() => setBroken(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </span>
  );
}
