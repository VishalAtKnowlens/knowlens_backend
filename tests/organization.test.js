import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { OrganizationService } from '../src/services/organization.js'
import { prisma } from '../src/config/database.js'

describe('Organization API Completeness Tests', () => {
  let testOrganization

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.organization.deleteMany({ where: { slug: { startsWith: 'test-' } } })
  })

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.division.deleteMany({ where: { organizationId: testOrganization?.id } })
      await prisma.organization.deleteMany({ where: { slug: { startsWith: 'test-' } } })
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  })

  describe('Organization Service CRUD Operations', () => {
    it('should create organization using OrganizationService.create', async () => {
      const orgData = {
        name: 'Test Service Organization',
        slug: 'test-service-org',
        logoUrl: 'https://example.com/logo.png'
      }

      const result = await OrganizationService.create(orgData, 'en')
      
      expect(result.success).toBe(true)
      expect(result.data.organization.name).toBe(orgData.name)
      expect(result.data.organization.slug).toBe(orgData.slug)
      
      testOrganization = result.data.organization
    })

    it('should get all organizations using OrganizationService.findAll', async () => {
      const result = await OrganizationService.findAll({ page: 1, limit: 10 }, 'en')
      
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data.organizations)).toBe(true)
      expect(result.data.pagination).toBeDefined()
      expect(result.data.pagination.page).toBe(1)
      expect(result.data.pagination.limit).toBe(10)
    })

    it('should get organization by ID using OrganizationService.findById', async () => {
      const result = await OrganizationService.findById(testOrganization.id, 'en')
      
      expect(result.success).toBe(true)
      expect(result.data.organization.id).toBe(testOrganization.id)
      expect(result.data.organization.name).toBe(testOrganization.name)
    })

    it('should update organization using OrganizationService.update', async () => {
      const updateData = {
        name: 'Updated Service Organization',
        logoUrl: 'https://example.com/new-logo.png'
      }

      const result = await OrganizationService.update(testOrganization.id, updateData, 'en')
      
      expect(result.success).toBe(true)
      expect(result.data.organization.name).toBe(updateData.name)
      expect(result.data.organization.logoUrl).toBe(updateData.logoUrl)
    })

    it('should create division using OrganizationService.createDivision', async () => {
      const divisionData = {
        name: 'Test Division',
        shortName: 'TD'
      }

      const result = await OrganizationService.createDivision(testOrganization.id, divisionData, 'en')
      
      expect(result.success).toBe(true)
      expect(result.data.division.name).toBe(divisionData.name)
      expect(result.data.division.shortName).toBe(divisionData.shortName)
      expect(result.data.division.organizationId).toBe(testOrganization.id)
    })

    it('should delete organization using OrganizationService.delete', async () => {
      const result = await OrganizationService.delete(testOrganization.id, 'en')
      
      expect(result.success).toBe(true)

      // Verify organization is soft deleted (status changed to INACTIVE)
      const deletedOrg = await prisma.organization.findUnique({
        where: { id: testOrganization.id }
      })
      expect(deletedOrg.status).toBe('INACTIVE')
    })
  })

  describe('Service Method Error Handling', () => {
    it('should handle duplicate slug creation', async () => {
      // First create an organization
      const orgData = {
        name: 'Duplicate Test Organization',
        slug: 'test-duplicate-org'
      }
      
      await OrganizationService.create(orgData, 'en')
      
      // Try to create another with same slug
      try {
        await OrganizationService.create(orgData, 'en')
        expect.fail('Should have thrown an error for duplicate slug')
      } catch (error) {
        expect(error.statusCode).toBe(409)
      }
    })

    it('should handle non-existent organization lookup', async () => {
      try {
        await OrganizationService.findById(99999, 'en')
        expect.fail('Should have thrown an error for non-existent organization')
      } catch (error) {
        expect(error.statusCode).toBe(404)
      }
    })

    it('should handle non-existent organization update', async () => {
      try {
        await OrganizationService.update(99999, { name: 'Updated' }, 'en')
        expect.fail('Should have thrown an error for non-existent organization')
      } catch (error) {
        expect(error.statusCode).toBe(404)
      }
    })

    it('should handle non-existent organization deletion', async () => {
      try {
        await OrganizationService.delete(99999, 'en')
        expect.fail('Should have thrown an error for non-existent organization')
      } catch (error) {
        expect(error.statusCode).toBe(404)
      }
    })

    it('should handle division creation for non-existent organization', async () => {
      try {
        await OrganizationService.createDivision(99999, { name: 'Test Division' }, 'en')
        expect.fail('Should have thrown an error for non-existent organization')
      } catch (error) {
        expect(error.statusCode).toBe(404)
      }
    })
  })

  describe('API Endpoint Coverage Verification', () => {
    it('should verify all CRUD endpoints are implemented', async () => {
      // This test verifies that the organization API has all the expected endpoints
      // by checking the OrganizationService methods are available
      
      // Verify create method exists
      expect(typeof OrganizationService.create).toBe('function')
      
      // Verify findAll method exists
      expect(typeof OrganizationService.findAll).toBe('function')
      
      // Verify findById method exists
      expect(typeof OrganizationService.findById).toBe('function')
      
      // Verify update method exists
      expect(typeof OrganizationService.update).toBe('function')
      
      // Verify delete method exists
      expect(typeof OrganizationService.delete).toBe('function')
      
      // Verify createDivision method exists
      expect(typeof OrganizationService.createDivision).toBe('function')
      
      // Verify createDepartment method exists
      expect(typeof OrganizationService.createDepartment).toBe('function')
      
      // Verify getStatistics method exists
      expect(typeof OrganizationService.getStatistics).toBe('function')
    })

    it('should verify service methods return consistent response format', async () => {
      // Create a test organization to verify response format
      const orgData = {
        name: 'Format Test Organization',
        slug: 'test-format-org'
      }
      
      const result = await OrganizationService.create(orgData, 'en')
      
      // Verify response structure
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('data')
      expect(result.success).toBe(true)
      expect(typeof result.message).toBe('string')
      expect(result.data).toHaveProperty('organization')
      
      // Cleanup
      await OrganizationService.delete(result.data.organization.id, 'en')
    })

    it('should verify pagination support in findAll method', async () => {
      const result = await OrganizationService.findAll({
        page: 1,
        limit: 5,
        search: 'test',
        status: 'ACTIVE',
        sortBy: 'name',
        sortOrder: 'asc'
      }, 'en')
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('organizations')
      expect(result.data).toHaveProperty('pagination')
      expect(result.data.pagination).toHaveProperty('page')
      expect(result.data.pagination).toHaveProperty('limit')
      expect(result.data.pagination).toHaveProperty('total')
      expect(result.data.pagination).toHaveProperty('totalPages')
      expect(result.data.pagination).toHaveProperty('hasNextPage')
      expect(result.data.pagination).toHaveProperty('hasPrevPage')
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should validate required fields in organization creation', async () => {
      try {
        await OrganizationService.create({}, 'en')
        expect.fail('Should have thrown validation error')
      } catch (error) {
        // Should fail due to missing required fields
        expect(error).toBeDefined()
      }
    })

    it('should handle slug generation when not provided', async () => {
      const timestamp = Date.now()
      const orgData = {
        name: `Auto Slug Organization ${timestamp}`
        // No slug provided
      }
      
      const result = await OrganizationService.create(orgData, 'en')
      
      expect(result.success).toBe(true)
      expect(result.data.organization.slug).toBeDefined()
      expect(result.data.organization.slug).toBe(`auto-slug-organization-${timestamp}`)
      
      // Cleanup
      await OrganizationService.delete(result.data.organization.id, 'en')
    })

    it('should maintain data consistency in updates', async () => {
      // Create organization
      const orgData = {
        name: 'Consistency Test Organization',
        slug: 'test-consistency-org'
      }
      
      const createResult = await OrganizationService.create(orgData, 'en')
      const orgId = createResult.data.organization.id
      
      // Update organization
      const updateData = {
        name: 'Updated Consistency Organization',
        logoUrl: 'https://example.com/logo.png'
      }
      
      const updateResult = await OrganizationService.update(orgId, updateData, 'en')
      
      expect(updateResult.success).toBe(true)
      expect(updateResult.data.organization.name).toBe(updateData.name)
      expect(updateResult.data.organization.logoUrl).toBe(updateData.logoUrl)
      expect(updateResult.data.organization.slug).toBe(orgData.slug) // Should remain unchanged
      
      // Cleanup
      await OrganizationService.delete(orgId, 'en')
    })
  })
})