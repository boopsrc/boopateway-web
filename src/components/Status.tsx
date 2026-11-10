import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { bouncy, softSpring } from '../animation/motion'

/**
 * Carregando: rosto estilizado sendo "escaneado" (anéis orbitais, linha de scan e pontos
 * biométricos acendendo) + mensagens que se alternam.
 */
export function LoadingContent({ messages, detail }: { messages: string[]; detail?: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (messages.length < 2) return
    const t = window.setInterval(() => setI((x) => (x + 1) % messages.length), 2200)
    return () => window.clearInterval(t)
  }, [messages.length])
  const points = useMemo(
    () => [
      [44, 46], [76, 46], [60, 62], [48, 80], [72, 80], [60, 86], [36, 60], [84, 60], [60, 30],
    ],
    [],
  )
  return (
    <div className="loading" role="status" aria-live="polite">
      <motion.div className="scan" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={softSpring}>
        {[0, 1, 2].map((k) => (
          <motion.span
            key={k}
            className="scan-orbit"
            style={{ inset: -k * 14 }}
            animate={{ rotate: k % 2 ? -360 : 360 }}
            transition={{ duration: 3 + k * 1.4, repeat: Infinity, ease: 'linear' }}
          />
        ))}
        <svg viewBox="0 0 120 120" className="scan-face" aria-hidden>
          <ellipse cx="60" cy="60" rx="34" ry="44" className="scan-face-outline" />
          {points.map(([x, y], k) => (
            <motion.circle
              key={k}
              cx={x}
              cy={y}
              r="2.6"
              className="scan-point"
              animate={{ opacity: [0.15, 1, 0.15], scale: [0.6, 1.3, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: k * 0.18 }}
            />
          ))}
          <motion.line
            x1="22"
            x2="98"
            className="scan-line"
            animate={{ y1: [18, 102, 18], y2: [18, 102, 18] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </motion.div>
      <div className="loading-text">
        <AnimatePresence mode="wait">
          <motion.p
            key={messages[i]}
            className="t-title-l center"
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
            transition={{ duration: 0.35 }}
          >
            {messages[i]}
          </motion.p>
        </AnimatePresence>
        {detail && (
          <motion.p className="t-body-l muted center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {detail}
          </motion.p>
        )}
        <span className="loading-dots" aria-hidden>
          {[0, 1, 2].map((k) => (
            <motion.span key={k} animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.15 }} />
          ))}
        </span>
      </div>
    </div>
  )
}

/**
 * Resultado final: círculo que surge com mola, ondas de pulso, ícone desenhado por traço
 * e (em sucesso) confete. Falha dá um tremido no ícone.
 */
export function StatusContent(props: { success: boolean; title: string; subtitle?: ReactNode; confetti?: boolean }) {
  const { success } = props
  return (
    <div className="status">
      <div className="status-icon-wrap">
        {props.confetti && <Confetti />}
        {[0, 1].map((k) => (
          <motion.span
            key={k}
            className={`status-ring ${success ? 'ok' : 'bad'}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.9], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 + k * 0.9, ease: 'easeOut' }}
          />
        ))}
        <motion.div
          className={`status-circle ${success ? 'ok' : 'bad'}`}
          initial={{ scale: 0, rotate: success ? -45 : 45 }}
          animate={success ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0, x: [0, -8, 8, -6, 6, 0] }}
          transition={success ? bouncy : { ...bouncy, x: { delay: 0.6, duration: 0.45 } }}
        >
          <svg viewBox="0 0 52 52" width="76" height="76" aria-hidden>
            {success ? (
              <motion.path
                d="M14 27.5 22.5 36 39 18"
                className="status-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
              />
            ) : (
              <>
                <motion.path
                  d="M17 17 35 35"
                  className="status-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                />
                <motion.path
                  d="M35 17 17 35"
                  className="status-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                />
              </>
            )}
          </svg>
        </motion.div>
      </div>
      <motion.h2
        className="t-headline-m center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...softSpring, delay: 0.35 }}
      >
        {props.title}
      </motion.h2>
      {props.subtitle && (
        <motion.div
          className="t-body-l muted center status-sub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...softSpring, delay: 0.48 }}
        >
          {props.subtitle}
        </motion.div>
      )}
    </div>
  )
}

const CONFETTI_COLORS = ['var(--primary)', 'var(--success)', '#f5b83d', '#ef6f9a', 'var(--primary-container)']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.3
        const dist = 110 + Math.random() * 110
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 40,
          rot: Math.random() * 720 - 360,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          w: 6 + Math.random() * 6,
          round: i % 3 === 0,
          delay: 0.35 + Math.random() * 0.15,
        }
      }),
    [],
  )
  return (
    <span className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          style={{ background: p.color, width: p.w, height: p.round ? p.w : p.w * 0.45, borderRadius: p.round ? '50%' : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 140], opacity: [1, 1, 0], rotate: p.rot, scale: 1 }}
          transition={{ duration: 1.8, delay: p.delay, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </span>
  )
}
