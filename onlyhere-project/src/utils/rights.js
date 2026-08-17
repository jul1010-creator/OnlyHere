// ── WHOSE WORDS THESE ARE ────────────────────────────────────────────
//
// Oliver, 17 Aug 2026:
//
//   "I also want you to write on the pages that I claim copyright on my texts and
//    guides. We need to make it strictly forbidden to share the guides online."
//   "or publically rather."
//
// The second message is the one that makes this workable, and it is worth saying
// why. "Never share it" and "never share it publicly" are different products. A
// guide is built for a trip, and a trip has other people on it: the person who
// booked the ferry, the friend meeting them in Aarhus, the partner carrying the
// other phone. A rule that forbids forwarding it to them is a rule that gets
// broken by every single honest user on day one, and a term nobody can keep is
// worth less than no term at all. Publishing it — reposting the text, mirroring it
// on a blog, feeding it to a scraper, selling it — is the thing that actually
// costs him, and that is what this forbids.
//
// ── AND WHAT IS ACTUALLY HIS ─────────────────────────────────────────
// Stated carefully, because a notice that overclaims damages the part of it that
// is true. Three separate things, and only two of them are copyright:
//
//   THE WRITING IS HIS. Every description, every "howItsMade", every day plan and
//   every judgement about whether somewhere is worth the detour is original
//   expression, and it is his the moment it is written down. No registration, no
//   filing, nothing to do. This is the strong claim and it needs no hedging.
//
//   THE FACTS ARE NOT. An opening time, an address, a 795 kr menu price: nobody
//   owns those, and a notice claiming them would be wrong on the one page whose
//   whole promise is not being wrong. Saying so plainly costs nothing and makes
//   the rest credible.
//
//   THE COLLECTION IS HIS ANYWAY. This is the part most notices miss. Denmark and
//   the EU protect a database that took substantial investment to assemble and
//   verify, separately from copyright in its contents. Checking every price
//   against the business that charges it, town by town, for a year, is exactly
//   that investment. So the facts are free and the CHECKED SET OF THEM is not,
//   which is a better fit for this product than copyright alone.
//
// ── AND THE RESERVATION THAT HAS TO BE WRITTEN TO EXIST ──────────────
// EU law lets anyone mine a lawfully accessible site for text and data unless the
// rightsholder expressly reserves that right in a machine-readable way. Silence
// is permission. So the reservation is stated here, in the page metadata and in
// robots.txt, because unstated it does not exist.
//
// None of this is legal advice and I am not a lawyer. It is the accurate,
// unembarrassing version of what he asked to say, and it is worth ten minutes of
// a Danish solicitor's time before it is treated as settled.
export const RIGHTS_HOLDER = "Gemlyx";

// One line, for the foot of a page.
export const copyrightLine = (year) => {
  const y = Number(year);
  return `© ${Number.isFinite(y) && y > 2000 ? y : new Date().getFullYear()} ${RIGHTS_HOLDER}. All written content is ours.`;
};

// The rule, in his voice rather than a lawyer's, for the foot of a guide. Short,
// because a long notice on a travel guide reads as a threat and gets skipped.
export const GUIDE_RIGHTS_SHORT =
  "This guide was written for you. Take it on your trip, print it, send it to whoever is coming with you. " +
  "Publishing it is not allowed: no reposting the text, no copying it into a blog, listing or another app, " +
  "no feeding it to a scraper or a model.";

// The same rule at the length a terms page needs.
export const GUIDE_RIGHTS_FULL = [
  "The words are ours. Every description, every day plan and every judgement about whether a place is worth your time was written for Gemlyx and is protected by copyright the moment it is written. That includes the guide built for you.",
  "The facts are not, and we will not pretend otherwise. An address, an opening time, a menu price: nobody owns those. What took the work was checking them, and a verified collection is protected in its own right under Danish and EU database law, separately from the words.",
  "Your guide is yours to use. Read it, print it, save it, take it on the trip, and send it to the people travelling with you. That is what it is for.",
  "Publishing it is not. Do not repost the text publicly, mirror it on a site or a blog, republish it in a listing, a newsletter, another app or a book, sell it, or pass it off as your own writing. Do not scrape the site, and do not use any of it to train or fine-tune a model. We expressly reserve text and data mining rights.",
  "Quoting is fine, the ordinary way: a sentence or two with Gemlyx named and a link back.",
].join("\n");

// The machine-readable half of the same sentence. Unstated, it has no effect.
export const TDM_RESERVATION = "noai, noimageai";
