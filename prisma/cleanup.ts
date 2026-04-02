import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Cleaning up database...')

    // Order matters for FK constraints
    await prisma.actionLog.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.order.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.menuSet.deleteMany()
    await prisma.warehouseItem.deleteMany()
    await prisma.message.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.account.deleteMany()

    // Keep admins but maybe clear non-super admins?
    await prisma.admin.deleteMany({
        where: { role: { not: 'SUPER_ADMIN' } }
    })

    // We keep Menus and Dishes as they are seeded by prisma db seed which we'll run
    await prisma.menu.deleteMany()
    await prisma.dish.deleteMany()

    console.log('✅ Cleanup finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
