import { motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useIdle } from '../animation/motion'
import { ButtonBar, PrimaryButton, SecondaryButton } from '../components/Buttons'
import { CustomerInfo } from '../components/Display'
import { PosTextField } from '../components/Fields'
import { PosScreen } from '../components/PosScreen'
import { LoadingContent, StatusContent } from '../components/Status'
import { useAppStore } from '../data/session/store'
import { registerPerson, saveRegistrationFace, startRegistration } from '../data/session/useCases'
import { RegistrationError, type Person } from '../domain/types'
import { CODE_LENGTH, MAX_NAME, ValidationError, type Field } from '../domain/validation'
import { FaceCaptureView } from './face/FaceCaptureView'

// ---------- Dados

export function RegisterFormScreen() {
  const navigate = useNavigate()
  const { form, setForm } = useAppStore()
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const canContinue = form.name.trim() !== '' && form.email.trim() !== '' && form.code.length === CODE_LENGTH
  const idle = useIdle(3000, true, `${form.name}|${form.email}|${form.code}`)
  const firstEmpty: Field | null = !form.name.trim() ? 'name' : !form.email.trim() ? 'email' : form.code.length < CODE_LENGTH ? 'code' : null

  const update = (field: Field, value: string) => {
    setForm({ [field]: value })
    setErrors((e) => ({ ...e, [field]: undefined }))
  }
  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canContinue) return
    try {
      startRegistration(form.name, form.email, form.code)
      navigate('/register/face')
    } catch (err) {
      if (err instanceof ValidationError) setErrors({ [err.field]: err.message })
    }
  }

  return (
    <PosScreen title="Cadastrar pessoa" subtitle="Etapa 1 de 2" onBack={() => navigate('/', { replace: true })} flow={{ flow: 'registration', step: 0, error: Object.values(errors).some(Boolean) }}>
      <form className="register-form" onSubmit={submit} noValidate>
        <div className="register-fields">
          <PosTextField
            index={0}
            label="Nome completo"
            value={form.name}
            onChange={(v) => update('name', v)}
            error={errors.name}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={MAX_NAME + 20}
            coach={idle && firstEmpty === 'name'}
          />
          <PosTextField
            index={1}
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(v) => update('email', v)}
            error={errors.email}
            coach={idle && firstEmpty === 'email'}
          />
          <PosTextField
            index={2}
            label="Código de 4 dígitos"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={form.code}
            onChange={(v) => update('code', v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            error={errors.code}
            supportingText="Será pedido para confirmar cada pagamento"
            coach={idle && firstEmpty === 'code'}
          />
        </div>
        <ButtonBar>
          <PrimaryButton type="submit" onClick={() => {}} disabled={!canContinue} coach={idle && canContinue}>
            Continuar para foto
          </PrimaryButton>
        </ButtonBar>
      </form>
    </PosScreen>
  )
}

// ---------- Foto

export function RegisterFaceScreen() {
  const navigate = useNavigate()
  const hasDraft = useAppStore((s) => !!s.registration.draft)
  if (!hasDraft) return <Navigate to="/register/form" replace />
  return (
    <FaceCaptureView
      title="Foto do cadastro"
      subtitle="Etapa 2 de 2"
      flow={{ flow: 'registration', step: 1 }}
      onBack={() => navigate('/register/form', { replace: true })}
      onCaptured={(c) => {
        saveRegistrationFace(c)
        navigate('/register/result', { replace: true })
      }}
    />
  )
}

// ---------- Envio / resultado

type RegState = { kind: 'loading' } | { kind: 'success'; person: Person } | { kind: 'error'; message: string; retryable: boolean }

export function RegisterResultScreen() {
  const navigate = useNavigate()
  const hasFace = useAppStore((s) => !!s.registration.face)
  const [state, setState] = useState<RegState>({ kind: 'loading' })
  const started = useRef(false)

  const register = () => {
    setState({ kind: 'loading' })
    registerPerson()
      .then((person) => setState({ kind: 'success', person }))
      .catch((e: Error) =>
        setState({ kind: 'error', message: e.message || 'Falha no cadastro', retryable: e instanceof RegistrationError && e.retryable }),
      )
  }
  useEffect(() => {
    if (!hasFace || started.current) return
    started.current = true
    register()
  }, [hasFace])

  // Só redireciona se a tela abriu sem foto; após o envio a sessão é limpa de propósito.
  if (!hasFace && !started.current) return <Navigate to="/" replace />
  const done = () => navigate('/', { replace: true })
  // Volta ao formulário: os campos digitados continuam lá.
  const editData = () => navigate('/register/form', { replace: true })

  return (
    <PosScreen title="Cadastro" flow={{ flow: 'registration', step: 2, error: state.kind === 'error', done: state.kind === 'success' }}>
      {state.kind === 'loading' ? (
        <LoadingContent messages={['Cadastrando pessoa...', 'Gerando assinatura facial...', 'Salvando cadastro...']} detail="Enviando foto para o reconhecimento facial" />
      ) : state.kind === 'success' ? (
        <>
          <div className="spacer" />
          <StatusContent success confetti title="Pessoa cadastrada" subtitle="Já pode pagar usando o rosto." />
          <motion.div style={{ marginTop: 24 }}>
            <CustomerInfo name={state.person.name} maskedEmail={state.person.maskedEmail} delay={0.6} />
          </motion.div>
          <div className="spacer" />
          <ButtonBar>
            <PrimaryButton onClick={done} coach>
              Concluir
            </PrimaryButton>
          </ButtonBar>
        </>
      ) : (
        <>
          <div className="spacer" />
          <StatusContent success={false} title="Não foi possível cadastrar" subtitle={state.message} />
          <div className="spacer" />
          <ButtonBar>
            {state.retryable ? (
              <PrimaryButton onClick={register}>Tentar novamente</PrimaryButton>
            ) : (
              <PrimaryButton onClick={editData}>Corrigir dados</PrimaryButton>
            )}
            <SecondaryButton onClick={done}>Cancelar</SecondaryButton>
          </ButtonBar>
        </>
      )}
    </PosScreen>
  )
}
