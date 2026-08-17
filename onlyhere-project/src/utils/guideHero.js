// ── THE PICTURE BEHIND THE TITLE ─────────────────────────────────────
//
// Oliver, 17 Aug 2026:
//
//   "And I wonder if we should get a picture of something Danish in the
//    background when the guide is given."
//
// He is right that the guide opens on nothing. A title on a dark field, then
// straight into numbers. Every other page of this app leads with a photograph and
// the one page a traveller actually keeps does not.
//
// ── BUT NOT "SOMETHING DANISH" ───────────────────────────────────────
// The literal build is a stock shot of Nyhavn behind every guide, and it is the
// wrong move on this product specifically. Three reasons, in the order they
// matter:
//
//   IT WOULD BE A PICTURE OF SOMEWHERE THEY ARE NOT GOING. A guide for a bicycle
//   trip from Aalborg to Skagen, opening on a photograph of a Copenhagen
//   waterfront. That is the "random route" complaint in image form, and on the
//   surface a reader trusts most.
//
//   IT IS THE ONE THING ON THE PAGE NOBODY CHECKED. Every price here is traced to
//   whoever charges it and every distance is measured. A decorative image chosen
//   because it looks Danish is an unsourced claim about the trip, sitting above
//   all of it.
//
//   IT IS WHAT A TEMPLATE LOOKS LIKE. The same header on every guide is the exact
//   feeling he keeps naming — "someone using Gemlyx repeatedly should never feel
//   like they're getting the same template with different words swapped in."
//
// ── SO IT IS THEIR OWN FIRST STOP ────────────────────────────────────
// The photograph is the one already published on the first stop of the trip that
// has one. Every guide gets a different picture, of a real place on that specific
// route, from a row he wrote himself, with the credit the licence requires. It
// costs no research, no new API call and no prompt: the photo is already in the
// payload.
//
// His own screenshot is the argument. Day 1 opened on a real photograph of
// Aalborg's old town and looked like a product. Day 2, Skagen, had no photo and
// looked like a spreadsheet. The material is already there and the top of the page
// was not using it.
//
// AND IF THERE IS NO PHOTOGRAPH, THERE IS NO HEADER IMAGE. Not a placeholder, not
// a gradient pretending to be one, and above all not a stock fallback — which
// would put us back at a picture of somewhere they are not going, only on exactly
// the guides where we know least.

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// Walk the trip in order and take the first stop that resolves to a published row
// with a photograph. In ORDER, deliberately: the first place they will actually
// stand in is the honest picture of the trip, and picking "the best" photo would
// need a judgement nobody can check.
//
// `lookup` is passed in rather than imported so this file has no opinion about
// where the library lives, and so the test can drive it with a plain object.
export const guideHero = (guide, lookup) => {
  if (typeof lookup !== "function") return null;
  const days = Array.isArray(guide?.days) ? guide.days : [];
  for (const day of days) {
    const stops = Array.isArray(day?.stops) ? day.stops : [];
    for (const stop of stops) {
      const name = clean(stop?.name);
      if (!name) continue;
      const row = lookup(name);
      const photo = clean(row?.photo);
      // A craft row is excluded for the same reason the stop cards exclude it:
      // those are products rather than places, and a product shot is not a
      // picture of a trip.
      if (!photo || row?._src === "craft") continue;
      return {
        photo,
        // Named, because the credit line and the alt text both have to say what
        // the reader is looking at. An unlabelled photograph on a travel page is
        // a decoration; a labelled one is information.
        name: clean(row?.name) || name,
        town: clean(row?.town || row?.city || row?.location || stop?.town),
        credit: row?.__photoCredit || null,
      };
    }
  }
  return null;
};

// What the picture is OF, said out loud under the title. Without this the reader
// is looking at an unexplained photograph and guessing, which on a page about
// where to go is worse than no photograph.
export const heroCaption = (hero) => {
  if (!hero?.photo) return "";
  const name = clean(hero.name);
  if (!name) return "";
  const town = clean(hero.town);
  // The town is dropped when it repeats the name, so a town stop does not read
  // "Skagen, Skagen".
  return town && town.toLowerCase() !== name.toLowerCase() ? `${name}, ${town}` : name;
};
