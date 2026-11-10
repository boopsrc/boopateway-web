import { describe, expect, it } from 'vitest'
import { maskEmail } from './emailMasker'
import { ValidationError, validateAmount, validatePin, validateRegistration } from './validation'

describe('maskEmail (EmailMaskerTest)', () => {
  it('mascara mantendo 3 primeiros e último caractere', () =>
    expect(maskEmail('lucas.nepomuceno1999@gmail.com')).toBe('luc***9@gmail.com'))
  it('local curto mantém só o primeiro', () => expect(maskEmail('ana@example.com')).toBe('a***@example.com'))
  it('e-mail já mascarado pela API não muda', () => expect(maskEmail('a***@example.com')).toBe('a***@example.com'))
})

describe('validateRegistration (StartRegistrationUseCaseTest)', () => {
  const fieldOf = (fn: () => unknown) => {
    try {
      fn()
    } catch (e) {
      return (e as ValidationError).field
    }
    return null
  }
  it('normaliza o rascunho', () => {
    const d = validateRegistration('  Ana Souza ', ' Ana@Example.com ', '1234')
    expect(d.name).toBe('Ana Souza')
    expect(d.email).toBe('ana@example.com')
  })
  it('valida nome, e-mail e código', () => {
    expect(fieldOf(() => validateRegistration(' ', 'ana@example.com', '1234'))).toBe('name')
    expect(fieldOf(() => validateRegistration('Ana', 'ana@', '1234'))).toBe('email')
    expect(fieldOf(() => validateRegistration('Ana', 'ana@example.com', '12a4'))).toBe('code')
  })
})

describe('valor e PIN', () => {
  it('valor precisa ser positivo e dentro do limite', () => {
    expect(validateAmount(0)).toBe('Valor inválido')
    expect(validateAmount(100_000_000)).toBe('Valor acima do limite')
    expect(validateAmount(1990)).toBeNull()
  })
  it('PIN precisa de 4 dígitos', () => {
    expect(validatePin('123')).not.toBeNull()
    expect(validatePin('12a4')).not.toBeNull()
    expect(validatePin('1234')).toBeNull()
  })
})
