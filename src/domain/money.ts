/** Valor monetário em centavos (evita erros de ponto flutuante). */
export type Money = number

export const MAX_CENTS = 99_999_999

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatMoney = (cents: Money): string => brl.format(cents / 100)
