import { useState } from 'react'
import type { SessionUser, User } from './services/api'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import VerifyEmail from './pages/VerifyEmail/VerifyEmail'

type AuthView = 'login' | 'register'

function App() {
  const savedUser = (): SessionUser | null => {
    const token = localStorage.getItem('twitter_token')
    const user = localStorage.getItem('twitter_user')
    if (!token || !user) return null
    try { return { ...JSON.parse(user) as SessionUser, token } } catch { return null }
  }

  const [user, setUser] = useState<SessionUser | null>(savedUser)
  const [view, setView] = useState<AuthView>('login')

  const handleLogin = (session: SessionUser) => {
    localStorage.setItem('twitter_token', session.token)
    localStorage.setItem('twitter_user_id', session.id)
    localStorage.setItem('twitter_user', JSON.stringify(session))
    setUser(session)
  }

  const handleRegistered = (registeredUser: User) => {
    void registeredUser
    setView('login')
  }

  if (window.location.pathname === '/verify-email') return <VerifyEmail onLogin={() => { window.history.replaceState({}, '', '/'); setView('login') }} />
  if (user) return <Home />
  if (view === 'register') return <Register onRegistered={handleRegistered} onLogin={() => setView('login')} onGoogleLogin={handleLogin} />
  return <Login onLogin={handleLogin} onCreateAccount={() => setView('register')} />
}

export default App
