import { useEffect, useMemo, useState } from 'react'
import { feedApi, type Post, type User } from '../../services/api'

type SuggestedUser = User & { following: boolean; isUpdating: boolean }

type Trend = {
  label: string
  posts: number
}

const currentUserId = () => localStorage.getItem('twitter_user_id') ?? ''

const getInitials = (name: string) => name.slice(0, 1).toUpperCase()

const getTrends = (posts: Post[]): Trend[] => {
  const words = posts
    .flatMap((post) => post.content.toLowerCase().match(/#[a-z0-9_]+/g) ?? [])
    .reduce<Record<string, number>>((counts, word) => ({ ...counts, [word]: (counts[word] ?? 0) + 1 }), {})

  return Object.entries(words)
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .slice(0, 3)
    .map(([label, posts]) => ({ label, posts }))
}

function RightSidebar() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<SuggestedUser[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [trends, setTrends] = useState<Trend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadRightRail = async () => {
      try {
        const userId = currentUserId()
        const [usersResponse, postsResponse, followingResponse] = await Promise.all([
          feedApi.getUsers(),
          feedApi.getPosts(userId),
          userId ? feedApi.getFollowing(userId) : Promise.resolve({ data: [] as string[] }),
        ])
        const following = new Set(followingResponse.data)
        setFollowingIds(following)
        const suggestions = usersResponse.data
          .filter((user) => user.id !== userId)
          .slice(0, 4)
          .map((user) => ({ ...user, following: following.has(user.id), isUpdating: false }))
        setSuggestedUsers(suggestions)
        setUsers(suggestions)
        setTrends(getTrends(postsResponse.data))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load the right sidebar.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadRightRail()
  }, [])

  useEffect(() => {
    const searchQuery = query.trim()
    if (!searchQuery) {
      setUsers(suggestedUsers)
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        setIsSearching(true)
        setError('')
        const response = await feedApi.search(searchQuery)
        const userId = currentUserId()
        setUsers(response.data
          .filter((user) => user.id !== userId)
          .map((user) => ({ ...user, following: followingIds.has(user.id), isUpdating: false })))
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : 'Could not search users.')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [followingIds, query, suggestedUsers])

  const openProfile = (userId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: userId }))
  }

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users
    return users.filter((user) => `${user.name} ${user.username}`.toLowerCase().includes(normalizedQuery))
  }, [query, users])

  const searchResults = query.trim() ? filteredUsers : []

  const handleFollow = async (user: SuggestedUser) => {
    const followerId = currentUserId()
    if (!followerId) {
      setError('Log in first to follow people.')
      return
    }

    setUsers((existingUsers) => existingUsers.map((item) => item.id === user.id ? { ...item, isUpdating: true } : item))
    setSuggestedUsers((existingUsers) => existingUsers.map((item) => item.id === user.id ? { ...item, isUpdating: true } : item))
    try {
      const response = await feedApi.toggleFollow(user.id, followerId)
      const following = response.following ?? !user.following
      setUsers((existingUsers) => existingUsers.map((item) => item.id === user.id ? {
        ...item,
        following,
        isUpdating: false,
      } : item))
      setSuggestedUsers((existingUsers) => existingUsers.map((item) => item.id === user.id ? { ...item, following, isUpdating: false } : item))
    } catch (followError) {
      setUsers((existingUsers) => existingUsers.map((item) => item.id === user.id ? { ...item, isUpdating: false } : item))
      setSuggestedUsers((existingUsers) => existingUsers.map((item) => item.id === user.id ? { ...item, isUpdating: false } : item))
      setError(followError instanceof Error ? followError.message : 'Could not update follow status.')
    }
  }

  return (
    <aside className="w-full min-h-screen bg-white px-5 py-2.5 max-[1100px]:hidden" aria-label="Explore and recommendations">
      <div className="relative mb-[18px]">
      <label className="flex h-11 items-center gap-3 rounded-full border border-transparent bg-[#eff3f4] px-4 text-[#536471] focus-within:border-[#1d9bf0] focus-within:bg-white focus-within:text-[#1d9bf0]">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#0f1419] outline-0 placeholder:text-[#536471]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Twitter" aria-label="Search users" />
        {query && <button className="border-0 bg-transparent text-xl text-[#536471]" type="button" onClick={() => setQuery('')} aria-label="Clear search">&times;</button>}
      </label>
      {query.trim() && <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(0,0,0,0.18)]" role="listbox" aria-label="Search results">
        {isSearching && <p className="px-4 py-3 text-sm text-[#536471]">Searching...</p>}
        {!isSearching && searchResults.length === 0 && <p className="px-4 py-3 text-sm text-[#536471]">No people match your search.</p>}
        {!isSearching && searchResults.map((user) => (
          <div className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f7f9f9]" key={user.id} role="option" tabIndex={0} onClick={() => openProfile(user.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openProfile(user.id) }}>
            {user.avatar ? <img className="h-10 w-10 shrink-0 rounded-full object-cover" src={user.avatar} alt="" /> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#536471] font-extrabold text-white" aria-hidden="true">{getInitials(user.name)}</div>}
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#0f1419]">{user.name}</strong><span className="block truncate text-[13px] text-[#536471]">@{user.username}</span></div>
            <button className={user.following ? 'rounded-full border border-[#cfd9de] bg-white px-3 py-1.5 text-xs font-extrabold text-[#0f1419]' : 'rounded-full border border-[#0f1419] bg-[#0f1419] px-3 py-1.5 text-xs font-extrabold text-white'} type="button" onClick={(event) => { event.stopPropagation(); void handleFollow(user) }} disabled={user.isUpdating}>{user.isUpdating ? '...' : user.following ? 'Following' : 'Follow'}</button>
          </div>
        ))}
      </div>}
      </div>

      {error && <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-[#f5c2c0] bg-[#fff5f4] px-2.5 py-2 text-xs text-[#b42318]" role="alert"><span>{error}</span><button className="border-0 bg-transparent text-xl text-[#b42318]" type="button" onClick={() => setError('')} aria-label="Dismiss error">&times;</button></div>}

      <section className="mb-[18px] overflow-hidden rounded-2xl bg-[#f7f9f9]" aria-labelledby="trends-title">
        <div className="flex items-center justify-between p-4"><h2 id="trends-title" className="m-0 text-xl font-extrabold text-[#0f1419]">What’s happening</h2><i className="fa-solid fa-gear text-[15px] text-[#1d9bf0]" aria-hidden="true" /></div>
        {isLoading && <p className="m-0 px-4 pb-[18px] text-[13px] text-[#536471]">Loading trends...</p>}
        {!isLoading && trends.length === 0 && <p className="m-0 px-4 pb-[18px] text-[13px] text-[#536471]">Trends will appear as people post.</p>}
        {trends.map((trend, index) => (
          <a className="flex flex-col gap-[3px] px-4 py-3 text-[#0f1419] no-underline transition-colors hover:bg-[#eff3f4]" href={`#${trend.label.slice(1)}`} key={trend.label}>
            <span className="text-xs text-[#536471]">{index + 1} · Trending</span>
            <strong>{trend.label}</strong>
            <span className="text-xs text-[#536471]">{trend.posts} {trend.posts === 1 ? 'post' : 'posts'}</span>
          </a>
        ))}
        <a className="block p-4 text-sm text-[#1d9bf0] no-underline hover:underline" href="#trends">Show more</a>
      </section>

      <section className="mb-[18px] overflow-hidden rounded-2xl bg-[#f7f9f9]" aria-labelledby="follow-title">
        <div className="flex items-center justify-between p-4"><h2 id="follow-title" className="m-0 text-xl font-extrabold text-[#0f1419]">Who to follow</h2></div>
        {isLoading && <p className="m-0 px-4 pb-[18px] text-[13px] text-[#536471]">Loading suggestions...</p>}
        {!isLoading && suggestedUsers.length === 0 && <p className="m-0 px-4 pb-[18px] text-[13px] text-[#536471]">No people to follow yet.</p>}
        {suggestedUsers.map((user) => (
          <div className="flex cursor-pointer items-center gap-2 px-4 py-3 transition-colors hover:bg-[#eff3f4]" key={user.id} role="button" tabIndex={0} onClick={() => openProfile(user.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openProfile(user.id) }}>
            {user.avatar ? <img className="h-10 w-10 shrink-0 rounded-full object-cover" src={user.avatar} alt="" /> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#536471] font-extrabold text-white" aria-hidden="true">{getInitials(user.name)}</div>}
            <div className="flex min-w-0 flex-1 flex-col"><strong className="truncate text-sm text-[#0f1419]">{user.name}</strong><span className="truncate text-[13px] text-[#536471]">@{user.username}</span></div>
            <button className={user.following ? 'min-w-[76px] rounded-full border border-[#cfd9de] bg-white px-[13px] py-[7px] text-xs font-extrabold text-[#0f1419] hover:border-[#f4212e] hover:text-[#f4212e]' : 'min-w-[76px] rounded-full border border-[#0f1419] bg-[#0f1419] px-[13px] py-[7px] text-xs font-extrabold text-white hover:border-[#f4212e] hover:bg-white hover:text-[#f4212e]'} type="button" onClick={(event) => { event.stopPropagation(); void handleFollow(user) }} disabled={user.isUpdating}>{user.isUpdating ? '...' : user.following ? 'Following' : 'Follow'}</button>
          </div>
        ))}
        <a className="block p-4 text-sm text-[#1d9bf0] no-underline hover:underline" href="#people">Show more</a>
      </section>

      <footer className="flex flex-wrap gap-x-3 gap-y-1 px-4 text-[11px] leading-[1.5] text-[#536471]">
        <a href="#terms">Terms of Service</a><a href="#privacy">Privacy Policy</a><a href="#cookies">Cookie Policy</a><a href="#accessibility">Accessibility</a><span>© 2026 Twitter</span>
      </footer>
    </aside>
  )
}

export default RightSidebar
