import { prisma } from '../config/database.js'
import { hashPassword } from '../utils/password.js'
import bcrypt from 'bcrypt'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Admin service class for administrative operations
 */
export class AdminService {
  /**
   * Get system-wide dashboard statistics
   * @param {string} language - Language for response
   * @returns {Object} System statistics
   */
  static async getDashboardStats(language = 'en') {
    try {
      // Get comprehensive system statistics
      const [
        totalOrganizations,
        activeOrganizations,
        totalUsers,
        activeUsers,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        completedEnrollments,
        totalQuizAttempts,
        passedQuizAttempts,
        recentUsers,
        recentOrganizations
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.organization.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.course.count(),
        prisma.course.count({ where: { isPublished: true } }),
        prisma.courseEnrollment.count(),
        prisma.courseEnrollment.count({ where: { isCompleted: true } }),
        prisma.quizAttempt.count(),
        prisma.quizAttempt.count({ where: { isCompleted: true } }),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
            organization: {
              select: {
                name: true
              }
            }
          }
        }),
        prisma.organization.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            _count: {
              select: {
                users: true
              }
            }
          }
        })
      ])

      const statistics = {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          inactive: totalOrganizations - activeOrganizations
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          draft: totalCourses - publishedCourses
        },
        learning: {
          totalEnrollments,
          completedEnrollments,
          completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments * 100).toFixed(2) : 0
        },
        assessments: {
          totalQuizAttempts,
          passedQuizAttempts,
          passRate: totalQuizAttempts > 0 ? (passedQuizAttempts / totalQuizAttempts * 100).toFixed(2) : 0
        },
        recent: {
          users: recentUsers,
          organizations: recentOrganizations
        }
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      console.error('Get dashboard stats error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Create system administrator
   * @param {Object} adminData - Admin user data
   * @param {string} language - Language for response
   * @returns {Object} Created admin user
   */
  static async createSystemAdmin(adminData, language = 'en') {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        organizationId,
        username
      } = adminData

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        throw createLocalizedError('auth.email_already_exists', language, 409)
      }

      // Check if username already exists
      if (username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username }
        })
        
        if (existingUsername) {
          throw createLocalizedError('auth.username_already_exists', language, 409)
        }
      }

      // Check if organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      })

      if (!organization) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }

      // Hash password and generate salt
      const hashedPassword = await hashPassword(password)
      const salt = await bcrypt.genSalt(12)

      // Create admin user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create admin user
        const adminUser = await tx.user.create({
          data: {
            email,
            username: username || email.split('@')[0],
            password: hashedPassword,
            salt,
            firstName,
            lastName,
            organizationId,
            type: 'ADMIN',
            status: 'ACTIVE',
            isEmailVerified: true
          }
        })

        // Find or create admin role
        let adminRole = await tx.role.findFirst({
          where: {
            organizationId,
            name: 'Administrator'
          }
        })

        if (!adminRole) {
          adminRole = await tx.role.create({
            data: {
              name: 'Administrator',
              organizationId
            }
          })
        }

        // Assign admin role
        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id
          }
        })

        return adminUser
      })

      // Get created user with relations
      const createdAdmin = await prisma.user.findUnique({
        where: { id: result.id },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          type: true,
          status: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      return createLocalizedSuccess('admin.admin_created', language, {
        admin: createdAdmin
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create system admin error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get all system users with advanced filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Users list with pagination
   */
  static async getAllUsers(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        type,
        organizationId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      // Build where clause
      const where = {}
      
      if (organizationId) {
        where.organizationId = organizationId
      }
      
      if (status) {
        where.status = status
      }

      if (type) {
        where.type = type
      }
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Get users with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            type: true,
            status: true,
            isEmailVerified: true,
            lastLoginAt: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            userRoles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }),
        prisma.user.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        users,
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
      console.error('Get all users error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Manage user roles across organizations
   * @param {number} userId - User ID
   * @param {Object} roleData - Role assignment data
   * @param {string} language - Language for response
   * @returns {Object} Updated user with roles
   */
  static async manageUserRoles(userId, roleData, language = 'en') {
    try {
      const { roleIds, divisionId } = roleData

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true }
      })

      if (!user) {
        throw createLocalizedError('user.user_not_found', language, 404)
      }

      // Verify roles belong to user's organization
      if (roleIds && roleIds.length > 0) {
        const roles = await prisma.role.findMany({
          where: {
            id: { in: roleIds },
            organizationId: user.organizationId
          }
        })

        if (roles.length !== roleIds.length) {
          throw createLocalizedError('user.invalid_roles', language, 400)
        }
      }

      // Update roles in transaction
      await prisma.$transaction(async (tx) => {
        // Remove existing roles
        await tx.userRole.deleteMany({
          where: { userId }
        })

        await tx.roleAssignment.deleteMany({
          where: { userId }
        })

        // Add new roles
        if (roleIds && roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map(roleId => ({
              userId,
              roleId
            }))
          })

          // Create role assignments if divisionId provided
          if (divisionId) {
            await tx.roleAssignment.createMany({
              data: roleIds.map(roleId => ({
                userId,
                roleId,
                divisionId
              }))
            })
          }
        }
      })

      // Get updated user with roles
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          type: true,
          status: true,
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          roleAssignments: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              },
              division: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      return createLocalizedSuccess('admin.user_roles_updated', language, {
        user: updatedUser
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Manage user roles error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get system audit logs
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Audit logs with pagination
   */
  static async getAuditLogs(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 50,
        organizationId,
        userId,
        action,
        targetType,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      // Build where clause
      const where = {}
      
      if (organizationId) {
        where.organisationId = organizationId
      }
      
      if (userId) {
        where.userId = userId
      }

      if (action) {
        where.action = { contains: action, mode: 'insensitive' }
      }

      if (targetType) {
        where.targetType = targetType
      }

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }
      
      // Get audit logs with pagination
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder }
        }),
        prisma.auditLog.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        logs,
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
      console.error('Get audit logs error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Bulk user operations
   * @param {Object} operationData - Bulk operation data
   * @param {string} language - Language for response
   * @returns {Object} Operation results
   */
  static async bulkUserOperations(operationData, language = 'en') {
    try {
      const { operation, userIds, data } = operationData

      if (!userIds || userIds.length === 0) {
        throw createLocalizedError('admin.no_users_selected', language, 400)
      }

      let results = {}

      switch (operation) {
        case 'activate':
          results = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { status: 'ACTIVE', updatedAt: new Date() }
          })
          break

        case 'deactivate':
          results = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { status: 'INACTIVE', updatedAt: new Date() }
          })
          break

        case 'delete':
          // Soft delete by setting status to ARCHIVED
          results = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { status: 'ARCHIVED', updatedAt: new Date() }
          })
          break

        case 'assign_role':
          if (!data.roleId) {
            throw createLocalizedError('admin.role_required', language, 400)
          }
          
          // Remove existing roles and assign new one
          await prisma.$transaction(async (tx) => {
            await tx.userRole.deleteMany({
              where: { userId: { in: userIds } }
            })
            
            await tx.userRole.createMany({
              data: userIds.map(userId => ({
                userId,
                roleId: data.roleId
              }))
            })
          })
          
          results = { count: userIds.length }
          break

        default:
          throw createLocalizedError('admin.invalid_operation', language, 400)
      }

      return createLocalizedSuccess('admin.bulk_operation_completed', language, {
        operation,
        affectedUsers: results.count || userIds.length,
        results
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Bulk user operations error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get system health status
   * @param {string} language - Language for response
   * @returns {Object} System health information
   */
  static async getSystemHealth(language = 'en') {
    try {
      // Check database connectivity and get basic metrics
      const [
        dbStatus,
        activeUsers,
        recentErrors,
        systemLoad
      ] = await Promise.all([
        prisma.$queryRaw`SELECT 1 as status`,
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.auditLog.count({
          where: {
            action: { contains: 'ERROR' },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
        // System load metrics would typically come from system monitoring
        Promise.resolve({
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          disk: Math.random() * 100
        })
      ])

      const health = {
        database: {
          status: dbStatus ? 'healthy' : 'unhealthy',
          connected: !!dbStatus
        },
        users: {
          active: activeUsers
        },
        errors: {
          last24Hours: recentErrors
        },
        system: systemLoad,
        timestamp: new Date().toISOString()
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        health
      })

    } catch (error) {
      console.error('Get system health error:', error)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        health: {
          database: { status: 'unhealthy', connected: false },
          error: error.message,
          timestamp: new Date().toISOString()
        }
      })
    }
  }
}