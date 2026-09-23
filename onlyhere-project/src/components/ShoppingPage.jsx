import { useState } from "react";
import { C } from "../utils/theme";
import { readableOn } from "../utils/readableColor";
import { tierBadge, tierOf } from "../utils/placeThemes";
import { shoppingTownList, shoppingForTown, shopsInPlace, shopPlaceFor, worthShowing, shopKindOf, SHOP_KINDS } from "../utils/shopping";

// ── SHOPPING: TOWN, THEN THE STREET, THEN THE SHOPS ─────────────────
//
// Oliver, 22 Sep 2026, after I argued that a shopping centre is the one place
// in Denmark that is not only here: "I'd do it another way then.. put shopping
// centers with -> 'recommended Denmark-Only Shops' like with bar streets.
// Unless you've put them onto some islands, of course."
//
// That is this page, and the three levels are the ones the nightlife page has
// had since August, for the same reason: a container sits between a town and
// the places inside it, and the places are matched to it by address at render
// time rather than stored on it. See utils/placeContainer.js.
//
// THE RULE THAT LETS A MALL IN AT ALL. A centre appears only when it holds at
// least one published shop that passes the only-here test. Fields is not a
// recommendation, it is an address for the shops that are, and with none of
// them published it would be a mall on a travel guide. His "unless you've put
// them onto some islands" is the other half: a workshop on Bornholm has no
// container and never should, so it stands on its own in the loose list.
const byName = (a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "da");

const KindChip = ({ shop }) => {
  const k = shopKindOf(shop);
  if (!k) return null;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>
      {k.emoji} {k.value}
    </span>
  );
};

