// ── A FETCH THAT ONLY GOES OUT TO THE PUBLIC INTERNET ───────────────
//
// Security review, 6 Oct 2026, finding 1 (Medium): Studio's page readers
// (scan-source through readPage.js, find-email, social-find, calendar,
// link-alive) fetched any address and followed redirects. The draft pipeline
// hands scan-source the links a scanned page carries, so a website being
// drafted could steer Gemlyx's server to an address inside the hosting network
// and read back what it said. calendar.js had a guard on the written name only,
// which a redirect, or a name that points at 127.0.0.1, walks past.
//
// So these readers fetch through this instead of the plain fetch:
//   - http or https only, on the usual ports, with no user name or password;
//   - the name is looked up first, and every address it gives must be public;
//   - the connection is made to the address that was checked (the lookup is
//     pinned), so a name cannot answer public to the check and private to the
//     connect;
//   - redirects are followed here, one hop at a time, and each hop is checked
//     the same way;
//   - the body is capped, and the whole read has a time limit.
// It answers in the shape the readers already use: ok, status, url,
// headers.get(), text(), json().
//
// Server only. It uses Node's own http, https, dns and zlib, so it adds no
// dependency, and nothing in the browser may import it.
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import zlib from "node:zlib";
import net from "node:net";
import { Buffer } from "node:buffer";

export const SAFE_MAX_BYTES = 3_000_000;
export const SAFE_TIMEOUT_MS = 15000;
export const SAFE_MAX_HOPS = 5;
const PORTS = new Set(["", "80", "443"]);

// ── WHICH ADDRESSES ARE PUBLIC ──────────────────────────────────────
const v4 = (ip) => ip.split(".").map(Number);
const inV4 = (n, [a, b, c, d], bits) => {
  const x = ((n[0] << 24) | (n[1] << 16) | (n[2] << 8) | n[3]) >>> 0;
  const y = ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (x & mask) === (y & mask);
};
const PRIVATE_V4 = [
  [[0, 0, 0, 0], 8], [[10, 0, 0, 0], 8], [[100, 64, 0, 0], 10], [[127, 0, 0, 0], 8], [[169, 254, 0, 0], 16],
  [[172, 16, 0, 0], 12], [[192, 0, 0, 0], 24], [[192, 0, 2, 0], 24], [[192, 88, 99, 0], 24], [[192, 168, 0, 0], 16],
  [[198, 18, 0, 0], 15], [[198, 51, 100, 0], 24], [[203, 0, 113, 0], 24], [[224, 0, 0, 0], 4], [[240, 0, 0, 0], 4],
];
const publicV4 = (ip) => {
  const n = v4(ip);
  if (n.length !== 4 || n.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  return !PRIVATE_V4.some(([net4, bits]) => inV4(n, net4, bits));
};
// The 8 groups of an IPv6 address, as numbers.
const groups6 = (ip) => {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  // An IPv4 tail ("::ffff:1.2.3.4") becomes two groups.
  const tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const n = v4(tail[1]);
    s = s.slice(0, -tail[1].length) + `${((n[0] << 8) | n[1]).toString(16)}:${((n[2] << 8) | n[3]).toString(16)}`;
  }
  const [head, rest] = s.split("::");
  const a = head ? head.split(":") : [], b = rest !== undefined && rest ? rest.split(":") : [];
  const fillN = s.includes("::") ? 8 - a.length - b.length : 0;
  const all = [...a, ...Array(Math.max(0, fillN)).fill("0"), ...b].map(h => parseInt(h || "0", 16));
  return all.length === 8 && all.every(x => Number.isInteger(x) && x >= 0 && x <= 0xffff) ? all : null;
};
const publicV6 = (ip) => {
  const g = groups6(ip);
  if (!g) return false;
  if (g.every(x => x === 0)) return false;                                      // ::
  if (g.slice(0, 7).every(x => x === 0) && g[7] === 1) return false;            // ::1
  // An IPv4 address inside IPv6 is judged as IPv4: ::ffff:a.b.c.d, ::a.b.c.d, 64:ff9b::a.b.c.d.
  const asV4 = (hi, lo) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  if (g.slice(0, 5).every(x => x === 0) && (g[5] === 0xffff || g[5] === 0)) return publicV4(asV4(g[6], g[7]));
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(x => x === 0)) return publicV4(asV4(g[6], g[7]));
  if ((g[0] & 0xfe00) === 0xfc00) return false;                                 // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return false;                                 // fe80::/10 link local
  if ((g[0] & 0xff00) === 0xff00) return false;                                 // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false;                         // documentation
  if (g[0] === 0x0100 && g.slice(1, 4).every(x => x === 0)) return false;       // discard
  return true;
};
export const isPublicAddress = (ip) => {
  const kind = net.isIP(String(ip || "").replace(/^\[|\]$/g, ""));
  if (kind === 4) return publicV4(String(ip));
  if (kind === 6) return publicV6(String(ip));
  return false;
};

