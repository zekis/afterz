import React from 'react'
import ReactDOM from 'react-dom/client'
import { FrappeProvider } from 'frappe-react-sdk'
import App from './App.tsx'
import BeforezApp from './BeforezApp'
import './index.css'

// Wait for Frappe boot data to be available
const initializeApp = () => {
  if (window.frappeBootAvailable && window.frappe_boot) {
    const siteName = window.frappe_boot.sitename || window.location.hostname;
    
    const isBeforez = window.location.pathname.includes('/beforez')

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <FrappeProvider
          siteName={siteName}
          url={window.location.origin}
        >
          {isBeforez ? <BeforezApp /> : <App />}
        </FrappeProvider>
      </React.StrictMode>,
    )
  } else {
    // Retry if boot data not ready
    setTimeout(initializeApp, 100);
  }
};

initializeApp();
