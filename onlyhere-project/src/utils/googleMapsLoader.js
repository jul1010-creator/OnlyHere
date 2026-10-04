// ── GOOGLE'S OWN MAP, LOADED ONLY WHERE IT IS USED ──────────────────
//
// Oliver, 4 Oct 2026, of a camera that turns slowly round a Google map: "kind
// of a cool feature", and "Sure" to trying it on the Klaipėda examples page.
//
// Two reasons it is Google's map and not the OpenFreeMap one the rest of the
// site draws on. The turning camera and the tilted view are Google's vector
// map. And Google's terms (Maps Service Specific Terms 14.2 and 19.2, read 4 Oct
// 2026) say content from Places and Routes must not be used "in conjunction
// with a non-Google map": the walking lines on this map come from the Routes
// API, so on Google's map they are where the terms want them.
//
// ── THE KEY IS A BROWSER KEY, AND THAT IS HOW GOOGLE BUILT IT ──────
// A Google map in a web page loads with a key the visitor's browser can see,
// whichever way it is delivered. Google's protection is not hiding it: it is a
// key that only works on gemlyxtravel.com and only for the Maps JavaScript API,
// both set on the key in Google Cloud. So this is a SEPARATE key from
// GOOGLE_MAPS_KEY, which stays on the server and is never sent anywhere.
//
// Without the key and a Map ID nothing loads and the map is simply left out,
// so the page reads exactly as it did before.
// Written out in full and inside a try, the way config.js reads its own: Vite
// replaces the exact text import.meta.env.VITE_..., and plain node (the test
// suite) has no import.meta.env at all.
const readKey = () => { try { return import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY || ""; } catch { return ""; } };
const readMapId = () => { try { return import.meta.env.VITE_GOOGLE_MAP_ID || ""; } catch { return ""; } };
export const GOOGLE_MAPS_BROWSER_KEY = readKey();
export const GOOGLE_MAP_ID = readMapId();
export const googleMapsReady = () => !!(GOOGLE_MAPS_BROWSER_KEY && GOOGLE_MAP_ID);

let loading = null;
export const loadGoogleMaps = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.reject(new Error("no browser"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (!googleMapsReady()) return Promise.reject(new Error("no Google map key"));
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const cb = `__gemlyxMapsReady${Math.floor(Math.random() * 1e9)}`;
    window[cb] = () => {
      try { delete window[cb]; } catch { /* nothing to tidy */ }
      resolve(window.google.maps);
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_BROWSER_KEY)}&v=weekly&loading=async&callback=${cb}`;
    s.async = true;
    s.onerror = () => { loading = null; reject(new Error("Google's map did not load")); };
    document.head.appendChild(s);
  });
  return loading;
};
