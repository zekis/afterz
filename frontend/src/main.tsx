import React from 'react'
import ReactDOM from 'react-dom/client'
import { FrappeProvider } from 'frappe-react-sdk'
import App from './App.tsx'
import BeforezApp from './BeforezApp'
import WhatWorkzApp from './WhatWorkzApp'
import UnifiedWorkzApp from './UnifiedWorkzApp'
import './index.css'

// Wait for Frappe boot data to be available
const initializeApp = () => {
  if (window.frappeBootAvailable && window.frappe_boot) {
    const siteName = window.frappe_boot.sitename || window.location.hostname;
    
    const isBeforez = window.location.pathname.includes('/beforez')
    const isWhatz = window.location.pathname.includes('/whatz')
    const isWorkz = window.location.pathname.includes('/workz')
    
    // Determine which root element to use
    let rootElementId = 'root'
    if (isWhatz) {
      rootElementId = 'whatworkz-root'
    } else if (isWorkz) {
      rootElementId = 'workz-root'
    }
    
    const rootElement = document.getElementById(rootElementId)
    if (!rootElement) {
      console.error(`Root element '${rootElementId}' not found`)
      return
    }

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <FrappeProvider
          siteName={siteName}
          url={window.location.origin}
        >
          {isWorkz ? <UnifiedWorkzApp /> : isWhatz ? <WhatWorkzApp /> : isBeforez ? <BeforezApp /> : <App />}
        </FrappeProvider>
      </React.StrictMode>,
    )
  } else {
    // Retry if boot data not ready
    setTimeout(initializeApp, 100);
  }
};

initializeApp();
