import { entryUrlPath } from "../utils/placeUrl";

// ── A LINK A CRAWLER CAN FOLLOW, AND A PERSON CAN OPEN IN A TAB ──────
//
// Oliver, 16 Aug 2026, on Google and the blogs. The audit found that making the
// URLs exist was only half of it: `townPath` was imported into App.jsx and called
// zero times, there was no `<a href>` to any place page anywhere in the app, and
// nothing navigated to one either. So the only way a crawler ever learned those
// pages existed was the sitemap, and a page that nothing links to gets crawled
// late and treated as unimportant however good it is.
//
// ── WHY THE TITLE AND NOT THE WHOLE CARD ────────────────────────────
// Wrapping the card would be the obvious move and it is not allowed: every card
// in this app carries a heart button, and interactive content inside an anchor is
// invalid HTML. Browsers mostly cope, which is worse than failing, because the
// behaviour differs between them. The title is also the better link: its text is
// the place's name, which is exactly the anchor text a search engine wants, and a
// card wrapped in an anchor gives it the whole card's words instead.
//
// ── IT DOES NOT NAVIGATE, EXCEPT WHEN A PERSON MEANS IT TO ───────────
// A plain left click is cancelled and left to the card's own onClick, so tapping
// a place still opens it over the app exactly as it did before. A middle click, a
// ctrl or cmd click, or a right-click-open-in-new-tab is NOT cancelled, so the
// real URL opens in a new tab. That is a feature this app did not have: until now
// there was no way to open two places side by side.
//
// A type with no page returns null from entryUrlPath, and then this renders the
// children with no anchor at all rather than a link to nowhere.
export const EntryLink = ({ type, name, style, children }) => {
  const href = entryUrlPath(type, name);
  if (!href) return children ?? null;
  return (
    <a
      href={href}
      onClick={(e) => {
        // Let the browser do its normal thing for anything that means "open this
        // somewhere else". Only the plain click belongs to the app.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
      }}
      style={{ color: "inherit", textDecoration: "none", ...style }}
    >
      {children}
    </a>
  );
};
