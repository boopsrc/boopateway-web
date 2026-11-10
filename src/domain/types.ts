import type { Money } from './money'

/** Recorte JPG do rosto capturado. */
export interface FaceCapture {
  blob: Blob
  url: string
  width: number
  height: number
}

export interface PendingPayment {
  transactionId: string
  amount: Money
  personName: string
  maskedEmail: string | null
}

export type CreatePaymentOutcome =
  | { kind: 'pending'; payment: PendingPayment }
  /** A foto não foi reconhecida (status cancel_notfound). Estado final. */
  | { kind: 'notRecognized'; transactionId: string }

export type PaymentResult =
  | { kind: 'approved'; transactionId: string; amount: Money; personName: string | null }
  /** Código errado, mas a transação continua pendente. */
  | { kind: 'invalidCode'; remainingAttempts: number }
  | { kind: 'declined'; reason: string }

export interface PersonDraft {
  name: string
  email: string
  code: string
}

export interface Person {
  id: number
  name: string
  maskedEmail: string
}

export class PaymentError extends Error {}

/** [retryable]: reenviar pode funcionar (rede/5xx). 4xx exige corrigir os dados. */
export class RegistrationError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message)
  }
}
