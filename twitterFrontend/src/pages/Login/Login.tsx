import { useState } from 'react'
import type { FormEvent } from 'react'
import { authApi, type SessionUser } from '../../services/api'
import GoogleSignIn from '../../components/GoogleSignIn/GoogleSignIn'

type LoginProps = {
  onLogin: (user: SessionUser) => void
  onCreateAccount: () => void
}

export default function Login({ onLogin, onCreateAccount }: LoginProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!identifier.trim() || !password) {
      setError('Enter your email or username and password.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const response = await authApi.login(identifier.trim(), password)
      onLogin(response.data)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to log in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-white text-[#0f1419] lg:grid-cols-[minmax(300px,0.8fr)_minmax(480px,1.2fr)]">
      <section className="grid min-h-[220px] place-items-center bg-[#1d9bf0] px-8 py-12 text-white lg:min-h-screen" aria-label="Twitter">
        <span className="text-[clamp(8rem,22vw,19rem)] font-black leading-none" aria-hidden="true">X</span>
      </section>

      <section className="mx-auto flex w-full max-w-[430px] flex-col justify-center px-6 py-10 sm:px-8 lg:px-0 lg:py-12">
        <div className="mb-12 text-3xl font-black text-[#1d9bf0]">X</div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.8px] text-[#1d9bf0]">Welcome back</p>
        <h1 className="text-4xl font-normal tracking-[-2px] text-[#0f1419] sm:text-5xl">Log in to Twitter</h1>
        <p className="mt-4 text-sm text-[#536471]">The conversation is waiting for you.</p>

        <form className="mt-8 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-[12px] font-extrabold text-[#536471]">
            Email or username
            <input
              className="w-full rounded-md border border-[#cfd9de] bg-white px-4 py-3.5 text-sm text-[#0f1419] outline-none transition focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_#e8f5fd] placeholder:text-[#8899a6]"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              placeholder="you@example.com"
            />
          </label>

          <label className="grid gap-2 text-[12px] font-extrabold text-[#536471]">
            Password
            <div className="relative">
              <input
                className="w-full rounded-md border border-[#cfd9de] bg-white px-4 py-3.5 pr-16 text-sm text-[#0f1419] outline-none transition focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_#e8f5fd] placeholder:text-[#8899a6]"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Your password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent text-[11px] font-extrabold text-[#1d9bf0]"
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && <p className="m-0 text-xs text-[#b42318]" role="alert">{error}</p>}

          <button
            className="mt-2 flex w-full items-center justify-between rounded-full border-0 bg-[#0f1419] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#1d9bf0] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Logging in...' : 'Log in'}</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="mt-4" onClick={() => setError('')}>
          <GoogleSignIn onLogin={onLogin} onError={setError} />
        </div>

        <p className="mt-7 text-center text-xs text-[#536471]">
          New to Twitter?{' '}
          <button type="button" className="border-0 bg-transparent p-0 font-extrabold text-[#1d9bf0]" onClick={onCreateAccount}>Create an account</button>
        </p>
      </section>
    </main>
  )
}
