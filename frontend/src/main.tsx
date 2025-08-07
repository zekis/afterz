import React from 'react'
import ReactDOM from 'react-dom/client'
import { FrappeProvider } from 'frappe-react-sdk'
import App from './App.tsx'
import './index.css'

// Wait for Frappe boot data to be available
const initializeApp = () => {
  if (window.frappeBootAvailable && window.frappe_boot) {
    const siteName = window.frappe_boot.sitename || window.location.hostname;
    
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <FrappeProvider
          siteName={siteName}
          url={window.location.origin}
        >
          <App />
        </FrappeProvider>
      </React.StrictMode>,
    )
  } else {
    // Retry if boot data not ready
    setTimeout(initializeApp, 100);
  }
};

initializeApp();
