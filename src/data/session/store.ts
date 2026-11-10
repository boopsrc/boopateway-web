import { create } from 'zustand'
import type { Money } from '../../domain/money'
import type { FaceCapture, PendingPayment, PersonDraft } from '../../domain/types'
import { createRemoteGateway, type FacePayGateway } from '../api/gateway'
import { createMockGateway } from '../api/mockGateway'

const DEMO_KEY = 'facepay.demo'
const readDemo = (): boolean => {
  try {
    const v = localStorage.getItem(DEMO_KEY)
    if (v != null) return v === 'true'
  } catch {
    /* sem storage */
  }
  return import.meta.env.VITE_DEMO === 'true'
}

/** Sessões em memória (equivalentes às InMemory*SessionRepository do Android). */
export interface PaymentSession {
  amount: Money
  face: FaceCapture | null
  createKey: string | null
  pending: PendingPayment | null
  pin: string | null
  confirmKey: string | null
}
export interface RegistrationSession {
  draft: PersonDraft | null
  face: FaceCapture | null
  idempotencyKey: string | null
}
export interface RegisterForm {
  name: string
  email: string
  code: string
}

interface AppState {
  demo: boolean
  payment: PaymentSession
  registration: RegistrationSession
  /** Campos digitados no cadastro: continuam lá ao voltar para "Corrigir dados". */
  form: RegisterForm
  setDemo(v: boolean): void
  setPayment(p: Partial<PaymentSession>): void
  setRegistration(r: Partial<RegistrationSession>): void
  setForm(f: Partial<RegisterForm>): void
}

export const emptyPayment = (): PaymentSession => ({
  amount: 0,
  face: null,
  createKey: null,
  pending: null,
  pin: null,
  confirmKey: null,
})
export const emptyRegistration = (): RegistrationSession => ({ draft: null, face: null, idempotencyKey: null })

export const useAppStore = create<AppState>((set) => ({
  demo: readDemo(),
  payment: emptyPayment(),
  registration: emptyRegistration(),
  form: { name: '', email: '', code: '' },
  setDemo: (demo) => {
    try {
      localStorage.setItem(DEMO_KEY, String(demo))
    } catch {
      /* sem storage */
    }
    set({ demo })
  },
  setPayment: (p) => set((s) => ({ payment: { ...s.payment, ...p } })),
  setRegistration: (r) => set((s) => ({ registration: { ...s.registration, ...r } })),
  setForm: (f) => set((s) => ({ form: { ...s.form, ...f } })),
}))

const remote = createRemoteGateway()
const mock = createMockGateway()
export const gateway = (): FacePayGateway => (useAppStore.getState().demo ? mock : remote)

export const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
