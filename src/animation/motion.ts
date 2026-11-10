import type { Transition, Variants } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

export const spring = { type: 'spring', stiffness: 420, damping: 30 } as const satisfies Transition
export const softSpring = { type: 'spring', stiffness: 220, damping: 24 } as const satisfies Transition
export const bouncy = { type: 'spring', stiffness: 500, damping: 14 } as const satisfies Transition

/** Profundidade de cada rota no fluxo: define a direção da transição (avançar/voltar). */
const DEPTH: Record<string, number> = {
  '/': 0,
  '/amount': 1,
  '/face': 2,
  '/processing': 3,
  '/pin': 4,
  '/result': 5,
  '/register/form': 1,
  '/register/face': 2,
  '/register/result': 3,
  '/face/test': 1,
}
export const routeDepth = (path: string) => DEPTH[path] ?? 0

/** Transição de tela direcional: avançar entra pela direita, voltar entra pela esquerda. */
export const screenVariants: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 80 : -80, opacity: 0, scale: 0.98, filter: 'blur(6px)' }),
  center: { x: 0, opacity: 1, scale: 1, filter: 'blur(0px)', transition: { ...softSpring, opacity: { duration: 0.25 } } },
  exit: (dir: number) => ({
    x: dir >= 0 ? -60 : 60,
    opacity: 0,
    scale: 0.98,
    filter: 'blur(6px)',
    transition: { duration: 0.22, ease: 'easeIn' },
  }),
}

/** Entrada em cascata dos filhos. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
}
export const riseChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: softSpring },
}

export const shake = { x: [0, -12, 12, -9, 9, -5, 5, 0], transition: { duration: 0.5 } }

/**
 * Fica true quando o usuário passa [ms] sem interagir (toque, tecla, ponteiro).
 * Base das dicas contextuais: some assim que há interação. `resetKey` reinicia a contagem.
 */
export function useIdle(ms: number, enabled = true, resetKey?: unknown): boolean {
  const [idle, setIdle] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => {
    if (!enabled) {
      setIdle(false)
      return
    }
    const arm = () => {
      setIdle(false)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setIdle(true), ms)
    }
    arm()
    const events = ['pointerdown', 'keydown', 'pointermove', 'wheel'] as const
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    return () => {
      window.clearTimeout(timer.current)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [ms, enabled, resetKey])
  return idle
}
