import { describe, expect, it } from 'vitest'
import { evaluate, largestIndex, toView, type Box } from './faceGuide'

// View 1000x1600 -> elipse 700x933 centrada em (500, 800)
const vw = 1000
const vh = 1600
const faceAt = (cx: number, cy: number, w: number, h = w * 1.2): Box => ({
  left: cx - w / 2,
  top: cy - h / 2,
  right: cx + w / 2,
  bottom: cy + h / 2,
})

describe('faceGuide (FaceGuideTest)', () => {
  it('rosto centralizado e do tamanho certo está OK', () => expect(evaluate(faceAt(500, 800, 450), vw, vh)).toBe('OK'))
  it('rosto deslocado para o lado está fora do centro', () =>
    expect(evaluate(faceAt(780, 800, 450), vw, vh)).toBe('OFF_CENTER'))
  it('rosto deslocado para cima está fora do centro', () =>
    expect(evaluate(faceAt(500, 380, 450), vw, vh)).toBe('OFF_CENTER'))
  it('rosto pequeno está longe', () => expect(evaluate(faceAt(500, 800, 200), vw, vh)).toBe('TOO_FAR'))
  it('rosto maior que a elipse está perto demais', () => expect(evaluate(faceAt(500, 800, 800), vw, vh)).toBe('TOO_CLOSE'))
  it('sem rostos não há maior', () => expect(largestIndex([])).toBeNull())
  it('escolhe o maior rosto mesmo que não seja o primeiro', () =>
    expect(largestIndex([faceAt(200, 300, 150), faceAt(500, 800, 450), faceAt(800, 300, 200)])).toBe(1))
  it('converte imagem para view considerando o corte do cover', () => {
    // Imagem 480x640 numa view 1000x1600: escala = 2.5, sobra 200px na largura (100 de cada lado)
    const v = toView({ left: 240, top: 320, right: 240, bottom: 320 }, 480, 640, vw, vh)
    expect(v.left).toBeCloseTo(500, 2)
    expect(v.top).toBeCloseTo(800, 2)
  })
})
