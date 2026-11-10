import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bouncy, softSpring } from '../animation/motion'
import { ButtonBar, PrimaryButton, SecondaryButton } from '../components/Buttons'
import { PosScreen } from '../components/PosScreen'
import type { FaceCapture } from '../domain/types'
import { FaceCaptureView } from './face/FaceCaptureView'

/**
 * Tela de teste/validação: mesma captura dos fluxos reais, mas em vez de salvar ou enviar
 * mostra o recorte JPG exatamente como ele seria enviado ao servidor.
 */
export function FaceTestScreen() {
  const navigate = useNavigate()
  const [captured, setCaptured] = useState<FaceCapture | null>(null)
  const [attempt, setAttempt] = useState(0)
  const back = () => navigate('/', { replace: true })

  if (!captured)
    return (
      <FaceCaptureView
        key={attempt}
        title="Teste de captura"
        subtitle="Somente validação — nada é enviado"
        onBack={back}
        onCaptured={setCaptured}
      />
    )

  return (
    <PosScreen title="Foto capturada" subtitle="Recorte que seria enviado ao servidor" onBack={back}>
      <motion.div className="photo-box" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={softSpring}>
        <motion.img
          src={captured.url}
          alt="Rosto capturado"
          initial={{ scale: 0.4, rotate: -6, opacity: 0, filter: 'brightness(3)' }}
          animate={{ scale: 1, rotate: 0, opacity: 1, filter: 'brightness(1)' }}
          transition={{ ...bouncy, filter: { duration: 0.8 } }}
        />
      </motion.div>
      <motion.p className="t-body-l muted center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        {captured.width} x {captured.height} px · {Math.round(captured.blob.size / 1024)} KB · JPEG
      </motion.p>
      <ButtonBar>
        <PrimaryButton
          onClick={() => {
            URL.revokeObjectURL(captured.url)
            setCaptured(null)
            setAttempt((a) => a + 1)
          }}
        >
          Tirar novamente
        </PrimaryButton>
        <SecondaryButton onClick={back}>Voltar</SecondaryButton>
      </ButtonBar>
    </PosScreen>
  )
}
