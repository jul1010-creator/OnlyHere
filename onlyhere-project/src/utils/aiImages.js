// ── SAYING THAT A PICTURE IS NOT A PHOTOGRAPH ───────────────────────
//
// Oliver, 15 Sep 2026: "I will start creating AI photos for places that I can't
// find pictures for... according to EU laws, I believe I need to explicitly
// state that the picture is AI. I might be wrong."
//
// He is right, and it is in force. AI Act Article 50(4) puts the duty on the
// DEPLOYER, which is him: somebody who publishes AI-generated image content
// that resembles an existing place and would pass for authentic has to disclose
// that it is artificially generated, "in a clear and distinguishable manner",
// with a label a person can see "without requiring specific technical tools",
// and "upon first exposure at the latest". Article 50 has applied since
// 2 August 2026.
//
// The definition that catches this is the AI Act's own reading of a deep fake:
// content resembling "existing persons, objects, places, entities or events"
// that "would falsely appear to a person to be authentic or truthful". A
// photorealistic picture of a real Danish harbour, published on a page about
// that harbour, is exactly that. The carve-out for evidently artistic or
// fictional works does not apply, because nothing about a travel entry says the
// picture is invented.
//
// THE OTHER HALF OF ARTICLE 50 IS ALREADY IN utils/aiDisclosure.js, which
// handles the TEXT duties: 50(1), telling a reader they are talking to an AI,
// and the 50(4) text case, which the guides escape through human editorial
// review. This file is the IMAGE case, which has no such escape: editing a
// generated picture does not make it a photograph. Read the two together; one
// law, two surfaces, and neither file repeats the other.
//
// NOT LEGAL ADVICE, and written down for the same reason support.js writes down
// its Article 16 reading: so a lawyer can check it rather than rediscover it.
// Sources: Regulation (EU) 2024/1689 Article 50(4) and Article 3(60), and the
// Commission's transparency FAQ of 2026.
//
// ── AND THE PRODUCT REASON, WHICH CAME FIRST ────────────────────────
//
// Gemlyx's whole promise is that nothing here is invented. A generated picture
// of a place is the one thing on an entry that CAN be invented, so it is the
// one thing that most needs saying out loud. If the label ever feels like it is
// spoiling a page, the honest fix is fewer generated pictures, not a quieter
// label.
// ── THE DISCLOSURE IS THE CREDIT, NOT A BADGE BESIDE ONE ───────
//
// Oliver, 16 Sep 2026: "Just setup the AI as credits. Like 'AI-assimilation of
// [draft]'."
//
// So the line reads like every other credit under a photograph on this site,
// and answers the same question a photographer's name answers: where did this
// picture come from. "AI-generated image", which is what this said first, is a
// warning label, and a warning label under a picture the site chose to publish
// reads as an apology for it.
//
// ── AND "IMPRESSION" IS THE WORD, BECAUSE OF WHAT THESE ARE ────
//
// Oliver, an hour later: "the pictures are based off the atmosphere, area, and
// overall theme." That changes the right word and it changes it in the
// direction of MORE disclosure, not less. These are not renderings of one
// building from photographs of it; they are mood pieces, and a reader who takes
// one for a photograph has been told something about a place that nobody
// checked. This project's whole argument is that a traveller is never left
// standing somewhere the page misdescribed.
//
// "Impression" is the word that carries it. It is what a painter's caption says
// and it means evocative rather than documentary, so "AI impression of Ribe"
// tells a reader both things at once: a machine made it, and it is not a
// photograph of the place. "Assimilation", his first word, means absorbing
// something into a larger whole, which is not what happened and reads oddly in
// English.
//
// It still satisfies 50(4) on its own terms. The duty is that a reader can tell
// the picture is artificially generated, clearly and at first exposure, and the
// line leads with AI. The chip, the position and the gold are unchanged.
//
// AI_LABEL is the form with no subject. It is not the normal case and should
// stay rare: a credit that cannot name what it is a picture OF has lost the one
// thing that makes it a credit rather than a disclaimer.
export const AI_LEAD = "AI impression of";
export const AI_LABEL = "AI impression";

// The line a reader meets. Built here rather than in the component, so the one
// place that decides the wording is the one place that records why.
export const aiLabel = (credit) => {
  const subject = String(credit?.subject || "").trim();
  return subject ? `${AI_LEAD} ${subject}` : AI_LABEL;
};

// The flag rides on the CREDIT object rather than beside it, because the credit
// is already the one thing carried with a picture everywhere: shapeForLive
// keeps it, the hero keeps it as __photoCredit, a body block keeps it as
// block.credit, and PhotoCredit is the single component that draws it. A second
// parallel field would have to be added to all four and would be forgotten in
// the fifth.
export const isAiImage = (credit) =>
  !!credit && typeof credit === "object" && credit.ai === true;

// What gets written when he uploads through the AI door. `source` is filled in
// so a row still reads as something rather than as an empty credit, and the
// photographer field is deliberately left alone: nobody took this picture.
//
// `subject` is what the picture is OF, and the upload door fills it in from the
// draft's own name, so he never types it. An empty subject is stored as absent
// rather than as an empty string, because cleanCredit's allow-list would carry
// the empty string through and the label would then read "AI impression of "
// with nothing after it.
export const aiCredit = ({ subject = "", ...extra } = {}) => {
  const said = String(subject || "").trim().slice(0, 120);
  return { ...extra, ...(said ? { subject: said } : {}), source: "AI image", ai: true };
};
