// ── WHERE THE PICTURES GO IN AN ARTICLE ──────────────────────────────
//
// Lifted out of DetailPage on 21 Aug 2026, unchanged in intent, because it was
// unreachable from the suite. layoutBody is pure array arithmetic living in a
// .jsx file the tests cannot import, so the only assertions it ever had were
// regexes run against its own source text. It shipped a bug that a single
// behavioural test would have caught on the day it was written, and that is the
// whole argument for the move: logic that decides what a reader sees belongs
// somewhere it can be run.
//
// The original reasoning is kept below because it is still the reasoning.
//
// ── WHY THE ORDER IS DECIDED HERE AND NOT TRUSTED ────────────────────
//
// Oliver, 5 Aug 2026, on his own live pages:
//
// 1. EVERY IMAGE SITS AT THE END. The Studio media panel appends to blogBody, so
//    uploads and Wikimedia finds all land after the last paragraph. Four images
//    floated with no prose left to wrap them just stack up against each other in
//    a block, which is exactly the "odd" he was describing.
// 2. THE ALTERNATION NEVER WORKED. The CSS used .gx-fig:nth-of-type(even), and
//    nth-of-type counts siblings by TAG, not by class. Paragraphs and headings
//    are divs too, so the "even" rule was landing on whichever figures happened
//    to fall on an even div index. Left and right were effectively arbitrary.
//
// So images the author placed inside the prose stay exactly where they are,
// images stranded at the end get dealt back in after the paragraphs, and every
// figure is told which side it is on rather than inferring it from its tag
// position.

const isImage = (b) => b && (b.type === "image" || b.type === "video");

// ── WHAT COUNTS AS PROSE, AND WHY THE QUESTION MATTERS ───────────────
//
// Oliver, 21 Aug 2026, sending a screenshot of the Christmas-fair event page
// with three photographs piled at the bottom in a broken staircase: "jeesus".
//
// The dealer had not run at all. It found the stranded images by walking back
// from the end while the block it was looking at was an image:
//
//     while (cut > 0 && isImage(blocks[cut - 1])) cut--;
//
// That page ends [image, image, image, instagram]. The last block is an
// Instagram embed, so the walk stopped before it took a single step, the
// stranded run measured zero, and all three photographs stayed exactly where the
// media panel had appended them. One block of a type nobody thought about
// switched the whole feature off silently.
//
// It is the same shape as the nth-of-type bug it replaced: a rule that asked
// about the WRONG PROPERTY. "Is this an image" is not the question. The question
// is whether there is any prose left after it to wrap around, so that is what is
// asked now, and a block type invented next year cannot answer it wrongly by
// accident: anything that is not prose is simply part of the tail.
const isProse = (b) => b && (b.type === "paragraph" || b.type === undefined || b.type === "bullets" || b.type === "heading");

// An image is an anchor candidate's neighbour when it sits directly after it.
// Anchoring after paragraphs and never after a heading: a photo wedged between a
// heading and its first line reads as a mistake.
const isAnchor = (b) => b && (b.type === "paragraph" || b.type === undefined || b.type === "bullets");

