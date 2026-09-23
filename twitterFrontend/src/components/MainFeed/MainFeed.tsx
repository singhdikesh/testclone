import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { feedApi, type NotificationItem, type Post, type User } from '../../services/api'

type PostState = Post & { following: boolean; showReply: boolean; reply: string; isReplying: boolean }
type FollowUser = User & { following: boolean; isUpdating: boolean }
type ProfileUser = User & { email?: string; coverImage?: string | null }

const currentUserId = () => localStorage.getItem('twitter_user_id') ?? ''
const currentUser = () => {
  try { return JSON.parse(localStorage.getItem('twitter_user') ?? '{}') as { name?: string; username?: string } } catch { return {} }
}

const formatDate = (date: string) => {
  const elapsed = Date.now() - new Date(date).getTime()
  const minutes = Math.max(1, Math.floor(elapsed / 60000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

const MainFeed = () => {
  const [posts, setPosts] = useState<PostState[]>([])
  const [content, setContent] = useState('')
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'notifications' | 'follow' | 'bookmarks' | 'profile'>('for-you')
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState('')
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [followUsers, setFollowUsers] = useState<FollowUser[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [profileFollowing, setProfileFollowing] = useState(false)
  const [isUpdatingProfileFollow, setIsUpdatingProfileFollow] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', username: '', email: '', bio: '', avatar: '', coverImage: '' })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const loadPosts = useCallback(async () => {
    const userId = currentUserId()
    const [postsResponse, followingResponse, notificationsResponse, usersResponse, bookmarksResponse] = await Promise.all([
      feedApi.getPosts(userId),
      userId ? feedApi.getFollowing(userId) : Promise.resolve({ data: [] as string[] }),
      userId ? feedApi.getNotifications(userId) : Promise.resolve({ data: [] as NotificationItem[] }),
      feedApi.getUsers(),
      userId ? feedApi.getBookmarks(userId) : Promise.resolve({ data: [] as { id: string; postId: string; userId: string }[] }),
    ])
    const following = new Set(followingResponse.data)
    const newestNotifications = notificationsResponse.data
    setFollowingIds(following)
    setNotifications(newestNotifications)
    setFollowUsers(usersResponse.data
      .filter((user) => user.id !== userId)
      .map((user) => ({ ...user, following: following.has(user.id), isUpdating: false })))
    setBookmarkedIds(new Set(bookmarksResponse.data.map((bookmark) => bookmark.postId)))
    setPosts(postsResponse.data.map((post) => ({
      ...post,
      following: following.has(post.authorId),
      showReply: false,
      reply: '',
      isReplying: false,
    })).reverse())

    const notificationCount = newestNotifications.filter((notification) => !notification.readAt).length
    window.dispatchEvent(new CustomEvent('notification-count', { detail: notificationCount }))
  }, [])

  useEffect(() => {
    const focusComposer = () => composerRef.current?.focus()
    const handleNavSelection = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail === 'notifications') {
        setActiveTab('notifications')
        return
      }
      if (detail === 'home' || detail === 'for-you') {
        setActiveTab('for-you')
        return
      }
      if (detail === 'explore') {
        setActiveTab('for-you')
        return
      }
      if (detail === 'following') {
        setActiveTab('following')
        return
      }
      if (detail === 'follow') {
        setActiveTab('follow')
        return
      }
      if (detail === 'bookmarks') {
        setActiveTab('bookmarks')
        return
      }
      if (detail === 'profile') {
        setActiveTab('profile')
        void loadProfile(currentUserId())
      }
    }
    const handleProfileNavigation = (event: Event) => {
      setActiveTab('profile')
      void loadProfile((event as CustomEvent<string>).detail)
    }

    window.addEventListener('open-composer', focusComposer)
    window.addEventListener('navigate-to', handleNavSelection)
    window.addEventListener('navigate-to-profile', handleProfileNavigation)
    void Promise.resolve().then(() => loadPosts().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not load the feed.')).finally(() => setIsLoading(false)))
    return () => {
      window.removeEventListener('open-composer', focusComposer)
      window.removeEventListener('navigate-to', handleNavSelection)
      window.removeEventListener('navigate-to-profile', handleProfileNavigation)
    }
  }, [loadPosts])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const authorId = currentUserId()
    if (!authorId) { setError('Log in first so your post has an author.'); return }
    if (!content.trim() || isPosting) return
    setIsPosting(true); setError('')
    try {
      await feedApi.createPost(content.trim(), authorId)
      setContent('')
      await loadPosts()
    } catch (postError) { setError(postError instanceof Error ? postError.message : 'Could not publish your post.') } finally { setIsPosting(false) }
  }

  const requireUser = () => {
    const userId = currentUserId()
    if (!userId) setError('Log in first to interact with posts.')
    return userId
  }

  const refreshAfter = async (action: () => Promise<unknown>) => {
    try { await action(); await loadPosts() } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not update the post.') }
  }

  const handleReply = async (post: PostState, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const userId = requireUser()
    if (!userId || !post.reply.trim()) return
    setPosts((existing) => existing.map((item) => item.id === post.id ? { ...item, isReplying: true } : item))
    await refreshAfter(() => feedApi.createReply(post.id, post.reply.trim(), userId))
    setPosts((existing) => existing.map((item) => item.id === post.id ? { ...item, reply: '', isReplying: false, showReply: false } : item))
  }

  const updateReply = (postId: string, reply: string) => setPosts((existing) => existing.map((post) => post.id === postId ? { ...post, reply } : post))
  const toggleReply = (postId: string) => setPosts((existing) => existing.map((post) => post.id === postId ? { ...post, showReply: !post.showReply } : post))

  const handleFollow = (post: PostState) => {
    const userId = requireUser()
    if (!userId || post.authorId === userId) return
    void refreshAfter(() => feedApi.toggleFollow(post.authorId, userId))
  }

  const handleFollowUser = async (user: FollowUser) => {
    const followerId = requireUser()
    if (!followerId) return

    setFollowUsers((existing) => existing.map((item) => item.id === user.id ? { ...item, isUpdating: true } : item))
    try {
      const response = await feedApi.toggleFollow(user.id, followerId)
      setFollowUsers((existing) => existing.map((item) => item.id === user.id ? {
        ...item,
        following: response.following ?? !item.following,
        isUpdating: false,
      } : item))
      await loadPosts()
    } catch (followError) {
      setFollowUsers((existing) => existing.map((item) => item.id === user.id ? { ...item, isUpdating: false } : item))
      setError(followError instanceof Error ? followError.message : 'Could not update follow status.')
    }
  }

  const handlePostAction = (action: () => Promise<unknown>) => {
    if (!requireUser()) return
    void refreshAfter(action)
  }

  const loadProfile = async (profileUserId = currentUserId()) => {
    const userId = profileUserId
    if (!userId) {
      setError('Log in first to view your profile.')
      return
    }

    try {
      const response = await feedApi.getUser(userId)
      const nextProfile = response.data
      setProfile(nextProfile)
      const viewerId = currentUserId()
      if (viewerId && viewerId !== userId) {
        const followingResponse = await feedApi.getFollowing(viewerId)
        setProfileFollowing(followingResponse.data.includes(userId))
      } else {
        setProfileFollowing(false)
      }
      setProfileForm({
        name: nextProfile.name ?? '',
        username: nextProfile.username ?? '',
        email: nextProfile.email ?? '',
        bio: nextProfile.bio ?? '',
        avatar: nextProfile.avatar ?? '',
        coverImage: nextProfile.coverImage ?? '',
      })
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Could not load your profile.')
    }
  }

  const toggleProfileFollow = async () => {
    const viewerId = requireUser()
    if (!viewerId || !profile || profile.id === viewerId || isUpdatingProfileFollow) return

    setIsUpdatingProfileFollow(true)
    try {
      const response = await feedApi.toggleFollow(profile.id, viewerId)
      setProfileFollowing(response.following ?? !profileFollowing)
      setFollowingIds((existing) => {
        const next = new Set(existing)
        if (response.following ?? !profileFollowing) next.add(profile.id)
        else next.delete(profile.id)
        return next
      })
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : 'Could not update follow status.')
    } finally {
      setIsUpdatingProfileFollow(false)
    }
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const userId = requireUser()
    if (!userId || isSavingProfile) return

    setIsSavingProfile(true)
    setError('')
    try {
      const response = await feedApi.updateUser(userId, profileForm)
      setProfile(response.data)
      localStorage.setItem('twitter_user', JSON.stringify({
        ...JSON.parse(localStorage.getItem('twitter_user') ?? '{}'),
        ...response.data,
      }))
      window.dispatchEvent(new CustomEvent('profile-updated'))
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Could not update your profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const visiblePosts = activeTab === 'following'
    ? posts.filter((post) => followingIds.has(post.authorId))
    : activeTab === 'bookmarks'
      ? posts.filter((post) => bookmarkedIds.has(post.id))
      : posts
  const me = currentUser()
  const isOwnProfile = profile?.id === currentUserId()
  const notificationPosts = notifications.slice(0, 8)

  return (
    <main className="w-full min-h-screen border-x border-[#eff3f4] bg-white">
      {activeTab === 'profile' ? (
        <div className="min-h-screen">
          <div className="flex h-[54px] items-center border-b border-[#eff3f4] px-4">
            <h2 className="text-xl font-extrabold text-[#0f1419]">Profile</h2>
          </div>
          <section className="border-b border-[#eff3f4]">
            <div className="h-36 bg-[#1d9bf0]" style={profile?.coverImage ? { backgroundImage: `url(${profile.coverImage})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined} />
            <div className="px-4 pb-4">
              <div className="-mt-12 grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#536471] text-3xl font-extrabold text-white">
                {profile?.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-user" />}
              </div>
              <div className="mt-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0f1419]">{profile?.name || 'Your profile'}</h3>
                    <p className="text-sm text-[#536471]">@{profile?.username || 'username'}</p>
                  </div>
                  {profile && !isOwnProfile && <button className={profileFollowing ? 'rounded-full border border-[#cfd9de] bg-white px-4 py-2 text-sm font-extrabold text-[#0f1419] hover:border-[#f4212e] hover:text-[#f4212e]' : 'rounded-full border border-[#0f1419] bg-[#0f1419] px-4 py-2 text-sm font-extrabold text-white'} type="button" onClick={() => void toggleProfileFollow()} disabled={isUpdatingProfileFollow}>{isUpdatingProfileFollow ? '...' : profileFollowing ? 'Following' : 'Follow'}</button>}
                </div>
                {profile?.email && <p className="mt-1 text-sm text-[#536471]">{profile.email}</p>}
                {profile?.bio && <p className="mt-3 whitespace-pre-wrap text-sm text-[#0f1419]">{profile.bio}</p>}
              </div>
            </div>
          </section>
          {isOwnProfile && <form className="grid gap-4 p-4" onSubmit={handleProfileSubmit}>
            <h3 className="text-lg font-extrabold text-[#0f1419]">Edit profile</h3>
            <label className="grid gap-1 text-xs font-bold text-[#536471]">Name<input className="rounded-md border border-[#cfd9de] px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label className="grid gap-1 text-xs font-bold text-[#536471]">Username<input className="rounded-md border border-[#cfd9de] px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]" value={profileForm.username} onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))} required /></label>
            <label className="grid gap-1 text-xs font-bold text-[#536471]">Email<input className="rounded-md border border-[#cfd9de] px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]" type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label className="grid gap-1 text-xs font-bold text-[#536471]">Bio<textarea className="min-h-20 resize-y rounded-md border border-[#cfd9de] px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]" value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} maxLength={160} /></label>
            <label className="grid gap-1 text-xs font-bold text-[#536471]">Avatar URL<input className="rounded-md border border-[#cfd9de] px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]" value={profileForm.avatar} onChange={(event) => setProfileForm((current) => ({ ...current, avatar: event.target.value }))} /></label>
            <label className="grid gap-1 text-xs font-bold text-[#536471]">Cover image URL<input className="rounded-md border border-[#cfd9de] px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]" value={profileForm.coverImage} onChange={(event) => setProfileForm((current) => ({ ...current, coverImage: event.target.value }))} /></label>
            <button className="w-fit rounded-full border-0 bg-[#0f1419] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#1d9bf0] disabled:opacity-50" type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save'}</button>
          </form>}
        </div>
      ) : activeTab === 'follow' ? (
        <div className="min-h-screen">
          <div className="flex h-[54px] items-center border-b border-[#eff3f4] px-4">
            <h2 className="text-xl font-extrabold text-[#0f1419]">Follow</h2>
          </div>
          <section className="divide-y divide-[#eff3f4]">
            {followUsers.length === 0 ? (
              <p className="px-5 py-12 text-center text-[#536471]">No other users found.</p>
            ) : (
              followUsers.map((user) => (
                <div className="flex items-center gap-3 p-4 transition hover:bg-[#f7f9f9]" key={user.id}>
                  {user.avatar ? <img className="h-12 w-12 shrink-0 rounded-full object-cover" src={user.avatar} alt="" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#536471] text-lg font-extrabold text-white" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[15px] text-[#0f1419]">{user.name}</strong>
                    <span className="block truncate text-sm text-[#536471]">@{user.username}</span>
                    {user.bio && <p className="mt-1 truncate text-sm text-[#536471]">{user.bio}</p>}
                  </div>
                  <button className={user.following ? 'min-w-[92px] rounded-full border border-[#cfd9de] bg-white px-3 py-2 text-xs font-extrabold text-[#0f1419] hover:border-[#f4212e] hover:text-[#f4212e]' : 'min-w-[92px] rounded-full border border-[#0f1419] bg-[#0f1419] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#272c30]'} type="button" onClick={() => void handleFollowUser(user)} disabled={user.isUpdating}>{user.isUpdating ? '...' : user.following ? 'Following' : 'Follow'}</button>
                </div>
              ))
            )}
          </section>
        </div>
      ) : activeTab === 'notifications' ? (
        <div className="min-h-screen">
          <div className="flex h-[54px] items-center border-b border-[#eff3f4] px-4">
            <h2 className="text-xl font-extrabold text-[#0f1419]">Notifications</h2>
          </div>

          <section className="divide-y divide-[#eff3f4]">
            {notificationPosts.length === 0 ? (
              <div className="px-5 py-12 text-center text-[#536471]">
                No notifications yet. When someone you follow posts, it will appear here.
              </div>
            ) : (
              notificationPosts.map((notification) => {
                const actorName = notification.actor?.name ?? 'Someone'
                const username = notification.actor?.username ?? 'unknown'
                const content = notification.post?.content ?? 'A new update is available.'

                return (
                  <article key={notification.id} className="cursor-pointer p-4 transition hover:bg-[#f7f9f9]">
                    <div className="mb-2 flex items-center gap-3 text-[#1d9bf0]">
                      <i className="fa-solid fa-bell text-sm" aria-hidden="true" />
                      <span className="text-sm font-bold">New post</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#536471] text-sm font-bold text-white" aria-hidden="true">
                        {notification.actor?.avatar ? <img src={notification.actor.avatar} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-user" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[#536471]">
                          <span className="font-bold text-[#0f1419]">{actorName}</span>
                          <span className="ml-1">@{username}</span>
                          <span className="mx-1">·</span>
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-[#0f1419]">{content}</p>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="flex h-[54px] items-center border-b border-[#eff3f4]" role="tablist" aria-label="Timeline filter">
            <button className={`flex-1 border-0 bg-transparent px-4 text-sm font-semibold text-[#536471] transition hover:bg-[#f7f9f9] ${activeTab === 'for-you' ? 'font-extrabold text-[#0f1419]' : ''}`} onClick={() => setActiveTab('for-you')} role="tab" aria-selected={activeTab === 'for-you'}>
              For you
            </button>
            <button className={`flex-1 border-0 bg-transparent px-4 text-sm font-semibold text-[#536471] transition hover:bg-[#f7f9f9] ${activeTab === 'following' ? 'font-extrabold text-[#0f1419]' : ''}`} onClick={() => setActiveTab('following')} role="tab" aria-selected={activeTab === 'following'}>
              Following
            </button>
            {activeTab === 'bookmarks' && <h2 className="px-4 text-xl font-extrabold text-[#0f1419]">Bookmarks</h2>}
          </div>

          <form className="flex gap-3 border-b border-[#eff3f4] p-4" onSubmit={handleSubmit}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#536471] text-sm font-bold text-white" aria-hidden="true">
              <i className="fa-solid fa-user" />
            </div>
            <div className="min-w-0 flex-1">
              <textarea ref={composerRef} value={content} onChange={(event) => setContent(event.target.value)} placeholder="What is happening?" maxLength={250} aria-label="Post content" className="block min-h-[58px] w-full resize-y border-0 bg-transparent text-xl leading-relaxed text-[#0f1419] outline-none placeholder:text-[#536471]" />
              <div className="mt-3 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1 text-[#1d9bf0]">
                  <button type="button" aria-label="Add image" className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent text-sm transition hover:bg-[#e8f5fd]"><i className="fa-regular fa-image" /></button>
                  <button type="button" aria-label="Add GIF" className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent text-sm transition hover:bg-[#e8f5fd]"><i className="fa-solid fa-g" /></button>
                  <button type="button" aria-label="Add poll" className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent text-sm transition hover:bg-[#e8f5fd]"><i className="fa-solid fa-chart-column" /></button>
                  <button type="button" aria-label="Add emoji" className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent text-sm transition hover:bg-[#e8f5fd]"><i className="fa-regular fa-face-smile" /></button>
                </div>
                <span className="text-[11px] text-[#536471]">{content.length}/250</span>
                <button className="min-w-[66px] rounded-full border-0 bg-[#1d9bf0] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1a8cd8] disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!content.trim() || isPosting}>{isPosting ? 'Posting...' : 'Post'}</button>
              </div>
            </div>
          </form>

          {error && <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#f5c2c0] bg-[#fff5f4] px-3 py-2 text-xs text-[#b42318]" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="border-0 bg-transparent text-xl text-[#b42318]">&times;</button></div>}

          <section aria-label="Timeline">
            {isLoading && <p className="px-5 py-10 text-center text-[#536471]">Loading your timeline...</p>}
            {!isLoading && visiblePosts.length === 0 && <p className="px-5 py-10 text-center text-[#536471]">No posts here yet. Start the conversation.</p>}
            {visiblePosts.map((post) => {
              const isOwnPost = post.authorId === currentUserId()
              const authorName = post.author?.name ?? (isOwnPost ? me.name : 'Twitter user')
              const username = post.author?.username ?? (isOwnPost ? me.username : post.authorId.slice(0, 10))
              return (
                <article className="flex gap-3 border-b border-[#eff3f4] p-4 transition hover:bg-[#f7f9f9]" key={post.id}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#536471] text-sm font-bold text-white" aria-hidden="true">
                    {post.author?.avatar ? <img src={post.author.avatar} alt="" className="h-full w-full object-cover" /> : <i className="fa-solid fa-user" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1 overflow-hidden text-sm text-[#536471]">
                      <strong className="text-[#0f1419]">{authorName}</strong>
                      <span>@{username}</span>
                      <span>·</span>
                      <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                      {!isOwnPost && (
                        <button className={`ml-auto text-[12px] font-extrabold ${post.following ? 'text-[#536471]' : 'text-[#1d9bf0]'}`} type="button" onClick={() => handleFollow(post)}>{post.following ? 'Following' : 'Follow'}</button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-[#0f1419]">{post.content}</p>
                    <div className="mt-3 flex max-w-[500px] justify-between gap-2 text-[#536471]">
                      <button type="button" onClick={() => toggleReply(post.id)} aria-label="Reply" className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs transition hover:bg-[#e8f5fd] hover:text-[#1d9bf0]"><i className="fa-regular fa-comment" /><span>{post.repliesCount}</span></button>
                      <button type="button" onClick={() => handlePostAction(() => feedApi.toggleRepost(post.id, currentUserId()))} aria-label="Repost" className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs transition hover:bg-[#e8f5fd] ${post.reposted ? 'text-[#00ba7c]' : 'text-[#536471]'} hover:text-[#00ba7c]`}><i className="fa-solid fa-retweet" /><span>{post.repostsCount}</span></button>
                      <button type="button" onClick={() => handlePostAction(() => feedApi.toggleLike(post.id, currentUserId()))} aria-label="Like" className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs transition hover:bg-[#ffe7f0] ${post.liked ? 'text-[#f91880]' : 'text-[#536471]'} hover:text-[#f91880]`}><i className={post.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} /><span>{post.likesCount}</span></button>
                      <button type="button" onClick={() => handlePostAction(() => feedApi.addBookmark(post.id, currentUserId()))} aria-label="Bookmark" className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs transition hover:bg-[#e8f5fd] ${post.bookmarked ? 'text-[#1d9bf0]' : 'text-[#536471]'} hover:text-[#1d9bf0]`}><i className={post.bookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} /><span>{post.bookmarksCount}</span></button>
                      <button type="button" aria-label="Share" className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs text-[#536471] transition hover:bg-[#e8f5fd] hover:text-[#1d9bf0]"><i className="fa-solid fa-arrow-up-from-bracket" /></button>
                    </div>

                    {post.showReply && (
                      <form className="mt-3 flex gap-2" onSubmit={(event) => void handleReply(post, event)}>
                        <input className="min-w-0 flex-1 rounded-full border border-[#cfd9de] px-3 py-2 text-sm text-[#0f1419] outline-none focus:border-[#1d9bf0]" value={post.reply} onChange={(event) => updateReply(post.id, event.target.value)} placeholder={`Reply to @${username}`} aria-label={`Reply to ${authorName}`} />
                        <button className="rounded-full border-0 bg-[#1d9bf0] px-3 py-2 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!post.reply.trim() || post.isReplying}>{post.isReplying ? '...' : 'Reply'}</button>
                      </form>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        </>
      )}
    </main>
  )
}

export default MainFeed
