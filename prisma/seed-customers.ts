import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding test customers...')

    const superAdmin = await prisma.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })
    if (!superAdmin) {
        console.error('❌ Super admin not found. Run scripts/reset-admin.ts first.')
        return
    }

    const customers = [
        {
            name: 'John Doe',
            phone: '+998901234567',
            address: 'Tashkent, Uzbekistan',
            calories: 1600,
            deliveryDays: 'daily',
            isActive: true,
            createdBy: superAdmin.id,
        },
        {
            name: 'Jane Smith',
            phone: '+998907654321',
            address: 'Samarkand, Uzbekistan',
            calories: 2000,
            deliveryDays: 'even',
            isActive: true,
            createdBy: superAdmin.id,
        },
        {
            name: 'Bob Johnson',
            phone: '+998912345678',
            address: 'Bukhara, Uzbekistan',
            calories: 1200,
            deliveryDays: 'odd',
            isActive: true,
            createdBy: superAdmin.id,
        }
    ]

    for (const customer of customers) {
        // Check if exists
        const existing = await prisma.customer.findFirst({
            where: { phone: customer.phone, createdBy: customer.createdBy, deletedAt: null }
        })

        if (!existing) {
            await prisma.customer.create({
                data: customer,
            })
            console.log(`Created customer: ${customer.name}`)
        } else {
            console.log(`Customer ${customer.name} already exists.`)
        }
    }

    console.log('✅ Seeding customers finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
