// ── A REEL IS SOMEBODY ELSE'S WORK, AND IT IS OFF UNTIL HE SAYS ─────
//
// Oliver, 23 Sep 2026: "I'm getting nervous with the instagram reels.. I'm not
// sure it's legally permitted to just use bars' instagram. But I have so many
// setup.. remove every individual will take forever.. and some of them have
// actually allowed me to use it.."
//
// His answer, and it is the better one: "make an 'activate' next to the reel
// paste. And keep it as inactive as default. Then they all get removed until I
// activate them."
//
// THE DEFAULT DOES THE WORK. A reel already in the table carries no `active`
// field, so every one of them reads as off the moment this ships, and the
// question turns from "which do I have to take down before somebody asks" into
// "which do I want to put back". Nothing is deleted: the permalink stays on the
// row, so activating one is a tick rather than finding the post again.
//
// STRICTLY TRUE. Not truthy, not "!== false". A block written by an older
// publish, a block half copied from another row, a block where the flag arrived
// as the string "false": all of those are off. An embed that needs a judgement
// call to be off has the default the wrong way round.
export const reelLive = (block) =>
  !!block && block.type === "instagram" && !!block.url && block.active === true;

// ── AND IT COMES OUT BEFORE ANYTHING LAYS THE PAGE OUT ──────────────
//
// Not hidden at the moment of drawing. DetailPage runs blogBody through
// layoutBody, which counts figures and alternates their sides, so a block left
// in the list and drawn as nothing would still take a side and leave a hole in
// the text. Taking it out first means the page is laid out as though it was
// never there, which is what "removed until I activate them" has to mean.
export const withLiveReels = (blocks) =>
  (Array.isArray(blocks) ? blocks : []).filter(b => b?.type !== "instagram" || reelLive(b));

// How many are on, out of how many are held. For the Studio, where the whole
// point is seeing the number rather than hunting through rows.
export const reelCount = (blocks) => {
  const all = (Array.isArray(blocks) ? blocks : []).filter(b => b?.type === "instagram");
  return { held: all.length, live: all.filter(reelLive).length };
};
