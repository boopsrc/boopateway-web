import { AnimatePresence, motion } from 'motion/react'
import { useId } from 'react'
import { bouncy, spring } from '../animation/motion'
import { HOLD_MILLIS } from '../data/face/faceAnalyzer'
import { boxHeight, boxWidth, centerX, centerY, ellipse, type Box, type FaceState } from '../data/face/faceGuide'

// Sobre o vídeo as cores são fixas: o fundo é a câmera, não o tema.
const OK = '#4ade80'
const WRONG = '#f87171'
const IDLE = '#e6f0ef'

/**
 * Guia facial animado sobre o preview (mesma geometria do faceGuide usada na detecção).
 * Cada estado tem sua coreografia: respiração + silhueta (sem rosto), setas para fora
 * (aproxime-se) ou para dentro (afaste-se), seta até o centro (centralize) e, posicionado,
 * linha de scan + anel de progresso + contagem regressiva. Na captura, flash.
 */
export function FaceFrame(props: {
  width: number
  height: number
  state: FaceState
  holdProgress: number
  face: Box | null
  captured: boolean
  /** Mostra a caixa avaliada, os 5 pontos testados e as medidas (abrir a tela com ?debug). */
  debug?: boolean
}) {
  const { width: w, height: h, state, holdProgress, face, captured } = props
  const uid = useId().replace(/:/g, '')
  if (!w || !h) return null
  const e = ellipse(w, h)
  const cx = centerX(e)
  const cy = centerY(e)
  const rx = boxWidth(e) / 2
  const ry = boxHeight(e) / 2
  const positioned = captured || state === 'OK'
  const color = positioned ? OK : state === 'NONE' ? IDLE : WRONG
  const ringPath = `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry}`
  const remaining = Math.ceil(((1 - holdProgress) * HOLD_MILLIS) / 1000)
  // Acima da elipse quando há espaço; senão, logo dentro dela.
  const countY = cy - ry - 22 >= 48 ? cy - ry - 22 : cy - ry + 62

  return (
    <svg className="face-frame" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <mask id={`m${uid}`}>
          <rect width={w} height={h} fill="white" />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
        </mask>
        <clipPath id={`c${uid}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
        <linearGradient id={`g${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={OK} stopOpacity="0" />
          <stop offset="0.85" stopColor={OK} stopOpacity="0.45" />
          <stop offset="1" stopColor={OK} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Escurece o que está fora da elipse. */}
      <motion.rect
        width={w}
        height={h}
        fill="black"
        mask={`url(#m${uid})`}
        initial={false}
        animate={{ opacity: positioned ? 0.7 : 0.55 }}
        transition={{ duration: 0.4 }}
      />

      {/* Silhueta fantasma quando não há rosto. */}
      <AnimatePresence>
        {state === 'NONE' && !captured && (
          <motion.g
            key="ghost"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.18, 0.42, 0.18] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity }}
            clipPath={`url(#c${uid})`}
          >
            <ellipse cx={cx} cy={cy - ry * 0.12} rx={rx * 0.58} ry={ry * 0.62} fill="none" stroke={IDLE} strokeWidth={2} strokeDasharray="6 8" />
            <path
              d={`M ${cx - rx * 0.95} ${cy + ry} Q ${cx - rx * 0.7} ${cy + ry * 0.5} ${cx} ${cy + ry * 0.52} Q ${cx + rx * 0.7} ${cy + ry * 0.5} ${cx + rx * 0.95} ${cy + ry}`}
              fill="none"
              stroke={IDLE}
              strokeWidth={2}
              strokeDasharray="6 8"
            />
          </motion.g>
        )}
      </AnimatePresence>

      {/* Contorno pontilhado girando ao redor da elipse. */}
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={rx + 12}
        ry={ry + 12}
        fill="none"
        stroke={color}
        strokeOpacity={0.45}
        strokeWidth={2}
        strokeDasharray="2 14"
        strokeLinecap="round"
        animate={{ strokeDashoffset: [0, -160] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />

      {/* Borda principal: cor com transição e "respiração" enquanto espera. */}
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        strokeWidth={4}
        initial={false}
        animate={{
          stroke: color,
          scale: state === 'NONE' && !captured ? [1, 1.025, 1] : captured ? 0.96 : 1,
        }}
        transition={{
          stroke: { duration: 0.35 },
          scale: state === 'NONE' && !captured ? { duration: 2.2, repeat: Infinity } : spring,
        }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Caixa do rosto rastreado: cantos que seguem o rosto ao vivo. */}
      {face && !captured && state !== 'OK' && <TrackedCorners face={face} color={color} />}

      {/* Dicas direcionais. */}
      <AnimatePresence>
        {!captured && state === 'TOO_FAR' && <ScaleArrows key="far" cx={cx} cy={cy} rx={rx} ry={ry} outward />}
        {!captured && state === 'TOO_CLOSE' && <ScaleArrows key="close" cx={cx} cy={cy} rx={rx} ry={ry} outward={false} />}
        {!captured && state === 'OFF_CENTER' && face && (
          <CenterArrow key="center" from={[centerX(face), centerY(face)]} to={[cx, cy]} />
        )}
      </AnimatePresence>

      {/* Posicionado: scan + anel de progresso + contagem. */}
      <AnimatePresence>
        {(state === 'OK' || captured) && (
          <motion.g key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!captured && (
              <g clipPath={`url(#c${uid})`}>
                <motion.rect
                  x={cx - rx}
                  width={rx * 2}
                  height={ry * 0.5}
                  fill={`url(#g${uid})`}
                  animate={{ y: [cy - ry - ry * 0.5, cy + ry] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </g>
            )}
            <motion.path
              d={ringPath}
              fill="none"
              stroke={OK}
              strokeWidth={10}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: captured ? 1 : holdProgress }}
              transition={{ duration: 0.15, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 10px ${OK})` }}
            />
            {!captured && remaining > 0 && (
              <AnimatePresence mode="popLayout">
                <motion.text
                  key={remaining}
                  x={cx}
                  y={countY}
                  textAnchor="middle"
                  className="face-countdown"
                  initial={{ opacity: 0, scale: 1.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={bouncy}
                  style={{ transformOrigin: `${cx}px ${countY - 14}px` }}
                >
                  {remaining}
                </motion.text>
              </AnimatePresence>
            )}
          </motion.g>
        )}
      </AnimatePresence>

      {props.debug && face && <DebugOverlay face={face} e={e} state={state} textY={h - 100} />}

      {/* Flash da captura. */}
      <AnimatePresence>
        {captured && (
          <motion.rect
            key="flash"
            width={w}
            height={h}
            fill="white"
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </svg>
  )
}

/** Diagnóstico: caixa avaliada, pontos de borda (verde = dentro da elipse) e medidas. */
function DebugOverlay({ face, e, state, textY }: { face: Box; e: Box; state: FaceState; textY: number }) {
  const ex = centerX(e)
  const ey = centerY(e)
  const erx = boxWidth(e) / 2
  const ery = boxHeight(e) / 2
  const pts: [number, number][] = [
    [centerX(face), centerY(face)],
    [face.left, centerY(face)],
    [face.right, centerY(face)],
    [centerX(face), face.top],
    [centerX(face), face.bottom],
  ]
  const dist = ([x, y]: [number, number]) => ((x - ex) / erx) ** 2 + ((y - ey) / ery) ** 2
  const fill = boxWidth(face) / boxWidth(e)
  return (
    <g>
      <rect x={face.left} y={face.top} width={boxWidth(face)} height={boxHeight(face)} fill="none" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 4" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={5} fill={dist(p) <= 1.05 ? OK : WRONG} stroke="#000" />
      ))}
      <text x={10} y={textY} fill="#fff" fontSize={13} fontFamily="monospace" style={{ paintOrder: 'stroke' }} stroke="#000" strokeWidth={3}>
        {`${state} fill=${fill.toFixed(2)} (0.45–1.00)`}
      </text>
      <text x={10} y={textY + 18} fill="#fff" fontSize={13} fontFamily="monospace" style={{ paintOrder: 'stroke' }} stroke="#000" strokeWidth={3}>
        {`centro=(${centerX(face).toFixed(0)},${centerY(face).toFixed(0)}) elipse=(${ex.toFixed(0)},${ey.toFixed(0)})`}
      </text>
    </g>
  )
}

function TrackedCorners({ face, color }: { face: Box; color: string }) {
  const l = 18
  const { left, top, right, bottom } = face
  const d = [
    `M ${left} ${top + l} V ${top} H ${left + l}`,
    `M ${right - l} ${top} H ${right} V ${top + l}`,
    `M ${right} ${bottom - l} V ${bottom} H ${right - l}`,
    `M ${left + l} ${bottom} H ${left} V ${bottom - l}`,
  ].join(' ')
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.85, d }}
      transition={{ d: { duration: 0.12, ease: 'linear' }, opacity: { duration: 0.2 } }}
    />
  )
}

/** Quatro setas nas diagonais: para fora = "aproxime-se" (rosto precisa crescer), para dentro = "afaste-se". */
function ScaleArrows({ cx, cy, rx, ry, outward }: { cx: number; cy: number; rx: number; ry: number; outward: boolean }) {
  const angles = [-135, -45, 45, 135]
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {angles.map((deg) => {
        const a = (deg * Math.PI) / 180
        const px = cx + Math.cos(a) * rx * 0.72
        const py = cy + Math.sin(a) * ry * 0.72
        const rot = deg + (outward ? 0 : 180)
        const dx = Math.cos(a) * 14 * (outward ? 1 : -1)
        const dy = Math.sin(a) * 14 * (outward ? 1 : -1)
        return (
          <motion.g key={deg} animate={{ x: [0, dx, 0], y: [0, dy, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}>
            <g transform={`translate(${px} ${py}) rotate(${rot})`}>
              <path d="M -14 -10 L 0 0 L -14 10" fill="none" stroke={WRONG} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M -26 -10 L -12 0 L -26 10" fill="none" stroke={WRONG} strokeOpacity={0.5} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </motion.g>
        )
      })}
    </motion.g>
  )
}

/** Seta saindo do centro do rosto até o centro da elipse, com alvo pulsando. */
function CenterArrow({ from, to }: { from: [number, number]; to: [number, number] }) {
  const [x1, y1] = from
  const [x2, y2] = to
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len < 8) return null
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  const ex = x2 - ((x2 - x1) / len) * 20
  const ey = y2 - ((y2 - y1) / len) * 20
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.circle
        cx={x2}
        cy={y2}
        r={14}
        fill="none"
        stroke={OK}
        strokeWidth={3}
        animate={{ r: [10, 26], opacity: [0.9, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <circle cx={x2} cy={y2} r={5} fill={OK} />
      <motion.line
        x1={x1}
        y1={y1}
        x2={ex}
        y2={ey}
        stroke={WRONG}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="8 10"
        animate={{ strokeDashoffset: [0, -36] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <g transform={`translate(${ex} ${ey}) rotate(${ang})`}>
        <path d="M -12 -10 L 2 0 L -12 10" fill="none" stroke={WRONG} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </motion.g>
  )
}

const HINT_ICON: Record<string, string> = {
  NONE: '◎',
  TOO_FAR: '⤢',
  TOO_CLOSE: '⤡',
  OFF_CENTER: '✛',
  OK: '●',
  saving: '✓',
  error: '!',
}

/** Pílula de instrução sobre a câmera; troca de texto com slide + blur. */
export function CameraHint({ text, kind, positive }: { text: string; kind: string; positive: boolean }) {
  return (
    <motion.div
      className={`camera-hint ${positive ? 'is-ok' : kind === 'NONE' ? '' : 'is-warn'}`}
      layout
      transition={spring}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={kind + text}
          className="camera-hint-inner t-title-m"
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
          transition={{ duration: 0.25 }}
        >
          <motion.span
            className="camera-hint-icon"
            animate={kind === 'OK' ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, repeat: kind === 'OK' ? Infinity : 0 }}
          >
            {HINT_ICON[kind] ?? '•'}
          </motion.span>
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  )
}
