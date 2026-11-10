import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { spring } from '../animation/motion'
import { useRipples } from './Buttons'
import { BackspaceIcon, HandIcon } from './icons'

/**
 * Teclado numérico reutilizado nas telas de valor e de PIN. Aceita também o teclado físico
 * (0–9, Backspace, Enter). `coach` mostra uma onda percorrendo as teclas + mãozinha
 * indicando onde tocar.
 */
export function NumericKeypad(props: {
  onDigit: (d: number) => void
  onBackspace: () => void
  onEnter?: () => void
  coach?: boolean
}) {
  const [pressed, setPressed] = useState<string | null>(null)
  const { onDigit, onBackspace, onEnter } = props

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) {
        onDigit(Number(e.key))
        flash(e.key)
      } else if (e.key === 'Backspace') {
        onBackspace()
        flash('back')
      } else if (e.key === 'Enter' && onEnter) {
        e.preventDefault()
        onEnter()
      }
    }
    const flash = (k: string) => {
      setPressed(k)
      window.setTimeout(() => setPressed((p) => (p === k ? null : p)), 140)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDigit, onBackspace, onEnter])

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  return (
    <div className="keypad" role="group" aria-label="Teclado numérico">
      {keys.map((d, i) => (
        <Key key={d} label={String(d)} pressed={pressed === String(d)} index={i} coach={props.coach} onClick={() => onDigit(d)}>
          {d}
        </Key>
      ))}
      <span />
      <Key label="0" pressed={pressed === '0'} index={10} coach={props.coach} onClick={() => onDigit(0)}>
        0
      </Key>
      <Key label="Apagar" subtle pressed={pressed === 'back'} index={11} onClick={onBackspace}>
        <BackspaceIcon />
      </Key>
      <AnimatePresence>
        {props.coach && (
          <motion.span
            className="keypad-hand"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: [1, 0.86, 1], y: [0, 6, 0] }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 1.2, repeat: Infinity, opacity: { duration: 0.25 } }}
            aria-hidden
          >
            <HandIcon size={34} />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

function Key(props: {
  label: string
  onClick: () => void
  pressed: boolean
  index: number
  subtle?: boolean
  coach?: boolean
  children: React.ReactNode
}) {
  const { add, node } = useRipples()
  const row = Math.floor(props.index / 3)
  const col = props.index % 3
  return (
    <motion.button
      type="button"
      className={`key ${props.subtle ? 'key-subtle' : ''}`}
      aria-label={props.label}
      onClick={props.onClick}
      onPointerDown={add}
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: props.pressed ? 0.92 : 1,
        backgroundColor: props.pressed ? 'var(--primary-container)' : undefined,
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.9 }}
      transition={{ ...spring, delay: props.pressed ? 0 : 0.03 * props.index }}
    >
      {node}
      {props.coach && !props.subtle && (
        <motion.span
          className="key-wave"
          animate={{ opacity: [0, 0.55, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: (row + col) * 0.12, repeatDelay: 0.6 }}
          aria-hidden
        />
      )}
      <span className="key-content">{props.children}</span>
    </motion.button>
  )
}
