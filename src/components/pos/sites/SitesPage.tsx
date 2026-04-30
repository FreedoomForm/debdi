'use client'
/**
 * /pos/sites — manage public storefront / subdomain sites.
 *
 * New UI counterpart of the legacy /middle-admin?tab=interface&sub=site
 * site builder card. Reuses /api/admin/sites endpoints.
 *
 * Old UI preserved untouched. No redirects.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  MessageCircle,
  MessageCircleOff,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Site = {
  id: string
  adminId: string
  subdomain: string
  theme: string
  content: string
  chatEnabled: boolean
  createdAt: string
  updatedAt: string
  admin?: { id: string; name: string; email: string }
}

type ParsedSite = Site & {
  themeObj: Record<string, unknown>
  contentObj: Record<string, unknown>
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const DEFAULT_THEME = {
  primary: '#10b981',
  background: '#ffffff',
  font: 'Manrope',
}

const DEFAULT_CONTENT_RU = {
  ru: { title: '', description: '', heroSlogan: '' },
  uz: { title: '', description: '', heroSlogan: '' },
  en: { title: '', description: '', heroSlogan: '' },
}

export default function SitesPage() {
  const [items, setItems] = useState<ParsedSite[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [form, setForm] = useState({
    id: '',
    subdomain: '',
    primary: DEFAULT_THEME.primary,
    background: DEFAULT_THEME.background,
    font: DEFAULT_THEME.font,
    titleRu: '',
    descriptionRu: '',
    heroSloganRu: '',
    titleUz: '',
    descriptionUz: '',
    heroSloganUz: '',
    titleEn: '',
    descriptionEn: '',
    heroSloganEn: '',
    chatEnabled: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sites', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.items ?? []
      const parsed: ParsedSite[] = (list as Site[]).map((s) => ({
        ...s,
        themeObj: safeParse(s.theme),
        contentObj: safeParse(s.content),
      }))
      setItems(parsed)
    } catch (err) {
      toast.error(err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setFormMode('create')
    setForm({
      id: '',
      subdomain: '',
      primary: DEFAULT_THEME.primary,
      background: DEFAULT_THEME.background,
      font: DEFAULT_THEME.font,
      titleRu: '',
      descriptionRu: '',
      heroSloganRu: '',
      titleUz: '',
      descriptionUz: '',
      heroSloganUz: '',
      titleEn: '',
      descriptionEn: '',
      heroSloganEn: '',
      chatEnabled: false,
    })
    setFormOpen(true)
  }

  const openEdit = (s: ParsedSite) => {
    const theme = s.themeObj as Record<string, string>
    const content = s.contentObj as Record<string, Record<string, string>>
    const ru = content.ru ?? {}
    const uz = content.uz ?? {}
    const en = content.en ?? {}
    setFormMode('edit')
    setForm({
      id: s.id,
      subdomain: s.subdomain,
      primary: theme.primary ?? DEFAULT_THEME.primary,
      background: theme.background ?? DEFAULT_THEME.background,
      font: theme.font ?? DEFAULT_THEME.font,
      titleRu: ru.title ?? '',
      descriptionRu: ru.description ?? '',
      heroSloganRu: ru.heroSlogan ?? '',
      titleUz: uz.title ?? '',
      descriptionUz: uz.description ?? '',
      heroSloganUz: uz.heroSlogan ?? '',
      titleEn: en.title ?? '',
      descriptionEn: en.description ?? '',
      heroSloganEn: en.heroSlogan ?? '',
      chatEnabled: s.chatEnabled,
    })
    setFormOpen(true)
  }

  const submit = async () => {
    if (!form.subdomain || !/^[a-z0-9-]+$/.test(form.subdomain)) {
      toast.error('Поддомен может содержать только a-z, 0-9, дефисы')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        subdomain: form.subdomain,
        theme: {
          primary: form.primary,
          background: form.background,
          font: form.font,
        },
        content: {
          ru: {
            title: form.titleRu,
            description: form.descriptionRu,
            heroSlogan: form.heroSloganRu,
          },
          uz: {
            title: form.titleUz,
            description: form.descriptionUz,
            heroSlogan: form.heroSloganUz,
          },
          en: {
            title: form.titleEn,
            description: form.descriptionEn,
            heroSlogan: form.heroSloganEn,
          },
        },
        chatEnabled: form.chatEnabled,
      }
      const res = await fetch(
        formMode === 'create' ? '/api/admin/sites' : `/api/admin/sites/${form.id}`,
        {
          method: formMode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success(formMode === 'create' ? 'Сайт создан' : 'Сохранено')
      setFormOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (s: ParsedSite) => {
    if (!confirm(`Удалить сайт ${s.subdomain}? Действие необратимо.`)) return
    setPendingId(s.id)
    try {
      const res = await fetch(`/api/admin/sites/${s.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Удалено')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setPendingId(null)
    }
  }

  const toggleChat = async (s: ParsedSite) => {
    setPendingId(s.id)
    try {
      const res = await fetch(`/api/admin/sites/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatEnabled: !s.chatEnabled }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setPendingId(null)
    }
  }

  const stats = useMemo(() => {
    return {
      total: items.length,
      withChat: items.filter((s) => s.chatEnabled).length,
      lastUpdated: items.reduce<string | null>(
        (max, s) => (max && new Date(max) > new Date(s.updatedAt) ? max : s.updatedAt),
        null
      ),
    }
  }, [items])

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/pos/dashboard" aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Globe className="h-4 w-4 text-cyan-500" />
          <h1 className="text-sm font-semibold">Сайты-витрины</h1>
          <Badge variant="secondary" className="text-[10px]">
            {items.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Новый сайт
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Обновить
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-3 p-3 lg:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <KPI label="Всего сайтов" value={String(stats.total)} tone="cyan" />
          <KPI label="С чатом" value={String(stats.withChat)} tone="emerald" />
          <KPI
            label="Обновлён"
            value={
              stats.lastUpdated
                ? new Date(stats.lastUpdated).toLocaleDateString('ru-RU')
                : '—'
            }
            tone="neutral"
          />
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 py-10 text-center">
              <Globe className="mx-auto h-10 w-10 opacity-50" />
              <p className="text-sm text-muted-foreground">У вас ещё нет сайта-витрины</p>
              <Button onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> Создать первый сайт
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => {
              const theme = s.themeObj as Record<string, string>
              const content = s.contentObj as Record<string, Record<string, string>>
              const heroTitle = content.ru?.title ?? content.en?.title ?? content.uz?.title ?? '—'
              const heroDesc =
                content.ru?.description ?? content.en?.description ?? content.uz?.description ?? ''
              const url = `https://${s.subdomain}.debdi.uz`
              return (
                <Card key={s.id} className="overflow-hidden">
                  <div
                    className="h-16"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary ?? DEFAULT_THEME.primary}, ${theme.background ?? DEFAULT_THEME.background})`,
                    }}
                  />
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5 text-cyan-600" />
                          <span className="truncate text-sm font-semibold">
                            {s.subdomain}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.admin?.name ?? '—'}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'shrink-0 text-[10px]',
                          s.chatEnabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {s.chatEnabled ? 'Чат вкл.' : 'Чат выкл.'}
                      </Badge>
                    </div>
                    <div className="text-xs">
                      <div className="font-medium">{heroTitle}</div>
                      {heroDesc && (
                        <div className="line-clamp-2 text-muted-foreground">{heroDesc}</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Изменить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => toggleChat(s)}
                        disabled={pendingId === s.id}
                      >
                        {s.chatEnabled ? (
                          <>
                            <MessageCircleOff className="mr-1 h-3 w-3" />
                            Выкл. чат
                          </>
                        ) : (
                          <>
                            <MessageCircle className="mr-1 h-3 w-3" />
                            Вкл. чат
                          </>
                        )}
                      </Button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Открыть
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => remove(s)}
                        disabled={pendingId === s.id}
                      >
                        {pendingId === s.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 p-3 text-xs text-muted-foreground">
            <Globe className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Старый билдер сайтов остаётся доступным:{' '}
              <a
                href="/middle-admin?tab=interface&sub=site"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                /middle-admin?tab=interface&sub=site
              </a>
              . Эта страница использует те же данные модели Website и добавляет
              мульти-локализацию (ru/uz/en), цветовую тему и быстрое управление чатом.
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Создать сайт-витрину' : 'Изменить сайт-витрину'}
            </DialogTitle>
            <CardDescription className="text-xs">
              Поддомен будет доступен по адресу{' '}
              <span className="font-mono">{form.subdomain || '<subdomain>'}.debdi.uz</span>
            </CardDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Поддомен</Label>
              <Input
                value={form.subdomain}
                onChange={(e) =>
                  setForm({ ...form, subdomain: e.target.value.toLowerCase().trim() })
                }
                placeholder="healthy-food"
                disabled={formMode === 'edit'}
              />
            </div>
            <div>
              <Label className="text-xs">Основной цвет</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary}
                  onChange={(e) => setForm({ ...form, primary: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-input"
                />
                <Input
                  value={form.primary}
                  onChange={(e) => setForm({ ...form, primary: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Фон</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.background}
                  onChange={(e) => setForm({ ...form, background: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-input"
                />
                <Input
                  value={form.background}
                  onChange={(e) => setForm({ ...form, background: e.target.value })}
                />
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Шрифт</Label>
              <Input
                value={form.font}
                onChange={(e) => setForm({ ...form, font: e.target.value })}
                placeholder="Manrope"
              />
            </div>
            <div className="col-span-2 mt-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                🇷🇺 Русский
              </Label>
              <div className="mt-1 grid gap-2">
                <Input
                  value={form.titleRu}
                  onChange={(e) => setForm({ ...form, titleRu: e.target.value })}
                  placeholder="Заголовок (RU)"
                />
                <Input
                  value={form.heroSloganRu}
                  onChange={(e) => setForm({ ...form, heroSloganRu: e.target.value })}
                  placeholder="Слоган (RU)"
                />
                <textarea
                  value={form.descriptionRu}
                  onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })}
                  placeholder="Описание (RU)"
                  rows={2}
                  className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                🇺🇿 O'zbekcha
              </Label>
              <div className="mt-1 grid gap-2">
                <Input
                  value={form.titleUz}
                  onChange={(e) => setForm({ ...form, titleUz: e.target.value })}
                  placeholder="Sarlavha (UZ)"
                />
                <Input
                  value={form.heroSloganUz}
                  onChange={(e) => setForm({ ...form, heroSloganUz: e.target.value })}
                  placeholder="Slogan (UZ)"
                />
                <textarea
                  value={form.descriptionUz}
                  onChange={(e) => setForm({ ...form, descriptionUz: e.target.value })}
                  placeholder="Tavsif (UZ)"
                  rows={2}
                  className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                🇬🇧 English
              </Label>
              <div className="mt-1 grid gap-2">
                <Input
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  placeholder="Title (EN)"
                />
                <Input
                  value={form.heroSloganEn}
                  onChange={(e) => setForm({ ...form, heroSloganEn: e.target.value })}
                  placeholder="Slogan (EN)"
                />
                <textarea
                  value={form.descriptionEn}
                  onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                  placeholder="Description (EN)"
                  rows={2}
                  className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
              <Switch
                checked={form.chatEnabled}
                onCheckedChange={(v) => setForm({ ...form, chatEnabled: v })}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">Чат для клиентов</div>
                <div className="text-[11px] text-muted-foreground">
                  Разрешить клиентам общаться через витрину
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {formMode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KPI({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'cyan' | 'emerald' | 'neutral'
}) {
  const cls = {
    cyan: 'border-cyan-200 bg-cyan-50/60 text-cyan-900',
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
    neutral: 'border-border bg-card text-foreground',
  }[tone]
  return (
    <div className={cn('rounded-lg border p-2 shadow-sm', cls)}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-bold tabular-nums">{value}</div>
    </div>
  )
}
