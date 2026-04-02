
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const admins = await prisma.admin.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            allowedTabs: true
        }
    })

    console.log('Found admins:', admins.length)
    console.log(JSON.stringify(admins, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
