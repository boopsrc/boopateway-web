import { validateAmount, validatePin, validateRegistration } from '../../domain/validation'
import { RegistrationError, type FaceCapture, type Person } from '../../domain/types'
import type { Money } from '../../domain/money'
import { emptyPayment, emptyRegistration, gateway, newKey, useAppStore } from './store'

const s = () => useAppStore.getState()

// ---------- Pagamento

/** Valida o valor e inicia uma nova sessão de pagamento. Devolve a mensagem de erro, se houver. */
export function startPayment(amount: Money): string | null {
  const error = validateAmount(amount)
  if (error) return error
  useAppStore.setState({ payment: { ...emptyPayment(), amount } })
  return null
}

/** Nova foto = nova transação: zera a chave de criação e o pendente. */
export function savePaymentFace(face: FaceCapture) {
  s().setPayment({ face, createKey: null, pending: null, pin: null, confirmKey: null })
}

/** Envia valor + foto; a API identifica a pessoa e cria a transação. */
export async function createPayment() {
  const { payment, setPayment } = s()
  if (!payment.face) throw new Error('Rosto não capturado')
  // Mesma chave em retentativas evita cobrança duplicada.
  const key = payment.createKey ?? newKey()
  setPayment({ createKey: key })
  const outcome = await gateway().createPayment(payment.amount, payment.face.blob, key)
  if (outcome.kind === 'pending') setPayment({ pending: outcome.payment })
  return outcome
}

export function submitPin(pin: string): string | null {
  const error = validatePin(pin)
  if (error) return error
  // Cada tentativa de código exige uma Idempotency-Key nova.
  s().setPayment({ pin, confirmKey: newKey() })
  return null
}

export async function confirmPayment() {
  const { pending, pin, confirmKey } = s().payment
  if (!pending) throw new Error('Nenhum pagamento pendente')
  if (!pin || !confirmKey) throw new Error('PIN não informado')
  return gateway().confirmPayment(pending.transactionId, pin, confirmKey)
}

export function resetPayment() {
  useAppStore.setState({ payment: emptyPayment() })
}

// ---------- Cadastro

/** Valida com as mesmas regras da API e inicia o cadastro (lança ValidationError). */
export function startRegistration(name: string, email: string, code: string) {
  const draft = validateRegistration(name, email, code)
  useAppStore.setState({ registration: { ...emptyRegistration(), draft } })
  return draft
}

export function saveRegistrationFace(face: FaceCapture) {
  s().setRegistration({ face })
}

export async function registerPerson(): Promise<Person> {
  const { registration, setRegistration } = s()
  if (!registration.draft) throw new RegistrationError('Dados do cadastro ausentes', false)
  if (!registration.face) throw new RegistrationError('Rosto não capturado', false)
  const key = registration.idempotencyKey ?? newKey()
  setRegistration({ idempotencyKey: key })
  try {
    const person = await gateway().registerPerson(registration.draft, registration.face.blob, key)
    useAppStore.setState({ registration: emptyRegistration(), form: { name: '', email: '', code: '' } })
    return person
  } catch (e) {
    // 4xx fica gravado na chave: a próxima tentativa (após corrigir) precisa de chave nova.
    if (e instanceof RegistrationError && !e.retryable) setRegistration({ idempotencyKey: null })
    throw e
  }
}
