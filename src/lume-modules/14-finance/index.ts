/** Module 14: Finance */
export type FinanceTransaction = {
  id: string
  type: 'income' | 'expense' | 'salary' | 'ingredient_purchase' | 'refund'
  amount: number
  currency: string
  description: string
  category: string
  relatedId?: string
  createdAt: string
  createdBy: string
}

export type FinanceSummary = {
  income: number
  expenses: number
  salaries: number
  ingredients: number
  netProfit: number
  pendingPayouts: number
}

export async function fetchFinanceSummary(range: string) {
  const r = await fetch(`/api/admin/finance?range=${range}`)
  return r.json()
}

export async function createTransaction(t: Partial<FinanceTransaction>) {
  const r = await fetch('/api/admin/finance/transaction', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(t),
  })
  return r.json()
}

export async function fetchAdminBalances() {
  const r = await fetch('/api/admin/finance/admin-balances')
  return r.json()
}
