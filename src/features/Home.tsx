import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { bouncy, useIdle } from '../animation/motion'
import { HomeActionCard } from '../components/Fields'
import { CameraIcon, PersonAddIcon, PosIcon } from '../components/icons'
import { PosScreen } from '../components/PosScreen'
import { DEMO_PIN } from '../data/api/mockGateway'
import { useAppStore } from '../data/session/store'

export function HomeScreen() {
  const navigate = useNavigate()
  const { demo, setDemo } = useAppStore()
  const idle = useIdle(4000)
  return (
    <PosScreen title="FacePay" subtitle="Pagamento por reconhecimento facial">
      <div className="spacer" />
      <motion.div className="home-hero" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={bouncy}>
        <HeroFace />
      </motion.div>
      <div className="home-cards">
        <HomeActionCard
          index={0}
          highlighted
          coach={idle}
          title="Criar pagamento"
          description="Cobrar um cliente pelo rosto"
          icon={<PosIcon size={30} />}
          onClick={() => navigate('/amount')}
        />
        <HomeActionCard
          index={1}
          title="Cadastrar pessoa"
          description="Registrar nome, e-mail, código e foto"
          icon={<PersonAddIcon size={30} />}
          onClick={() => navigate('/register/form')}
        />
        <HomeActionCard
          index={2}
          title="Testar captura"
          description="Ver a foto recortada que seria enviada"
          icon={<CameraIcon size={30} />}
          onClick={() => navigate('/face/test')}
        />
      </div>
      <div className="spacer" />
      <motion.label
        className="demo-toggle"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <span className="demo-toggle-text">
          <span className="t-body-m" style={{ fontWeight: 600 }}>
            Modo demo
          </span>
          <span className="t-body-m muted">
            {demo ? `API simulada · PIN ${DEMO_PIN}` : 'Usando a API real do gateway'}
          </span>
        </span>
        <input type="checkbox" className="sr-only" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
        <motion.span className={`switch ${demo ? 'is-on' : ''}`} aria-hidden>
          <motion.span className="switch-thumb" layout transition={bouncy} />
        </motion.span>
      </motion.label>
    </PosScreen>
  )
}

/** Ilustração animada: rosto dentro da elipse com linha de scan e cantos pulsando. */
function HeroFace() {
  return (
    <svg viewBox="0 0 160 120" width="160" height="120" aria-hidden>
      <defs>
        <clipPath id="hero-clip">
          <ellipse cx="80" cy="60" rx="34" ry="46" />
        </clipPath>
      </defs>
      {[
        'M30 30 V18 H42',
        'M118 18 H130 V30',
        'M130 90 V102 H118',
        'M42 102 H30 V90',
      ].map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1, opacity: [1, 0.4, 1] }}
          transition={{ pathLength: { duration: 0.6, delay: 0.2 + i * 0.1 }, opacity: { duration: 2, repeat: Infinity, delay: 1 } }}
        />
      ))}
      <ellipse cx="80" cy="60" rx="34" ry="46" fill="var(--primary-container)" />
      <motion.g animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity }}>
        <motion.circle cx="68" cy="54" r="3.5" fill="var(--on-primary-container)" animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} style={{ originY: '54px' }} />
        <motion.circle cx="92" cy="54" r="3.5" fill="var(--on-primary-container)" animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} style={{ originY: '54px' }} />
        <path d="M68 74 Q80 84 92 74" fill="none" stroke="var(--on-primary-container)" strokeWidth="3.5" strokeLinecap="round" />
      </motion.g>
      <g clipPath="url(#hero-clip)">
        <motion.rect x="40" width="80" height="6" rx="3" fill="var(--primary)" opacity="0.55" animate={{ y: [10, 106, 10] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
      </g>
    </svg>
  )
}
