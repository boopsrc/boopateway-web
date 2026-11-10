import { AnimatePresence, animate, motion, useAnimationControls, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import { bouncy, shake, softSpring, spring } from '../animation/motion'
import { formatMoney, type Money } from '../domain/money'
import { AlertIcon } from './icons'

/**
 * Cartão de destaque com o valor. Cada caractere é um "rolo" de odômetro: dígitos novos
 * descem de cima ao digitar e sobem ao apagar; o cartão dá um pulso a cada mudança.
 */
export function AmountDisplay({ amount, label = 'Valor a pagar' }: { amount: Money; label?: string }) {
  const prev = useRef(amount)
  const dir = amount >= prev.current ? 1 : -1
  const pulse = useAnimationControls()
  useEffect(() => {
    if (prev.current !== amount) pulse.start({ scale: [1, 1.03, 1], transition: { duration: 0.25 } })
    prev.current = amount
  }, [amount, pulse])
  const text = formatMoney(amount)
  // Chaves alinhadas pela direita: os centavos mantêm a posição enquanto o número cresce.
  const chars = text.split('')
  return (
    <motion.div
      className="amount-card"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={softSpring}
    >
      <motion.div animate={pulse} className="amount-card-inner">
      <motion.span className="t-label-m" initial={{ opacity: 0 }} animate={{ opacity: 0.85 }}>
        {label}
      </motion.span>
      <div className="t-display amount-value" aria-live="polite" aria-label={text}>
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          {chars.map((c, i) => {
            const fromRight = chars.length - i
            return (
              <motion.span
                layout="position"
                key={`${fromRight}-${c}`}
                className={/[0-9]/.test(c) ? 'odo-digit' : 'odo-sep'}
                custom={dir}
                initial={{ y: dir > 0 ? '-70%' : '70%', opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: dir > 0 ? '70%' : '-70%', opacity: 0, filter: 'blur(4px)' }}
                transition={spring}
              >
                {c === ' ' ? ' ' : c}
              </motion.span>
            )
          })}
        </AnimatePresence>
      </div>
      </motion.div>
    </motion.div>
  )
}

/** Bolinhas do PIN: enchem com mola, erro faz shake, completo faz uma onda. */
export function PinIndicator({ filled, length, error }: { filled: number; length: number; error?: boolean }) {
  const complete = filled === length && !error
  return (
    <motion.div
      className={`pin-dots ${error ? 'is-error' : ''}`}
      role="status"
      aria-label={`${filled} de ${length} dígitos`}
      animate={error ? shake : { x: 0 }}
      key={error ? 'err' : 'ok'}
    >
      {Array.from({ length }, (_, i) => {
        const on = i < filled
        return (
          <motion.span
            key={i}
            className={`pin-dot ${on ? 'is-on' : ''}`}
            animate={
              complete
                ? { scale: [1, 1.35, 1], transition: { delay: i * 0.07, duration: 0.4 } }
                : { scale: on ? [0.6, 1.2, 1] : 1, transition: on ? bouncy : spring }
            }
          >
            <motion.span className="pin-dot-fill" initial={false} animate={{ scale: on ? 1 : 0 }} transition={bouncy} />
          </motion.span>
        )
      })}
    </motion.div>
  )
}

const initials = (name: string) =>
  (() => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
  })()

/** Cartão com iniciais, nome e e-mail mascarado do cliente identificado pela foto. */
export function CustomerInfo({ name, maskedEmail, delay = 0 }: { name: string; maskedEmail: string | null; delay?: number }) {
  return (
    <motion.div
      className="customer-card"
      initial={{ opacity: 0, x: -40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ ...softSpring, delay }}
    >
      <motion.span
        className="avatar t-title-m"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...bouncy, delay: delay + 0.15 }}
      >
        <motion.span
          className="avatar-ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        {initials(name)}
      </motion.span>
      <div style={{ minWidth: 0 }}>
        <motion.div
          className="t-title-l ellipsis"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.2 }}
        >
          {name.trim() || 'Cliente'}
        </motion.div>
        {maskedEmail && (
          <motion.div
            className="t-body-l muted ellipsis"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.3 }}
          >
            {maskedEmail}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/** Faixa de erro inline: entra abrindo a altura e com um leve shake. */
export function ErrorBanner({ message }: { message: string | null | undefined }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={softSpring}
          style={{ overflow: 'hidden' }}
        >
          <motion.div className="error-banner t-body-l" role="alert" key={message} animate={shake}>
            <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 0.5, delay: 0.1 }}>
              <AlertIcon />
            </motion.span>
            <span>{message}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Número que conta de 0 até o valor (usado no comprovante). */
export function CountUpMoney({ cents, delay = 0 }: { cents: Money; delay?: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => formatMoney(Math.round(v)))
  useEffect(() => {
    const c = animate(mv, cents, { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [cents, delay, mv])
  return <motion.span>{text}</motion.span>
}
