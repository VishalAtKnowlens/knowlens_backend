import { beforeAll, afterAll } from 'vitest'
import { prisma } from '../src/config/database.js'

beforeAll(async () => {
  // Setup test database if needed
  console.log('Setting up tests...')
})

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect()
  console.log('Tests cleanup complete')
})