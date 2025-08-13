import React from 'react'
import ReactDOM from 'react-dom/client'
import { FrappeProvider } from 'frappe-react-sdk'
import UnifiedWorkzApp from './UnifiedWorkzApp'
import './index.css'

// Wait for Frappe boot data to be available
const initializeApp = () => {
  if (window.frappeBootAvailable && window.frappe_boot) {
    const siteName = window.frappe_boot.sitename || window.location.hostname;
    
    // Use unified app for all workz routes
    const rootElement = document.getElementById('workz-root') || document.getElementById('root')
    if (!rootElement) {
      console.error('Root element not found')
      return
    }

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <FrappeProvider
          siteName={siteName}
          url={window.location.origin}
        >
          <UnifiedWorkzApp />
        </FrappeProvider>
      </React.StrictMode>,
    )
  } else {
    // Retry if boot data not ready
    setTimeout(initializeApp, 100);
  }
};

initializeApp();
