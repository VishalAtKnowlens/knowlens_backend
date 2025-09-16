import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/password.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

/**
 * Seed data for development and testing
 */
const seedData = {
  organizations: [
    {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      logoUrl: 'https://via.placeholder.com/200x80/4F46E5/FFFFFF?text=ACME',
      language: 'en'
    },
    {
      name: 'TechStart Inc',
      slug: 'techstart-inc',
      logoUrl: 'https://via.placeholder.com/200x80/059669/FFFFFF?text=TechStart',
      language: 'en'
    },
    {
      name: 'Global Solutions SA',
      slug: 'global-solutions',
      logoUrl: 'https://via.placeholder.com/200x80/DC2626/FFFFFF?text=Global',
      language: 'es'
    }
  ],
  
  roles: [
    {
      name: 'admin',
      description: 'Full system administrator with all permissions',
      permissions: ['*'], // Wildcard permission for everything
      isDefault: false
    },
    {
      name: 'user',
      description: 'Standard user with basic permissions',
      permissions: ['profile:read', 'profile:update', 'organization:read'],
      isDefault: true
    },
    {
      name: 'manager',
      description: 'Manager with user management permissions',
      permissions: [
        'profile:read', 'profile:update', 'organization:read',
        'user_management:read', 'user_management:create', 'user_management:update'
      ],
      isDefault: false
    },
    {
      name: 'viewer',
      description: 'Read-only access to basic information',
      permissions: ['profile:read', 'organization:read'],
      isDefault: false
    }
  ],
  
  users: [
    {
      email: 'admin@acme.com',
      password: 'AdminPass123!',
      firstName: 'John',
      lastName: 'Admin',
      language: 'en',
      employeeId: 'EMP001',
      roles: ['admin']
    },
    {
      email: 'manager@acme.com',
      password: 'ManagerPass123!',
      firstName: 'Jane',
      lastName: 'Manager',
      language: 'en',
      employeeId: 'EMP002',
      roles: ['manager']
    },
    {
      email: 'user@acme.com',
      password: 'UserPass123!',
      firstName: 'Bob',
      lastName: 'User',
      language: 'en',
      employeeId: 'EMP003',
      roles: ['user']
    },
    {
      email: 'viewer@acme.com',
      password: 'ViewerPass123!',
      firstName: 'Alice',
      lastName: 'Viewer',
      language: 'en',
      employeeId: 'EMP004',
      roles: ['viewer']
    },
    {
      email: 'admin@techstart.com',
      password: 'TechAdmin123!',
      firstName: 'Mike',
      lastName: 'Tech',
      language: 'en',
      roles: ['admin']
    },
    {
      email: 'usuario@global.com',
      password: 'GlobalUser123!',
      firstName: 'Carlos',
      lastName: 'García',
      language: 'es',
      employeeId: 'EMP005',
      roles: ['user', 'manager']
    }
  ]
}

/**
 * Clear all existing data (use with caution!)
 */
async function clearDatabase() {
  console.log('🧹 Clearing existing data...')
  
  // Delete in correct order to respect foreign key constraints
  await prisma.refreshToken.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.organisation.deleteMany()
  
  console.log('✅ Database cleared')
}

/**
 * Seed organizations
 */
async function seedOrganizations() {
  console.log('🏢 Seeding organizations...')
  
  const organizations = []
  
  for (const orgData of seedData.organizations) {
    const organization = await prisma.organisation.create({
      data: orgData
    })
    
    organizations.push(organization)
    console.log(`  ✅ Created organization: ${organization.name} (${organization.slug})`)
  }
  
  return organizations
}

/**
 * Seed roles for each organization
 */
async function seedRoles(organizations) {
  console.log('👥 Seeding roles...')
  
  const allRoles = []
  
  for (const organization of organizations) {
    console.log(`  Creating roles for ${organization.name}...`)
    
    for (const roleData of seedData.roles) {
      const role = await prisma.role.create({
        data: {
          ...roleData,
          organisationId: organization.id
        }
      })
      
      allRoles.push({ ...role, organisationSlug: organization.slug })
      console.log(`    ✅ Created role: ${role.name}`)
    }
  }
  
  return allRoles
}

