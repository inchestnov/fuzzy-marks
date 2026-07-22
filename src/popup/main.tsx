import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/components/App'
import './index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Scauta: #root element not found')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
