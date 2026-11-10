import { useEffect, useRef } from 'react'
import type { RawDetections } from '../../data/face/faceAnalyzer'
import { activeDelegate } from '../../data/face/faceDetector'

const INSET_W = 190

/**
 * Diagnóstico (?debug): miniatura do quadro BRUTO que vai para o detector (sem espelhar, sem
 * corte), com todas as caixas detectadas, score e keypoints; mais as medidas do mapeamento
 * quadro -> tela e o estilo realmente aplicado ao <video>.
 */
export function DebugInset(props: {
  video: HTMLVideoElement | null
  raw: RawDetections | undefined
  view: { width: number; height: number }
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { video, raw, view } = props

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !video || !raw) return
    const k = INSET_W / raw.videoWidth
    c.width = INSET_W
    c.height = Math.round(raw.videoHeight * k)
    const g = c.getContext('2d')!
    g.drawImage(video, 0, 0, c.width, c.height)
    raw.detections.forEach((d, i) => {
      const chosen = i === raw.target
      g.strokeStyle = chosen ? '#4ade80' : '#facc15'
      g.lineWidth = chosen ? 2 : 1
      g.strokeRect(d.box.left * k, d.box.top * k, (d.box.right - d.box.left) * k, (d.box.bottom - d.box.top) * k)
      g.fillStyle = '#f472b6'
      d.keypoints.forEach((p) => g.fillRect(p.x * c.width - 1.5, p.y * c.height - 1.5, 3, 3))
      g.fillStyle = '#fff'
      g.font = '10px monospace'
      g.fillText(d.score.toFixed(2), d.box.left * k + 2, d.box.top * k + 10)
    })
  }, [video, raw])

  if (!raw) return null
  const s = Math.max(view.width / raw.videoWidth, view.height / raw.videoHeight)
  const dx = (raw.videoWidth * s - view.width) / 2
  const dy = (raw.videoHeight * s - view.height) / 2
  const vr = video?.getBoundingClientRect()
  const t = raw.target !== null ? raw.detections[raw.target] : null
  const lines = [
    `delegate=${activeDelegate} faces=${raw.detections.length}`,
    `video=${raw.videoWidth}x${raw.videoHeight} view=${Math.round(view.width)}x${Math.round(view.height)}`,
    `scale=${s.toFixed(3)} dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}`,
    `preview=canvas (cover+espelho) fonte=${vr ? `${Math.round(vr.width)}x${Math.round(vr.height)}` : '?'} ${video?.paused ? 'PAUSADO' : 'tocando'}`,
    t
      ? `alvo bruto=(${Math.round(t.box.left)},${Math.round(t.box.top)}) ${Math.round(t.box.right - t.box.left)}x${Math.round(t.box.bottom - t.box.top)}`
      : 'alvo bruto=nenhum',
  ]
  return (
    <div className="debug-inset">
      <canvas ref={canvasRef} />
      <pre>{lines.join('\n')}</pre>
    </div>
  )
}
