import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { softSpring } from '../../animation/motion'
import { ButtonBar, PrimaryButton, SecondaryButton } from '../../components/Buttons'
import { CameraHint, FaceFrame } from '../../components/FaceFrame'
import type { Flow } from '../../components/FlowStepper'
import { CameraIcon, FaceScanIcon } from '../../components/icons'
import { PosScreen } from '../../components/PosScreen'
import { HOLD_MILLIS, startFaceAnalyzer, type FaceUpdate } from '../../data/face/faceAnalyzer'
import { loadFaceDetector } from '../../data/face/faceDetector'
import type { Box, FaceState } from '../../data/face/faceGuide'
import { startSimulatedFace } from '../../data/face/simulatedFace'
import { useAppStore } from '../../data/session/store'
import type { FaceCapture } from '../../domain/types'

type Mode = 'starting' | 'camera' | 'simulated' | 'denied' | 'unavailable'

function hintFor(state: FaceState, progress: number, saving: boolean, error: string | null): string {
  if (saving) return 'Rosto capturado!'
  if (error) return error
  switch (state) {
    case 'NONE':
      return 'Posicione o rosto na elipse'
    case 'TOO_FAR':
      return 'Aproxime-se da câmera'
    case 'TOO_CLOSE':
      return 'Afaste-se um pouco'
    case 'OFF_CENTER':
      return 'Centralize o rosto na elipse'
    default: {
      const remaining = Math.ceil(((1 - progress) * HOLD_MILLIS) / 1000)
      return remaining > 0 ? `Não se mova... ${remaining}` : 'Não se mova...'
    }
  }
}

/**
 * Captura facial reutilizada nos fluxos de pagamento, cadastro e teste.
 * `onCaptured` decide o que fazer com o recorte; se lançar erro, a câmera volta a analisar.
 */
