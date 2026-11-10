import { AnimatePresence, motion } from 'motion/react'
import { useState, type PointerEvent, type ReactNode } from 'react'
import { spring } from '../animation/motion'

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

/** Ondas de toque (ripple) a partir do ponto pressionado. */
export function useRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const add = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2.2
    const r = { id: performance.now() + Math.random(), x: e.clientX - rect.left, y: e.clientY - rect.top, size }
    setRipples((rs) => [...rs, r])
  }
  const node = (
    <span className="ripples" aria-hidden>
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="ripple"
            style={{ left: r.x - r.size / 2, top: r.y - r.size / 2, width: r.size, height: r.size }}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onAnimationComplete={() => setRipples((rs) => rs.filter((x) => x.id !== r.id))}
          />
        ))}
      </AnimatePresence>
    </span>
  )
  return { add, node }
}

/**
 * Botão principal. `coach` liga a dica contextual: brilho pulsante + seta indicando
 * que este é o próximo passo.
 */
export function PrimaryButton(props: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  coach?: boolean
  type?: 'button' | 'submit'
}) {
  const { add, node } = useRipples()
  const coach = props.coach && !props.disabled
  return (
    <motion.button
      type={props.type ?? 'button'}
      className={`btn btn-primary ${coach ? 'is-coach' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      onPointerDown={props.disabled ? undefined : add}
      initial={false}
      animate={{ opacity: props.disabled ? 0.9 : 1 }}
      whileHover={props.disabled ? undefined : { y: -2, boxShadow: '0 14px 28px -12px var(--glow)' }}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={spring}
      layout="position"
    >
      {node}
      <AnimatePresence>
        {coach && (
          <motion.span
            className="btn-coach-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.75, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
      </AnimatePresence>
      <span className="btn-label">{props.children}</span>
      <AnimatePresence>
        {coach && (
          <motion.span
            className="btn-coach-arrow"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, 6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ x: { duration: 1, repeat: Infinity }, opacity: { duration: 0.2 } }}
            aria-hidden
          >
            →
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function SecondaryButton(props: { children: ReactNode; onClick: () => void }) {
  const { add, node } = useRipples()
  return (
    <motion.button
      type="button"
      className="btn btn-secondary"
      onClick={props.onClick}
      onPointerDown={add}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
    >
      {node}
      <span className="btn-label">{props.children}</span>
    </motion.button>
  )
}

/** Botões no rodapé entrando de baixo, em cascata. */
export function ButtonBar({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="button-bar"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.15 }}
    >
      {children}
    </motion.div>
  )
}
