const API_BASE = '/api'

export type Post = {
  id: string
  content: string
  authorId: string
  createdAt: string
  author: { id: string; name: string; username: string; avatar?: string | null } | null
  likesCount: number
  repostsCount: number
  bookmarksCount: number
  repliesCount: number
  liked: boolean
  reposted: boolean
  bookmarked: boolean
}

export type User = {
  id: string
  username: string
  name: string
  bio?: string | null
  avatar?: string | null
}

export type NotificationItem = {
  id: string
  userId: string
  actorId?: string | null
  postId?: string | null
  type: 'POST' | 'LIKE' | 'REPOST' | 'FOLLOW' | 'REPLY'
  readAt?: string | null
  createdAt: string
  actor?: User | null
  post?: {
    id: string
    content: string
    authorId: string
    createdAt: string
  } | null
}

export type SessionUser = User & { email: string; token: string }

type ApiResponse<T> = {
  success: boolean
  data: T
  liked?: boolean
  reposted?: boolean
  bookmarked?: boolean
  following?: boolean
  message?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('twitter_token')
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message ?? 'The server could not complete that request.')
  }

  return payload as ApiResponse<T>
}

export const feedApi = {
  getPosts: (userId?: string) => request<Post[]>(`/posts${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
  createPost: (content: string, authorId: string) =>
    request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, authorId }),
    }),
  toggleLike: (postId: string, userId: string) =>
    request<unknown>('/likes', {
      method: 'POST',
      body: JSON.stringify({ postId, userId }),
    }),
  toggleRepost: (postId: string, userId: string) =>
    request<unknown>('/reposts', {
      method: 'POST',
      body: JSON.stringify({ postId, userId }),
    }),
  addBookmark: (postId: string, userId: string) =>
    request<unknown>('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ postId, userId }),
    }),
  getBookmarks: (userId: string) => request<{ id: string; postId: string; userId: string }[]>('/bookmarks/list', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  getUsers: () => request<User[]>('/users'),
  search: (searchQuery: string) => request<User[]>(`/search?searchQuery=${encodeURIComponent(searchQuery)}`),
  getUser: (userId: string) => request<User & { email?: string; coverImage?: string | null }>(`/users/${encodeURIComponent(userId)}`),
  updateUser: (userId: string, fields: { name: string; username: string; email: string; bio: string; avatar: string; coverImage: string }) => request<User & { email?: string; coverImage?: string | null }>(`/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  }),
  toggleFollow: (followingId: string, followerId: string) =>
    request<unknown>('/follows', {
      method: 'POST',
      body: JSON.stringify({ followingId, followerId }),
    }),
  getFollowing: (followerId: string) => request<string[]>('/follows/status', {
    method: 'POST',
    body: JSON.stringify({ followerId }),
  }),
  getNotifications: (userId: string) => request<NotificationItem[]>(`/notifications?userId=${encodeURIComponent(userId)}`),
  markNotificationAsRead: (notificationId: string) => request<NotificationItem>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  }),
  createReply: (postId: string, content: string, authorId: string) => request<Post>(`/posts/${postId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content, authorId }),
  }),
}

export const authApi = {
  login: (identifier: string, password: string) =>
    request<SessionUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, username: identifier, password }),
    }),
  register: (name: string, username: string, email: string, password: string) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password }),
    }),
  verifyEmail: (token: string) =>
    request<null>(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  googleLogin: (credential: string) =>
    request<SessionUser>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),
}
