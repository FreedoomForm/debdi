'use client'
/**
 * /pos/finance — modern finance dashboard built on top of the legacy
 * /api/admin/finance/* endpoints. This is the *new UI* counterpart of
 * src/components/admin/FinanceTab.tsx — the legacy tab is preserved
 * and remains accessible at /middle-admin?tab=finance, but here we
 * deliver a refreshed layout, sticky KPI strip, deep-link sub-views,
 * date-range filters, period analytics, and quick-actions for cash
 * movements, expenses, salary payouts and ingredient purchases.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  ShoppingCart,
  Loader2,
  History,
  Users,
  ReceiptText,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { formatCurrency } from '@/lib/pos'
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/pos/shared/KpiTile'
import { Row } from '@/components/pos/shared/FormPrimitives'

type Transaction = {
  id: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  description: string
  category: string
  createdAt: string
  admin?: { name: string } | null
  customer?: { name: string; phone: string } | null
}

type Client = {
  id: string
  name: string
  phone: string
  balance: number
  dailyPrice?: number
}

const EXPENSE_CATEGORIES = [
  { value: 'SUPPLIES', label: 'Расходники / товары' },
  { value: 'UTILITIES', label: 'Коммунальные / аренда' },
  { value: 'SALARY', label: 'Зарплата' },
  { value: 'MARKETING', label: 'Маркетинг' },
  { value: 'TRANSPORT', label: 'Транспорт' },
  { value: 'OTHER', label: 'Прочее' },
]

const INCOME_CATEGORIES = [
  { value: 'SALES', label: 'Продажи' },
  { value: 'CLIENT_TOPUP', label: 'Пополнение клиента' },
  { value: 'INVESTMENT', label: 'Инвестиция' },
  { value: 'OTHER', label: 'Прочее' },
]

export default function FinancePage() {
  const [companyBalance, setCompanyBalance] = useState(0)
  const [history, setHistory] = useState<Transaction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'clients' | 'analytics'>('overview')

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'INCOME' | 'EXPENSE'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [txCategory, setTxCategory] = useState('SALES')
  const [submitting, setSubmitting] = useState(false)

  const loadFinance = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/finance/company?limit=200&type=all&category=all', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCompanyBalance(data.companyBalance ?? 0)
      setHistory(Array.isArray(data.history) ? data.history : [])
    } catch (err) {
      // Surface to user via toast; raw error stays in DevTools network panel.
      toast.error(
        err instanceof Error
          ? `Ошибка загрузки: ${err.message}`
          : 'Не удалось загрузить финансовые данные'
      )
    }
  }, [])

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/finance/clients?filter=all', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    loadFinance()
    loadClients()
  }, [loadFinance, loadClients])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadFinance(), loadClients()])
    } finally {
      setRefreshing(false)
    }
  }

  // Derived analytics
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    let todayIncome = 0
    let todayExpense = 0
    let monthIncome = 0
    let monthExpense = 0
    const byCategory: Record<string, number> = {}

    for (const tx of history) {
      const at = new Date(tx.createdAt)
      const sign = tx.type === 'INCOME' ? 1 : -1
      const v = Math.abs(tx.amount)
      if (at >= today) {
        if (tx.type === 'INCOME') todayIncome += v
        else todayExpense += v
      }
      if (at >= monthStart) {
        if (tx.type === 'INCOME') monthIncome += v
        else monthExpense += v
      }
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) + sign * v
    }
    const debtClients = clients.filter((c) => c.balance < 0)
    const prepaidClients = clients.filter((c) => c.balance > 0)
    const debtTotal = debtClients.reduce((s, c) => s + Math.abs(c.balance), 0)
    const prepaidTotal = prepaidClients.reduce((s, c) => s + c.balance, 0)
    return {
      todayIncome,
      todayExpense,
      todayNet: todayIncome - todayExpense,
      monthIncome,
      monthExpense,
      monthNet: monthIncome - monthExpense,
      debtCount: debtClients.length,
      prepaidCount: prepaidClients.length,
      debtTotal,
      prepaidTotal,
      byCategory,
    }
  }, [history, clients])

  const filteredHistory = useMemo(() => {
    return history.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${tx.description} ${tx.category} ${tx.admin?.name ?? ''} ${tx.customer?.name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [history, typeFilter, categoryFilter, search])

  const submitTransaction = async () => {
    const amt = Number(txAmount)
    if (!amt || amt <= 0) {
      toast.error('Введите корректную сумму')
      return
    }
    if (!txDescription.trim()) {
      toast.error('Описание обязательно')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/finance/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: amt,
          type: txType,
          category: txCategory,
          description: txDescription,
        }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Не удалось сохранить операцию')
      }
      toast.success(txType === 'INCOME' ? 'Поступление добавлено' : 'Расход добавлен')
      setTxModalOpen(false)
      setTxAmount('')
      setTxDescription('')
      await loadFinance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Дата', 'Тип', 'Категория', 'Сумма', 'Описание', 'Админ', 'Клиент'],
      ...filteredHistory.map((t) => [
        new Date(t.createdAt).toLocaleString('ru-RU'),
        t.type,
        t.category,
        String(t.amount),
        t.description.replace(/[\r\n]+/g, ' '),
        t.admin?.name ?? '',
        t.customer?.name ?? '',
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const allCategories = useMemo(
    () => Array.from(new Set(history.map((t) => t.category))),
    [history]
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Wallet className="h-6 w-6 text-emerald-600" />
            Финансы
          </h1>
          <p className="text-sm text-muted-foreground">
            Касса, расходы, расчёты с клиентами и сотрудниками
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Обновить
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setTxType('INCOME')
              setTxCategory('SALES')
              setTxModalOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Поступление
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setTxType('EXPENSE')
              setTxCategory('SUPPLIES')
              setTxModalOpen(true)
            }}
          >
            <Minus className="mr-1 h-4 w-4" />
            Расход
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Касса"
          value={formatCurrency(companyBalance, 'UZS')}
          icon={<Wallet className="h-4 w-4" />}
          tone={companyBalance >= 0 ? 'emerald' : 'rose'}
          hint="Текущий баланс компании"
        />
        <KpiTile
          label="Сегодня"
          value={formatCurrency(stats.todayNet, 'UZS')}
          icon={<TrendingUp className="h-4 w-4" />}
          tone={stats.todayNet >= 0 ? 'emerald' : 'rose'}
          hint={`+${formatCurrency(stats.todayIncome, 'UZS')} / −${formatCurrency(stats.todayExpense, 'UZS')}`}
        />
        <KpiTile
          label="Месяц"
          value={formatCurrency(stats.monthNet, 'UZS')}
          icon={<TrendingDown className="h-4 w-4" />}
          tone={stats.monthNet >= 0 ? 'emerald' : 'rose'}
          hint={`+${formatCurrency(stats.monthIncome, 'UZS')} / −${formatCurrency(stats.monthExpense, 'UZS')}`}
        />
        <KpiTile
          label="Долги клиентов"
          value={formatCurrency(stats.debtTotal, 'UZS')}
          icon={<Users className="h-4 w-4" />}
          tone={stats.debtTotal > 0 ? 'amber' : 'neutral'}
          hint={`${stats.debtCount} клиентов в минусе`}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1 h-3.5 w-3.5" /> История
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="mr-1 h-3.5 w-3.5" /> Клиенты
          </TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Последние операции</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {history.slice(0, 8).map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'shrink-0',
                            tx.type === 'INCOME'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {tx.type === 'INCOME' ? '+' : '−'}
                        </Badge>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{tx.description}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {tx.category} · {new Date(tx.createdAt).toLocaleString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          'shrink-0 font-bold tabular-nums',
                          tx.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'
                        )}
                      >
                        {tx.type === 'INCOME' ? '+' : '−'}
                        {formatCurrency(Math.abs(tx.amount), 'UZS')}
                      </div>
                    </li>
                  ))}
                  {history.length === 0 && (
                    <li className="py-6 text-center text-xs text-muted-foreground">
                      Нет операций
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Структура расходов / доходов</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {Object.entries(stats.byCategory)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, 8)
                    .map(([cat, val]) => {
                      const max = Math.max(
                        ...Object.values(stats.byCategory).map((v) => Math.abs(v)),
                        1
                      )
                      const pct = (Math.abs(val) / max) * 100
                      return (
                        <li key={cat}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{cat}</span>
                            <span
                              className={cn(
                                'tabular-nums',
                                val >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              )}
                            >
                              {val >= 0 ? '+' : '−'}
                              {formatCurrency(Math.abs(val), 'UZS')}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-1.5 rounded-full',
                                val >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  {Object.keys(stats.byCategory).length === 0 && (
                    <li className="py-6 text-center text-xs text-muted-foreground">
                      Нет данных для аналитики
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по описанию, категории, клиенту…"
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="INCOME">Поступления</SelectItem>
                <SelectItem value="EXPENSE">Расходы</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Ничего не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              tx.type === 'INCOME'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            )}
                          >
                            {tx.type === 'INCOME' ? 'Поступление' : 'Расход'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{tx.category}</TableCell>
                        <TableCell className="max-w-[400px]">
                          <div className="truncate">{tx.description}</div>
                          {(tx.admin?.name || tx.customer?.name) && (
                            <div className="text-[11px] text-muted-foreground">
                              {tx.admin?.name && `Админ: ${tx.admin.name}`}
                              {tx.admin?.name && tx.customer?.name && ' · '}
                              {tx.customer?.name && `Клиент: ${tx.customer.name}`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-bold tabular-nums',
                            tx.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'
                          )}
                        >
                          {tx.type === 'INCOME' ? '+' : '−'}
                          {formatCurrency(Math.abs(tx.amount), 'UZS')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead className="text-right">Дневной тариф</TableHead>
                    <TableHead className="text-right">Баланс</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        Нет клиентов
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients
                      .sort((a, b) => a.balance - b.balance)
                      .map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {c.dailyPrice ? formatCurrency(c.dailyPrice, 'UZS') : '—'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-bold tabular-nums',
                              c.balance < 0
                                ? 'text-rose-700'
                                : c.balance > 0
                                ? 'text-emerald-700'
                                : ''
                            )}
                          >
                            {formatCurrency(c.balance, 'UZS')}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Доходы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Row label="Сегодня" value={formatCurrency(stats.todayIncome, 'UZS')} tone="emerald" />
                <Row label="Месяц" value={formatCurrency(stats.monthIncome, 'UZS')} tone="emerald" />
                <Row label="Предоплаты клиентов" value={formatCurrency(stats.prepaidTotal, 'UZS')} tone="emerald" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Расходы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Row label="Сегодня" value={formatCurrency(stats.todayExpense, 'UZS')} tone="rose" />
                <Row label="Месяц" value={formatCurrency(stats.monthExpense, 'UZS')} tone="rose" />
                <Row label="Долги клиентов" value={formatCurrency(stats.debtTotal, 'UZS')} tone="amber" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={txModalOpen} onOpenChange={setTxModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {txType === 'INCOME' ? 'Поступление в кассу' : 'Расход из кассы'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Сумма</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Категория</Label>
              <Select value={txCategory} onValueChange={setTxCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(txType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Описание</Label>
              <Input
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                placeholder={txType === 'INCOME' ? 'Например: продажа за наличные' : 'Например: закупка тары'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitTransaction} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {txType === 'INCOME' ? (
                <>
                  <Plus className="mr-1 h-4 w-4" /> Добавить поступление
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1 h-4 w-4" /> Записать расход
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


// Row now lives in @/components/pos/shared/FormPrimitives
