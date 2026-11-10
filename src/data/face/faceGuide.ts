/**
 * Geometria da elipse-guia desenhada sobre o preview e a regra que decide se o rosto
 * está corretamente posicionado dentro dela (porta do FaceGuide.kt).
 *
 * O vídeo usa object-fit: cover — a imagem é escalada até cobrir a view e o excesso é cortado.
 * O espelhamento da câmera frontal não importa porque a elipse é simétrica no eixo vertical.
 */
export type FaceState = 'NONE' | 'TOO_FAR' | 'TOO_CLOSE' | 'OFF_CENTER' | 'OK'

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export const boxWidth = (b: Box) => b.right - b.left
export const boxHeight = (b: Box) => b.bottom - b.top
export const centerX = (b: Box) => (b.left + b.right) / 2
export const centerY = (b: Box) => (b.top + b.bottom) / 2

/** Largura da elipse em relação à largura da view. */
export const WIDTH_FRACTION = 0.7
/** Largura / altura da elipse. */
export const ASPECT_RATIO = 0.75
/** A elipse nunca ocupa mais que esta fração da altura (views largas, ex.: desktop). */
const MAX_HEIGHT_FRACTION = 0.82
const MIN_FACE_FILL = 0.45
const MAX_FACE_FILL = 1.0
const EDGE_TOLERANCE = 1.05

export function ellipse(viewWidth: number, viewHeight: number): Box {
  let w = viewWidth * WIDTH_FRACTION
  let h = w / ASPECT_RATIO
  if (h > viewHeight * MAX_HEIGHT_FRACTION) {
    h = viewHeight * MAX_HEIGHT_FRACTION
    w = h * ASPECT_RATIO
  }
  const cx = viewWidth / 2
  const cy = viewHeight / 2
  return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 }
}

/** Largura / altura típica de um rosto (testa ao queixo), como a caixa do ML Kit no Android. */
export const FACE_ASPECT = 0.8

/**
 * O BlazeFace (MediaPipe) devolve caixas QUADRADAS, com lado ≈ altura do rosto. As regras de
 * tamanho vieram do Android (ML Kit), cuja caixa acompanha o formato do rosto (mais estreita).
 * Comparar a caixa quadrada com a largura da elipse superestima o rosto em ~25% e dá
 * "afaste-se" com o rosto bem enquadrado. Aqui a caixa vira uma caixa com formato de rosto,
 * mesma altura e mesmo centro.
 */
export function faceShapedBox(square: Box): Box {
  const w = boxHeight(square) * FACE_ASPECT
  const cx = centerX(square)
  return { left: cx - w / 2, right: cx + w / 2, top: square.top, bottom: square.bottom }
}

/** Índice do maior rosto (por área), ou null se a lista estiver vazia. */
export function largestIndex(faces: Box[]): number | null {
  if (faces.length === 0) return null
  let best = 0
  faces.forEach((f, i) => {
    if (boxWidth(f) * boxHeight(f) > boxWidth(faces[best]) * boxHeight(faces[best])) best = i
  })
  return best
}

/**
 * Recorte do quadro (em pixels do quadro) que aparece na view com "cover": inverso exato de
 * [toView]. O preview é desenhado com este recorte, então imagem e caixas usam a mesma conta.
 */
export function coverSource(imageWidth: number, imageHeight: number, viewWidth: number, viewHeight: number) {
  const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight)
  const sw = viewWidth / scale
  const sh = viewHeight / scale
  return { sx: (imageWidth - sw) / 2, sy: (imageHeight - sh) / 2, sw, sh, scale }
}

/** Espelha uma caixa da view no eixo vertical (preview tipo "selfie"). */
export const mirrorX = (b: Box, viewWidth: number): Box => ({
  left: viewWidth - b.right,
  right: viewWidth - b.left,
  top: b.top,
  bottom: b.bottom,
})

export function toView(face: Box, imageWidth: number, imageHeight: number, viewWidth: number, viewHeight: number): Box {
  const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight)
  const dx = (imageWidth * scale - viewWidth) / 2
  const dy = (imageHeight * scale - viewHeight) / 2
  return {
    left: face.left * scale - dx,
    top: face.top * scale - dy,
    right: face.right * scale - dx,
    bottom: face.bottom * scale - dy,
  }
}

/** <= 1 quando o ponto está dentro da elipse. */
function normalizedDistance(x: number, y: number, e: Box): number {
  const nx = (x - centerX(e)) / (boxWidth(e) / 2)
  const ny = (y - centerY(e)) / (boxHeight(e) / 2)
  return nx * nx + ny * ny
}

/** Classifica o rosto (já em coordenadas da view) em relação à elipse. */
export function evaluate(face: Box, viewWidth: number, viewHeight: number): FaceState {
  const e = ellipse(viewWidth, viewHeight)
  const fill = boxWidth(face) / boxWidth(e)
  if (fill < MIN_FACE_FILL) return 'TOO_FAR'
  // Mais alto que a elipse também é perto demais (senão a dica seria "centralize").
  if (fill > MAX_FACE_FILL || boxHeight(face) > boxHeight(e)) return 'TOO_CLOSE'
  const points: [number, number][] = [
    [centerX(face), centerY(face)],
    [face.left, centerY(face)],
    [face.right, centerY(face)],
    [centerX(face), face.top],
    [centerX(face), face.bottom],
  ]
  const inside = points.every(([x, y]) => normalizedDistance(x, y, e) <= EDGE_TOLERANCE)
  return inside ? 'OK' : 'OFF_CENTER'
}