export const layoutBody = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];

  // The trailing run with no prose after it. Everything in here is either an
  // image with nothing left to wrap around, or a block that genuinely belongs at
  // the end and must stay there (an Instagram embed is the trailing block on
  // dozens of event pages and is not a figure to be dealt into a paragraph).
  let cut = blocks.length;
  while (cut > 0 && !isProse(blocks[cut - 1])) cut--;
  const body = blocks.slice(0, cut);
  const tail = blocks.slice(cut);
  const stranded = tail.filter(isImage);
  const tailKeeps = tail.filter(b => !isImage(b));

  let anchors = [];
  body.forEach((b, i) => { if (isAnchor(b)) anchors.push(i); });
  // Skip anchors that already have a picture next to them, or an entry whose
  // author placed photos inline gets a second one dealt on top of the first.
  const free = anchors.filter(i => !isImage(body[i + 1]));
  if (free.length) anchors = free;

  const out = body.map(b => b);
  if (stranded.length) {
    if (anchors.length === 0) {
      out.push(...stranded); // nothing to wrap around, leave them where they were
    } else {
      // Round-robin across the anchors rather than proportional spacing: with
      // four images and three paragraphs, proportional put two at the end and
      // left the first paragraph bare. If two do land together they alternate
      // sides, so they sit one left one right rather than stacking.
      //
      // Splice from the HIGHEST anchor down, not in image order. Inserting at a
      // low index shifts every later index by one, so walking the images in
      // order silently drops the rest a slot early, which is how the first
      // version put a photo above the paragraph it was meant to sit beside.
      const drops = stranded.map((b, n) => ({ at: anchors[n % anchors.length], b, n }));
      drops.sort((x, y) => y.at - x.at || y.n - x.n);
      for (const d of drops) out.splice(d.at + 1, 0, d.b);
    }
  }
  out.push(...tailKeeps);

  // ── ONE CAPTION, HOWEVER MANY FILES SHARE A TITLE ────────────────
  //
  // The same screenshot, second fault. Two of the three photographs printed the
  // identical line, "Christmas market at Tivoli, Copenhagen", one under the
  // other, which reads as the page having duplicated itself.
  //
  // They are NOT the same file. One is Commons 23531145852 and the other is
  // 23011541394, two different photographs Maria Eklind took the same evening
  // and gave the same name. So there is nothing to dedupe upstream and nothing
  // wrong with the data: it is only that repeating a caption verbatim tells the
  // reader nothing the first one did not, and looks like a fault.
  //
  // THE CREDIT IS NOT TOUCHED. Both files are CC BY-SA 2.0, which requires
  // attribution next to the work, and two works need two attributions however
  // alike their titles are. Only the descriptive caption is dropped, and only on
  // the second and later appearances.
  // `key.length > 0` here is DOCUMENTATION, not behaviour: the add below is
  // already guarded, so an empty caption never enters the set and seen.has("")
  // can never be true. Mutation testing on 21 Aug flagged removing it as a
  // surviving mutant, and it survives because the two forms genuinely are the
  // same. Kept because the pair reads as one rule, which is that a caption
  // nobody wrote is not a repeat of another caption nobody wrote.
  const seen = new Set();
  // Alternate sides counting FIGURES only, which is what nth-of-type could not do.
  let fig = 0;
  return out.map(b => {
    if (!isImage(b)) return b;
    const key = String(b.caption || "").trim().toLowerCase();
    const repeat = key.length > 0 && seen.has(key);
    if (key) seen.add(key);
    return { ...b, _side: (fig++ % 2 === 0) ? "right" : "left", _showCaption: !repeat };
  });
};

// ── A CAPTION THAT IS ONLY THE CREDIT AGAIN ──────────────────────────
//
// Third fault on the same page. The carousel photograph was captioned "The Swing
// Carousel - Flickr - Stig Nygaard", with "Photo: Stig Nygaard / wikimedia · CC
// BY-SA 2.0" printed directly underneath it.
//
// "- Flickr - <name>" is the naming convention Commons' Flickr import bot uses,
// on tens of thousands of files. It is provenance, and provenance is the
// credit's job. api/commons-photo.js is fixed not to hand this over as a caption
// in the first place, but rows published before today already carry it in the
// database, so the rendering side trims it too. Belt and braces on purpose: the
// database is not migrateable in one pass and a reader should not wait for it.
export const trimCaption = (caption) => {
  const t = String(caption || "").trim();
  if (!t) return "";
  // Only the bot's own tail, anchored at the end, so a photograph genuinely
  // called something with "Flickr" in the middle of it is left alone.
  return t.replace(/\s*-\s*Flickr\s*-\s*.+$/i, "").trim();
};
