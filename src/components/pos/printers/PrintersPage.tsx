'use client'
/**
 * Printers management page.
 *
 * Lists configured printers (RECEIPT / KITCHEN / BAR / LABEL / REPORT) with
 * connection details. Supports adding new printers, marking defaults per
 * type, and a "Тест печати" button that sends a tiny test ticket.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Bluetooth,
  Check,
  Edit3,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Usb,
  Wifi,
  X,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import type { PosPrinter } from '@/lib/pos'

const TYPE_LABELS: Record<PosPrinter['type'], string> = {
  RECEIPT: 'Чеки',
  KITCHEN: 'Кухня',
  BAR: 'Бар',
  LABEL: 'Этикетки',
  REPORT: 'Отчёты',
}

const CONNECTION_LABELS: Record<PosPrinter['connection'], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  network: { label: 'Сеть (TCP)', icon: Wifi },
  bluetooth: { label: 'Bluetooth', icon: Bluetooth },
  usb: { label: 'USB', icon: Usb },
}

const EMPTY: Partial<PosPrinter> = {
  name: '',
  type: 'RECEIPT',
  connection: 'network',
  port: 9100,
  paperWidth: '80mm',
  isActive: true,
  isDefault: false,
}

export function PrintersPage() {
  const [printers, setPrinters] = useState<PosPrinter[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<PosPrinter> | null>(null)
  const [busy, setBusy] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/printers', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: PosPrinter[] }
      setPrinters(data.items ?? [])
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
    if (!editing || !editing.name?.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/pos/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editing.name,
          type: editing.type,
          connection: editing.connection,
          ipAddress: editing.ipAddress || null,
          port: editing.port || 9100,
          bluetoothMac: editing.bluetoothMac || null,
          paperWidth: editing.paperWidth ?? '80mm',
          isDefault: !!editing.isDefault,
          isActive: editing.isActive ?? true,
          notes: editing.notes || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Принтер добавлен')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось сохранить'
      )
    } finally {
      setBusy(false)
    }
  }

  const test = async (id: string) => {
    setTestingId(id)
    try {
      const res = await fetch(`/api/pos/printers/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
      }
      if (data.ok) {
        toast.success('Тест отправлен — проверьте принтер')
      } else {
        toast.error(data.error || 'Не удалось напечатать тест')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Принтеры"
        icon={<Printer className="h-4 w-4 text-amber-500" />}
        backHref="/pos/terminal"
        actions={
          <>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Обновить
            </Button>
            <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Принтер
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : printers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <Printer className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Принтеры не настроены</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Добавьте сетевой / Bluetooth / USB принтер, чтобы печатать чеки
              и кухонные тикеты.
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setEditing({ ...EMPTY })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Добавить принтер
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {printers.map((p) => {
              const Conn = CONNECTION_LABELS[p.connection]?.icon ?? Wifi
              return (
                <article
                  key={p.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-50 text-amber-700">
                        <Printer className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          {p.name}
                          {p.isDefault && (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {TYPE_LABELS[p.type]} · {p.paperWidth}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={p.isActive ? 'default' : 'secondary'}
                      className={cn(
                        'text-[10px]',
                        p.isActive
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : ''
                      )}
                    >
                      {p.isActive ? '● Активен' : 'Выключен'}
                    </Badge>
                  </header>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Conn className="h-3.5 w-3.5" />
                      <span>{CONNECTION_LABELS[p.connection]?.label}</span>
                    </div>
                    {p.connection === 'network' && p.ipAddress && (
                      <div className="font-mono text-foreground">
                        {p.ipAddress}:{p.port ?? 9100}
                      </div>
                    )}
                    {p.connection === 'bluetooth' && p.bluetoothMac && (
                      <div className="font-mono text-foreground">
                        {p.bluetoothMac}
                      </div>
                    )}
                  </div>

                  <footer className="mt-3 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={testingId === p.id}
                      onClick={() => test(p.id)}
                    >
                      {testingId === p.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Тест печати
                    </Button>
                    <Button size="sm" variant="ghost" className="px-2">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2 text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Новый принтер</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Название*
                </Label>
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="напр. Касса 1, Кухня"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Тип
                </Label>
                <Select
                  value={editing.type ?? 'RECEIPT'}
                  onValueChange={(v) =>
                    setEditing({ ...editing, type: v as PosPrinter['type'] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as PosPrinter['type'][]).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Подключение
                </Label>
                <Select
                  value={editing.connection ?? 'network'}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      connection: v as PosPrinter['connection'],
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">Сеть (TCP)</SelectItem>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                    <SelectItem value="usb">USB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing.connection === 'network' && (
                <>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      IP адрес
                    </Label>
                    <Input
                      value={editing.ipAddress ?? ''}
                      onChange={(e) =>
                        setEditing({ ...editing, ipAddress: e.target.value })
                      }
                      placeholder="192.168.1.100"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Порт
                    </Label>
                    <Input
                      type="number"
                      value={editing.port ?? 9100}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          port: Number(e.target.value) || 9100,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {editing.connection === 'bluetooth' && (
                <div className="sm:col-span-2">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    MAC адрес
                  </Label>
                  <Input
                    value={editing.bluetoothMac ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, bluetoothMac: e.target.value })
                    }
                    placeholder="AA:BB:CC:DD:EE:FF"
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Сопряжение происходит из браузера через Web Bluetooth.
                  </p>
                </div>
              )}
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Ширина бумаги
                </Label>
                <Select
                  value={editing.paperWidth ?? '80mm'}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      paperWidth: v as '80mm' | '58mm',
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80 мм</SelectItem>
                    <SelectItem value="58mm">58 мм</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <span className="text-sm font-medium">
                    По умолчанию для типа «{TYPE_LABELS[editing.type ?? 'RECEIPT']}»
                  </span>
                  <Switch
                    checked={!!editing.isDefault}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, isDefault: v })
                    }
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <span className="text-sm font-medium">Активен</span>
                  <Switch
                    checked={editing.isActive ?? true}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, isActive: v })
                    }
                  />
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              <X className="mr-1.5 h-4 w-4" /> Отмена
            </Button>
            <Button onClick={save} disabled={busy || !editing?.name?.trim()}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
