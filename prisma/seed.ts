import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = 'admin123'
  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.personnel.upsert({
    where: { employeeNumber: 'ADMIN001' },
    update: {},
    create: {
      employeeNumber: 'ADMIN001',
      firstName: 'System',
      lastName: 'Admin',
      rank: 'Administrator',
      office: 'IT',
      contactNumber: '000-0000',
      isAdmin: true,
      passwordHash,
    },
  })

  console.log('✓ Default admin created:')
  console.log('  Employee Number: ADMIN001')
  console.log('  Password:        admin123')
  console.log('  → Change this password immediately after first login.')
  console.log(`  ID: ${admin.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
