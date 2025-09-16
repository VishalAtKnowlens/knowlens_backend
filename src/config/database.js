import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create Prisma client instance
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
})

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Test database connection
export async function connectDatabase() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  }
}

// Clean expired refresh tokens
export async function cleanupExpiredTokens() {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} expired refresh tokens`)
    }
  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error.message)
  }
}

// Run cleanup periodically (every hour)
if (process.env.NODE_ENV === 'production') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000) // 1 hour
}

export default prisma
