import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, Conversation, User } from '../../services/api'
import { chatApi, feedApi } from '../../services/api'

const userId = () => localStorage.getItem('twitter_user_id') ?? ''
const timeLabel = (date: string) => {
  const timestamp = Date.parse(String(date))
  return Number.isNaN(timestamp) ? '' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(timestamp)
}

const Messages = () => {
  const currentUserId = userId()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting')
  const [typingConversationId, setTypingConversationId] = useState('')
  const [typingUserId, setTypingUserId] = useState('')
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [hoveredMessageId, setHoveredMessageId] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const selectedIdRef = useRef('')
  const reconnectTimerRef = useRef<number | null>(null)
  const typingTimerRef = useRef<number | null>(null)

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null
  const selectedUser = selected?.members.find((member) => member.id !== currentUserId)

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    let active = true
    Promise.all([chatApi.getConversations(currentUserId), feedApi.getUsers()])
      .then(([conversationResponse, userResponse]) => {
        if (!active) return
        setConversations(conversationResponse.data)
        setUsers(userResponse.data.filter((user) => user.id !== currentUserId))
        if (conversationResponse.data[0]) setSelectedId(conversationResponse.data[0].id)
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not load messages.'))
      .finally(() => setIsLoading(false))
    return () => { active = false }
  }, [currentUserId])

  useEffect(() => {
    if (!selectedId) {
      return
    }
    let active = true
    Promise.all([chatApi.getMessages(selectedId, currentUserId), chatApi.markRead(selectedId, currentUserId)])
      .then(([response]) => {
        if (!active) return
        setMessages(response.data)
        setConversations((existing) => existing.map((conversation) => conversation.id === selectedId ? { ...conversation, unreadCount: 0 } : conversation))
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.'))
    return () => { active = false }
  }, [currentUserId, selectedId])

  useEffect(() => {
    let disposed = false
    let reconnectDelay = 1000
    const connect = () => {
      const token = localStorage.getItem('twitter_token')
      if (!token || disposed) return
      setConnectionStatus('connecting')
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`)
      socketRef.current = socket
      socket.onopen = () => {
        reconnectDelay = 1000
        setConnectionStatus('connected')
      }
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; message?: ChatMessage; error?: string; conversationId?: string; userId?: string; isTyping?: boolean; messageId?: string; reactions?: ChatMessage['reactions']; online?: boolean }
          if (payload.type === 'error') { setError(payload.error ?? 'Chat connection error.'); return }
          if (payload.type === 'presence' && payload.userId) {
            setOnlineUserIds((existing) => {
              const next = new Set(existing)
              if (payload.online) next.add(payload.userId as string)
              else next.delete(payload.userId as string)
              return next
            })
            return
          }
          if (payload.type === 'typing' && payload.conversationId && payload.userId && payload.userId !== currentUserId) {
            if (payload.isTyping) {
              setTypingConversationId(payload.conversationId)
              setTypingUserId(payload.userId)
              if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
              typingTimerRef.current = window.setTimeout(() => {
                setTypingConversationId('')
                setTypingUserId('')
              }, 2500)
            } else if (payload.conversationId === selectedIdRef.current) {
              setTypingConversationId('')
              setTypingUserId('')
            }
            return
          }
          if (payload.type === 'reaction' && payload.messageId && payload.reactions) {
            setMessages((existing) => existing.map((message) => message.id === payload.messageId ? { ...message, reactions: payload.reactions as ChatMessage['reactions'] } : message))
            return
          }
          if (payload.type !== 'message' || !payload.message) return
          const incoming = payload.message
          setConversations((existing) => existing.map((conversation) => conversation.id === incoming.conversationId ? { ...conversation, lastMessage: incoming, unreadCount: selectedIdRef.current === incoming.conversationId || incoming.senderId === currentUserId ? 0 : conversation.unreadCount + 1 } : conversation))
          if (selectedIdRef.current === incoming.conversationId) {
            setMessages((existing) => existing.some((message) => message.id === incoming.id) ? existing : [...existing, incoming])
            void chatApi.markRead(incoming.conversationId, currentUserId)
          }
        } catch { setError('Received an invalid chat message.') }
      }
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null
        if (!disposed) {
          setOnlineUserIds(new Set())
          setConnectionStatus('reconnecting')
          reconnectTimerRef.current = window.setTimeout(connect, reconnectDelay)
          reconnectDelay = Math.min(reconnectDelay * 2, 10000)
        }
      }
      socket.onerror = () => {
        // The close handler owns reconnection and status updates. Avoid showing a
        // transient error while the browser is already retrying the connection.
      }
    }
    connect()
    return () => {
      disposed = true
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
      setOnlineUserIds(new Set())
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [currentUserId])

  const startConversation = async (otherUser: User) => {
    try {
      const response = await chatApi.createDirectConversation(currentUserId, otherUser.id)
      const conversation = response.data
      setConversations((existing) => existing.some((item) => item.id === conversation.id) ? existing : [conversation, ...existing])
      setSelectedId(conversation.id)
      setError('')
    } catch (startError) { setError(startError instanceof Error ? startError.message : 'Could not start the conversation.') }
  }

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !selectedId) return
    if (socketRef.current?.readyState !== WebSocket.OPEN) { setError('Chat is reconnecting. Your message will send when the connection is ready.'); return }
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
    socketRef.current.send(JSON.stringify({ type: 'typing', conversationId: selectedId, isTyping: false }))
    socketRef.current.send(JSON.stringify({ type: 'send_message', conversationId: selectedId, content }))
    setDraft('')
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)
    if (!selectedId || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(JSON.stringify({ type: 'typing', conversationId: selectedId, isTyping: value.trim().length > 0 }))
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
    if (value.trim()) {
      typingTimerRef.current = window.setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: 'typing', conversationId: selectedId, isTyping: false }))
      }, 1200)
    }
  }

  const toggleReaction = (messageId: string, emoji: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN || !selectedId) return
    socketRef.current.send(JSON.stringify({ type: 'reaction', conversationId: selectedId, messageId, emoji }))
  }

  const typingUser = selected?.members.find((member) => member.id === typingUserId)

  return (
    <main className="flex min-h-screen min-w-0 flex-col border-x border-[#eff3f4] bg-white">
      <header className="flex h-[54px] shrink-0 items-center border-b border-[#eff3f4] px-4">
        <h1 className="flex-1 text-xl font-extrabold text-[#0f1419]">Messages</h1>
        <span className={`text-xs ${connectionStatus === 'connected' ? 'text-[#00ba7c]' : 'text-[#536471]'}`} aria-live="polite">{connectionStatus === 'connected' ? 'Live' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}</span>
      </header>
      {error && <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#f5c2c0] bg-[#fff5f4] px-3 py-2 text-xs text-[#b42318]" role="alert"><span>{error}</span><button type="button" className="border-0 bg-transparent text-xl" onClick={() => setError('')} aria-label="Dismiss error">&times;</button></div>}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(160px,230px)_minmax(0,1fr)] max-[600px]:grid-cols-[88px_minmax(0,1fr)]">
        <aside className="overflow-y-auto border-r border-[#eff3f4]">
          <div className="border-b border-[#eff3f4] p-3 text-xs font-extrabold uppercase tracking-wide text-[#536471]">Conversations</div>
          {isLoading && <p className="p-4 text-xs text-[#536471]">Loading...</p>}
          {conversations.map((conversation) => {
            const person = conversation.members.find((member) => member.id !== currentUserId)
            return <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`flex w-full items-center gap-2 border-0 border-b border-[#eff3f4] bg-transparent p-3 text-left hover:bg-[#f7f9f9] ${selectedId === conversation.id ? 'bg-[#e8f5fd]' : ''}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#536471] text-sm font-bold text-white">{person?.avatar ? <img src={person.avatar} alt="" className="h-full w-full object-cover" /> : person?.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden min-w-0 flex-1 max-[600px]:hidden min-[601px]:block"><strong className="block truncate text-sm text-[#0f1419]">{person?.name ?? 'Conversation'}</strong><span className="block truncate text-xs text-[#536471]">{conversation.lastMessage?.content ?? 'Start chatting'}</span></span>
              {conversation.unreadCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#1d9bf0] px-1 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}
            </button>
          })}
          <div className="p-3"><p className="mb-2 hidden text-xs font-extrabold uppercase tracking-wide text-[#536471] min-[601px]:block">Start a chat</p>{users.map((user) => <button key={user.id} type="button" onClick={() => void startConversation(user)} className="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent p-2 text-left hover:bg-[#f7f9f9]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#536471] text-xs font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span><span className="hidden truncate text-sm text-[#0f1419] min-[601px]:block">{user.name}</span></button>)}</div>
        </aside>
        <section className="flex min-h-0 flex-col">
          {selected ? <>
            <div className="flex h-[54px] shrink-0 items-center gap-3 border-b border-[#eff3f4] px-4"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#536471] text-sm font-bold text-white">{selectedUser?.avatar ? <img src={selectedUser.avatar} alt="" className="h-full w-full object-cover" /> : selectedUser?.name.slice(0, 1).toUpperCase()}</span><div><strong className="block text-sm text-[#0f1419]">{selectedUser?.name ?? 'Conversation'}</strong><span className={onlineUserIds.has(selectedUser?.id ?? '') ? 'text-xs text-[#00ba7c]' : 'text-xs text-[#536471]'}>{onlineUserIds.has(selectedUser?.id ?? '') ? 'Online' : 'Offline'}</span></div></div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">{messages.length === 0 ? <p className="py-10 text-center text-sm text-[#536471]">No messages yet. Say hello.</p> : messages.map((message) => <div key={message.id} className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`} onMouseEnter={() => setHoveredMessageId(message.id)} onMouseLeave={() => setHoveredMessageId('')}><div className={`relative max-w-[78%] rounded-2xl px-3 py-2 text-sm ${message.senderId === currentUserId ? 'rounded-br-sm bg-[#1d9bf0] text-white' : 'rounded-bl-sm bg-[#eff3f4] text-[#0f1419]'}`}>{hoveredMessageId === message.id && <div className={`absolute -top-10 z-10 flex gap-1 rounded-full border border-[#cfd9de] bg-white px-2 py-1 shadow-md ${message.senderId === currentUserId ? 'right-0' : 'left-0'}`} role="toolbar" aria-label="Message reactions">{['❤️', '👍', '😂'].map((emoji) => <button key={emoji} type="button" className="border-0 bg-transparent p-1 text-base transition hover:scale-125" onClick={() => toggleReaction(message.id, emoji)} aria-label={`React ${emoji}`}>{emoji}</button>)}</div>}<p className="whitespace-pre-wrap break-words">{message.content}</p><div className="mt-1 flex items-center justify-between gap-3"><time className="block text-[10px] opacity-70">{timeLabel(message.createdAt)}</time>{(message.reactions ?? []).length > 0 && <span className="flex gap-1">{['❤️', '👍', '😂'].map((emoji) => { const count = (message.reactions ?? []).filter((reaction) => reaction.emoji === emoji).length; return count > 0 ? <button key={emoji} type="button" className="border-0 bg-transparent p-0 text-xs opacity-80" onClick={() => toggleReaction(message.id, emoji)} aria-label={`Remove or add ${emoji} reaction`}>{emoji} {count}</button> : null })}</span>}</div></div></div>)}{typingConversationId === selectedId && <p className="text-xs italic text-[#536471]" aria-live="polite">{typingUser?.name ?? 'Someone'} is typing...</p>}</div>
            <form className="flex gap-2 border-t border-[#eff3f4] p-3" onSubmit={sendMessage}><input value={draft} onChange={(event) => handleDraftChange(event.target.value)} maxLength={2000} placeholder="Write a message" aria-label="Message" className="min-w-0 flex-1 rounded-full border border-[#cfd9de] px-4 py-2 text-sm outline-none focus:border-[#1d9bf0]" /><button type="submit" disabled={!draft.trim() || connectionStatus !== 'connected'} className="rounded-full border-0 bg-[#1d9bf0] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{connectionStatus === 'connected' ? 'Send' : '...'}</button></form>
          </> : <div className="grid flex-1 place-items-center p-6 text-center"><div><i className="fa-regular fa-envelope text-3xl text-[#536471]" /><h2 className="mt-3 text-lg font-extrabold text-[#0f1419]">Your messages</h2><p className="mt-1 text-sm text-[#536471]">Choose someone to start a private conversation.</p></div></div>}
        </section>
      </div>
    </main>
  )
}

export default Messages
