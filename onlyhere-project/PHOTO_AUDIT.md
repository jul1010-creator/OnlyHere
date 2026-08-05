# PHOTO AUDIT (5 Aug 2026)

Every published row in `gemlyx_content` was tested against the live site by
actually loading its photo URL in a browser, not by guessing from the repo.

**Result: 54 of 55 published rows currently 404. Only `/towns/aeroskobing.jpg` loads.**

This is not a code bug. Content Studio assigned a photo path to every row it
published (`/towns/<slug>.jpg`, `/events/<slug>.jpg`, `/food/<slug>.jpg`,
`/free/<slug>.jpg`, `/craft/<slug>.jpg`) whether or not the file existed yet.

**Two things changed in code, both as of PASS 38.** A place with no working
photo now shows a proper Fraunces monogram plate instead of a broken image icon
or a faint floating emoji. And Studio has stopped inventing: on publish, the
assigned path is now actually loaded in the browser first, and a path that does
not resolve is dropped from the row rather than saved. **That applies to new
publishes only.** The 54 rows below were published under the old behaviour and
still carry their dead paths, which is exactly why this list exists.

Each one clears itself the moment you either drop the file in at the path shown
and push, or republish the row through Studio.

So this file is the to do list, not a bug report.

---

## Three quick wins first

These three are not missing images at all. The file already exists, it is just
in the wrong place or spelled differently.

1. **`public/towns/Nysted.jpg` exists but the row asks for `nysted.jpg`.**
   Vercel serves from a case sensitive filesystem, so the capital N is a 404.
   Rename the file to `nysted.jpg`.
2. **`public/ribe.jpg` exists at the repo root.** The published town row wants
   it at `public/towns/ribe.jpg`. Copy or move it there.
3. **The nightlife town "Aarhus" is asking for `/undefined/aarhus.jpg`.** That
   is a legacy bad path written by an older version of the publisher, before
   `nightTown` had a folder assigned. `public/aarhus.jpg` already exists.
   Easiest fix: open that row in Studio, republish it so it picks up the
   current `/nightlife-towns/aarhus.jpg` path, and put the file there.

Also worth knowing: `public/attractions/` already holds six images
(kastellet, lindholm-hoje, medical-herb-garden-kastellet, sohngaardsholmpark,
the-greenhouses-botanical-garden, the-viking-museum) that no published row
points at, and `public/towns/` holds skagen, ebeltoft and thorup-strand which
also have no published row. Those places are either unpublished or were
renamed. Not broken, just orphaned.

---

## Missing files, by folder

Drop each file at the path shown, then `git push`. Nothing else is needed:
the card picks the photo up automatically.

### `public/free/` (this folder does not exist yet)

- amalienborgslot.jpg
- nycarlsbergglyptotek.jpg
- faxe.jpg  *(note: `public/faxe.jpg` may already suit this one)*

### `public/towns/` (15 missing, 1 working)

- samso.jpg
- mogeltonder.jpg
- ringkobing.jpg
- hellerup.jpg
- sonderho.jpg
- ringsted.jpg
- ribe.jpg  *(quick win 2 above)*
- dragor.jpg  *(two rows want this, one of them is the duplicate row to delete)*
- koge.jpg
- rudkobing.jpg
- praesto.jpg
- viborg.jpg
- faxe.jpg
- nysted.jpg  *(quick win 1 above)*

### `public/nightlife-towns/` (2 missing, both on a legacy bad path)

Both rows currently ask for `/undefined/...`, from a version of the publisher
that had no folder assigned for the `nightTown` type. Republish each one
through Studio to give it the current path, then add the file.

- aarhus.jpg  *(row "Aarhus". `public/aarhus.jpg` already exists)*
- jomfruanegade.jpg  *(row "Aalborg")*

### `public/events/` (19 missing)

- riverboatjazzfestival.jpg
- femojazzfestival.jpg
- kogefestuge2026.jpg
- koldingginfestival.jpg
- nakkefestival.jpg
- comiccondenmark.jpg
- scarletpleasure.jpg
- nibefestival.jpg
- skanderborgfestival.jpg
- langelandsfestival.jpg  *(the row is named "Ø Festival", so the slug will not look obvious)*
- sydforsolen.jpg  *(row "Syd for solen")*
- spotfestivalaarhus.jpg
- jellingmusikfestival.jpg
- heartlandfestival.jpg
- northsidefestival.jpg
- sebbersundvikingemarked.jpg
- borkvikingemarked.jpg
- tinderbox.jpg
- gronkoncert.jpg

Several of these already exist at the repo root under different names
(`aarhus-festuge.jpg`, `trelleborg-vikingefestival.jpg`,
`moesgaard-viking-moot.jpg`, `vikingemarkedet-paa-lindholm-hoje.jpg` and
others). Worth a look before sourcing anything new.

### `public/food/` (14 missing, the complete list)

- bones.jpg  *(Bones)*
- flamestonepizzaria.jpg  *(Flamestone Pizzaria)*
- prinsenspizzagrill.jpg  *(Prinsens pizza & grill)*
- catchmesushi.jpg  *(Catch me Sushi)*
- rositabistro.jpg  *(Rosita bistro)*
- hyttefadet.jpg  *(Hyttefadet)*
- geranium.jpg  *(Geranium)*
- hookedkodbyen.jpg  *(Hooked Kødbyen)*
- smagsloetvesterbro.jpg  *(Smagsloet Vesterbro)*
- hookedchristianshavn.jpg  *(Hooked Christianshavn)*
- grillenburgerbaraalborg.jpg  *(Grillen Burgerbar Aalborg)*
- provence.jpg  *(Restaurant Provence)*
- burgerboomaalborg.jpg  *(Burger Boom Aalborg)*
- chickies.jpg  *(Chickie's)*

### Rows with no photo field at all

- **festival "Schleswig Wikingertage (technically a German Event)"** has no
  photo field in its payload. Republishing it through Studio will assign one.
- **The five `craft_items` rows** (Viking Ship Museum, Moesgaard Viking Days,
  Viking Center Ribe, Bornholm Ceramics, Sømods Bolcher) come from a different
  table that has **no photo column at all**. These were the cards drawing a
  broken image icon with the alt text written across them. They now show a
  monogram plate. Giving them real photos needs either a `photo` column added
  to `craft_items`, or those five moved over to Studio as `booking` rows.

---

## The other route: the Studio Media editor

PASS 35 added a per listing Media panel that uploads photos straight from your
phone into a Supabase Storage bucket, with no git push and no filename
matching. **It is still blocked on the one time `gemlyx-media` bucket SQL**
that is documented at the top of `CHANGES_THIS_PASS.md` and has not been run
yet. Running it turns that panel on, and from then on photos are a phone
upload rather than an entry in this list.
