import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'super@admin.com'
    const password = 'Test123!@#'

    console.log(`Checking user: ${email}`)

    const user = await prisma.admin.findUnique({
        where: { email }
    })

    if (!user) {
        console.error('❌ User not found!')
        return
    }

    console.log('✅ User found:', user.id, user.role)
    console.log('Stored password hash:', user.password)

    const isValid = await compare(password, user.password || '')

    if (isValid) {
        console.log('✅ Password matches!')
    } else {
        console.error('❌ Password does NOT match!')
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
