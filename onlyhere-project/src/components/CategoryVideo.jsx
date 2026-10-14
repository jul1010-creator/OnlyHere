// ── A VIDEO BEHIND A KIND OF PLACE ──────────────────────────────────
//
// Oliver, 14 Oct 2026: "try rush through Lidl+ and you'll see they got alot of
// videos", then a ten second nightlife film, "different video on phone and pc
// because otherwise the format will look silly", and it plays "Behind
// Nightlife": tap the Nightlife circle and the top of the page is the film,
// under the heading and the circles, running down into the deal tiles.
//
// A tall film on a phone held upright and a wide one on anything wider, chosen
// by the screen's shape, so neither is a letterbox. No sound, on a loop, and it
// stops when it is scrolled out of sight. Anybody whose phone asks for less
// motion, or to save data, gets the still instead, and so does a browser that
// will not play it.
//
// The films live in public/video, each twice: WebM, the smaller, for the
// browsers that play it, and MP4 for the rest (Safari on older iPhones), named
// without the ending here. About 0.4 to 2 MB each, cut from his 18 MB export.
// The tall nightlife film is cut from the middle of the wide one until
// Oliver's own phone edit replaces it.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";

export const CATEGORY_VIDEO = {
  nightlife: {
    wide: "/video/nightlife-wide", wideStill: "/video/nightlife-wide.jpg",
    tall: "/video/nightlife-tall", tallStill: "/video/nightlife-tall.jpg",
  },
};

// Upright and narrow gets the tall film.
export const TALL_QUERY = "(orientation: portrait) and (max-width: 820px)";
export const filmFor = (k, tall) => {
  const v = CATEGORY_VIDEO[k];
  if (!v) return null;
  return tall ? { src: v.tall, still: v.tallStill } : { src: v.wide, still: v.wideStill };
};

const matches = (q) => { try { return !!window.matchMedia?.(q).matches; } catch { return false; } };
const savesData = () => { try { return !!navigator.connection?.saveData; } catch { return false; } };

export const CategoryVideo = ({ k = null }) => {
  const [tall, setTall] = useState(() => typeof window !== "undefined" && matches(TALL_QUERY));
  const [still] = useState(() => typeof window !== "undefined" && (matches("(prefers-reduced-motion: reduce)") || savesData()));
  const [failed, setFailed] = useState(false);
  // The last film shown stays mounted while it fades out, so leaving
  // Nightlife fades the film away rather than cutting it.
  const [shown, setShown] = useState(k && CATEGORY_VIDEO[k] ? k : null);
  const on = !!(k && CATEGORY_VIDEO[k]);
  useEffect(() => { if (on) setShown(k); }, [k, on]);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(TALL_QUERY); } catch { return undefined; }
    const change = () => setTall(mq.matches);
    mq.addEventListener?.("change", change);
    return () => mq.removeEventListener?.("change", change);
  }, []);
  const box = useRef(null);
  const vid = useRef(null);
  useEffect(() => {
    const v = vid.current, b = box.current;
    if (!v || !b || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && on) v.play?.().catch(() => {});
      else v.pause?.();
    }, { threshold: 0.05 });
    io.observe(b);
    return () => io.disconnect();
  }, [on, shown, tall, still, failed]);

  const film = shown ? filmFor(shown, tall) : null;
  if (!film) return null;
  const media = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return (
    <div ref={box} aria-hidden="true" data-testid="category-video" data-cat={shown}
      style={{
        position: "absolute", top: -18, left: "50%", width: "100vw", marginLeft: "-50vw",
        height: tall ? "min(78vh, 640px)" : "min(62vh, 560px)",
        zIndex: 0, pointerEvents: "none", overflow: "hidden",
        opacity: on ? 1 : 0, transition: "opacity 400ms ease",
      }}>
      {still || failed ? (
        <img src={film.still} alt="" style={media} />
      ) : (
        <video key={film.src} ref={vid} poster={film.still} autoPlay muted defaultMuted loop playsInline webkit-playsinline="true" preload="metadata" style={media}>
          <source src={`${film.src}.webm`} type="video/webm" />
          {/* The last source's error is the one that means nothing played. */}
          <source src={`${film.src}.mp4`} type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
      {/* Darker at the top for the heading, then into the page's own colour, so
          the tiles below start on plain ground. */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${C.bg}B3 0%, ${C.bg}8C 40%, ${C.bg}D9 75%, ${C.bg} 100%)` }} />
    </div>
  );
};

export default CategoryVideo;
