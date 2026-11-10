import type { FaceDetector } from '@mediapipe/tasks-vision'
import { coverSource, evaluate, faceShapedBox, largestIndex, mirrorX, toView, type Box, type FaceState } from './faceGuide'

/**
 * Desenha o quadro da câmera no canvas do preview: recorte "cover" + espelho, com exatamente a
 * mesma conta usada para posicionar as caixas (coverSource/toView + mirrorX). Assim o preview
 * não depende de CSS (object-fit/transform) e a caixa sempre cai em cima do rosto.
 */
export function drawMirroredPreview(canvas: HTMLCanvasElement, video: HTMLVideoElement, width: number, height: number) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh || !width || !height || video.readyState < 2) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cw = Math.round(width * dpr)
  const ch = Math.round(height * dpr)
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw
    canvas.height = ch
  }
  const g = canvas.getContext('2d')
  if (!g) return
  const { sx, sy, sw, sh } = coverSource(vw, vh, width, height)
  g.setTransform(-dpr, 0, 0, dpr, cw, 0) // espelho horizontal + escala do dpr
  g.drawImage(video, sx, sy, sw, sh, 0, 0, width, height)
}
import type { FaceCapture } from '../../domain/types'

export const HOLD_MILLIS = 2_000
const PADDING_RATIO = 0.2
const JPEG_QUALITY = 0.9

/** Estado do rosto + progresso (0..1) do tempo parado na elipse + caixa do rosto na view (espelhada). */
export interface FaceUpdate {
  state: FaceState
  holdProgress: number
  faceInView: Box | null
  /** Dados brutos do detector (para o diagnóstico ?debug). */
  raw?: RawDetections
}

export interface RawDetections {
  videoWidth: number
  videoHeight: number
  /** Caixas em pixels do quadro bruto (sem espelhar), keypoints normalizados 0..1. */
  detections: { box: Box; score: number; keypoints: { x: number; y: number }[] }[]
  target: number | null
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
    const raw: RawDetections = { videoWidth: vw, videoHeight: vh, detections: [], target: null }
    for (const d of result.detections) {
      const b = d.boundingBox
      if (!b) continue
      const box = { left: b.originX, top: b.originY, right: b.originX + b.width, bottom: b.originY + b.height }
      boxes.push(box)
      raw.detections.push({ box, score: d.categories[0]?.score ?? 0, keypoints: d.keypoints.map((k) => ({ x: k.x, y: k.y })) })
    }
    const target = largestIndex(boxes)
    raw.target = target
    let state: FaceState = 'NONE'
    let faceInView: Box | null = null
    if (target !== null) {
      // Caixa quadrada do BlazeFace -> formato de rosto, para valer a mesma regra do Android.
      const v = toView(faceShapedBox(boxes[target]), vw, vh, size.width, size.height)
      // Preview espelhado (desenhado por drawMirroredPreview com a mesma conta).
      faceInView = mirrorX(v, size.width)
      state = evaluate(faceInView, size.width, size.height)
    }
    const now = performance.now()
    let progress = 0
    if (state === 'OK') {
      okSince ??= now
      progress = Math.min(1, (now - okSince) / HOLD_MILLIS)
    } else okSince = null
    onUpdate({ state, holdProgress: progress, faceInView, raw })

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
