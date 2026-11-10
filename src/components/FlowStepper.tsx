import { motion } from 'motion/react'
import { softSpring, spring } from '../animation/motion'

export type Flow = 'payment' | 'registration'
const STEPS: Record<Flow, string[]> = {
  payment: ['Valor', 'Rosto', 'PIN', 'Resultado'],
  registration: ['Dados', 'Foto', 'Envio'],
}

/**
 * Stepper guiado do fluxo: barra que enche com mola, etapa atual com halo pulsante,
 * concluídas viram check desenhado e etapa com erro fica vermelha.
 */
export function FlowStepper({ flow, step, error, done }: { flow: Flow; step: number; error?: boolean; done?: boolean }) {
  const steps = STEPS[flow]
  const fraction = done ? 1 : step / (steps.length - 1)
  return (
    <nav className="stepper" aria-label={`Etapa ${step + 1} de ${steps.length}: ${steps[step]}`}>
      <div className="stepper-track">
        <motion.div
          className={`stepper-fill ${error ? 'is-error' : ''}`}
          initial={false}
          animate={{ scaleX: fraction }}
          transition={softSpring}
        />
      </div>
      <ol className="stepper-dots">
        {steps.map((label, i) => {
          const complete = done ? true : i < step
          const current = !done && i === step
          const state = current && error ? 'error' : complete ? 'done' : current ? 'current' : 'todo'
          return (
            <li key={label} className={`stepper-step is-${state}`}>
              <motion.span
                className="stepper-dot"
                initial={false}
                animate={{ scale: current ? 1.15 : 1 }}
                transition={spring}
              >
                {current && !error && (
                  <motion.span
                    className="stepper-halo"
                    animate={{ scale: [1, 1.9], opacity: [0.55, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                {state === 'done' ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                    <motion.path
                      d="M5 12.5 10 17 19 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                    />
                  </svg>
                ) : state === 'error' ? (
                  <span aria-hidden>!</span>
                ) : (
                  <span aria-hidden>{i + 1}</span>
                )}
              </motion.span>
              <span className="stepper-label">{label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
