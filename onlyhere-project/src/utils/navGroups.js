// ── THE MENU AS DROPDOWNS ───────────────────────────────────────────
//
// Oliver, 30 Sep 2026: "I feel like we need to rename navigations and make
// them drop downs then.. like 'tips' and 'essentials' could be 'advice'
// (dropdown). 'Activities' (Dropdown for Calender and Events). Gems (Drop Down
// Cheap Gems and Gemlyx Promotions). And so on.." Then: "Finish making it a
// template of the Denmark version with the changes we talked about."
//
// The pages themselves do not change: same tabs, same addresses, same swipe
// order. This only decides how the menu groups them. A group whose other pages
// are hidden (no islands in Klaipėda, no promotions yet) stops being a
// dropdown and becomes the one page it still has, and a group with nothing
// left is not drawn, so the menu never offers a door to an empty room.
//
// "The rest" is Claude's grouping, 30 Sep 2026, written into
// LITHUANIA_PLAN_29SEP.md for him to change: Places (Attractions, Towns,
// Islands) and Eat & drink (Food, Nightlife, Shopping).

// `tab` is a TAB_ORDER id. `sub` picks a view inside it: the Events page's
// "Full calendar" tab.
export const NAV_GROUPS = [
  { id: "home", tabs: [{ tab: "home" }] },
  { id: "advice", labelKey: "nav.group.advice", ico: "bulb", tabs: [{ tab: "essentials" }, { tab: "tips" }] },
  { id: "activities", labelKey: "nav.group.activities", ico: "calendar", tabs: [{ tab: "events", sub: "picks" }, { tab: "events", sub: "calendar", labelKey: "nav.calendar", ico: "calendar" }] },
  { id: "gems", labelKey: "nav.group.gems", ico: "tag", tabs: [{ tab: "gems" }, { tab: "promotions" }] },
  { id: "places", labelKey: "nav.group.places", ico: "ticket", tabs: [{ tab: "attractions" }, { tab: "visits" }, { tab: "islands" }] },
  { id: "eatdrink", labelKey: "nav.group.eatdrink", ico: "utensils", tabs: [{ tab: "food" }, { tab: "nightlife" }, { tab: "shopping" }] },
  // The planner, as an ordinary item, only where the gold button carries
  // something else (Special deals on /lithuania). Elsewhere the caller leaves
  // "ai" out and this group is empty, so it is not drawn.
  { id: "plan", tabs: [{ tab: "ai" }] },
];

// navItems: the visible NAV_ITEMS ({ id, label, ico }), already filtered to
// the pages this site shows. calendar: whether a full calendar exists (the
// Events page only shows its tabs then). t: the uiT lookup for group labels.
// Returns [{ id, label, ico, children: [{ key, tab, sub, label, ico }] }].
export const groupNav = (navItems = [], { calendar = false, t = (k) => k } = {}) => {
  const byId = new Map(navItems.map(n => [n.id, n]));
  const out = [];
  for (const g of NAV_GROUPS) {
    const children = [];
    for (const c of g.tabs) {
      const item = byId.get(c.tab);
      if (!item) continue;
      if (c.sub === "calendar" && !calendar) continue;
      children.push({
        key: c.sub ? `${c.tab}:${c.sub}` : c.tab,
        tab: c.tab,
        sub: c.sub || "",
        label: c.labelKey ? t(c.labelKey) : item.label,
        ico: c.ico || item.ico || null,
      });
    }
    if (!children.length) continue;
    // One page left is that page, under its own name: "Advice" opening
    // straight onto Tips would be a label promising a choice it does not have.
    const single = children.length === 1;
    out.push({
      id: g.id, single, children,
      label: single || !g.labelKey ? children[0].label : t(g.labelKey),
      ico: single ? children[0].ico : (g.ico || children[0].ico),
    });
  }
  return out;
};

// Is this child the page being shown. The Events page's two views are told
// apart by its own tab state.
export const childActive = (child, active, eventTab = "picks") =>
  child.tab === active && (!child.sub || child.tab !== "events" || child.sub === eventTab);

export const groupActive = (group, active, eventTab) => group.children.some(c => childActive(c, active, eventTab));
