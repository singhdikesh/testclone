import { useEffect, useState } from 'react'
import { Sidebar } from '../../components/Sidebar/Sidebar'
import MainFeed from '../../components/MainFeed/MainFeed'
import RightSidebar from '../../components/RightSidebar/RightSidebar'
import Messages from '../../components/Messages/Messages'

export default function Home() {
  const [showMessages, setShowMessages] = useState(() => window.location.pathname === '/messages')

  useEffect(() => {
    const handleNavigation = (event: Event) => setShowMessages((event as CustomEvent<string>).detail === 'messages')
    window.addEventListener('navigate-to', handleNavigation)
    return () => window.removeEventListener('navigate-to', handleNavigation)
  }, [])

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1305px] grid-cols-[275px_minmax(0,680px)_minmax(280px,350px)] px-4 sm:px-0 lg:w-[calc(100%-32px)]">
      <Sidebar />
      {showMessages ? <Messages /> : <MainFeed />}
      <RightSidebar />
    </div>
  )
}
