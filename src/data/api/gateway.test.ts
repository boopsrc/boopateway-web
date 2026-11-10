import { beforeEach, describe, expect, it } from 'vitest'
import { PaymentError, RegistrationError } from '../../domain/types'
import { createRemoteGateway } from './gateway'

/** Servidor falso: fila de respostas + registro das requisições (equivalente ao MockWebServer). */
function fakeServer() {
  const queue: (Response | Error)[] = []
  const requests: { url: string; init: RequestInit }[] = []
  const fetchFn = (async (url: string, init: RequestInit) => {
    requests.push({ url, init })
    const next = queue.shift()
    if (!next) throw new Error('sem resposta enfileirada')
    if (next instanceof Error) throw next
    return next
  }) as unknown as typeof fetch
  return {
    fetchFn,
    requests,
    enqueue: (status: number, body: string) => queue.push(new Response(body, { status })),
    fail: () => queue.push(new TypeError('Failed to fetch')),
  }
}

const image = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name]

describe('pagamento (RemotePaymentRepositoryTest)', () => {
  let server: ReturnType<typeof fakeServer>
  let gw: ReturnType<typeof createRemoteGateway>
  beforeEach(() => {
    server = fakeServer()
    gw = createRemoteGateway('', server.fetchFn)
  })

  it('cria pagamento pendente enviando multipart e idempotency key', async () => {
    server.enqueue(201, '{"transaction_id":"txn_1","amount_cents":1990,"status":"pending_confirmation","person_name":"Ana Souza"}')
    const outcome = await gw.createPayment(1990, image, 'key-1')
    expect(outcome.kind).toBe('pending')
    if (outcome.kind !== 'pending') return
    expect(outcome.payment.transactionId).toBe('txn_1')
    expect(outcome.payment.personName).toBe('Ana Souza')
    const req = server.requests[0]
    expect(req.url).toBe('/payments')
    expect(header(req.init, 'Idempotency-Key')).toBe('key-1')
    const form = req.init.body as FormData
    expect(form.get('amount_cents')).toBe('1990')
    expect((form.get('image') as File).name).toBe('face.jpg')
  })

  it('busca e-mail da pessoa quando a API devolve person_id', async () => {
    server.enqueue(201, '{"transaction_id":"txn_1","amount_cents":1990,"status":"pending_confirmation","person_name":"Lucas","person_id":7}')
    server.enqueue(200, '{"id":7,"name":"Lucas","email":"lucas.nepomuceno1999@gmail.com"}')
    const outcome = await gw.createPayment(1990, image, 'k')
    expect(outcome.kind === 'pending' && outcome.payment.maskedEmail).toBe('luc***9@gmail.com')
    expect(server.requests[1].url).toBe('/persons/7')
  })

  it('rosto não encontrado', async () => {
    server.enqueue(201, '{"transaction_id":"txn_2","amount_cents":1990,"status":"cancel_notfound"}')
    expect((await gw.createPayment(1990, image, 'k')).kind).toBe('notRecognized')
  })

  it('502 vira PaymentError', async () => {
    server.enqueue(502, '{"error":"falha ao comunicar com o serviço de reconhecimento facial"}')
    await expect(gw.createPayment(1990, image, 'k')).rejects.toBeInstanceOf(PaymentError)
  })

  it('sem rede vira "Sem conexão com o servidor"', async () => {
    server.fail()
    await expect(gw.createPayment(1990, image, 'k')).rejects.toThrow('Sem conexão com o servidor')
  })

  it('confirmação aprovada', async () => {
    server.enqueue(200, '{"transaction_id":"txn_1","amount_cents":1990,"status":"confirmed","person_name":"Ana"}')
    const result = await gw.confirmPayment('txn_1', '1234', 'k')
    expect(result.kind).toBe('approved')
    expect(server.requests[0].init.body).toBe('{"code":"1234"}')
    expect(server.requests[0].url).toBe('/payments/txn_1/confirm')
  })

  it('código inválido com tentativas restantes', async () => {
    server.enqueue(422, '{"error":"código inválido","status":"pending_confirmation","remaining_attempts":2}')
    expect(await gw.confirmPayment('txn_1', '0000', 'k')).toEqual({ kind: 'invalidCode', remainingAttempts: 2 })
  })

  it('terceiro código inválido cancela', async () => {
    server.enqueue(422, '{"error":"código inválido","status":"cancel_invalid_code","remaining_attempts":0}')
    expect((await gw.confirmPayment('txn_1', '0000', 'k')).kind).toBe('declined')
  })

  it('transação não pendente', async () => {
    server.enqueue(409, '{"error":"transação não está pendente de confirmação"}')
    expect(await gw.confirmPayment('txn_1', '1234', 'k')).toEqual({
      kind: 'declined',
      reason: 'transação não está pendente de confirmação',
    })
  })
})

describe('cadastro (RemotePersonRepositoryTest)', () => {
  const draft = { name: 'Ana Souza', email: 'ana@example.com', code: '1234' }

  it('cadastra enviando todos os campos multipart', async () => {
    const server = fakeServer()
    server.enqueue(201, '{"id":1,"name":"Ana Souza","email":"a***@example.com","created_at":"2026-10-17T19:37:57.639Z"}')
    const person = await createRemoteGateway('', server.fetchFn).registerPerson(draft, image, 'key-1')
    expect(person).toEqual({ id: 1, name: 'Ana Souza', maskedEmail: 'a***@example.com' })
    const req = server.requests[0]
    expect(req.url).toBe('/persons')
    expect(header(req.init, 'Idempotency-Key')).toBe('key-1')
    const form = req.init.body as FormData
    for (const f of ['name', 'email', 'code']) expect(form.get(f)).toBe(draft[f as keyof typeof draft])
    const file = form.get('image') as File
    expect(file.name).toBe('face.jpg')
    expect(file.type).toBe('image/jpeg')
  })

  it('e-mail duplicado não é retentável', async () => {
    const server = fakeServer()
    server.enqueue(409, '{"error":"email já cadastrado"}')
    const err = await createRemoteGateway('', server.fetchFn).registerPerson(draft, image, 'k').catch((e) => e)
    expect(err).toBeInstanceOf(RegistrationError)
    expect(err.message).toBe('email já cadastrado')
    expect(err.retryable).toBe(false)
  })

  it('502 é retentável', async () => {
    const server = fakeServer()
    server.enqueue(502, '{"error":"falha ao comunicar com o serviço de reconhecimento facial"}')
    const err = await createRemoteGateway('', server.fetchFn).registerPerson(draft, image, 'k').catch((e) => e)
    expect(err.retryable).toBe(true)
  })
})
