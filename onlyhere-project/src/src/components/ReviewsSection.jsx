import { useState, useEffect } from "react";
import { C } from "../utils/theme";
import { SUPABASE_URL, SUPABASE_KEY } from "../config";

export const ReviewsSection = ({ itemType, itemName }) => {
  const [reviews, setReviews] = useState(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_reviews?select=*&item_type=eq.${encodeURIComponent(itemType)}&item_name=eq.${encodeURIComponent(itemName)}&order=created_at.desc`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        const data = await res.json();
        if (!cancelled) setReviews(Array.isArray(data) ? data : []);
      } catch { if (!cancelled) setReviews([]); }
    })();
    return () => { cancelled = true; };
  }, [itemType, itemName]);

  const submit = async () => {
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gemlyx_reviews`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ item_type: itemType, item_name: itemName, author: name.trim() || "Anonymous", text: text.trim() }),
      });
      const data = await res.json();
      if (res.ok && data?.[0]) {
        setReviews(prev => [data[0], ...(prev || [])]);
        setText(""); setStatus("sent");
        setTimeout(() => setStatus(null), 1800);
      } else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 4 }}>💬 What travelers say</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>Real visitor comments — not edited or verified by Gemlyx, shown as written.</div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)"
          style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8, boxSizing: "border-box" }} />
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Been here? Share what it was really like…" rows={3}
          style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8, boxSizing: "border-box", resize: "vertical" }} />
        <button onClick={submit} disabled={status === "sending" || !text.trim()}
          style={{ background: C.gold, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {status === "sending" ? "Posting…" : status === "sent" ? "✓ Posted" : "Post comment"}
        </button>
        {status === "error" && <div style={{ fontSize: 11, color: "#FFB347", marginTop: 6 }}>Couldn't post — try again.</div>}
      </div>

      {reviews === null ? (
        <div style={{ fontSize: 12, color: C.muted }}>Loading comments…</div>
      ) : reviews.length === 0 ? (
        <div style={{ fontSize: 12, color: C.muted }}>No comments yet — be the first to share your experience.</div>
      ) : (
        reviews.map((r, i) => (
          <div key={r.id || i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < reviews.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{r.author || "Anonymous"}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}</div>
            </div>
            <div style={{ fontSize: 13, color: C.light, lineHeight: 1.6 }}>{r.text}</div>
          </div>
        ))
      )}
    </div>
  );
};
