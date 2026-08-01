import React from "react";

// Right now, ANY unhandled render error anywhere in the app (a bad state
// value, a null field the UI didn't expect, a routing edge case) crashes the
// entire React tree with zero recovery — that's exactly what "black screen,
// uncaught error in the console" is: React unmounts everything and there's
// nothing left to render, so the page goes fully blank with no way back
// except a hard refresh the visitor has to think to do themselves.
//
// This doesn't fix any specific underlying bug — it can't, since minified
// production stack traces (index-XXXX.js:40) aren't readable without a
// sourcemap. What it does: turns a silent, total, unrecoverable crash into a
// visible "something broke, here's a reload button" screen, and logs the
// REAL error + component stack to the console so if this happens again, that
// console output is exactly what to send back for a real fix.
//
// Must be a class component — React only supports error boundaries via
// getDerivedStateFromError/componentDidCatch, there's no hook equivalent.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // This is the line to check in the browser console (or Vercel won't see
    // this — it's client-side only) if the black screen happens again: the
    // REAL error and exactly which component tree crashed, not the mangled
    // minified trace alone.
    console.error("Gemlyx crashed — caught by ErrorBoundary:", error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed", inset: 0, background: "#0A0F1E", color: "#E8EDF7",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 24, textAlign: "center", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Cormorant Garamond', serif" }}>
            Something broke on our end
          </div>
          <div style={{ fontSize: 13, color: "#8fa3c7", maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>
            Sorry about that — try reloading. If it keeps happening, let us know what you were doing right before it happened.
          </div>
          <button onClick={() => window.location.reload()} style={{
            background: "#D4AF37", border: "none", borderRadius: 100, padding: "12px 28px",
            fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
