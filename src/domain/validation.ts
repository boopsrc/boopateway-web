import { MAX_CENTS, type Money } from './money'
import type { PersonDraft } from './types'

export const PIN_LENGTH = 4
export const CODE_LENGTH = 4
export const MAX_NAME = 120

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const FOUR_DIGITS = /^[0-9]{4}$/

export type Field = 'name' | 'email' | 'code'
export class ValidationError extends Error {
  constructor(readonly field: Field, message: string) {
    super(message)
  }
}

/** Mesmas regras da API para o cadastro. Devolve o rascunho normalizado ou lança ValidationError. */
export function validateRegistration(name: string, email: string, code: string): PersonDraft {
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  if (!trimmedName || trimmedName.length > MAX_NAME)
    throw new ValidationError('name', `Informe o nome (máx. ${MAX_NAME} caracteres)`)
  if (!EMAIL_REGEX.test(normalizedEmail)) throw new ValidationError('email', 'E-mail inválido')
  if (!FOUR_DIGITS.test(code)) throw new ValidationError('code', 'O código deve ter exatamente 4 dígitos')
  return { name: trimmedName, email: normalizedEmail, code }
}

export function validateAmount(amount: Money): string | null {
  if (amount <= 0) return 'Valor inválido'
  if (amount > MAX_CENTS) return 'Valor acima do limite'
  return null
}

export function validatePin(pin: string): string | null {
  return FOUR_DIGITS.test(pin) ? null : `PIN deve ter ${PIN_LENGTH} dígitos`
}
