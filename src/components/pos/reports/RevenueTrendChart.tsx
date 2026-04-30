'use client'
/**
 * Revenue trend chart for /pos/reports.
 *
 * Renders a dual-axis area + line chart of revenue and orders for the
 * selected date range. Uses recharts (already in dependencies).
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/pos'

type Point = { date: string; revenue: number; orders: number }

export function RevenueTrendChart({ series }: { series: Point[] }) {
  if (series.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Нет данных за выбранный период
      </p>
    )
  }
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sorted} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d: string) => d.slice(5)}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1000
                  ? `${(v / 1000).toFixed(0)}K`
                  : String(v)
            }
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
            }}
            formatter={(value: number, name: string) =>
              name === 'revenue'
                ? [formatCurrency(value, 'UZS'), 'Выручка']
                : [String(value), 'Заказов']
            }
            labelFormatter={(d: string) => d}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(v: string) => (v === 'revenue' ? 'Выручка' : 'Заказы')}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
