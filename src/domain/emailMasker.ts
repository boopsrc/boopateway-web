/** Mascara o e-mail: lucas.nepomuceno1999@gmail.com -> luc***9@gmail.com */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at <= 0 || email.includes('*')) return email // inválido ou já mascarado pela API
  const local = email.slice(0, at)
  const masked = local.length <= 3 ? `${local[0]}***` : `${local.slice(0, 3)}***${local[local.length - 1]}`
  return masked + email.slice(at)
}
