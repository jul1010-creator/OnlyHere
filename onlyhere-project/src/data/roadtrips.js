// CONTENT REMOVED (Aug 5 2026, Oliver's call). This file used to hold three
// fully assistant-written road trips and a set of seasonal itineraries: real
// town names wrapped in invented stop notes ("best smoked fish in Zealand",
// "a proper coffee stop") and invented day-by-day plans. None of it went
// through research, Studio, or any fact-check. That is exactly the kind of
// content the app promises it does not publish, so it is gone, the same way
// the hardcoded towns/events/food/nightlife arrays went in PASS 29.
//
// HIS WORDS: "Probably Road Trips + itineraries. We need to recreate this in
// another way. I like the concept of a road trip.. but it needs to be somehow
// redesigned."
//
// So the CONCEPT is not cancelled, only this hardcoded version of it. Whatever
// replaces it has to come from real verified content the same way everything
// else now does. The obvious shape, not yet agreed or built: a road trip is
// really just an ordered list of published towns plus real driving legs between
// them, and the app can already compute those legs (utils/guideEnrichment.js
// does exactly that for guides). That would make a route real by construction
// instead of written from memory. Do NOT refill these arrays by hand.
//
// seasonalItineraries was ALREADY dead code before this change: App.jsx imports
// it on line 14 and never reads it anywhere. Kept as an empty export so the
// import keeps resolving, and so removing that import can be a deliberate,
// separately verified edit rather than a drive-by.
export const roadTrips = [];

export const seasonalItineraries = [];
