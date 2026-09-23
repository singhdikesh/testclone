import { useEffect, useRef, useState } from 'react'
import { authApi } from '../../services/api'

type VerifyState = 'checking' | 'success' | 'error'
type VerifyEmailProps = { onLogin: () => void }

export default function VerifyEmail({ onLogin }: VerifyEmailProps) {
  const [state, setState] = useState<VerifyState>('checking')
  const [message, setMessage] = useState('Verifying your email address...')
  const hasStartedVerification = useRef(false)

  useEffect(() => {
    if (hasStartedVerification.current) return
    hasStartedVerification.current = true

    const token = new URLSearchParams(window.location.search).get('token')

    if (!token) {
      setState('error')
      setMessage('This verification link is missing its token.')
      return
    }

    authApi.verifyEmail(token)
      .then((response) => {
        setState('success')
        setMessage(response.message ?? 'Your email has been verified successfully.')
      })
      .catch((verificationError) => {
        setState('error')
        setMessage(verificationError instanceof Error ? verificationError.message : 'This verification link is invalid or expired.')
      })
  }, [])

  return (
    <main className="grid min-h-screen bg-white text-[#0f1419] lg:grid-cols-[minmax(300px,0.8fr)_minmax(480px,1.2fr)]">
      <section className="grid min-h-[220px] place-items-center bg-[#1d9bf0] px-8 py-12 text-white lg:min-h-screen" aria-label="Twitter">
        <span className="text-[clamp(8rem,22vw,19rem)] font-black leading-none" aria-hidden="true">X</span>
      </section>

      <section className="mx-auto flex w-full max-w-[430px] flex-col justify-center px-6 py-10 sm:px-8 lg:px-0 lg:py-12">
        <div className="mb-12 text-3xl font-black text-[#1d9bf0]">X</div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.8px] text-[#1d9bf0]">Email verification</p>
        <h1 className="text-4xl font-normal tracking-[-2px] sm:text-5xl">
          {state === 'checking' ? 'Checking your link' : state === 'success' ? 'You are verified' : 'Verification failed'}
        </h1>
        <p className="mt-4 text-sm text-[#536471]" role={state === 'error' ? 'alert' : undefined}>{message}</p>

        {state !== 'checking' && (
          <button className="mt-8 flex w-full items-center justify-between rounded-full border-0 bg-[#0f1419] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#1d9bf0]" type="button" onClick={onLogin}>
            <span>Go to login</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </section>
    </main>
  )
}