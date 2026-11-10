import type { FaceDetector } from '@mediapipe/tasks-vision'

let instance: Promise<FaceDetector> | null = null
/** Delegate efetivamente em uso (para o diagnóstico ?debug). */
export let activeDelegate: 'GPU' | 'CPU' | null = null

/**
 * Carrega o detector BlazeFace uma única vez (lib sob demanda; wasm e modelo servidos de /public).
 * Tenta GPU e cai para CPU; `?cpu` na URL força CPU (útil para isolar problemas do GPU).
 */
export function loadFaceDetector(): Promise<FaceDetector> {
  instance ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks('/mediapipe')
    const create = async (delegate: 'GPU' | 'CPU') => {
      const d = await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      })
      activeDelegate = delegate
      return d
    }
    const forceCpu = new URLSearchParams(window.location.search).has('cpu')
    if (forceCpu) return create('CPU')
    try {
      return await create('GPU')
    } catch {
      return await create('CPU')
    }
  })().catch((e) => {
    instance = null
    throw e
  })
  return instance
}
