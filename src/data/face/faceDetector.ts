import type { FaceDetector } from '@mediapipe/tasks-vision'

let instance: Promise<FaceDetector> | null = null

/** Carrega o detector BlazeFace uma única vez (lib sob demanda; wasm e modelo servidos de /public). */
export function loadFaceDetector(): Promise<FaceDetector> {
  instance ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks('/mediapipe')
    const create = (delegate: 'GPU' | 'CPU') =>
      FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      })
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
