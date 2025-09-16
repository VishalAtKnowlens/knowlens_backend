import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Create sample organisation
  const organisation = await prisma.organisation.upsert({
    where: { id: "org_sample_123" },
    update: {},
    create: {
      id: "org_sample_123",
      name: "Sample Organisation",
      slug: "sample",
      language: "en",
      isActive: true,
    },
  })

  console.log("✅ Created organisation:", organisation.name)

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { id: "role_admin_123" },
    update: {},
    create: {
      id: "role_admin_123",
      name: "admin",
      description: "Organisation Administrator",
      permissions: [
        "users.read",
        "users.write",
        "users.delete",
        "roles.read",
        "roles.write",
        "roles.delete",
        "organisation.read",
        "organisation.write",
      ],
      organisationId: organisation.id,
    },
  })

  console.log("✅ Created admin role")

  // Create user role
  const userRole = await prisma.role.upsert({
    where: { id: "role_user_123" },
    update: {},
    create: {
      id: "role_user_123",
      name: "user",
      description: "Regular User",
      permissions: ["profile.read", "profile.write"],
      organisationId: organisation.id,
    },
  })

  console.log("✅ Created user role")

  // Create sample admin user (password: admin123)
  const hashedPassword = await bcrypt.hash("admin123", 12)

  const adminUser = await prisma.user.upsert({
    where: { id: "user_admin_123" },
    update: {},
    create: {
      id: "user_admin_123",
      email: "admin@sample.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      language: "en",
      isActive: true,
      emailVerified: true,
      organisationId: organisation.id,
    },
  })

  console.log("✅ Created admin user:", adminUser.email)

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { id: "ur_admin_123" },
    update: {},
    create: {
      id: "ur_admin_123",
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  })

  console.log("✅ Assigned admin role to admin user")
  console.log("🎉 Database seeded successfully!")
  console.log("\n📋 Test credentials:")
  console.log("Email: admin@sample.com")
  console.log("Password: admin123")
  console.log("Organisation ID: org_sample_123")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
