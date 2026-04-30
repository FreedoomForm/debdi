'use client'
/**
 * /pos/chat — modern internal messenger built on top of /api/chat/*.
 *
 * The legacy /middle-admin?tab=chat view is preserved untouched —
 * no redirects. This is the *new UI* counterpart with two-pane layout,
 * live polling, and a quick "new conversation" picker.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageSquare,
  Send,
  Search,
  RefreshCw,
  Loader2,
  Plus,
  Users,
  CircleDot,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePolling } from '@/hooks/usePolling'
import { cn } from '@/lib/utils'

type Participant = {
  id: string
  name: string
  email?: string
  role: string
}

type Conversation = {
  id: string
  otherParticipant: Participant
  lastMessage?: {
    content: string
    createdAt: string
    senderId: string
  } | null
  unreadCount?: number
  lastMessageAt?: string
}

type Message = {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
  sender?: { id: string; name: string; role: string }
}

const ROLE_TONE: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-800',
  MIDDLE_ADMIN: 'bg-indigo-100 text-indigo-800',
  LOW_ADMIN: 'bg-cyan-100 text-cyan-800',
  COURIER: 'bg-amber-100 text-amber-800',
  WORKER: 'bg-slate-100 text-slate-700',
}

export default function ChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<Participant[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [me, setMe] = useState<{ id: string; name?: string } | null>(null)

  // Poll conversations every 15s
  const {
    data: conversationsData,
    refresh: refreshConversations,
  } = usePolling<{ conversations?: Conversation[] } | Conversation[]>(
    '/api/chat/conversations',
    15000
  )
  const conversations = useMemo<Conversation[]>(() => {
    if (!conversationsData) return []
    return Array.isArray(conversationsData)
      ? conversationsData
      : conversationsData.conversations ?? []
  }, [conversationsData])

  // Poll messages of the active conversation every 8s
  const {
    data: messagesData,
    refresh: refreshMessages,
  } = usePolling<{ messages?: Message[] } | Message[]>(
    activeId ? `/api/chat/messages?conversationId=${activeId}` : null,
    8000
  )
  const messages = useMemo<Message[]>(() => {
    if (!messagesData) return []
    const list = Array.isArray(messagesData)
      ? messagesData
      : messagesData.messages ?? []
    // API returns DESC; reverse to ASC for natural chat flow.
    return [...list].reverse()
  }, [messagesData])

  // Get current user from session-derived endpoint
  useEffect(() => {
    fetch('/api/admin/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.id) setMe({ id: data.user.id, name: data.user.name })
      })
      .catch(() => {})
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filteredConversations = useMemo(() => {
    if (!search) return conversations
    const q = search.toLowerCase()
    return conversations.filter((c) =>
      `${c.otherParticipant?.name ?? ''} ${c.otherParticipant?.email ?? ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [conversations, search])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  )

  const send = async () => {
    if (!activeId || !draft.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId: activeId, content: draft.trim() }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось отправить')
      }
      setDraft('')
      await Promise.all([refreshMessages(), refreshConversations()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSending(false)
    }
  }

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/chat/users', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.users ?? []
      setUsers(list)
    } catch {
      toast.error('Не удалось загрузить пользователей')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const startConversation = async (otherUserId: string) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otherUserId }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось начать диалог')
      }
      const conv = await res.json()
      const newId = conv?.conversation?.id ?? conv?.id
      setPickerOpen(false)
      await refreshConversations()
      if (newId) setActiveId(newId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  return (
    <div className="mx-auto h-[calc(100vh-3rem)] max-w-[1400px] space-y-3 p-3 lg:p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-6 w-6 text-cyan-600" />
            Чат
          </h1>
          <p className="text-sm text-muted-foreground">
            Внутренний мессенджер — обновление каждые 8 сек
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshConversations()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Обновить
          </Button>
          <Button
            size="sm"
            onClick={() => {
              loadUsers()
              setPickerOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Новый диалог
          </Button>
        </div>
      </header>

      <div className="grid h-[calc(100%-3.5rem)] grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <Card className="flex h-full flex-col">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск диалогов…"
                className="pl-8"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <p className="px-3 py-10 text-center text-xs text-muted-foreground">
                Диалогов пока нет
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredConversations.map((c) => {
                  const isActive = c.id === activeId
                  const tone = ROLE_TONE[c.otherParticipant?.role ?? ''] ?? 'bg-slate-100'
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={cn(
                          'flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-accent',
                          isActive && 'bg-accent'
                        )}
                      >
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold uppercase">
                          {c.otherParticipant?.name?.slice(0, 2) ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium">
                              {c.otherParticipant?.name ?? 'Без имени'}
                            </span>
                            {(c.unreadCount ?? 0) > 0 && (
                              <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                                {c.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className={cn('text-[9px]', tone)}>
                              {c.otherParticipant?.role}
                            </Badge>
                            {c.lastMessage && (
                              <span className="truncate text-[11px] text-muted-foreground">
                                {c.lastMessage.content}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </Card>

        {/* Active conversation */}
        <Card className="flex h-full flex-col">
          {!activeConversation ? (
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-50" />
                Выберите диалог слева или начните новый
              </div>
            </CardContent>
          ) : (
            <>
              <header className="flex items-center gap-2 border-b border-border px-3 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-bold uppercase">
                  {activeConversation.otherParticipant?.name?.slice(0, 2) ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {activeConversation.otherParticipant?.name}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[9px]',
                      ROLE_TONE[activeConversation.otherParticipant?.role ?? ''] ?? 'bg-slate-100'
                    )}
                  >
                    {activeConversation.otherParticipant?.role}
                  </Badge>
                </div>
                <CircleDot className="h-3 w-3 text-emerald-500" />
              </header>
              <ScrollArea className="flex-1 p-3">
                {messages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    Сообщений пока нет — начните разговор
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {messages.map((m) => {
                      const isMine = me?.id ? m.senderId === me.id : false
                      return (
                        <li
                          key={m.id}
                          className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[78%] rounded-2xl px-3 py-1.5 text-sm shadow-sm',
                              isMine
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            {!isMine && m.sender && (
                              <div className="text-[10px] font-medium opacity-70">
                                {m.sender.name}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            <div
                              className={cn(
                                'mt-0.5 text-[10px]',
                                isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}
                            >
                              {new Date(m.createdAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </ul>
                )}
              </ScrollArea>
              <div className="border-t border-border p-2">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    placeholder="Введите сообщение… (Enter — отправить, Shift+Enter — перенос)"
                    rows={2}
                    className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button onClick={send} disabled={sending || !draft.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Начать диалог
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {usersLoading ? (
              <div className="grid place-items-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Нет доступных пользователей</p>
            ) : (
              <ul className="divide-y divide-border">
                {users.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => startConversation(u.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-accent"
                    >
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-[10px] font-bold uppercase">
                        {u.name?.slice(0, 2) ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{u.name}</div>
                        <Badge
                          variant="secondary"
                          className={cn('text-[9px]', ROLE_TONE[u.role] ?? 'bg-slate-100')}
                        >
                          {u.role}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
