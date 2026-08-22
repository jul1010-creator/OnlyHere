import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";

// Redesign pass: Instagram's embed itself is always a white iframe we can't
// re-theme (Instagram offers no dark mode for embeds), so the fix is the frame
// around it — before, the raw blockquote sat in a plain bordered box, which is
// exactly the 2015-blog look. Now: a proper media card with a header row (the
// Instagram glyph drawn as an inline SVG, no emoji), the embed clipped inside
// rounded corners so the white iframe reads as intentional media content, and
// a capped width so it never stretches into a wall.
//
// ── WHY YOU COULD NOT CLICK IT ───────────────────────────────────────
//
// Oliver, 21 Aug 2026, on the Christmas fair event page: "why can I not click
// the instagram video? Where does it take me into instagram?"
//
// Two separate things were wrong and they have different answers.
//
// ONE: THE EMBED COULD SILENTLY NEVER RENDER. The old effect was
//
//     if (document.getElementById("ig-embed-script")) { process(); return; }
//     ... s.onload = process; document.body.appendChild(s);
//
// which reads as "the script is here, so process now". But the tag exists from
// the moment it is APPENDED, and window.instgrm does not exist until the script
// has downloaded and run. Any embed mounting inside that window took the early
// return, called process() against an undefined global, did nothing, and
// registered no onload of its own. There was no retry. The blockquote then sat
// there as a raw quote forever, which is not a video, which is why there was
// nothing to click.
//
// It is the same shape as several bugs already found in this codebase: a check
// that answers a NEARBY question rather than the real one. "Is the script tag in
// the document" is not "is the embed library ready".
//
// Fixed by waiting for the thing that actually matters. The tag is still added
// once, every mount polls for window.instgrm on a short interval with a ceiling,
// and the timer is cleared on unmount so a page you have left cannot keep one
// alive.
//
// TWO: EVEN A WORKING EMBED IS NOT CLICKABLE IN THE MIDDLE. Instagram's iframe
// shows the post, and clicking the media area does not navigate anywhere:
// Instagram routes out through the account name and its own "View this post on
// Instagram" line, not through the picture. That is their behaviour inside their
// iframe and we cannot change it. What we CAN do is make our own frame answer
// the question, so the header link says where it goes by name instead of
// "Open ↗", and the fallback underneath is a real target rather than a small
// line of text in an empty box.
const READY_POLL_MS = 120;
// Twelve seconds. Long enough for a cold load on a phone, short enough that a
// blocked script (an ad blocker refusing instagram.com is common and completely
// reasonable) stops costing timers and shows the fallback instead.
const READY_TIMEOUT_MS = 12000;

// ── WHERE IT ACTUALLY GOES ───────────────────────────────────────────
// The second half of his question, which the card could not answer: the link
// goes to whatever permalink was typed into Studio for this row, and nothing on
// screen said which account or which post, so the only way to find out was to
// click it and see.
//
// Read off the URL rather than fetched. Instagram's oEmbed endpoint needs an app
// token now, and a network request per embed just to label a link is not worth
// it. The handle sits in the path on a profile-style permalink and is simply
// absent from the /p/ and /reel/ forms, which is honest to show as absent.
export const instagramTarget = (url) => {
  const clean = String(url || "").trim();
  const m = /instagram\.com\/(?:([A-Za-z0-9._]+)\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i.exec(clean);
  if (!m) return null;
  const kind = /^reels?$/i.test(m[2]) ? "reel" : m[2].toLowerCase() === "tv" ? "video" : "post";
  return { handle: m[1] ? `@${m[1]}` : null, kind, id: m[3] };
};

// True only for a link Instagram's embed library can actually render. A profile
// URL, a /share/ redirect or a bare instagram.com produces an empty card
// forever. The publish path never checked at all (only the Studio media panel
// did, and only for the substring "instagram.com/"), so a link of the wrong
// shape failed silently on a live page with nothing anywhere saying why.
export const isEmbeddablePost = (url) => !!instagramTarget(url);

export const InstagramEmbed = ({ url }) => {
  // TWO STATES, NOT ONE. The first version had only `ready` and showed the
  // "your browser is blocking instagram.com" line whenever it was false, which
  // is from the first paint. So every reader saw the failure message for the
  // second or two the script legitimately takes to arrive, and the comment under
  // it claiming otherwise was wrong about its own code. `gaveUp` is the state
  // that sentence was always describing.
  const [ready, setReady] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    let alive = true;
    if (!document.getElementById("ig-embed-script")) {
      const s = document.createElement("script");
      s.id = "ig-embed-script";
      s.src = "https://www.instagram.com/embed.js";
      s.async = true;
      document.body.appendChild(s);
    }
    // POLL FOR THE GLOBAL, NOT FOR THE TAG. See the note above; this is the
    // whole bug. onload is deliberately not used even on the first insertion,
    // because only the one mount that created the tag would ever receive it.
    const started = Date.now();
    const tick = () => {
      if (!alive) return;
      if (window.instgrm?.Embeds?.process) {
        window.instgrm.Embeds.process();
        setReady(true);
        return;
      }
      if (Date.now() - started > READY_TIMEOUT_MS) { setGaveUp(true); return; }
      timer.current = setTimeout(tick, READY_POLL_MS);
    };
    tick();
    return () => { alive = false; if (timer.current) clearTimeout(timer.current); };
  }, [url]);

  const target = instagramTarget(url);
  const label = target
    ? `${target.handle ? `${target.handle} · ` : ""}${target.kind} on Instagram`
    : "View on Instagram";

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 16, maxWidth: 420 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.light} strokeWidth="2" strokeLinecap="round">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill={C.light} stroke="none" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: 0.8, textTransform: "uppercase" }}>From Instagram</span>
        {/* NAMED, not "Open". This header link is the reliable way out of the
            card at every moment: before the embed loads, after it loads, and on
            a browser whose blocker refuses instagram.com outright. It should
            therefore say where it goes. Gold rather than muted, because it was
            the least visible thing in a card whose middle is not clickable. */}
        <a href={url} target="_blank" rel="noreferrer"
          style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: C.gold, textDecoration: "none", whiteSpace: "nowrap" }}>
          {target?.handle ? `${target.handle} ↗` : "Open on Instagram ↗"}
        </a>
      </div>
      <div style={{ padding: 8, background: C.bg }}>
        <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14"
          style={{ width: "100%", margin: 0, background: C.surface, border: "none", borderRadius: 10, minWidth: 0, overflow: "hidden" }}>
          {/* THE FALLBACK IS THE WHOLE BOX, NOT A LINE OF TEXT INSIDE IT. When
              the embed does not render this is everything the reader gets, and it
              used to be a 12px link floating in an otherwise empty card, which
              reads as broken rather than as something to press. Instagram
              replaces this entire node the moment process() succeeds, so nothing
              here ever has to coexist with the iframe. */}
          <a href={url} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 88, padding: "18px 14px", fontSize: 12.5, fontWeight: 600, color: C.light, textDecoration: "none", textAlign: "center" }}>
            {label} ↗
          </a>
        </blockquote>
        {/* Said out loud rather than leaving somebody looking at a box wondering
            whether it is still coming. Only after the wait is over, so a slow
            connection is never told the thing failed while it is still on its
            way. */}
        {gaveUp && !ready && (
          <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", padding: "6px 8px 2px", lineHeight: 1.5 }}>
            If the post does not appear, your browser is blocking instagram.com. The link above still works.
          </div>
        )}
      </div>
    </div>
  );
};
