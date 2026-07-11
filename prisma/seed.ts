import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = "pcgadminRRY";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.personnel.upsert({
    where: { employeeNumber: "ADMIN001" },
    update: { passwordHash },
    create: {
      employeeNumber: "ADMIN001",
      firstName: "System",
      lastName: "Admin",
      rank: "Administrator",
      office: "IT",
      contactNumber: "000-0000",
      isAdmin: true,
      passwordHash,
    },
  });

  console.log("✓ Default admin ready:");
  console.log("  Employee Number: ADMIN001");
  console.log(`  Password:        ${password}`);
  console.log("  → Change this password immediately after first login.");
  console.log(`  ID: ${admin.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
