// ── A VIDEO BEHIND A KIND OF PLACE ──────────────────────────────────
//
// Oliver, 14 Oct 2026: "try rush through Lidl+ and you'll see they got alot of
// videos", then a ten second nightlife film, "different video on phone and pc
// because otherwise the format will look silly". Then, with lidl.dk's front
// page: a banner across the top, the circles under it, "when you click the
// navigations, the video will replace the banner".
//
// A tall film on a phone held upright and a wide one on anything wider, chosen
// by the screen's shape, so neither is a letterbox. No sound, on a loop, and it
// stops when it is scrolled out of sight. Anybody whose phone asks for less
// motion, or to save data, gets the still instead, and so does a browser that
// will not play it.
//
// The films live in public/video as MP4 only, named without the ending here.
// There was a WebM beside each until 14 Oct 2026, when Oliver set it next to
// lidl.dk and hivecph.dk: "Our quality is far inferior". WebM was what most
// browsers chose, and it smoothed away the grain of the footage however much
// room it was given. H.264 at quality 20 keeps it, at about 6.6 MB wide and
// 4.4 MB on a phone.
//
// The phone's film is a 960 by 1080 cut from the middle of the wide one, the
// shape of the banner on a phone. A 9:16 strip (608 wide) was cut first, and
// the near square banner then showed only 608 by 730 of it, stretched.
import { useEffect, useRef, useState } from "react";

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

export const CategoryVideo = ({ k = null, playing = true }) => {
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
    if (!v || !b) return undefined;
    if (!on || !playing) { v.pause?.(); return undefined; }
    if (typeof IntersectionObserver === "undefined") { v.play?.().catch(() => {}); return undefined; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play?.().catch(() => {});
      else v.pause?.();
    }, { threshold: 0.05 });
    io.observe(b);
    return () => io.disconnect();
  }, [on, playing, shown, tall, still, failed]);

  const film = shown ? filmFor(shown, tall) : null;
  if (!film) return null;
  const media = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  // It fills the box it is put in: the banner at the top of Explore
  // (ExploreBanner.jsx), which it replaces while its kind of place is shown.
  return (
    <div ref={box} aria-hidden="true" data-testid="category-video" data-cat={shown}
      style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden", background: "#0B0A08", opacity: on ? 1 : 0, transition: "opacity 600ms ease" }}>
      {still || failed ? (
        <img src={film.still} alt="" style={media} />
      ) : (
        <video key={film.src} ref={vid} poster={film.still} autoPlay muted defaultMuted loop playsInline webkit-playsinline="true" preload="metadata" style={media}>
          {/* Its error is the one that means nothing played. */}
          <source src={`${film.src}.mp4`} type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
      {/* Only the bottom is darkened, for the name over it, as Lidl's own
          category film does. "Can it be a little less faded?" (14 Oct 2026).
          Design review, 15 Oct 2026: hivecph.dk's film reads as one block with
          the black bar over it because the two meet dark on dark. So the top
          fifth carries a faint shade too, enough for the film to sit under the
          header and for the Example mark to read, and nothing a viewer would
          call a fade. The bottom is as it was. */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)" }} />
    </div>
  );
};

export default CategoryVideo;