const ShopRow = ({ shop, onOpen }) => (
  <div onClick={() => onOpen && onOpen(shop)}
    style={{ display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${C.border}`, padding: "14px 0", cursor: onOpen ? "pointer" : "default" }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden" }}>
      {shop.photo
        ? <img src={shop.photo} alt={shop.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (shop.emoji || "🛍")}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>{shop.name}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <KindChip shop={shop} />
        {shop.priceNote && <span>{shop.priceNote}</span>}
        {tierOf(shop)?.id === "must" && <span style={{ fontWeight: 700, color: C.gold }}>★</span>}
      </div>
    </div>
    <span style={{ fontSize: 18, color: C.muted }}>›</span>
  </div>
);

export const ShoppingPage = ({ shops = [], places = [], title = "Shopping", onOpen = null }) => {
  const [town, setTown] = useState("");
  const [placeView, setPlaceView] = useState(null);
  const [kind, setKind] = useState("");

  const towns = shoppingTownList(shops, places).sort((a, b) => a.localeCompare(b, "da"));
  const narrowed = kind ? shops.filter(s => shopKindOf(s)?.id === kind) : shops;
  const split = town ? shoppingForTown(town, narrowed, places) : { places: [], loose: [] };
  // A container earns its row by holding something. One reader for that, so
  // the page and the preview cannot disagree about which centres exist. See
  // the note above.
  const filled = split.places.filter(g => worthShowing(g.place, narrowed, places));
  const kinds = SHOP_KINDS.filter(k => shops.some(s => shopKindOf(s)?.id === k.id));

  if (!shops.length && !places.length) {
    return (
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, margin: "8px 0 10px" }}>{title}</h2>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 18px", maxWidth: 560, fontSize: 13, color: C.light, lineHeight: 1.7 }}>
          Nothing published yet. What goes here is the shopping you cannot do at home: Danish labels in their own stores, second-hand and genbrug, and workshops that sell what they make.
        </div>
      </div>
    );
  }

  // ── LEVEL 3: ONE STREET OR CENTRE, AND THE SHOPS IN IT ───────────
  if (placeView) {
    const inside = shopsInPlace(placeView, narrowed, places).slice().sort(byName);
    const badge = tierBadge(placeView);
    return (
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <button onClick={() => setPlaceView(null)}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
          ‹ {town || title}
        </button>
        {placeView.photo && (
          <div style={{ height: 160, borderRadius: 14, overflow: "hidden", marginBottom: 12, background: C.surface }}>
            <img src={placeView.photo} alt={placeView.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, marginBottom: 6 }}>{placeView.name}</div>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
          {placeView.category || "Shopping street"}{placeView.location ? ` · ${placeView.location}` : ""}
        </div>
        {badge && (
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: badge.fg, background: badge.bg, padding: "5px 12px", borderRadius: 100, marginBottom: 12 }}>
            {badge.label}
          </div>
        )}
        {placeView.desc && <div style={{ fontSize: 13, color: C.light, lineHeight: 1.7, marginBottom: 12 }}>{placeView.desc}</div>}
        {placeView.gemlyxFind && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            ◆ <b>Gemlyx Find:</b> {placeView.gemlyxFind}
          </div>
        )}
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>Shops on {placeView.name}</div>
        {/* An empty container is a real state and not a broken page, exactly as
            an empty bar street is: it has its own writing and it can be
            published before any of its shops are. It is not offered on the
            level above until something is inside it, which is the rule that
            keeps a mall off this page. */}
        {inside.length === 0 ? (
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, padding: "22px 0", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            No shops on {placeView.name} are published yet.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10 }}>{inside.length} published here</div>
            {inside.map(sp => <ShopRow key={sp.id || sp.name} shop={sp} onOpen={onOpen} />)}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto", width: "100%" }}>
      <h2 style={{ fontSize: 34, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, margin: "8px 0 8px" }}>{title}</h2>
      <div style={{ fontSize: 14, color: C.light, lineHeight: 1.7, maxWidth: 560, marginBottom: 16 }}>
        The shopping you cannot do at home. Danish labels in their own stores, second-hand and genbrug, and workshops that sell what they make.
      </div>
      {kinds.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {kinds.map(k => (
            <button key={k.id} onClick={() => setKind(kind === k.id ? "" : k.id)}
              style={{ background: kind === k.id ? C.gold : "none", border: `1px solid ${kind === k.id ? C.gold : C.border}`, color: kind === k.id ? "#0A0F1E" : C.light, borderRadius: 100, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              {k.emoji} {k.value}
            </button>
          ))}
        </div>
      )}
      {/* ── LEVEL 1: THE TOWNS ──────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {towns.map(t => (
          <button key={t} onClick={() => { setTown(town === t ? "" : t); setPlaceView(null); }}
            style={{ background: town === t ? C.gold : "none", border: `1px solid ${town === t ? C.gold : C.border}`, color: town === t ? "#0A0F1E" : C.light, borderRadius: 100, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {t}
          </button>
        ))}
      </div>
      {!town ? (
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>Pick a town to see what is worth walking to.</div>
      ) : (<>
        {/* ── LEVEL 2: THE STREETS AND CENTRES, WITH THE ARROW ──────
            His own shape: the container, and then an arrow into the shops on
            it. The count is the point, the same way it is on a bar street. */}
        {filled.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", marginBottom: 12 }}>Where the shops are</div>
            {filled.map(({ place, shops: inside }) => (
              <div key={place.id || place.name} onClick={() => setPlaceView(place)}
                style={{ display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${C.border}`, padding: "16px 0", cursor: "pointer" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden" }}>
                  {place.photo
                    ? <img src={place.photo} alt={place.name} onError={e => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (place.emoji || "🛍")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif" }}>{place.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{place.category || "Shopping street"}</span>
                    <span style={{ color: readableOn(C.gold, C.bg), fontWeight: 700 }}>
                      {inside.length} shop{inside.length !== 1 ? "s" : ""} worth it
                    </span>
                    {tierOf(place)?.id === "must" && <span style={{ fontWeight: 700, color: C.gold }}>★</span>}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: C.muted }}>→</span>
              </div>
            ))}
          </div>
        )}
        {/* ── AND THE ONES IN NO STREET AT ALL ──────────────────────
            "Unless you've put them onto some islands, of course." A workshop
            with no container is not a gap in the data, it is a shop standing on
            its own, and it belongs on the page exactly as it is. */}
        {split.loose.length > 0 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>On their own</div>
            {/* Asked rather than assumed: a shop lands here when no published
                container claims its address, and shopPlaceFor is the same
                reader that claimed the others, so this list cannot quietly
                hold a shop that belongs on a street. */}
            {split.loose.filter(sp => !shopPlaceFor(sp, places)).slice().sort(byName)
              .map(sp => <ShopRow key={sp.id || sp.name} shop={sp} onOpen={onOpen} />)}
          </div>
        )}
        {filled.length === 0 && split.loose.length === 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "22px 0", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Nothing published for {town} yet.
          </div>
        )}
      </>)}
    </div>
  );
};
