import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// BrowserRouter added here — App.jsx now renders a <Routes> table ("/" for the
// existing app, "/guide/:guideId" for the new shareable full-page guide view)
// instead of being the page itself, so it needs a router ancestor to work.
// Requires react-router-dom: npm install react-router-dom
//
// ErrorBoundary wraps everything — without it, any unhandled render error
// anywhere in the app crashes the WHOLE page to a blank black screen with no
// recovery (this is what the "Uncaught Error" + black screen report was).
// Now it shows a reload screen instead, and logs the real error to console.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
