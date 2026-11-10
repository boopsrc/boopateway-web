import { maskEmail } from '../../domain/emailMasker'
import type { Money } from '../../domain/money'
import {
  PaymentError,
  RegistrationError,
  type CreatePaymentOutcome,
  type PaymentResult,
  type Person,
  type PersonDraft,
} from '../../domain/types'
import { HttpError, IDEMPOTENCY_KEY, NetworkError, createHttp, type FetchFn } from './http'

/** Endpoints do gateway usados pelo POS: cadastro de pessoa e pagamento. */
export interface FacePayGateway {
  createPayment(amount: Money, image: Blob, idempotencyKey: string): Promise<CreatePaymentOutcome>
  confirmPayment(transactionId: string, code: string, idempotencyKey: string): Promise<PaymentResult>
  registerPerson(draft: PersonDraft, image: Blob, idempotencyKey: string): Promise<Person>
}

interface PaymentDto {
  transaction_id: string
  amount_cents: number
  status: string
  person_name?: string | null
  person_id?: number | null
  person_email?: string | null
}
interface PersonDto {
  id: number
  name: string
  email: string
}

export const PaymentStatus = {
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  CANCEL_NOT_FOUND: 'cancel_notfound',
  CANCEL_INVALID_CODE: 'cancel_invalid_code',
} as const

const NO_CONNECTION = 'Sem conexão com o servidor'

function toPaymentError(e: unknown): Error {
  if (e instanceof HttpError) {
    const message =
      e.body?.error ??
      (e.status === 502
        ? 'Serviço de reconhecimento facial indisponível'
        : e.status >= 500
          ? 'Erro no servidor. Tente novamente.'
          : `Erro ${e.status}`)
    return new PaymentError(message)
  }
  if (e instanceof NetworkError) return new PaymentError(NO_CONNECTION)
  return e as Error
}

function toRegistrationError(e: unknown): Error {
  if (e instanceof NetworkError) return new RegistrationError(NO_CONNECTION, true)
  if (!(e instanceof HttpError)) return e as Error
  const apiMessage = e.body?.error
  const code = e.status
  const message =
    code === 502
      ? (apiMessage ?? 'Serviço de reconhecimento facial indisponível')
      : code === 413
        ? 'Imagem muito grande'
        : code >= 500
          ? (apiMessage ?? 'Erro no servidor. Tente novamente.')
          : (apiMessage ?? `Erro ${code}`)
  // 5xx libera a chave no servidor; 409 "em processamento" também pode ser repetido.
  const retryable = code >= 500 || (code === 409 && !!apiMessage?.includes('processamento'))
  return new RegistrationError(message, retryable)
}

export function createRemoteGateway(baseUrl = '/api', fetchFn?: FetchFn): FacePayGateway {
  const request = createHttp(baseUrl, fetchFn)

  /** O POST /payments só traz o nome; o e-mail vem de campos opcionais ou de GET /persons/{id}. */
  async function resolveMaskedEmail(dto: PaymentDto): Promise<string | null> {
    let email = dto.person_email ?? null
    if (!email && dto.person_id != null) {
      email = await request<PersonDto>(`/persons/${dto.person_id}`, { method: 'GET' })
        .then((p) => p.email)
        .catch(() => null)
    }
    return email ? maskEmail(email) : null
  }

  return {
    async createPayment(amount, image, key) {
      const form = new FormData()
      form.append('amount_cents', String(amount))
      form.append('image', image, 'face.jpg')
      let dto: PaymentDto
      try {
        dto = await request<PaymentDto>('/payments', { method: 'POST', headers: { [IDEMPOTENCY_KEY]: key }, body: form })
      } catch (e) {
        throw toPaymentError(e)
      }
      switch (dto.status) {
        case PaymentStatus.PENDING_CONFIRMATION:
          return {
            kind: 'pending',
            payment: {
              transactionId: dto.transaction_id,
              amount: dto.amount_cents,
              personName: dto.person_name ?? '',
              maskedEmail: await resolveMaskedEmail(dto),
            },
          }
        case PaymentStatus.CANCEL_NOT_FOUND:
          return { kind: 'notRecognized', transactionId: dto.transaction_id }
        default:
          throw new PaymentError(`Status inesperado: ${dto.status}`)
      }
    },

    async confirmPayment(transactionId, code, key) {
      try {
        const dto = await request<PaymentDto>(`/payments/${encodeURIComponent(transactionId)}/confirm`, {
          method: 'POST',
          headers: { [IDEMPOTENCY_KEY]: key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        return dto.status === PaymentStatus.CONFIRMED
          ? { kind: 'approved', transactionId: dto.transaction_id, amount: dto.amount_cents, personName: dto.person_name ?? null }
          : { kind: 'declined', reason: `Status inesperado: ${dto.status}` }
      } catch (e) {
        if (e instanceof HttpError) {
          const body = e.body
          if (e.status === 422 && body?.remaining_attempts != null) {
            return body.status === PaymentStatus.CANCEL_INVALID_CODE || body.remaining_attempts <= 0
              ? { kind: 'declined', reason: 'Código inválido. Pagamento cancelado após 3 tentativas.' }
              : { kind: 'invalidCode', remainingAttempts: body.remaining_attempts }
          }
          // 404 transação inexistente / 409 transação não pendente: resultados finais.
          if (e.status === 404 || e.status === 409) return { kind: 'declined', reason: body?.error ?? 'Transação indisponível' }
        }
        throw toPaymentError(e)
      }
    },

    async registerPerson(draft, image, key) {
      const form = new FormData()
      form.append('name', draft.name)
      form.append('email', draft.email)
      form.append('code', draft.code)
      form.append('image', image, 'face.jpg')
      try {
        const dto = await request<PersonDto>('/persons', { method: 'POST', headers: { [IDEMPOTENCY_KEY]: key }, body: form })
        return { id: dto.id, name: dto.name, maskedEmail: maskEmail(dto.email) }
      } catch (e) {
        throw toRegistrationError(e)
      }
    },
  }
}