/**
 * Seed users with role assignments
 */
async function seedUsers(organizations, roles) {
  console.log('👤 Seeding users...')
  
  // Group roles by organization
  const rolesByOrg = {}
  for (const role of roles) {
    if (!rolesByOrg[role.organisationId]) {
      rolesByOrg[role.organisationId] = []
    }
    rolesByOrg[role.organisationId].push(role)
  }
  
  for (const userData of seedData.users) {
    // Determine organization based on email domain
    let targetOrg
    if (userData.email.includes('@acme.com')) {
      targetOrg = organizations.find(org => org.slug === 'acme-corp')
    } else if (userData.email.includes('@techstart.com')) {
      targetOrg = organizations.find(org => org.slug === 'techstart-inc')
    } else if (userData.email.includes('@global.com')) {
      targetOrg = organizations.find(org => org.slug === 'global-solutions')
    }
    
    if (!targetOrg) {
      console.log(`  ⚠️ Skipping user ${userData.email} - no matching organization`)
      continue
    }
    
    // Hash password
    const hashedPassword = await hashPassword(userData.password)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        language: userData.language,
        employeeId: userData.employeeId,
        organisationId: targetOrg.id,
        emailVerified: true // Set as verified for demo purposes
      }
    })
    
    // Assign roles
    const orgRoles = rolesByOrg[targetOrg.id]
    for (const roleName of userData.roles) {
      const role = orgRoles.find(r => r.name === roleName)
      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id
          }
        })
        console.log(`    ✅ Assigned ${roleName} role to ${user.email}`)
      }
    }
    
    console.log(`  ✅ Created user: ${user.email} (${user.firstName} ${user.lastName})`)
  }
}

/**
 * Display seeded data summary
 */
async function displaySummary() {
  console.log('\\n📊 Seeding Summary:')
  
  const organizations = await prisma.organisation.findMany({
    include: {
      _count: {
        select: {
          users: true,
          roles: true
        }
      }
    }
  })
  
  for (const org of organizations) {
    console.log(`\\n🏢 ${org.name} (${org.slug}):`)
    console.log(`   👥 Users: ${org._count.users}`)
    console.log(`   🎭 Roles: ${org._count.roles}`)
    console.log(`   🌐 Language: ${org.language}`)
  }
  
  // Display sample credentials
  console.log('\\n🔐 Sample Login Credentials:')
  console.log('├─ Admin (Acme Corp):')
  console.log('│  📧 Email: admin@acme.com')
  console.log('│  🔑 Password: AdminPass123!')
  console.log('│')
  console.log('├─ Manager (Acme Corp):')
  console.log('│  📧 Email: manager@acme.com')
  console.log('│  🔑 Password: ManagerPass123!')
  console.log('│')
  console.log('├─ User (Acme Corp):')
  console.log('│  📧 Email: user@acme.com')
  console.log('│  🔑 Password: UserPass123!')
  console.log('│')
  console.log('├─ Admin (TechStart):')
  console.log('│  📧 Email: admin@techstart.com')
  console.log('│  🔑 Password: TechAdmin123!')
  console.log('│')
  console.log('└─ User/Manager (Global Solutions):')
  console.log('   📧 Email: usuario@global.com')
  console.log('   🔑 Password: GlobalUser123!')
}

/**
 * Main seeding function
 */
async function main() {
  try {
    console.log('🌱 Starting database seeding...')
    console.log('⚠️  This will clear all existing data!')
    
    // In production, add confirmation prompt
    if (process.env.NODE_ENV === 'production') {
      console.log('❌ Seeding is disabled in production environment')
      process.exit(1)
    }
    
    // Clear existing data
    await clearDatabase()
    
    // Seed data in order
    const organizations = await seedOrganizations()
    const roles = await seedRoles(organizations)
    await seedUsers(organizations, roles)
    
    // Display summary
    await displaySummary()
    
    console.log('\\n✅ Database seeding completed successfully!')
    console.log('🚀 You can now start the server and test the API')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((error) => {
      console.error('❌ Fatal error during seeding:', error)
      process.exit(1)
    })
}

export default main
