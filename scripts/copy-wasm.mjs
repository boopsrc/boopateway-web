// Copia o runtime wasm do MediaPipe para public/, servido localmente (sem CDN).
import { cpSync, mkdirSync } from 'node:fs'
const src = 'node_modules/@mediapipe/tasks-vision/wasm'
const dest = 'public/mediapipe'
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`MediaPipe wasm copiado para ${dest}`)
