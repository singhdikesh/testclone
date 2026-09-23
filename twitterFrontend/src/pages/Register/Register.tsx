import { useState } from 'react'
import type { FormEvent } from 'react'
import { authApi, type SessionUser, type User } from '../../services/api'
import GoogleSignIn from '../../components/GoogleSignIn/GoogleSignIn'

type RegisterProps = { onRegistered: (user: User) => void; onLogin: () => void; onGoogleLogin: (user: SessionUser) => void }

export default function Register({ onRegistered, onLogin, onGoogleLogin }: RegisterProps) {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (Object.values(form).some((value) => !value.trim())) { setError('Complete every field to create your account.'); return }
    if (form.password.length < 8) { setError('Your password must be at least 8 characters.'); return }
    setIsSubmitting(true); setError('')
    try {
      const response = await authApi.register(form.name.trim(), form.username.trim(), form.email.trim(), form.password)
      void response.data
      setIsRegistered(true)
      window.setTimeout(onRegistered, 2500)
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Unable to create your account.')
    } finally { setIsSubmitting(false) }
  }

  return (
    <main className="grid min-h-screen bg-white text-[#0f1419] lg:grid-cols-[minmax(300px,0.8fr)_minmax(480px,1.2fr)]">
      <section className="grid min-h-[220px] place-items-center bg-[#1d9bf0] px-8 py-12 text-white lg:min-h-screen" aria-label="Twitter">
        <span className="text-[clamp(8rem,22vw,19rem)] font-black leading-none" aria-hidden="true">X</span>
      </section>

      <section className="mx-auto flex w-full max-w-[430px] flex-col justify-center px-6 py-10 sm:px-8 lg:px-0 lg:py-12">
        <div className="mb-12 text-3xl font-black text-[#1d9bf0]">X</div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.8px] text-[#1d9bf0]">{isRegistered ? 'Almost there' : 'Join the conversation'}</p>
        <h1 className="text-4xl font-normal tracking-[-2px] text-[#0f1419] sm:text-5xl">{isRegistered ? 'Check your inbox' : 'Create your account'}</h1>
        <p className="mt-4 text-sm text-[#536471]">{isRegistered ? 'Email verification link sent. Redirecting you to login...' : 'A few details, then you are in.'}</p>

        {!isRegistered && <form className="mt-8 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-[12px] font-extrabold text-[#536471]">
            Name
            <input className="w-full rounded-md border border-[#cfd9de] bg-white px-4 py-3.5 text-sm text-[#0f1419] outline-none transition focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_#e8f5fd] placeholder:text-[#8899a6]" value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" placeholder="Your name" />
          </label>
          <label className="grid gap-2 text-[12px] font-extrabold text-[#536471]">
            Username
            <input className="w-full rounded-md border border-[#cfd9de] bg-white px-4 py-3.5 text-sm text-[#0f1419] outline-none transition focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_#e8f5fd] placeholder:text-[#8899a6]" value={form.username} onChange={(event) => update('username', event.target.value.replace(/\s/g, '').toLowerCase())} autoComplete="username" placeholder="yourhandle" />
          </label>
          <label className="grid gap-2 text-[12px] font-extrabold text-[#536471]">
            Email
            <input className="w-full rounded-md border border-[#cfd9de] bg-white px-4 py-3.5 text-sm text-[#0f1419] outline-none transition focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_#e8f5fd] placeholder:text-[#8899a6]" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" placeholder="you@example.com" />
          </label>
          <label className="grid gap-2 text-[12px] font-extrabold text-[#536471]">
            Password
            <input className="w-full rounded-md border border-[#cfd9de] bg-white px-4 py-3.5 text-sm text-[#0f1419] outline-none transition focus:border-[#1d9bf0] focus:shadow-[0_0_0_3px_#e8f5fd] placeholder:text-[#8899a6]" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
          </label>

          {error && <p className="m-0 text-xs text-[#b42318]" role="alert">{error}</p>}

          <button className="mt-2 flex w-full items-center justify-between rounded-full border-0 bg-[#0f1419] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#1d9bf0] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'} <span aria-hidden="true">→</span></button>
        </form>}

        {!isRegistered && <p className="mt-7 text-center text-xs text-[#536471]">Already have an account? <button type="button" className="border-0 bg-transparent p-0 font-extrabold text-[#1d9bf0]" onClick={onLogin}>Log in</button></p>}
        {!isRegistered && <>
          <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[1.5px] text-[#8899a6]"><span className="h-px flex-1 bg-[#e1e8ed]" />or<span className="h-px flex-1 bg-[#e1e8ed]" /></div>
          <GoogleSignIn onLogin={onGoogleLogin} onError={setError} />
        </>}
      </section>
    </main>
  )
}
