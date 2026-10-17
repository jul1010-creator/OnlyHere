// ── THE STICKER BY THE TILL, AND WHERE ITS CODE LEADS ───────────────
//
// 17 Oct 2026 (utils/scanCode.js). A partner keeps a small Gemlyx sticker at
// the counter. The visitor's own camera reads it and opens /s/<code>, which
// hands over to the Klaipėda page with ?scan=<code>; the deals page opens the
// place's offer there, marked Redeemed.
//
// /sticker/<code>?n=<place> is the page Oliver prints the sticker from, from
// the Studio's deal list (or /sticker/demobakery and the other demo codes for
// the made-up partners). Black on white, because a camera reads a dark code on
// a light ground most reliably, with the gold kept to the edge.
import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import qrcode from "qrcode-generator";
import { cleanScanCode, scanUrl, scanLanding } from "../utils/scanCode";
import { GemlyxLogo } from "../components/GemlyxLogo";

export const ScanRedirect = () => {
  const { code } = useParams();
  useEffect(() => {
    const c = cleanScanCode(code);
    try { window.location.replace(c ? scanLanding(c) : "/lithuania"); } catch { /* nothing to do */ }
  }, [code]);
  return <div style={{ minHeight: "100vh", background: "#0E0E11" }} />;
};

// The code as squares, drawn here rather than handed in as markup.
const QrSquares = ({ text, size = 220 }) => {
  let qr = null;
  try { qr = qrcode(0, "M"); qr.addData(text); qr.make(); } catch { qr = null; }
  if (!qr) return null;
  const n = qr.getModuleCount();
  const quiet = 4;
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cells.push(<rect key={`${r}.${c}`} x={c + quiet} y={r + quiet} width="1.02" height="1.02" />);
  return (
    <svg data-testid="sticker-qr" viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={text}>
      <rect x="0" y="0" width={n + quiet * 2} height={n + quiet * 2} fill="#FFFFFF" />
      <g fill="#111111">{cells}</g>
    </svg>
  );
};

export const StickerPage = () => {
  const { code } = useParams();
  const [params] = useSearchParams();
  const c = cleanScanCode(code);
  const name = String(params.get("n") || "").slice(0, 80);
  useEffect(() => { try { document.title = `Gemlyx sticker${name ? ` · ${name}` : ""}`; } catch { /* no document */ } }, [name]);
  if (!c) return <div style={{ padding: 40, fontFamily: "'Inter', sans-serif" }}>This is not a Gemlyx code.</div>;
  return (
    <div style={{ minHeight: "100vh", background: "#F4F1EA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <style>{`@media print { .gx-no-print { display: none !important; } body, html { background: #FFFFFF !important; } @page { margin: 12mm; } }`}</style>
      <div data-testid="sticker" style={{ width: "90mm", boxSizing: "border-box", background: "#FFFFFF", border: "2px solid #C9A46A", borderRadius: 18, padding: "18px 16px 14px", textAlign: "center", color: "#111111" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><GemlyxLogo size={16} color="#111111" /></div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, lineHeight: 1.15, margin: "0 0 2px" }}>Scan for your Gemlyx deal</div>
        <div style={{ fontSize: 13, color: "#444444", margin: "0 0 10px" }}>Nuskaitykite ir gaukite Gemlyx pasiūlymą</div>
        <div style={{ display: "flex", justifyContent: "center" }}><QrSquares text={scanUrl(c)} size={230} /></div>
        {name && <div data-testid="sticker-name" style={{ fontSize: 15, fontWeight: 700, marginTop: 8, overflowWrap: "anywhere" }}>{name}</div>}
        <div style={{ fontSize: 10.5, color: "#666666", marginTop: 4, letterSpacing: 0.3 }}>{scanUrl(c).replace(/^https:\/\//, "")}</div>
      </div>
      <button className="gx-no-print" onClick={() => { try { window.print(); } catch { /* no printer */ } }} data-testid="sticker-print"
        style={{ marginTop: 22, background: "#C9A46A", color: "#111111", border: "none", borderRadius: 100, padding: "12px 26px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Print</button>
    </div>
  );
};

export default StickerPage;
