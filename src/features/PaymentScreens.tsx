import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { softSpring, useIdle } from '../animation/motion'
import { ButtonBar, PrimaryButton, SecondaryButton } from '../components/Buttons'
import { AmountDisplay, CountUpMoney, CustomerInfo, ErrorBanner, PinIndicator } from '../components/Display'
import { NumericKeypad } from '../components/NumericKeypad'
import { PosScreen } from '../components/PosScreen'
import { LoadingContent, StatusContent } from '../components/Status'
import { useAppStore } from '../data/session/store'
import {
  confirmPayment,
  createPayment,
  resetPayment,
  savePaymentFace,
  startPayment,
  submitPin,
} from '../data/session/useCases'
import { MAX_CENTS, formatMoney } from '../domain/money'
import type { PaymentResult } from '../domain/types'
import { PIN_LENGTH } from '../domain/validation'
import { FaceCaptureView } from './face/FaceCaptureView'

const useBackHome = () => {
  const navigate = useNavigate()
  return useCallback(() => navigate('/', { replace: true }), [navigate])
}

// ---------- Valor

export function AmountScreen() {
  const navigate = useNavigate()
  const [cents, setCents] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const idle = useIdle(cents === 0 ? 2500 : 3000, true, cents)

  const onDigit = useCallback((d: number) => {
    setCents((c) => {
      const next = c * 10 + d
      return next > MAX_CENTS ? c : next
    })
    setError(null)
  }, [])
  const onBackspace = useCallback(() => {
    setCents((c) => Math.floor(c / 10))
    setError(null)
  }, [])
  const onContinue = useCallback(() => {
    const err = startPayment(cents)
    if (err) setError(err)
    else navigate('/face')
  }, [cents, navigate])

  return (
    <PosScreen title="Nova venda" subtitle="Digite o valor da compra" onBack={() => navigate(-1)} flow={{ flow: 'payment', step: 0 }}>
      <div className="spacer" />
      <AmountDisplay amount={cents} label="Valor" />
      <ErrorBanner message={error} />
      <div className="spacer" />
      <NumericKeypad onDigit={onDigit} onBackspace={onBackspace} onEnter={cents > 0 ? onContinue : undefined} coach={idle && cents === 0} />
      <ButtonBar>
        <PrimaryButton onClick={onContinue} disabled={cents <= 0} coach={idle && cents > 0}>
          Continuar
        </PrimaryButton>
      </ButtonBar>
    </PosScreen>
  )
}

// ---------- Rosto

export function PaymentFaceScreen() {
  const navigate = useNavigate()
  const amount = useAppStore((s) => s.payment.amount)
  if (amount <= 0) return <Navigate to="/" replace />
  return (
    <FaceCaptureView
      title="Reconhecimento facial"
      subtitle={`Pagamento de ${formatMoney(amount)}`}
      flow={{ flow: 'payment', step: 1 }}
      onBack={() => navigate('/amount', { replace: true })}
      onCaptured={(c) => {
        savePaymentFace(c)
        navigate('/processing', { replace: true })
      }}
    />
  )
}

// ---------- Processando

type Processing = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'notRecognized' }

export function ProcessingScreen() {
  const navigate = useNavigate()
  const backHome = useBackHome()
  const hasFace = useAppStore((s) => !!s.payment.face)
  const [state, setState] = useState<Processing>({ kind: 'loading' })
  const started = useRef(false)

  useEffect(() => {
    if (!hasFace || started.current) return
    started.current = true
    createPayment()
      .then((outcome) => {
        if (outcome.kind === 'pending') navigate('/pin', { replace: true })
        else setState({ kind: 'notRecognized' })
      })
      .catch((e: Error) => setState({ kind: 'error', message: e.message || 'Falha ao criar pagamento' }))
  }, [hasFace, navigate])

  if (!hasFace && !started.current) return <Navigate to="/" replace />
  // "Tentar novamente" volta para a captura facial: o cliente passa o rosto de novo.
  const retryFace = () => navigate('/face', { replace: true })
  return (
    <PosScreen title="Processando" flow={{ flow: 'payment', step: 1, error: state.kind !== 'loading' }}>
      {state.kind === 'loading' ? (
        <LoadingContent messages={['Identificando cliente...', 'Comparando biometria...', 'Quase lá...']} />
      ) : (
        <>
          <div className="spacer" />
          <StatusContent
            success={false}
            title={state.kind === 'error' ? 'Falha ao criar pagamento' : 'Rosto não reconhecido'}
            subtitle={
              state.kind === 'error'
                ? state.message
                : 'Não encontramos um cadastro para este rosto. Tente novamente com o rosto bem centralizado.'
            }
          />
          <div className="spacer" />
          <ButtonBar>
            <PrimaryButton onClick={retryFace}>Tentar novamente</PrimaryButton>
            <SecondaryButton onClick={backHome}>Cancelar</SecondaryButton>
          </ButtonBar>
        </>
      )}
    </PosScreen>
  )
}

