import { ellipse, evaluate, type Box, type FaceState } from './faceGuide'
import { HOLD_MILLIS, canvasToCapture, type FaceUpdate } from './faceAnalyzer'
import type { FaceCapture } from '../../domain/types'

/**
 * Modo demo sem câmera: simula um rosto que se aproxima, passa do ponto, sai do centro e
 * por fim fica parado na elipse — percorre todos os estados da guia sem precisar de webcam.
 */
export function startSimulatedFace(opts: {
  viewSize: () => { width: number; height: number } | null
  onUpdate: (u: FaceUpdate) => void
  onCaptured: (c: FaceCapture) => void
}): () => void {
  const start = performance.now()
  let raf = 0
  let okSince: number | null = null
  let done = false
  const make = (cx: number, cy: number, w: number): Box => ({
    left: cx - w / 2,
    right: cx + w / 2,
    top: cy - w * 0.6,
    bottom: cy + w * 0.6,
  })
  const tick = () => {
    if (done) return
    raf = requestAnimationFrame(tick)
    const size = opts.viewSize()
    if (!size) return
    const t = (performance.now() - start) / 1000
    const e = ellipse(size.width, size.height)
    const ew = e.right - e.left
    const cx = (e.left + e.right) / 2
    const cy = (e.top + e.bottom) / 2
    let face: Box | null = null
    if (t < 1.5) face = null
    else if (t < 3.2) face = make(cx, cy, ew * 0.3)
    else if (t < 4.9) face = make(cx, cy, ew * 1.15)
    else if (t < 6.6) face = make(cx + ew * 0.45, cy - ew * 0.2, ew * 0.65)
    else face = make(cx, cy, ew * 0.65)
    const state: FaceState = face ? evaluate(face, size.width, size.height) : 'NONE'
    const now = performance.now()
    let progress = 0
    if (state === 'OK') {
      okSince ??= now
      progress = Math.min(1, (now - okSince) / HOLD_MILLIS)
    } else okSince = null
    opts.onUpdate({ state, holdProgress: progress, faceInView: face })
    if (progress >= 1) {
      done = true
      drawAvatar().then(opts.onCaptured)
    }
  }
  raf = requestAnimationFrame(tick)
  return () => {
    done = true
    cancelAnimationFrame(raf)
  }
}

function drawAvatar(): Promise<FaceCapture> {
  const c = document.createElement('canvas')
  c.width = 320
  c.height = 400
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 320, 400)
  grad.addColorStop(0, '#004F51')
  grad.addColorStop(1, '#6FD8D9')
  g.fillStyle = grad
  g.fillRect(0, 0, 320, 400)
  g.fillStyle = '#F4D3B5'
  g.beginPath()
  g.ellipse(160, 200, 95, 125, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#2B1D14'
  g.beginPath()
  g.ellipse(160, 110, 100, 55, 0, Math.PI, 0)
  g.fill()
  g.fillStyle = '#1E2B2B'
  for (const x of [125, 195]) {
    g.beginPath()
    g.arc(x, 190, 9, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = '#A0522D'
  g.lineWidth = 6
  g.lineCap = 'round'
  g.beginPath()
  g.arc(160, 240, 35, 0.15 * Math.PI, 0.85 * Math.PI)
  g.stroke()
  return canvasToCapture(c)
}
