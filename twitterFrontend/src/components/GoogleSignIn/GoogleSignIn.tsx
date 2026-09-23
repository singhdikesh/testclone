import { useEffect, useRef } from 'react'
import { authApi, type SessionUser } from '../../services/api'

type GoogleSignInProps = {
  onLogin: (user: SessionUser) => void
  onError: (message: string) => void
}

let initializedClientId: string | undefined

export default function GoogleSignIn({ onLogin, onError }: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const onLoginRef = useRef(onLogin)
  const onErrorRef = useRef(onError)

  onLoginRef.current = onLogin
  onErrorRef.current = onError

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || !buttonRef.current) return

    const renderButton = () => {
      if (!window.google || !buttonRef.current) return

      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              const response = await authApi.googleLogin(credential)
              onLoginRef.current(response.data)
            } catch (error) {
              onErrorRef.current(error instanceof Error ? error.message : 'Unable to log in with Google.')
            }
          },
        })
        initializedClientId = clientId
      }

      buttonRef.current.replaceChildren()
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: '390',
        text: 'continue_with',
      })
    }

    const script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (window.google) {
      renderButton()
      return
    }

    script?.addEventListener('load', renderButton)
    return () => script?.removeEventListener('load', renderButton)
  }, [])

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <button
        className="w-full rounded-full border border-[#cfd9de] bg-white px-5 py-3.5 text-sm font-extrabold text-[#0f1419]"
        type="button"
        onClick={() => onError('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in twitterFrontend/.env.')}
      >
        Continue with Google
      </button>
    )
  }

  return <div className="flex min-h-11 justify-center" ref={buttonRef} aria-label="Continue with Google" />
}