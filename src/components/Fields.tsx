import { AnimatePresence, motion, useAnimationControls, useMotionTemplate, useMotionValue, useSpring } from 'motion/react'
import { forwardRef, useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { bouncy, shake, softSpring, spring } from '../animation/motion'
import { ChevronRight } from './icons'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>

/**
 * Campo com label flutuante animado, linha de foco que se expande do centro,
 * erro com shake e texto de apoio que troca com fade. `coach` aponta este campo.
 */
export const PosTextField = forwardRef<HTMLInputElement, InputProps & {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  supportingText?: string
  coach?: boolean
  index?: number
}>(function PosTextField({ label, value, onChange, error, supportingText, coach, index = 0, ...rest }, ref) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  // Shake por controle (sem trocar `key`, que remontaria o input e tiraria o foco).
  const controls = useAnimationControls()
  useEffect(() => {
    if (error) controls.start(shake)
  }, [error, controls])
  const id = rest.id ?? `f-${label.replace(/\W/g, '')}`
  return (
    <motion.div
      className="field"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...softSpring, delay: 0.08 * index }}
    >
      <motion.div
        className={`field-box ${focused ? 'is-focused' : ''} ${error ? 'is-error' : ''}`}
        animate={controls}
      >
        <motion.label
          htmlFor={id}
          className="field-label"
          initial={false}
          animate={floated ? { y: -13, scale: 0.78 } : { y: 0, scale: 1 }}
          transition={spring}
        >
          {label}
        </motion.label>
        <input
          ref={ref}
          id={id}
          className="field-input t-body-l"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={!!error}
          aria-describedby={`${id}-help`}
          {...rest}
        />
        <motion.span className="field-underline" initial={false} animate={{ scaleX: focused || error ? 1 : 0 }} transition={spring} />
        <AnimatePresence>
          {coach && !focused && (
            <motion.span
              className="field-coach"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: [0, -8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ x: { duration: 1, repeat: Infinity }, opacity: { duration: 0.2 } }}
              aria-hidden
            >
              ← comece aqui
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <div id={`${id}-help`} className="field-help t-body-m">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={error ?? supportingText ?? ''}
            className={error ? 'field-help-error' : 'muted'}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
          >
            {error ?? supportingText ?? ' '}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  )
})

/**
 * Botão grande da home: entra em cascata, inclina em 3D seguindo o ponteiro e tem um
 * brilho radial que acompanha o cursor; o ícone dá um salto no hover.
 */
export function HomeActionCard(props: {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
  highlighted?: boolean
  index: number
  coach?: boolean
}) {
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  const rx = useSpring(0, { stiffness: 200, damping: 18 })
  const ry = useSpring(0, { stiffness: 200, damping: 18 })
  const glow = useMotionTemplate`radial-gradient(260px circle at ${mx}% ${my}%, var(--card-glow), transparent 70%)`
  const [hover, setHover] = useState(false)
  return (
    <motion.button
      type="button"
      className={`home-card ${props.highlighted ? 'is-highlighted' : ''}`}
      onClick={props.onClick}
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...softSpring, delay: 0.12 + props.index * 0.1 }}
      whileTap={{ scale: 0.97 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        mx.set(px * 100)
        my.set(py * 100)
        if (e.pointerType === 'mouse') {
          ry.set((px - 0.5) * 10)
          rx.set(-(py - 0.5) * 10)
        }
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        setHover(false)
        rx.set(0)
        ry.set(0)
      }}
    >
      <motion.span className="home-card-glow" style={{ background: glow }} animate={{ opacity: hover ? 1 : 0 }} />
      {props.highlighted && (
        <motion.span
          className="home-card-shine"
          animate={{ x: ['-120%', '220%'] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
          aria-hidden
        />
      )}
      <motion.span
        className="home-card-icon"
        animate={hover ? { rotate: [0, -10, 10, 0], scale: 1.08 } : { rotate: 0, scale: 1 }}
        transition={hover ? { duration: 0.5 } : bouncy}
      >
        {props.icon}
      </motion.span>
      <span className="home-card-text">
        <span className="t-title-l">{props.title}</span>
        <span className="t-body-m home-card-desc">{props.description}</span>
      </span>
      <motion.span animate={{ x: hover || props.coach ? [0, 6, 0] : 0 }} transition={{ duration: 0.9, repeat: hover || props.coach ? Infinity : 0 }}>
        <ChevronRight />
      </motion.span>
      <AnimatePresence>
        {props.coach && (
          <motion.span
            className="home-card-coach"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.98, 1.04, 1.06] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity }}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}
