import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WhatWorkzApp from './WhatWorkzApp.tsx'

// Global function to initialize What-Workz
window.initWhatWorkz = function(containerId) {
  const container = document.getElementById(containerId)
  if (container) {
    const root = createRoot(container)
    root.render(
      <StrictMode>
        <WhatWorkzApp />
      </StrictMode>
    )
  }
}

// Auto-initialize if root element exists
if (document.getElementById('whatworkz-root')) {
  window.initWhatWorkz('whatworkz-root')
}
