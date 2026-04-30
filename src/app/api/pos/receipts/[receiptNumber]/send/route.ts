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
 * POST /api/pos/receipts/:receiptNumber/send
 *
 * Sends a receipt to the customer via email and/or SMS, mirroring
 * Square's "send receipt" workflow. The actual delivery is delegated to
 * the platform's transactional channels (Notification rows) — picked up
 * by an out-of-band worker that connects to SES / Twilio / similar.
 *
 * Body: { email?, phone? } — at least one required.
 *
 * Side effects:
 *   1. Updates Receipt.emailedTo / smsTo for audit.
 *   2. Inserts one Notification per channel (type SYSTEM) so the worker
 *      can pick them up; the title/body include a deep link to the
 *      hosted receipt page (/r/<receiptNumber>).
 */
const bodySchema = z
  .object({
    email: z.string().trim().email().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 \-()]{6,20}$/, 'Invalid phone')
      .optional(),
  })
  .refine((d) => d.email || d.phone, {
    message: 'At least one of email/phone is required',
  })

type Ctx = { params: Promise<{ receiptNumber: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const ctx = await requirePosAuth(request)
  if (ctx instanceof NextResponse) return ctx
  const { receiptNumber } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload')
  }
  const { email, phone } = parsed.data

  // Verify ownership via order → ownerAdminId.
  const receipt = await db.receipt.findUnique({
    where: { receiptNumber },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          ownerAdminId: true,
          grandTotal: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  })
  if (!receipt || receipt.order.ownerAdminId !== ctx.ownerAdminId) {
    return notFound('Чек не найден')
  }

  try {
    const baseUrl =
      request.headers.get('x-forwarded-proto') && request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
        : new URL(request.url).origin
    const link = `${baseUrl}/r/${receipt.receiptNumber}`

    // Persist contact address(es) on the receipt for audit.
    await db.receipt.update({
      where: { id: receipt.id },
      data: {
        ...(email ? { emailedTo: email } : {}),
        ...(phone ? { smsTo: phone } : {}),
      },
    })

    // Queue notifications for an out-of-band worker.
    const inserts: Promise<unknown>[] = []
    if (email) {
      inserts.push(
        db.notification.create({
          data: {
            ownerAdminId: ctx.ownerAdminId,
            type: 'SYSTEM',
            title: `Receipt #${receipt.order.orderNumber} → ${email}`,
            body: `Email-доставка чека «${receipt.receiptNumber}» поставлена в очередь. Ссылка: ${link}`,
            link,
          },
        })
      )
    }
    if (phone) {
      inserts.push(
        db.notification.create({
          data: {
            ownerAdminId: ctx.ownerAdminId,
            type: 'SYSTEM',
            title: `Receipt #${receipt.order.orderNumber} → ${phone}`,
            body: `SMS-доставка чека «${receipt.receiptNumber}» поставлена в очередь. Ссылка: ${link}`,
            link,
          },
        })
      )
    }
    await Promise.all(inserts)

    return NextResponse.json({
      ok: true,
      sentEmail: email ?? null,
      sentPhone: phone ?? null,
      hostedUrl: link,
    })
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'unknown_error')
  }
}
