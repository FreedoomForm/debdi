'use client'
/**
 * /pos/checklists — manager-facing digital checklist dashboard.
 *
 * Inspired by Lightspeed K-Series March 2026 release. Lets the owner
 * define opening/closing/midshift checklist templates and lets staff
 * run and tick-off live instances.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Sun,
  Moon,
  CircleDot,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { Field } from '@/components/pos/shared/FormPrimitives'

type Phase = 'OPENING' | 'CLOSING' | 'MIDSHIFT'

type ChecklistItem = {
  id: string
  label: string
  required: boolean
  sortOrder: number
}

type Template = {
  id: string
  name: string
  phase: Phase
  isActive: boolean
  items: ChecklistItem[]
  _count?: { instances: number }
}

type Response = {
  id: string
  itemId: string
  checked: boolean
  note?: string | null
  checkedAt?: string | null
}

type Instance = {
  id: string
  templateId: string
  shiftId?: string | null
  performedBy: string
  startedAt: string
  completedAt?: string | null
  template: { name: string; phase: Phase }
  responses: Response[]
}

const PHASE_META: Record<Phase, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  OPENING: { label: 'Открытие', icon: Sun, tone: 'bg-amber-100 text-amber-800' },
  CLOSING: { label: 'Закрытие', icon: Moon, tone: 'bg-indigo-100 text-indigo-800' },
  MIDSHIFT: { label: 'Среди смены', icon: CircleDot, tone: 'bg-cyan-100 text-cyan-800' },
}

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)

  // Create-template dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplPhase, setTplPhase] = useState<Phase>('OPENING')
  const [tplItems, setTplItems] = useState<Array<{ label: string; required: boolean }>>([
    { label: '', required: true },
  ])

  // Run-instance dialog
  const [runInstance, setRunInstance] = useState<Instance | null>(null)
  const [savingResponse, setSavingResponse] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, iRes] = await Promise.all([
        fetch('/api/pos/checklists', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/pos/checklists/instances', { credentials: 'include', cache: 'no-store' }),
      ])
      if (tRes.ok) {
        const data = await tRes.json()
        setTemplates(Array.isArray(data?.items) ? data.items : [])
      }
      if (iRes.ok) {
        const data = await iRes.json()
        setInstances(Array.isArray(data?.items) ? data.items : [])
      }
    } catch (err) {
      toast.error(err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось загрузить')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const openTpl = templates.filter((t) => t.isActive).length
    const openInstances = instances.filter((i) => !i.completedAt).length
    const completedToday = instances.filter((i) => {
      if (!i.completedAt) return false
      const t = new Date(i.completedAt)
      const today = new Date()
      return (
        t.getFullYear() === today.getFullYear() &&
        t.getMonth() === today.getMonth() &&
        t.getDate() === today.getDate()
      )
    }).length
    return { openTpl, openInstances, completedToday }
  }, [templates, instances])

  const addTplItem = () =>
    setTplItems((p) => [...p, { label: '', required: true }])
  const updateTplItem = (idx: number, patch: Partial<{ label: string; required: boolean }>) =>
    setTplItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const removeTplItem = (idx: number) =>
    setTplItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))

  const createTemplate = async () => {
    const validItems = tplItems
      .map((it) => ({ ...it, label: it.label.trim() }))
      .filter((it) => it.label.length > 0)
    if (!tplName.trim()) {
      toast.error('Введите название чек-листа')
      return
    }
    if (validItems.length === 0) {
      toast.error('Добавьте хотя бы один пункт')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/pos/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: tplName.trim(),
          phase: tplPhase,
          items: validItems.map((it, i) => ({
            label: it.label,
            required: it.required,
            sortOrder: i,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success('Шаблон создан')
      setCreateOpen(false)
      setTplName('')
      setTplPhase('OPENING')
      setTplItems([{ label: '', required: true }])
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setCreating(false)
    }
  }

  const startRun = async (templateId: string) => {
    try {
      const res = await fetch('/api/pos/checklists/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templateId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setRunInstance(data.instance)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    }
  }

  const toggleResponse = async (itemId: string, checked: boolean) => {
    if (!runInstance) return
    setSavingResponse(itemId)
    try {
      const res = await fetch('/api/pos/checklists/instances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          instanceId: runInstance.id,
          itemId,
          checked,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setRunInstance(data.instance)
      // Refresh background list silently.
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось')
    } finally {
      setSavingResponse(null)
    }
  }

  const tplById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates]
  )

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <PosPageHeader
        title="Чек-листы смены"
        icon={<ClipboardCheck className="h-4 w-4 text-amber-500" />}
        badge={templates.length}
        actions={
          <>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Шаблон
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-[1400px] space-y-3 p-3 lg:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <KpiTile
            label="Активные шаблоны"
            value={stats.openTpl}
            tone="cyan"
            icon={<ClipboardList className="h-3 w-3" />}
          />
          <KpiTile
            label="В процессе"
            value={stats.openInstances}
            tone={stats.openInstances > 0 ? 'amber' : 'neutral'}
            icon={<CircleDot className="h-3 w-3" />}
          />
          <KpiTile
            label="Завершено сегодня"
            value={stats.completedToday}
            tone="emerald"
            icon={<CheckCircle2 className="h-3 w-3" />}
          />
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">
              <ClipboardList className="mr-1 h-3.5 w-3.5" />
              Шаблоны ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="instances">
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
              История запусков ({instances.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-3">
            {loading ? (
              <div className="grid place-items-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Шаблонов чек-листов пока нет. Создайте первый — например,
                  «Открытие зала» с пунктами «Касса посчитана», «Холодильник
                  работает», «Вывески включены».
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => {
                  const phaseMeta = PHASE_META[t.phase]
                  const PhaseIcon = phaseMeta.icon
                  return (
                    <Card key={t.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm">{t.name}</CardTitle>
                            <Badge
                              variant="secondary"
                              className={cn('mt-1 text-[10px]', phaseMeta.tone)}
                            >
                              <PhaseIcon className="mr-1 h-3 w-3" />
                              {phaseMeta.label}
                            </Badge>
                          </div>
                          <div className="text-right text-[10px] text-muted-foreground">
                            <div>{t.items.length} пунктов</div>
                            {t._count && <div>×{t._count.instances} запусков</div>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <ul className="space-y-1 text-xs">
                          {t.items.slice(0, 4).map((it) => (
                            <li key={it.id} className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full',
                                  it.required ? 'bg-rose-500' : 'bg-muted-foreground/40'
                                )}
                              />
                              <span className="truncate">{it.label}</span>
                            </li>
                          ))}
                          {t.items.length > 4 && (
                            <li className="text-[10px] text-muted-foreground">
                              + ещё {t.items.length - 4}…
                            </li>
                          )}
                        </ul>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => startRun(t.id)}
                        >
                          <CircleDot className="mr-1.5 h-3.5 w-3.5" />
                          Запустить
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="instances" className="mt-3">
            {instances.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Запусков ещё не было.
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-2">
                {instances.map((i) => {
                  const tpl = tplById.get(i.templateId)
                  const total = tpl?.items.length ?? i.responses.length
                  const checked = i.responses.filter((r) => r.checked).length
                  const phaseMeta = PHASE_META[i.template.phase]
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        onClick={() => setRunInstance(i)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:bg-accent"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-md bg-muted">
                          <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {i.template.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Badge
                              variant="secondary"
                              className={cn('text-[9px]', phaseMeta.tone)}
                            >
                              {phaseMeta.label}
                            </Badge>
                            <span>{new Date(i.startedAt).toLocaleString('ru-RU')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">
                            {checked} / {total}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {i.completedAt ? '✓ завершено' : '… в процессе'}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create-template dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый шаблон чек-листа</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Название">
                <Input
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  maxLength={120}
                  placeholder="Например: «Открытие зала»"
                />
              </Field>
              <Field label="Фаза">
                <Select value={tplPhase} onValueChange={(v) => setTplPhase(v as Phase)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPENING">Открытие</SelectItem>
                    <SelectItem value="CLOSING">Закрытие</SelectItem>
                    <SelectItem value="MIDSHIFT">Среди смены</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Пункты" full>
              <div className="space-y-1">
                {tplItems.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      value={it.label}
                      onChange={(e) => updateTplItem(idx, { label: e.target.value })}
                      placeholder={`Пункт ${idx + 1}`}
                      className="flex-1"
                      maxLength={200}
                    />
                    <label className="flex items-center gap-1 rounded-md border border-border px-2 text-[11px]">
                      <input
                        type="checkbox"
                        checked={it.required}
                        onChange={(e) => updateTplItem(idx, { required: e.target.checked })}
                      />
                      обяз.
                    </label>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-rose-600"
                      onClick={() => removeTplItem(idx)}
                      disabled={tplItems.length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTplItem}
                  className="w-full"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Добавить пункт
                </Button>
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={createTemplate} disabled={creating}>
              {creating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run-instance dialog */}
      <Dialog
        open={!!runInstance}
        onOpenChange={(open) => !open && setRunInstance(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {runInstance?.template.name}
              {runInstance?.completedAt && (
                <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800">
                  ✓ завершено
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {runInstance && (
            <div className="space-y-1.5">
              {(tplById.get(runInstance.templateId)?.items ?? []).map((it) => {
                const resp = runInstance.responses.find((r) => r.itemId === it.id)
                const checked = resp?.checked ?? false
                const isSaving = savingResponse === it.id
                return (
                  <label
                    key={it.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-md border p-2 transition',
                      checked
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-border bg-card hover:bg-accent'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isSaving}
                      onChange={(e) => toggleResponse(it.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="text-sm">
                        {it.label}
                        {it.required && (
                          <span className="ml-1 text-[10px] text-rose-600">*</span>
                        )}
                      </div>
                      {resp?.checkedAt && (
                        <div className="text-[10px] text-muted-foreground">
                          ✓ {new Date(resp.checkedAt).toLocaleTimeString('ru-RU')}
                        </div>
                      )}
                    </div>
                    {isSaving && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
