import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

const navigationItems = [
  { href: '/', icon: 'fa-solid fa-house', label: 'Home' },
  { href: '/explore', icon: 'fa-solid fa-magnifying-glass', label: 'Explore' },
  { href: '/notifications', icon: 'fa-solid fa-bell', label: 'Notifications', badge: '0' },
  { href: '/follow', icon: 'fa-solid fa-user-plus', label: 'Follow' },
  { href: '/messages', icon: 'fa-solid fa-envelope', label: 'Messages' },
  { href: '/bookmarks', icon: 'fa-solid fa-bookmark', label: 'Bookmarks' },
  { href: '/profile', icon: 'fa-solid fa-user', label: 'Profile' },
  { href: '/more', icon: 'fa-solid fa-ellipsis', label: 'More' },
]

export const Sidebar = () => {
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('twitter_user') ?? '{}') as { name?: string; username?: string } } catch { return {} }
  })()
  const [activeItem, setActiveItem] = useState(() => navigationItems.find((item) => item.href === window.location.pathname)?.label ?? 'Home')
  const [isAccountOpen, setIsAccountOpen] = useState(false)

  useEffect(() => {
    const closeAccountMenu = () => setIsAccountOpen(false)
    const syncActiveItem = () => setActiveItem(navigationItems.find((item) => item.href === window.location.pathname)?.label ?? 'Home')
    window.addEventListener('click', closeAccountMenu)
    window.addEventListener('popstate', syncActiveItem)
    return () => {
      window.removeEventListener('click', closeAccountMenu)
      window.removeEventListener('popstate', syncActiveItem)
    }
  }, [])

  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, label: string) => {
    event.preventDefault()
    setActiveItem(label)
    window.history.pushState(null, '', event.currentTarget.pathname)
    const normalized = label.toLowerCase()
    if (normalized === 'notifications' || normalized === 'home' || normalized === 'explore' || normalized === 'follow' || normalized === 'messages' || normalized === 'bookmarks' || normalized === 'profile') {
      window.dispatchEvent(new CustomEvent('navigate-to', { detail: normalized }))
    }
  }

  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    const updateNotificationCount = (event: Event) => {
      setNotificationCount((event as CustomEvent<number>).detail ?? 0)
    }

    window.addEventListener('notification-count', updateNotificationCount)
    return () => window.removeEventListener('notification-count', updateNotificationCount)
  }, [])

  const openComposer = () => window.dispatchEvent(new CustomEvent('open-composer'))

  return (
    <nav className="sticky top-0 z-50 flex h-screen w-[275px] shrink-0 flex-col border-r border-[#eff3f4] bg-white px-3 py-1 max-[1100px]:w-[88px] max-[1100px]:items-center max-[600px]:fixed max-[600px]:bottom-0 max-[600px]:top-auto max-[600px]:h-[62px] max-[600px]:w-full max-[600px]:flex-row max-[600px]:justify-around max-[600px]:border-r-0 max-[600px]:border-t max-[600px]:px-2" aria-label="Primary navigation">
      <a className="mb-1 flex h-[52px] w-[52px] items-center justify-center rounded-full text-[30px] text-[#0f1419] transition-colors hover:bg-[#eff3f4] max-[600px]:hidden" href="/" aria-label="X home">
        <i className="fa-brands fa-x-twitter" aria-hidden="true" />
      </a>

      <div className="flex flex-col max-[600px]:w-full max-[600px]:flex-row max-[600px]:items-center max-[600px]:justify-around">
        {navigationItems.map((item) => {
          const isActive = activeItem === item.label

          return (
            <a
              key={item.label}
              href={item.href}
              className={`group relative my-px flex min-h-[50px] w-fit items-center gap-4 rounded-full px-4 text-[1.05rem] text-[#0f1419] transition-colors hover:bg-[#eff3f4] max-[1100px]:h-[52px] max-[1100px]:w-[52px] max-[1100px]:justify-center max-[1100px]:p-0 max-[600px]:my-0 max-[600px]:h-12 max-[600px]:w-12 max-[600px]:min-h-12 ${isActive ? 'font-bold' : 'font-medium'}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => handleNavigation(event, item.label)}
            >
              <span className="relative flex h-7 w-7 items-center justify-center" aria-hidden="true">
                <i className={`${item.icon} text-[1.45rem] ${isActive ? 'text-[#0f1419]' : 'text-[#0f1419]'}`} />
              </span>
              <span className="hidden xl:inline">{item.label}</span>
              {item.label === 'Notifications' && notificationCount > 0 && (
                <span className="absolute -right-1.5 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-white bg-[#1d9bf0] px-[3px] text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
              {item.label === 'Notifications' && notificationCount === 0 && item.badge && (
                <span className="absolute -right-1.5 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-white bg-[#1d9bf0] px-[3px] text-[10px] font-bold text-white">{item.badge}</span>
              )}
            </a>
          )
        })}
      </div>

      <button className="mt-4 flex min-h-[52px] w-[90%] items-center justify-center gap-2 rounded-full border-0 bg-[#1d9bf0] px-5 text-[17px] font-bold text-white shadow-[0_0_0_1px_rgba(0,0,0,0.03)] transition hover:bg-[#1a8cd8] max-[1100px]:h-[52px] max-[1100px]:w-[52px] max-[1100px]:p-0 max-[600px]:hidden" type="button" onClick={openComposer}>
        <span className="hidden xl:inline">Post</span>
        <i className="fa-solid fa-feather-pointed text-[19px] xl:hidden" aria-hidden="true" />
      </button>

      <button className="mt-auto flex min-h-[58px] w-full items-center gap-2 rounded-full border-0 bg-transparent px-2 py-2 text-left text-[#0f1419] transition hover:bg-[#eff3f4] max-[1100px]:h-[52px] max-[1100px]:w-[52px] max-[1100px]:justify-center max-[1100px]:p-1 max-[600px]:hidden" type="button" aria-label="Open account menu" aria-expanded={isAccountOpen} onClick={(event) => { event.stopPropagation(); setIsAccountOpen((open) => !open) }}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#536471] text-white"><i className="fa-solid fa-user" aria-hidden="true" /></span>
        <span className="flex min-w-0 flex-1 flex-col overflow-hidden max-[1100px]:hidden">
          <strong className="truncate text-[15px]">{storedUser.name ?? 'Your account'}</strong>
          <span className="truncate text-[15px] text-[#536471]">@{storedUser.username ?? 'username'}</span>
        </span>
        <i className="fa-solid fa-ellipsis px-2.5 text-sm max-[1100px]:hidden" aria-hidden="true" />
      </button>

      {isAccountOpen && <div className="absolute bottom-[76px] left-2.5 right-2.5 z-10 overflow-hidden rounded-[14px] border border-[#eff3f4] bg-white p-1 shadow-[0_8px_24px_rgba(15,20,25,0.16)] max-[1100px]:hidden" role="menu">
        <button className="block w-full rounded-lg border-0 bg-transparent px-2.5 py-3 text-left text-[13px] text-[#0f1419] hover:bg-[#eff3f4]" type="button" role="menuitem" onClick={() => setIsAccountOpen(false)}>Add an existing account</button>
        <button className="block w-full rounded-lg border-0 bg-transparent px-2.5 py-3 text-left text-[13px] text-[#0f1419] hover:bg-[#eff3f4]" type="button" role="menuitem" onClick={() => { localStorage.removeItem('twitter_token'); localStorage.removeItem('twitter_user'); localStorage.removeItem('twitter_user_id'); window.location.reload() }}>Log out @{storedUser.username ?? 'username'}</button>
      </div>}
    </nav>
  )
}
