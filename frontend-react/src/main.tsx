import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@bcgov/bc-sans/css/BC_Sans.css'
import { BrowserRouter } from 'react-router'
import App from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
