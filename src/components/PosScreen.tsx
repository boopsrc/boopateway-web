import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { riseChild, spring, staggerParent } from '../animation/motion'
import { useAppStore } from '../data/session/store'
import { FlowStepper, type Flow } from './FlowStepper'
import { ArrowLeft } from './icons'
import './components.css'

/** Estrutura base de todas as telas do POS: cabeçalho (com stepper) + conteúdo. */
export function PosScreen(props: {
  title: string
  subtitle?: string | null
  onBack?: () => void
  flow?: { flow: Flow; step: number; error?: boolean; done?: boolean }
  children: ReactNode
}) {
  const demo = useAppStore((s) => s.demo)
  return (
    <div className="screen-body">
      <motion.header className="pos-header" variants={staggerParent} initial="hidden" animate="show">
        <div className="pos-header-row">
          {props.onBack && (
            <motion.button
              className="icon-btn"
              onClick={props.onBack}
              aria-label="Voltar"
              variants={riseChild}
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.88 }}
            >
              <ArrowLeft />
            </motion.button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h1
                key={props.title}
                className="t-headline-s pos-title"
                variants={riseChild}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -12 }}
              >
                {props.title}
              </motion.h1>
            </AnimatePresence>
            {props.subtitle && (
              <motion.p className="t-body-m muted pos-subtitle" variants={riseChild}>
                {props.subtitle}
              </motion.p>
            )}
          </div>
          <AnimatePresence>
            {demo && (
              <motion.span
                className="demo-badge"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={spring}
                title="Modo demo: API simulada no navegador"
              >
                DEMO
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {props.flow && (
          <motion.div variants={riseChild}>
            <FlowStepper {...props.flow} />
          </motion.div>
        )}
      </motion.header>
      {props.children}
    </div>
  )
}
