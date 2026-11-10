import { maskEmail } from '../../domain/emailMasker'
import { RegistrationError, type PaymentResult } from '../../domain/types'
import type { FacePayGateway } from './gateway'

/** PIN aceito no modo demo. */
export const DEMO_PIN = '1234'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Gateway simulado no navegador (modo demo): mesmas regras da API real —
 * 3 tentativas de PIN, e-mail duplicado não retentável, chave de idempotência reaproveitada.
 */
export function createMockGateway(): FacePayGateway {
  const persons = new Map<string, { id: number; name: string; email: string; code: string }>([
    ['cliente.demo@facepay.dev', { id: 1, name: 'Cliente Demo', email: 'cliente.demo@facepay.dev', code: DEMO_PIN }],
  ])
  const tx = new Map<string, { amount: number; code: string; personName: string; attempts: number; status: string }>()
  const confirmByKey = new Map<string, PaymentResult>()
  let lastPerson = persons.get('cliente.demo@facepay.dev')!
  let seq = 1

  return {
    async createPayment(amount) {
      await wait(1800)
      const id = `txn_demo_${Date.now().toString(36)}`
      tx.set(id, { amount, code: lastPerson.code, personName: lastPerson.name, attempts: 3, status: 'pending_confirmation' })
      return {
        kind: 'pending',
        payment: { transactionId: id, amount, personName: lastPerson.name, maskedEmail: maskEmail(lastPerson.email) },
      }
    },

    async confirmPayment(transactionId, code, key) {
      await wait(1400)
      const cached = confirmByKey.get(key)
      if (cached) return cached
      const t = tx.get(transactionId)
      let result: PaymentResult
      if (!t) result = { kind: 'declined', reason: 'Transação inexistente' }
      else if (t.status !== 'pending_confirmation') result = { kind: 'declined', reason: 'transação não está pendente de confirmação' }
      else if (code === t.code) {
        t.status = 'confirmed'
        result = { kind: 'approved', transactionId, amount: t.amount, personName: t.personName }
      } else {
        t.attempts -= 1
        if (t.attempts <= 0) {
          t.status = 'cancel_invalid_code'
          result = { kind: 'declined', reason: 'Código inválido. Pagamento cancelado após 3 tentativas.' }
        } else result = { kind: 'invalidCode', remainingAttempts: t.attempts }
      }
      confirmByKey.set(key, result)
      return result
    },

    async registerPerson(draft) {
      await wait(2200)
      if (persons.has(draft.email)) throw new RegistrationError('email já cadastrado', false)
      const person = { id: ++seq, ...draft }
      persons.set(draft.email, person)
      // O próximo pagamento no demo "reconhece" a última pessoa cadastrada.
      lastPerson = person
      return { id: person.id, name: person.name, maskedEmail: maskEmail(person.email) }
    },
  }
}
