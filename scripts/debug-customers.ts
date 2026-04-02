import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const customers = await prisma.customer.findMany({
        select: {
            id: true,
            name: true,
            isActive: true,
            deliveryDays: true,
            calories: true
        }
    })
    console.log('Customers:', JSON.stringify(customers, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