// The address an URL may be fetched at, or why not. `lookup` is dns.lookup's
// shape, and is passed in by tests.
export const checkUrl = async (raw, { lookup = dns.lookup, httpsOnly = false } = {}) => {
  let u;
  try { u = new URL(String(raw)); } catch { return { ok: false, why: "not an address" }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, why: "not http or https" };
  if (httpsOnly && u.protocol !== "https:") return { ok: false, why: "not https" };
  if (u.username || u.password) return { ok: false, why: "carries a user name or password" };
  if (!PORTS.has(u.port)) return { ok: false, why: "not on the usual port" };
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host) return { ok: false, why: "no host" };
  if (net.isIP(host)) return isPublicAddress(host) ? { ok: true, url: u, address: host, family: net.isIP(host) } : { ok: false, why: "a private address" };
  if (/(^|\.)(localhost|local|internal|localdomain|home|lan)$/i.test(host) || !host.includes(".")) return { ok: false, why: "a private name" };
  let found;
  try {
    found = await new Promise((res, rej) => lookup(host, { all: true, verbatim: true }, (err, list) => (err ? rej(err) : res(list))));
  } catch { return { ok: false, why: "the name does not resolve" }; }
  const list = (Array.isArray(found) ? found : [found]).filter(Boolean);
  if (!list.length) return { ok: false, why: "the name does not resolve" };
  // Every address the name gives has to be public, not only the first.
  if (!list.every(a => isPublicAddress(a.address))) return { ok: false, why: "the name points at a private address" };
  return { ok: true, url: u, address: list[0].address, family: list[0].family || net.isIP(list[0].address) };
};

// Node asks a lookup in two shapes: with { all: true } it wants a list, and
// without it wants one address and its family. Both answer the checked one.
export const pinnedLookup = (address, family) => (_host, opts, cb) => {
  const done = typeof opts === "function" ? opts : cb;
  const all = typeof opts === "object" && opts && opts.all;
  if (all) done(null, [{ address, family }]);
  else done(null, address, family);
};

export const requestOnce = (url, address, family, { method = "GET", headers = {}, body = null, signal } = {}) => new Promise((resolve, reject) => {
  const lib = url.protocol === "https:" ? https : http;
  const req = lib.request({
    protocol: url.protocol,
    hostname: url.hostname.replace(/^\[|\]$/g, ""),
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    method,
    headers: { "Accept-Encoding": "gzip, deflate, br", ...headers },
    lookup: pinnedLookup(address, family),
    servername: net.isIP(url.hostname) ? undefined : url.hostname,
    timeout: SAFE_TIMEOUT_MS,
  }, (res) => {
    const status = res.statusCode || 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      return resolve({ status, location: String(res.headers.location), headers: res.headers });
    }
    const enc = String(res.headers["content-encoding"] || "").toLowerCase();
    const stream = enc === "gzip" ? res.pipe(zlib.createGunzip()) : enc === "deflate" ? res.pipe(zlib.createInflate()) : enc === "br" ? res.pipe(zlib.createBrotliDecompress()) : res;
    const parts = [];
    let size = 0;
    stream.on("data", (c) => {
      size += c.length;
      if (size > SAFE_MAX_BYTES) { stream.destroy(); req.destroy(); return resolve({ status, headers: res.headers, buf: Buffer.concat(parts), capped: true }); }
      parts.push(c);
    });
    stream.on("end", () => resolve({ status, headers: res.headers, buf: Buffer.concat(parts) }));
    stream.on("error", reject);
  });
  req.on("timeout", () => req.destroy(Object.assign(new Error("The site did not answer in time."), { name: "AbortError" })));
  req.on("error", reject);
  if (signal) {
    if (signal.aborted) req.destroy(Object.assign(new Error("aborted"), { name: "AbortError" }));
    else signal.addEventListener("abort", () => req.destroy(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
  }
  if (body) req.write(body);
  req.end();
});

const answer = (url, got, hops) => {
  const h = new Map(Object.entries(got.headers || {}).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(", ") : String(v)]));
  const text = () => Promise.resolve((got.buf || Buffer.alloc(0)).toString("utf8"));
  return {
    ok: got.status >= 200 && got.status < 300,
    status: got.status,
    statusText: "",
    url: url.toString(),
    redirected: hops > 0,
    headers: { get: (k) => (h.has(String(k).toLowerCase()) ? h.get(String(k).toLowerCase()) : null), has: (k) => h.has(String(k).toLowerCase()) },
    text,
    json: () => text().then(t => JSON.parse(t)),
  };
};

// fetch(url, init), for the public internet only. A refused address throws,
// the way fetch throws when it cannot connect, with the reason in the message.
export const safeFetch = async (input, init = {}, { lookup = dns.lookup, send = requestOnce, httpsOnly = false } = {}) => {
  let target = typeof input === "string" ? input : input?.url;
  let method = String(init.method || "GET").toUpperCase();
  let body = init.body || null;
  const headers = Object.fromEntries(Object.entries(init.headers instanceof Map ? Object.fromEntries(init.headers) : (init.headers || {})).map(([k, v]) => [k, String(v)]));
  const follow = init.redirect !== "manual" && init.redirect !== "error";
  for (let hop = 0; hop <= SAFE_MAX_HOPS; hop++) {
    const checked = await checkUrl(target, { lookup, httpsOnly });
    if (!checked.ok) throw Object.assign(new Error(`Refused: ${checked.why}.`), { name: "RefusedAddress" });
    const got = await send(checked.url, checked.address, checked.family, { method, headers, body, signal: init.signal });
    if (got.location && follow) {
      let next;
      try { next = new URL(got.location, checked.url); } catch { throw new Error("A redirect went to an address that does not read."); }
      // A 303, and a 301 or 302 after a POST, carry on as a GET with no body.
      if (got.status === 303 || ((got.status === 301 || got.status === 302) && method === "POST")) { method = "GET"; body = null; }
      target = next.toString();
      continue;
    }
    return answer(checked.url, got.location ? { ...got, buf: Buffer.alloc(0) } : got, hop);
  }
  throw new Error("Too many redirects.");
};

export default safeFetch;