// ---------- PIN

export function PinScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pending = useAppStore((s) => s.payment.pending)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(params.get('error'))
  const complete = pin.length === PIN_LENGTH
  const idle = useIdle(complete ? 1500 : 3000, true, pin)

  const onDigit = useCallback((d: number) => {
    setPin((p) => (p.length >= PIN_LENGTH ? p : p + d))
    setError(null)
  }, [])
  const onBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1))
    setError(null)
  }, [])
  const onFinish = useCallback(() => {
    const err = submitPin(pin)
    if (err) setError(err)
    else navigate('/result', { replace: true })
  }, [pin, navigate])

  if (!pending) return <Navigate to="/" replace />
  return (
    <PosScreen title="Confirmação" subtitle={`Pagamento de ${formatMoney(pending.amount)}`} flow={{ flow: 'payment', step: 2, error: !!error }}>
      <CustomerInfo name={pending.personName} maskedEmail={pending.maskedEmail} delay={0.1} />
      <div className="spacer" />
      <motion.p className="t-title-m center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay: 0.25 }}>
        Digite seu PIN de {PIN_LENGTH} dígitos
      </motion.p>
      <PinIndicator filled={pin.length} length={PIN_LENGTH} error={!!error} />
      <ErrorBanner message={error} />
      <div className="spacer" />
      <NumericKeypad onDigit={onDigit} onBackspace={onBackspace} onEnter={complete ? onFinish : undefined} coach={idle && !complete} />
      <ButtonBar>
        <PrimaryButton onClick={onFinish} disabled={!complete} coach={idle && complete}>
          Finalizar pagamento
        </PrimaryButton>
      </ButtonBar>
    </PosScreen>
  )
}

// ---------- Resultado

type ResultState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'finished'; result: PaymentResult }

export function PaymentResultScreen() {
  const navigate = useNavigate()
  const hasPin = useAppStore((s) => !!s.payment.confirmKey)
  const [state, setState] = useState<ResultState>({ kind: 'loading' })
  const started = useRef(false)

  useEffect(() => {
    if (!hasPin || started.current) return
    started.current = true
    confirmPayment()
      .then((result) => {
        // Código errado com tentativas restantes: volta direto para o PIN.
        if (result.kind === 'invalidCode') {
          const plural = result.remainingAttempts === 1 ? 'tentativa restante' : 'tentativas restantes'
          const msg = `Código inválido. ${result.remainingAttempts} ${plural}.`
          navigate(`/pin?error=${encodeURIComponent(msg)}`, { replace: true })
        } else setState({ kind: 'finished', result })
      })
      .catch((e: Error) => setState({ kind: 'error', message: e.message || 'Falha na comunicação' }))
  }, [hasPin, navigate])

  if (!hasPin && !started.current) return <Navigate to="/" replace />
  const newSale = () => {
    resetPayment()
    navigate('/', { replace: true })
  }
  // "Tentar novamente" volta para a captura facial: a nova foto gera uma nova transação.
  const retryFace = () => navigate('/face', { replace: true })

  const result = state.kind === 'finished' ? state.result : null
  const approved = result?.kind === 'approved'
  return (
    <PosScreen
      title="Pagamento"
      flow={{ flow: 'payment', step: 3, error: state.kind === 'error' || result?.kind === 'declined', done: approved }}
    >
      {state.kind === 'loading' || result?.kind === 'invalidCode' ? (
        <LoadingContent messages={['Autorizando pagamento...', 'Validando PIN...', 'Confirmando com o gateway...']} />
      ) : (
        <>
          <div className="spacer" />
          {state.kind === 'error' ? (
            <StatusContent success={false} title="Falha na comunicação" subtitle={state.message} />
          ) : result?.kind === 'approved' ? (
            <StatusContent
              success
              confetti
              title="Pagamento aprovado"
              subtitle={
                <span className="receipt">
                  {result.personName && <span>{result.personName}</span>}
                  <span className="t-headline-s receipt-amount">
                    <CountUpMoney cents={result.amount} delay={0.5} />
                  </span>
                  <span className="t-body-m">Transação {result.transactionId}</span>
                </span>
              }
            />
          ) : result?.kind === 'declined' ? (
            <StatusContent success={false} title="Pagamento recusado" subtitle={result.reason} />
          ) : null}
          <div className="spacer" />
          <ButtonBar>
            {state.kind === 'error' ? (
              <>
                <PrimaryButton onClick={retryFace}>Tentar novamente</PrimaryButton>
                <SecondaryButton onClick={newSale}>Cancelar</SecondaryButton>
              </>
            ) : (
              <PrimaryButton onClick={newSale} coach={approved}>
                Nova venda
              </PrimaryButton>
            )}
          </ButtonBar>
        </>
      )}
    </PosScreen>
  )
}
