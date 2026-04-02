import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const admins = await prisma.admin.findMany()
    console.log('Admins:', JSON.stringify(admins, null, 2))

    const superAdmin = await prisma.admin.findFirst({ where: { role: 'SUPER_ADMIN' } })
    console.log('Super Admin:', superAdmin)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
