import { OrderDetail } from '@/lume-modules/09-order-detail/order-detail'
import type { Order } from '@/lume-modules/08-orders'

const SAMPLE: Order = {
  id: 'demo', number: '2026-0001', status: 'PREPARING',
  total: 245000, currency: 'UZS',
  customerId: 'c1', customerName: 'Азиз К.', customerPhone: '+998 90 123 45 67',
  address: 'г. Ташкент, ул. Амира Темура, 12',
  items: [
    { id: 'i1', name: 'Овсянка с ягодами', qty: 2, price: 35000 },
    { id: 'i2', name: 'Куриная грудка', qty: 1, price: 60000 },
    { id: 'i3', name: 'Салат «Цезарь»', qty: 1, price: 70000 },
  ],
  notes: 'Без лука, оставить у двери',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}

export default function Page() { return <OrderDetail order={SAMPLE} /> }
