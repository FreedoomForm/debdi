'use client'
/**
 * POS settings — top-level operations configuration page.
 *
 * Surfaces the most-used preferences for a POS-running business:
 * • store details (name / phone / address shown on receipts)
 * • currency, tax rate, service charge
 * • receipt footer text
 * • feature toggles (loyalty / tip line / kitchen ticket auto-print)
 *
 * Persists to localStorage for now (per-cashier preferences). Server-side
 * persistence per-owner can layer on top later via /api/pos/settings.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  Check,
  Cog,
  Globe,
  Monitor,
  Moon,
  Palette,
  Percent,
  Receipt,
  Save,
  Sun,
} from 'lucide-react'
import { useAdminSettings } from '@/hooks/useAdminSettings'
import { cn } from '@/lib/utils'
import { PosPageHeader } from '@/components/pos/shared/PosPageHeader'
import { Field, Toggle, LinkRow } from '@/components/pos/shared/FormPrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STORAGE_KEY = 'debdi:pos:settings:v1'

type PosSettings = {
  storeName: string
  storeAddress: string
  storePhone: string
  receiptFooter: string
  currency: 'UZS' | 'USD' | 'EUR' | 'RUB' | 'KZT' | 'TJS'
  taxRate: number // 0..1
  serviceChargeRate: number // 0..1
  loyaltyEnabled: boolean
  tipLineOnReceipt: boolean
  autoPrintKitchen: boolean
  receiptPaperWidth: '80mm' | '58mm'
}

const DEFAULTS: PosSettings = {
  storeName: 'Debdi POS',
  storeAddress: '',
  storePhone: '',
  receiptFooter: 'Спасибо за покупку!',
  currency: 'UZS',
  taxRate: 0,
  serviceChargeRate: 0,
  loyaltyEnabled: true,
  tipLineOnReceipt: false,
  autoPrintKitchen: true,
  receiptPaperWidth: '80mm',
}

function load(): PosSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PosSettings>) }
  } catch {
    return DEFAULTS
  }
}

export function SettingsPage() {
  const [settings, setSettings] = useState<PosSettings>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const {
    settings: uiSettings,
    updateSettings: updateUiSettings,
    mounted: uiMounted,
  } = useAdminSettings()

  useEffect(() => {
    setSettings(load())
    setHydrated(true)
  }, [])

  const set = <K extends keyof PosSettings>(key: K, value: PosSettings[K]) => {
    setSettings((p) => ({ ...p, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      toast.success('Сохранено')
    } catch (err) {
      toast.error(
        err instanceof Error ? `Ошибка: ${err.message}` : 'Не удалось'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="grid h-screen place-items-center text-sm text-muted-foreground">
          Загрузка…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PosPageHeader
        title="Настройки"
        icon={<Cog className="h-4 w-4 text-amber-500" />}
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Check className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Сохранить
          </Button>
        }
      />

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-amber-500" />
              Информация о заведении
            </CardTitle>
            <CardDescription>
              Используется в шапке чека и при экспорте отчётов.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Название*" full>
              <Input
                value={settings.storeName}
                onChange={(e) => set('storeName', e.target.value)}
              />
            </Field>
            <Field label="Адрес" full>
              <Input
                value={settings.storeAddress}
                onChange={(e) => set('storeAddress', e.target.value)}
              />
            </Field>
            <Field label="Телефон">
              <Input
                value={settings.storePhone}
                onChange={(e) => set('storePhone', e.target.value)}
                placeholder="+998..."
              />
            </Field>
            <Field label="Подпись чека">
              <Input
                value={settings.receiptFooter}
                onChange={(e) => set('receiptFooter', e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-amber-500" />
              Валюта и налоги
            </CardTitle>
            <CardDescription>
              Применяется ко всем заказам по-умолчанию. Конкретные товары
              могут переопределить ставку.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field label="Валюта">
              <Select
                value={settings.currency}
                onValueChange={(v) =>
                  set('currency', v as PosSettings['currency'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UZS">UZS — Узбекский сум</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="RUB">RUB — Российский рубль</SelectItem>
                  <SelectItem value="KZT">KZT — Тенге</SelectItem>
                  <SelectItem value="TJS">TJS — Сомони</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="НДС / Налог (%)">
              <Input
                type="number"
                inputMode="numeric"
                value={Math.round(settings.taxRate * 1000) / 10}
                onChange={(e) =>
                  set('taxRate', (Number(e.target.value) || 0) / 100)
                }
              />
            </Field>
            <Field label="Сервисный сбор (%)">
              <Input
                type="number"
                inputMode="numeric"
                value={Math.round(settings.serviceChargeRate * 1000) / 10}
                onChange={(e) =>
                  set(
                    'serviceChargeRate',
                    (Number(e.target.value) || 0) / 100
                  )
                }
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-amber-500" />
              Чеки и печать
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Ширина бумаги">
              <Select
                value={settings.receiptPaperWidth}
                onValueChange={(v) =>
                  set('receiptPaperWidth', v as '80mm' | '58mm')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80 мм (стандарт)</SelectItem>
                  <SelectItem value="58mm">58 мм (компактные)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Toggle
              label="Авто-печать на кухню"
              hint="При закрытии заказа отправлять тикет на кухонный принтер"
              checked={settings.autoPrintKitchen}
              onChange={(v) => set('autoPrintKitchen', v)}
            />
            <Toggle
              label="Строка чаевых на чеке"
              hint="Печатать пустую строку для чаевых на каждом чеке"
              checked={settings.tipLineOnReceipt}
              onChange={(v) => set('tipLineOnReceipt', v)}
            />
            <Toggle
              label="Программа лояльности"
              hint="Начислять и принимать к оплате баллы лояльности"
              checked={settings.loyaltyEnabled}
              onChange={(v) => set('loyaltyEnabled', v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4 text-amber-500" />
              Связанные разделы
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <LinkRow href="/pos/printers" label="Принтеры" desc="Кассовые, кухонные, барные" />
            <LinkRow href="/pos/categories" label="Категории" desc="Группы товаров" />
            <LinkRow href="/pos/discounts" label="Скидки и промо" desc="Купоны и акции" />
            <LinkRow href="/pos/loyalty" label="Лояльность" desc="Баллы и уровни" />
            <LinkRow href="/pos/employees" label="Сотрудники" desc="Роли и доступы" />
            <LinkRow href="/pos/branches" label="Филиалы" desc="Сеть локаций" />
          </CardContent>
        </Card>

        {/* Interface settings (migrated from legacy InterfaceSettings) */}
        {uiMounted && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-amber-500" />
                Интерфейс
              </CardTitle>
              <CardDescription>
                Персональные настройки этого браузера. Мигрированы из легаси
                «Настройки · Интерфейс» в старой админке.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Тема оформления
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={uiSettings.theme === 'light' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateUiSettings({ theme: 'light' })}
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Светлая
                  </Button>
                  <Button
                    type="button"
                    variant={uiSettings.theme === 'dark' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateUiSettings({ theme: 'dark' })}
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Тёмная
                  </Button>
                  <Button
                    type="button"
                    variant={uiSettings.theme === 'system' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateUiSettings({ theme: 'system' })}
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    Система
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Toggle
                  label="Компактный режим"
                  hint="Уменьшает отступы и размер элементов интерфейса"
                  checked={uiSettings.compactMode}
                  onChange={(v) => updateUiSettings({ compactMode: v })}
                />
                <Toggle
                  label="Показывать KPI-блок"
                  hint="Сводка выручки и заказов на дашборде"
                  checked={uiSettings.showStats}
                  onChange={(v) => updateUiSettings({ showStats: v })}
                />
                <Toggle
                  label="Анимации"
                  hint="Анимированные переходы и fade-in эффекты"
                  checked={uiSettings.enableAnimations}
                  onChange={(v) => updateUiSettings({ enableAnimations: v })}
                />
              </div>

              <div className="rounded-md border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                Полный вид старых настроек доступен по ссылке{' '}
                <a
                  href="/middle-admin?tab=interface"
                  className={cn(
                    'font-medium text-primary underline-offset-2 hover:underline'
                  )}
                >
                  /middle-admin?tab=interface
                </a>
                 — эти настройки синхронизированы в обоих UI.
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

// Field / Toggle / LinkRow now live in @/components/pos/shared/FormPrimitives
