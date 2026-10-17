// ── THE GEMLYX CODE AT THE COUNTER ──────────────────────────────────
//
// Oliver, 17 Oct 2026, on a "how to use": "I guess both the business would
// scan the user's QR code?" Turned round, and he said "Sure": the business
// keeps a small Gemlyx sticker by the till, the visitor scans it with the
// phone's own camera, and Gemlyx opens on that place's offer marked Redeemed,
// with the time and a moving mark, so an old screenshot cannot pass for it.
// Staff only look at the phone. Each scan is counted for the partner's own
// page. The code is not secret (it is in each deal's public data), so the
// count is visits to the sticker's address, not proof somebody stood at the
// till: approximate, like the other counts (Fable's review, 17 Oct 2026). A
// signed, short-lived code on the sticker would be the step after this.
//
// The sticker holds a plain web address, gemlyxtravel.com/s/<code>, so it
// opens in the browser today and can open an app later without reprinting.
//
// A code is eight letters and digits, without 0, 1, i, l or o, which are easy
// to misread on a sticker. It is stored on the deal (payload.__scan) and made
// when the deal is first saved in Studio. The made-up example partners carry
// "demo" codes so the stickers can be shown at the pitch.

export const SCAN_PATH = "/s";
export const STICKER_PATH = "/sticker";
export const SCAN_SITE = "https://gemlyxtravel.com";
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE = /^[a-z0-9]{6,12}$/;

export const cleanScanCode = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  return CODE.test(s) ? s : "";
};

export const newScanCode = () => {
  const n = 8;
  let bytes = null;
  try { bytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(n)) || null; } catch { bytes = null; }
  let out = "";
  for (let i = 0; i < n; i++) {
    const b = bytes ? bytes[i] : Math.floor(Math.random() * 256);
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
};

export const scanUrl = (code) => `${SCAN_SITE}${SCAN_PATH}/${cleanScanCode(code)}`;
export const stickerPath = (code, name = "") => `${STICKER_PATH}/${cleanScanCode(code)}${name ? `?n=${encodeURIComponent(String(name).slice(0, 80))}` : ""}`;

// /s/<code> lands on the Klaipėda page with ?scan=<code>, which the deals
// page reads once its deals are in.
export const scanLanding = (code) => `/lithuania?scan=${cleanScanCode(code)}`;
export const scanFromSearch = (search) => {
  try { return cleanScanCode(new URLSearchParams(String(search || "")).get("scan")); } catch { return ""; }
};

// One count per place per phone per day, so reopening the page or scanning
// twice at the same counter is one visit. Kept in the phone only.
export const scanOnceKey = (id, day) => `gx.scan.${id}.${day}`;
export const firstScanToday = (id, day) => {
  try {
    const k = scanOnceKey(id, day);
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, "1");
    return true;
  } catch { return true; }
};
