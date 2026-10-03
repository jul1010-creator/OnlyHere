// ── THE PUBLIC SUPABASE ADDRESS AND KEY, FOR THE SERVER ─────────────
//
// The same two values as src/config.js, which a server route cannot import
// (it reads import.meta). The key is the anon key, public by design and in
// every page's JavaScript; it can read only what row level security lets
// anybody read. Security review, 3 Oct 2026, finding 16: /api/plan-now read
// published rows with the service key, which can read everything, when the
// public key reads exactly the published rows it needs. The suite checks
// these match src/config.js.
export const PUBLIC_SUPABASE_URL = "https://vpxfahjnerkkkoueovhl.supabase.co";
export const PUBLIC_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweGZhaGpuZXJra2tvdWVvdmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzQ4OTYsImV4cCI6MjA5NTMxMDg5Nn0.-GgXeog0DufIz6WNXn_8pIzxmQfkHRK3Lz8V71O-v_c";
