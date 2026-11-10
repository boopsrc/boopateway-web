import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './theme.css'
import './components/components.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Respeita prefers-reduced-motion: transforms viram fades simples. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