export function FaceCaptureView(props: {
  title: string
  subtitle?: string
  flow?: { flow: Flow; step: number }
  onBack?: () => void
  onCaptured: (c: FaceCapture) => Promise<void> | void
}) {
  const demo = useAppStore((s) => s.demo)
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')
  const [mode, setMode] = useState<Mode>('starting')
  const [update, setUpdate] = useState<FaceUpdate>({ state: 'NONE', holdProgress: 0, faceInView: null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thumb, setThumb] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sizeRef = useRef(size)
  sizeRef.current = size
  const onCapturedRef = useRef(props.onCaptured)
  onCapturedRef.current = props.onCaptured

  // Callback ref: a caixa da câmera só monta depois da animação de saída da tela anterior.
  const roRef = useRef<ResizeObserver | null>(null)
  const boxRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect()
    roRef.current = null
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    ro.observe(el)
    roRef.current = ro
  }, [])
  useEffect(() => () => roRef.current?.disconnect(), [])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const requestCamera = useCallback(async () => {
    setMode('starting')
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('unavailable')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      setMode('camera')
    } catch (e) {
      const name = (e as DOMException)?.name
      setMode(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
    }
  }, [])

  useEffect(() => {
    requestCamera()
    return stopStream
  }, [requestCamera])

  // Liga o stream ao <video> quando ele aparece.
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  const handleCaptured = useCallback(async (c: FaceCapture) => {
    setSaving(true)
    setThumb(c.url)
    setError(null)
    // Deixa o flash e a miniatura animarem antes de seguir.
    await new Promise((r) => setTimeout(r, 950))
    try {
      await onCapturedRef.current(c)
    } catch (e) {
      setError((e as Error).message || 'Falha ao salvar a foto')
      setSaving(false)
      setThumb(null)
      setUpdate({ state: 'NONE', holdProgress: 0, faceInView: null })
    }
  }, [])

  // Loop de análise (câmera real ou simulada). Recriado quando `saving` volta a false.
  useEffect(() => {
    if (saving) return
    const viewSize = () => (sizeRef.current.width ? sizeRef.current : null)
    if (mode === 'simulated') return startSimulatedFace({ viewSize, onUpdate: setUpdate, onCaptured: handleCaptured })
    if (mode !== 'camera' || !videoRef.current) return
    let stop: (() => void) | null = null
    let cancelled = false
    loadFaceDetector()
      .then((detector) => {
        if (cancelled || !videoRef.current) return
        stop = startFaceAnalyzer({ detector, video: videoRef.current, viewSize, onUpdate: setUpdate, onCaptured: handleCaptured })
      })
      .catch(() => !cancelled && setError('Não foi possível carregar o detector facial'))
    return () => {
      cancelled = true
      stop?.()
    }
  }, [mode, saving, handleCaptured])

  const simulate = () => {
    stopStream()
    setError(null)
    setMode('simulated')
  }

  const showCamera = mode === 'camera' || mode === 'simulated' || mode === 'starting'
  const hint = hintFor(update.state, update.holdProgress, saving, error)
  const positioned = saving || update.state === 'OK'

  return (
    <PosScreen title={props.title} subtitle={props.subtitle} onBack={saving ? undefined : props.onBack} flow={props.flow}>
      <AnimatePresence mode="wait">
        {showCamera ? (
          <motion.div
            key="cam"
            className="camera-box"
            ref={boxRef}
            initial={{ opacity: 0, scale: 0.94, borderRadius: 60 }}
            animate={{ opacity: 1, scale: 1, borderRadius: 28 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={softSpring}
          >
            {mode === 'camera' && <video ref={videoRef} className="camera-video" playsInline muted autoPlay />}
            {mode === 'simulated' && <SimulatedBackdrop face={update.faceInView} />}
            {mode === 'starting' && (
              <motion.div className="camera-starting" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>
                <CameraIcon size={44} />
                <span className="t-body-l">Abrindo câmera…</span>
              </motion.div>
            )}
            <FaceFrame
              width={size.width}
              height={size.height}
              state={update.state}
              holdProgress={saving ? 1 : update.holdProgress}
              face={update.faceInView}
              captured={saving}
              debug={debug}
            />
            <AnimatePresence>
              {thumb && (
                <motion.img
                  key="thumb"
                  src={thumb}
                  alt="Rosto capturado"
                  className="camera-thumb"
                  initial={{ scale: 2.4, opacity: 0, y: 0, borderRadius: '50%' }}
                  animate={{ scale: [2.4, 1, 1], opacity: [0, 1, 1], y: [0, 0, -size.height / 2 + 30], borderRadius: '50%' }}
                  transition={{ duration: 0.95, times: [0, 0.45, 1], ease: 'easeInOut' }}
                />
              )}
            </AnimatePresence>
            <div className="camera-hint-wrap">
              <CameraHint text={hint} kind={saving ? 'saving' : error ? 'error' : update.state} positive={positioned && !error} />
            </div>
            {demo && mode === 'camera' && !saving && (
              <motion.button
                type="button"
                className="sim-chip"
                onClick={simulate}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.94 }}
              >
                Simular rosto
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="perm"
            className="permission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={softSpring}
          >
            <div className="spacer" />
            <motion.div
              className="permission-icon"
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              <FaceScanIcon size={64} />
            </motion.div>
            <p className="t-title-m center">
              {mode === 'denied'
                ? 'Precisamos da câmera para reconhecer o rosto.'
                : 'Nenhuma câmera disponível neste dispositivo.'}
            </p>
            {mode === 'denied' && (
              <p className="t-body-m muted center">Libere o acesso à câmera nas permissões do navegador e tente de novo.</p>
            )}
            <div className="spacer" />
            <ButtonBar>
              <PrimaryButton onClick={requestCamera}>Permitir câmera</PrimaryButton>
              {demo && <SecondaryButton onClick={simulate}>Simular rosto (demo)</SecondaryButton>}
            </ButtonBar>
          </motion.div>
        )}
      </AnimatePresence>
      {showCamera && (
        <motion.p
          className="t-body-l muted center camera-caption"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Olhe para a câmera e mantenha o rosto dentro da moldura
        </motion.p>
      )}
    </PosScreen>
  )
}

/** Fundo do modo simulado: um "rosto" desenhado acompanhando a caixa simulada. */
function SimulatedBackdrop({ face }: { face: Box | null }) {
  return (
    <div className="sim-backdrop">
      <AnimatePresence>
        {face && (
          <motion.div
            key="sim-face"
            className="sim-face"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: face.left,
              top: face.top,
              width: face.right - face.left,
              height: face.bottom - face.top,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 16 }}
          >
            <span className="sim-eye" style={{ left: '30%' }} />
            <span className="sim-eye" style={{ right: '30%' }} />
            <span className="sim-mouth" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
