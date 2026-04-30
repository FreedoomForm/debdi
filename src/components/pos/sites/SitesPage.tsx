'use client'
/**
 * /pos/sites — modern website / subdomain manager.
 *
 * New UI counterpart of the legacy site-builder card on
 * /middle-admin?tab=interface&sub=site. Reuses the existing
 * /api/admin/website (GET/PUT) endpoints — no new API surface.
 *
 * Old UI is preserved untouched and remains accessible via the unified nav.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/pos/shared/FormPrimitives'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { Field } from '@/components/pos/shared/FormPrimitives'

type StylePreset = {
  id: string
  title: string
  description: string
  palette: {
    pageBackground: string
    panelBackground: string
    accent: string
    accentSoft: string
    heroFrom: string
    heroTo: string
    textPrimary: string
  }
}

type RenderPage = { id: string; label: string }

type WebsitePayload = {
  website: {
    id: string | null
    subdomain: string
    siteName: string
    styleVariant: string
    chatEnabled: boolean
    style: StylePreset
  }
  presets: StylePreset[]
  renderPages: RenderPage[]
  baseHost: string
}

export default function SitesPage() {
  const [data, setData] = useState<WebsitePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [subdomain, setSubdomain] = useState('')
  const [siteName, setSiteName] = useState('')
  const [styleVariant, setStyleVariant] = useState<string>('organic-warm')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/website', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = (await res.json()) as WebsitePayload
      setData(payload)
      setSubdomain(payload.website.subdomain ?? '')
      setSiteName(payload.website.siteName ?? '')
      setStyleVariant(payload.website.styleVariant ?? 'organic-warm')
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!subdomain || subdomain.length < 3) {
      toast.error('Поддомен должен содержать минимум 3 символа')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subdomain, siteName, styleVariant }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const result = await res.json()
      toast.success('Сайт сохранён')
      // Refresh to pick up server-canonical state
      await load()
      // If hostUrl was returned, surface it
      if (result?.urls?.pathUrl) {
        toast.success(`Доступен по ${result.urls.pathUrl}`, { duration: 5000 })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const pathUrl = useMemo(
    () => (subdomain ? `/sites/${subdomain}` : null),
    [subdomain]
  )
  const hostUrl = useMemo(() => {
    if (!subdomain || !data?.baseHost) return null
    const proto = data.baseHost.startsWith('localhost') ? 'http' : 'https'
    return `${proto}://${subdomain}.${data.baseHost}`
  }, [subdomain, data?.baseHost])

  const copy = (text: string, label: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error('Буфер обмена недоступен')
      return
    }
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} скопировано`),
      () => toast.error('Не удалось скопировать')
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Сайт-витрина"
        icon={<Globe className="h-4 w-4 text-cyan-500" />}
        badge={data?.website.subdomain || undefined}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw
                className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')}
              />
              Обновить
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Сохранить
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        {loading && !data ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Domain & name */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-cyan-500" />
                  Поддомен и название
                </CardTitle>
                <CardDescription>
                  Поддомен формирует адрес вашего сайта-витрины.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Название сайта">
                    <Input
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="My Restaurant"
                    />
                  </Field>
                  <Field label="Поддомен">
                    <div className="flex">
                      <Input
                        value={subdomain}
                        onChange={(e) =>
                          setSubdomain(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, '')
                              .slice(0, 32)
                          )
                        }
                        placeholder="my-cafe"
                        className="rounded-r-none"
                      />
                      <span className="grid place-items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-xs text-muted-foreground">
                        .{data?.baseHost ?? 'debdi.uz'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      3–32 символа, латиница, цифры, дефис.
                    </p>
                  </Field>
                </div>

                {/* URL preview */}
                {(pathUrl || hostUrl) && (
                  <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
                    {pathUrl && (
                      <UrlRow
                        label="Path URL"
                        url={pathUrl}
                        href={pathUrl}
                        onCopy={() => copy(pathUrl, 'Path URL')}
                      />
                    )}
                    {hostUrl && (
                      <UrlRow
                        label="Subdomain URL"
                        url={hostUrl}
                        href={hostUrl}
                        onCopy={() => copy(hostUrl, 'URL')}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Style picker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-cyan-500" />
                  Стиль оформления
                </CardTitle>
                <CardDescription>
                  Выберите тему — цвета, типографика и hero-блок применяются автоматически.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                  {(data?.presets ?? []).map((preset) => {
                    const active = preset.id === styleVariant
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setStyleVariant(preset.id)}
                        className={cn(
                          'group flex flex-col gap-2 rounded-xl border p-3 text-left transition',
                          active
                            ? 'border-cyan-500 ring-2 ring-cyan-200'
                            : 'border-border hover:border-cyan-300'
                        )}
                      >
                        {/* Palette preview */}
                        <div
                          className="h-20 w-full overflow-hidden rounded-md"
                          style={{
                            background: `linear-gradient(135deg, ${preset.palette.heroFrom}, ${preset.palette.heroTo})`,
                          }}
                        >
                          <div
                            className="m-2 h-3 w-12 rounded-full"
                            style={{ background: preset.palette.accent }}
                          />
                          <div
                            className="m-2 h-2 w-20 rounded-full opacity-70"
                            style={{ background: preset.palette.textPrimary }}
                          />
                          <div
                            className="m-2 h-2 w-16 rounded-full opacity-50"
                            style={{ background: preset.palette.textPrimary }}
                          />
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{preset.title}</div>
                            <div className="line-clamp-2 text-[11px] text-muted-foreground">
                              {preset.description}
                            </div>
                          </div>
                          {active && (
                            <Check className="h-4 w-4 shrink-0 text-cyan-600" />
                          )}
                        </div>
                        {/* Color swatches */}
                        <div className="flex gap-1">
                          {[
                            preset.palette.accent,
                            preset.palette.accentSoft,
                            preset.palette.pageBackground,
                            preset.palette.panelBackground,
                          ].map((c, i) => (
                            <span
                              key={i}
                              className="h-3 w-3 rounded-full border border-border"
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Render pages list */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-cyan-500" />
                  Доступные страницы
                </CardTitle>
                <CardDescription>
                  Эти страницы автоматически генерируются для каждого поддомена.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(data?.renderPages ?? []).map((p) => (
                    <Link
                      key={p.id}
                      href={subdomain ? `/sites/${subdomain}` : '#'}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-accent"
                    >
                      {p.label}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Legacy pointer */}
            <Card className="border-dashed">
              <CardContent className="flex items-start gap-3 p-3 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  Расширенный билдер (AI-редактор контента, превью каждой
                  страницы, стиль-варианты по разделам) доступен в старом
                  интерфейсе:{' '}
                  <a
                    href="/middle-admin?tab=interface&sub=site"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    /middle-admin?tab=interface&sub=site
                  </a>
                  . Новые и старые настройки синхронизированы — изменения
                  отражаются в обеих UI.
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

function UrlRow({
  label,
  url,
  href,
  onCopy,
}: {
  label: string
  url: string
  href: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-card px-2 py-1 text-[11px]">
        {url}
      </code>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={onCopy}
        title="Скопировать"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Открыть">
        <a href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  )
}
