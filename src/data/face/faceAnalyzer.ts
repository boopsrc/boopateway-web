import type { FaceDetector } from '@mediapipe/tasks-vision'
import { evaluate, largestIndex, toView, type Box, type FaceState } from './faceGuide'
import type { FaceCapture } from '../../domain/types'

export const HOLD_MILLIS = 2_000
const PADDING_RATIO = 0.2
const JPEG_QUALITY = 0.9

/** Estado do rosto + progresso (0..1) do tempo parado na elipse + caixa do rosto na view (espelhada). */
export interface FaceUpdate {
  state: FaceState
  holdProgress: number
  faceInView: Box | null
}

/**
 * Analisa frames do <video> com MediaPipe. Considera apenas o maior rosto e só captura quando
 * ele fica dentro da elipse continuamente por HOLD_MILLIS; qualquer saída zera a contagem.
 * O rosto é recortado (com margem) e entregue como JPG.
 */
export function startFaceAnalyzer(opts: {
  detector: FaceDetector
  video: HTMLVideoElement
  viewSize: () => { width: number; height: number } | null
  onUpdate: (u: FaceUpdate) => void
  onCaptured: (c: FaceCapture) => void
}): () => void {
  const { detector, video, viewSize, onUpdate, onCaptured } = opts
  let stopped = false
  let captured = false
  let okSince: number | null = null
  let lastTs = -1
  let raf = 0

  const tick = () => {
    if (stopped || captured) return
    raf = requestAnimationFrame(tick)
    const size = viewSize()
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!size || !vw || !vh || video.readyState < 2) return
    const ts = performance.now()
    if (ts <= lastTs) return
    lastTs = ts

    const result = detector.detectForVideo(video, ts)
    const boxes: Box[] = []
    for (const d of result.detections) {
      const b = d.boundingBox
      if (b) boxes.push({ left: b.originX, top: b.originY, right: b.originX + b.width, bottom: b.originY + b.height })
    }
    const target = largestIndex(boxes)
    let state: FaceState = 'NONE'
    let faceInView: Box | null = null
    if (target !== null) {
      const v = toView(boxes[target], vw, vh, size.width, size.height)
      // Preview espelhado: inverte o eixo X para que as dicas apontem para o lado certo.
      faceInView = { left: size.width - v.right, right: size.width - v.left, top: v.top, bottom: v.bottom }
      state = evaluate(faceInView, size.width, size.height)
    }
    const now = performance.now()
    let progress = 0
    if (state === 'OK') {
      okSince ??= now
      progress = Math.min(1, (now - okSince) / HOLD_MILLIS)
    } else okSince = null
    onUpdate({ state, holdProgress: progress, faceInView })

    if (target !== null && progress >= 1 && !captured) {
      captured = true
      cropToJpeg(video, boxes[target]).then(onCaptured)
    }
  }
  raf = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(raf)
  }
}

async function cropToJpeg(video: HTMLVideoElement, face: Box): Promise<FaceCapture> {
  const w = face.right - face.left
  const h = face.bottom - face.top
  const dx = w * PADDING_RATIO
  const dy = h * PADDING_RATIO
  const left = Math.max(0, face.left - dx)
  const top = Math.max(0, face.top - dy)
  const right = Math.min(video.videoWidth, face.right + dx)
  const bottom = Math.min(video.videoHeight, face.bottom + dy)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(right - left)
  canvas.height = Math.round(bottom - top)
  canvas.getContext('2d')!.drawImage(video, left, top, right - left, bottom - top, 0, 0, canvas.width, canvas.height)
  return canvasToCapture(canvas)
}

export async function canvasToCapture(canvas: HTMLCanvasElement): Promise<FaceCapture> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar JPG'))), 'image/jpeg', JPEG_QUALITY),
  )
  return { blob, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height }
}
