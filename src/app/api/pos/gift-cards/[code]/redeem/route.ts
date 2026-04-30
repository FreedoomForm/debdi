import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requirePosAuth,
  badRequest,
  notFound,
  serverError,
} from '@/lib/pos/auth'

/**
 * POST /api/pos/gift-cards/[code]/redeem
 *
 * Decrements the card balance by `amount`. Refuses if the card is inactive,
 * expired, or doesn't have enough balance.
 */
const bodySchema = z.object({
  amount: z.number().positive(),
  orderId: z.string().nullable().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { code } = await params
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return badRequest(parsed.error.message)

  try {
    const card = await db.giftCard.findFirst({
      where: { code: code.toUpperCase(), ownerAdminId: ctx.ownerAdminId },
    })
    if (!card) return notFound('gift_card_not_found')
    if (!card.isActive) return badRequest('gift_card_inactive')
    if (card.expiresAt && card.expiresAt.getTime() < Date.now()) {
      return badRequest('gift_card_expired')
    }
    if (card.balance < parsed.data.amount) {
      return badRequest('insufficient_balance')
    }

    const updated = await db.$transaction(async (tx) => {
      const card2 = await tx.giftCard.update({
        where: { id: card.id },
        data: { balance: { decrement: parsed.data.amount } },
      })
      await tx.giftCardRedemption.create({
        data: {
          giftCardId: card.id,
          orderId: parsed.data.orderId ?? null,
          amount: parsed.data.amount,
          performedBy: ctx.user.id,
        },
      })
      return card2
    })

    return NextResponse.json({ item: updated })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
