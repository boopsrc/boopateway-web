import { AnimatePresence, motion } from 'motion/react'
import { useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { routeDepth, screenVariants } from './animation/motion'
import { FaceTestScreen } from './features/FaceTestScreen'
import { HomeScreen } from './features/Home'
import { AmountScreen, PaymentFaceScreen, PaymentResultScreen, PinScreen, ProcessingScreen } from './features/PaymentScreens'
import { RegisterFaceScreen, RegisterFormScreen, RegisterResultScreen } from './features/RegisterScreens'

/** Fundo "aurora": manchas de cor desfocadas que flutuam devagar. */
function Aurora() {
  const blobs = [
    { c: 'var(--aurora-1)', s: 520, x: ['-10%', '10%'], y: ['0%', '12%'], l: '5%', t: '0%', d: 18 },
    { c: 'var(--aurora-2)', s: 460, x: ['0%', '-14%'], y: ['10%', '-6%'], l: '55%', t: '10%', d: 22 },
    { c: 'var(--aurora-3)', s: 420, x: ['8%', '-6%'], y: ['-8%', '10%'], l: '25%', t: '60%', d: 26 },
  ]
  return (
    <div className="aurora" aria-hidden>
      {blobs.map((b, i) => (
        <motion.span
          key={i}
          style={{ background: b.c, width: b.s, height: b.s, left: b.l, top: b.t }}
          animate={{ x: b.x, y: b.y, scale: [1, 1.15, 1] }}
          transition={{ duration: b.d, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  const prev = useRef(location.pathname)
  const dirRef = useRef(1)
  if (prev.current !== location.pathname) {
    dirRef.current = routeDepth(location.pathname) >= routeDepth(prev.current) ? 1 : -1
    prev.current = location.pathname
  }
  const dir = dirRef.current
  return (
    <AnimatePresence mode="wait" custom={dir} initial={false}>
      <motion.main
        key={location.pathname + location.search}
        className="screen"
        custom={dir}
        variants={screenVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <Routes location={location}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/face/test" element={<FaceTestScreen />} />
          {/* Pagamento: valor -> rosto -> processamento -> PIN -> resultado */}
          <Route path="/amount" element={<AmountScreen />} />
          <Route path="/face" element={<PaymentFaceScreen />} />
          <Route path="/processing" element={<ProcessingScreen />} />
          <Route path="/pin" element={<PinScreen />} />
          <Route path="/result" element={<PaymentResultScreen />} />
          {/* Cadastro: dados -> rosto -> envio/resultado */}
          <Route path="/register/form" element={<RegisterFormScreen />} />
          <Route path="/register/face" element={<RegisterFaceScreen />} />
          <Route path="/register/result" element={<RegisterResultScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Aurora />
        <div className="device">
          <AnimatedRoutes />
        </div>
      </div>
    </BrowserRouter>
  )
}
