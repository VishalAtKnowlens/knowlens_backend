import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Organization service class for managing organization operations
 */
export class OrganizationService {
  /**
   * Create a new organization
   * @param {Object} orgData - Organization data
   * @param {string} language - Language for response
   * @returns {Object} Created organization
   */
  static async create(orgData, language = 'en') {
    try {
      const { 
        name, 
        slug, 
        logoUrl, 
        websiteUrl, 
        address, 
        contactPerson, 
        contactEmail,
        status = 'ACTIVE'
      } = orgData

      // Check if slug already exists
      if (slug) {
        const existingOrg = await prisma.organization.findUnique({
          where: { slug }
        })
        
        if (existingOrg) {
          throw createLocalizedError('organization.slug_already_exists', language, 409)
        }
      }

      // Create organization
      const organization = await prisma.organization.create({
        data: {
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
          logoUrl,
          websiteUrl,
          address,
          contactPerson,
          contactEmail,
          status
        }
      })

      return createLocalizedSuccess('organization.organization_created', language, {
        organization
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create organization error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all organizations with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Organizations list with pagination
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100) // Max 100 per page
      
      // Build where clause
      const where = {}
      
      if (status) {
        where.status = status
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Get organizations with pagination
      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                users: true,
                divisions: true,
                roles: true
              }
            }
          }
        }),
        prisma.organization.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        organizations,
        pagination: {
          page,
          limit: take,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      })
      
    } catch (error) {
      console.error('Find all organizations error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find organization by ID
   * @param {number} organizationId - Organization ID
   * @param {string} language - Language for response
   * @returns {Object} Organization data
   */
  static async findById(organizationId, language = 'en') {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          divisions: {
            include: {
              departments: true,
              _count: {
                select: {
                  userOrgProfiles: true
                }
              }
            }
          },
          roles: {
            include: {
              _count: {
                select: {
                  userRoles: true
                }
              }
            }
          },
          _count: {
            select: {
              users: true,
              divisions: true,
              roles: true
            }
          }
        }
      })
      
      if (!organization) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        organization
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find organization by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update organization
   * @param {number} organizationId - Organization ID
   * @param {Object} updateData - Data to update
   * @param {string} language - Language for response
   * @returns {Object} Updated organization
   */
  static async update(organizationId, updateData, language = 'en') {
    try {
      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: organizationId }
      })
      
      if (!existingOrg) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }
      
      // If slug is being updated, check for conflicts
      if (updateData.slug && updateData.slug !== existingOrg.slug) {
        const slugConflict = await prisma.organization.findUnique({
          where: { slug: updateData.slug }
        })
        
        if (slugConflict) {
          throw createLocalizedError('organization.slug_already_exists', language, 409)
        }
      }
      
      // Update organization
      const updatedOrganization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          _count: {
            select: {
              users: true,
              divisions: true,
              roles: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('organization.organization_updated', language, {
        organization: updatedOrganization
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update organization error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete organization (soft delete by deactivating)
   * @param {number} organizationId - Organization ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(organizationId, language = 'en') {
    try {
      // Check if organization exists
      const existingOrg = await prisma.organization.findUnique({
        where: { id: organizationId }
      })
      
      if (!existingOrg) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }
      
      // Soft delete organization and deactivate users
      await prisma.$transaction(async (tx) => {
        // Deactivate organization
        await tx.organization.update({
          where: { id: organizationId },
          data: { 
            status: 'INACTIVE',
            updatedAt: new Date()
          }
        })
        
        // Deactivate all users in the organization
        await tx.user.updateMany({
          where: { organizationId },
          data: { 
            status: 'INACTIVE',
            updatedAt: new Date()
          }
        })
        
        // Revoke all refresh tokens for users in the organization
        const orgUsers = await tx.user.findMany({
          where: { organizationId },
          select: { id: true }
        })
        
        const userIds = orgUsers.map(user => user.id)
        
        if (userIds.length > 0) {
          await tx.refreshToken.deleteMany({
            where: { userId: { in: userIds } }
          })

          await tx.session.deleteMany({
            where: { userId: { in: userIds } }
          })
        }
      })
      
      return createLocalizedSuccess('organization.organization_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete organization error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Create division within organization
   * @param {number} organizationId - Organization ID
   * @param {Object} divisionData - Division data
   * @param {string} language - Language for response
   * @returns {Object} Created division
   */
  static async createDivision(organizationId, divisionData, language = 'en') {
    try {
      const { name, shortName } = divisionData

      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId, status: 'ACTIVE' }
      })

      if (!organization) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }

      // Check if division name already exists in organization
      const existingDivision = await prisma.division.findFirst({
        where: { 
          organizationId,
          name
        }
      })

      if (existingDivision) {
        throw createLocalizedError('organization.division_already_exists', language, 409)
      }

      // Create division
      const division = await prisma.division.create({
        data: {
          name,
          shortName,
          organizationId
        }
      })

      return createLocalizedSuccess('organization.division_created', language, {
        division
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create division error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Create department within division
   * @param {number} divisionId - Division ID
   * @param {Object} departmentData - Department data
   * @param {string} language - Language for response
   * @returns {Object} Created department
   */
  static async createDepartment(divisionId, departmentData, language = 'en') {
    try {
      const { name } = departmentData

      // Check if division exists
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
        include: { organization: true }
      })

      if (!division || division.organization.status !== 'ACTIVE') {
        throw createLocalizedError('organization.division_not_found', language, 404)
      }

      // Check if department name already exists in division
      const existingDepartment = await prisma.department.findFirst({
        where: { 
          divisionId,
          name
        }
      })

      if (existingDepartment) {
        throw createLocalizedError('organization.department_already_exists', language, 409)
      }

      // Create department
      const department = await prisma.department.create({
        data: {
          name,
          divisionId
        },
        include: {
          division: {
            select: {
              id: true,
              name: true,
              organizationId: true
            }
          }
        }
      })

      return createLocalizedSuccess('organization.department_created', language, {
        department
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create department error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get organization statistics
   * @param {number} organizationId - Organization ID
   * @param {string} language - Language for response
   * @returns {Object} Organization statistics
   */
  static async getStatistics(organizationId, language = 'en') {
    try {
      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      })

      if (!organization) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }

      // Get comprehensive statistics
      const [
        totalUsers,
        activeUsers,
        totalCourses,
        totalEnrollments,
        totalQuizAttempts,
        divisions,
        departments,
        roles
      ] = await Promise.all([
        prisma.user.count({ where: { organizationId } }),
        prisma.user.count({ where: { organizationId, status: 'ACTIVE' } }),
        prisma.course.count(),
        prisma.courseEnrollment.count({
          where: { user: { organizationId } }
        }),
        prisma.quizAttempt.count({
          where: { user: { organizationId } }
        }),
        prisma.division.count({ where: { organizationId } }),
        prisma.department.count({
          where: { division: { organizationId } }
        }),
        prisma.role.count({ where: { organizationId } })
      ])

      const statistics = {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        structure: {
          divisions,
          departments,
          roles
        },
        learning: {
          totalCourses,
          totalEnrollments,
          totalQuizAttempts
        }
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get organization statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}