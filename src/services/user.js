import { prisma } from '../config/database.js'
import { hashPassword } from '../utils/password.js'
import bcrypt from 'bcrypt'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * User service class for managing user operations
 */
export class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} language - Language for response
   * @returns {Object} Created user
   */
  static async create(userData, language = 'en') {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        organizationId, 
        language: userLanguage, 
        employeeId, 
        username,
        type = 'REGULAR',
        departmentId,
        managerId,
        roleIds = [],
        divisionId
      } = userData

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
      
      // Check if organization exists and is active
      const organization = await prisma.organization.findUnique({
        where: { 
          id: organizationId,
          status: 'ACTIVE'
        }
      })
      
      if (!organization) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }

      // Hash password and generate salt
      const hashedPassword = await hashPassword(password)
      const salt = await bcrypt.genSalt(12)
      
      // Create user in database transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            username: username || email.split('@')[0],
            password: hashedPassword,
            salt,
            firstName,
            lastName,
            organizationId,
            language: userLanguage || 'en',
            employeeId: employeeId || null,
            type,
            departmentId: departmentId || null,
            managerId: managerId || null,
            status: 'ACTIVE'
          }
        })

        // Assign roles if provided
        if (roleIds && roleIds.length > 0) {
          // Verify all roles exist and belong to the organization
          const roles = await tx.role.findMany({
            where: {
              id: { in: roleIds },
              organizationId
            }
          })
          
          if (roles.length !== roleIds.length) {
            throw createLocalizedError('user.invalid_roles', language, 400)
          }
          
          // Create user role assignments (both old and new systems)
          await tx.userRole.createMany({
            data: roleIds.map(roleId => ({
              userId: user.id,
              roleId
            }))
          })

          // Create new role assignments if divisionId provided
          if (divisionId) {
            await tx.roleAssignment.createMany({
              data: roleIds.map(roleId => ({
                userId: user.id,
                roleId,
                divisionId
              }))
            })
          }
        } else {
          // Assign default user role if no roles specified
          const defaultRole = await tx.role.findFirst({
            where: {
              organizationId,
              name: 'Learner'
            }
          })
          
          if (defaultRole) {
            await tx.userRole.create({
              data: {
                userId: user.id,
                roleId: defaultRole.id
              }
            })

            // Create role assignment if divisionId provided
            if (divisionId) {
              await tx.roleAssignment.create({
                data: {
                  userId: user.id,
                  roleId: defaultRole.id,
                  divisionId
                }
              })
            }
          }
        }

        // Create user org profile if additional org data provided
        if (divisionId || departmentId) {
          await tx.userOrgProfile.create({
            data: {
              userId: user.id,
              divisionId: divisionId || null,
              departmentId: departmentId || null,
              joiningDate: new Date()
            }
          })
        }
        
        return user
      })
      
      // Get the created user with all relations
      const createdUser = await this.findById(result.id, null, language)
      
      return createLocalizedSuccess('user.user_created', language, {
        user: createdUser.data.user
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create user error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all users with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Users list with pagination
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        organizationId,
        page = 1,
        limit = 20,
        search,
        status,
        type,
        departmentId,
        divisionId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100) // Max 100 per page
      
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

      if (departmentId) {
        where.departmentId = departmentId
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
            language: true,
            employeeId: true,
            photoUrl: true,
            type: true,
            status: true,
            isEmailVerified: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            organizationId: true,
            departmentId: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            department: {
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
      console.error('Find all users error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @param {number} organizationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} User data
   */
  static async findById(userId, organizationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organizationId) {
        where.organizationId = organizationId
      }
      
      const user = await prisma.user.findUnique({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          language: true,
          employeeId: true,
          photoUrl: true,
          type: true,
          status: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          organizationId: true,
          departmentId: true,
          managerId: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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
          },
          userOrgProfile: {
            include: {
              division: {
                select: {
                  id: true,
                  name: true
                }
              },
              department: {
                select: {
                  id: true,
                  name: true
                }
              },
              designation: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
      
      if (!user) {
        throw createLocalizedError('user.user_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        user
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find user by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {number} organizationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} Updated user
   */
  static async update(userId, updateData, organizationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organizationId) {
        where.organizationId = organizationId
      }
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where })
      
      if (!existingUser) {
        throw createLocalizedError('user.user_not_found', language, 404)
      }
      
      // If email is being updated, check for conflicts
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailConflict = await prisma.user.findUnique({
          where: { email: updateData.email }
        })
        
        if (emailConflict) {
          throw createLocalizedError('auth.email_already_exists', language, 409)
        }
      }

      // If username is being updated, check for conflicts
      if (updateData.username && updateData.username !== existingUser.username) {
        const usernameConflict = await prisma.user.findUnique({
          where: { username: updateData.username }
        })
        
        if (usernameConflict) {
          throw createLocalizedError('auth.username_already_exists', language, 409)
        }
      }
      
      // Hash password if being updated
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password)
        updateData.salt = await bcrypt.genSalt(12)
      }
      
      // Update user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Extract role IDs and division info if provided
        const { roleIds, divisionId, ...userData } = updateData
        
        // Update user data
        const updatedUser = await tx.user.update({
          where,
          data: {
            ...userData,
            updatedAt: new Date()
          }
        })
        
        // Update roles if provided
        if (roleIds !== undefined) {
          // Remove existing roles
          await tx.userRole.deleteMany({
            where: { userId }
          })

          await tx.roleAssignment.deleteMany({
            where: { userId }
          })
          
          // Add new roles if any
          if (roleIds && roleIds.length > 0) {
            // Verify all roles exist and belong to the organization
            const roles = await tx.role.findMany({
              where: {
                id: { in: roleIds },
                organizationId: existingUser.organizationId
              }
            })
            
            if (roles.length !== roleIds.length) {
              throw createLocalizedError('user.invalid_roles', language, 400)
            }
            
            // Create new role assignments
            await tx.userRole.createMany({
              data: roleIds.map(roleId => ({
                userId,
                roleId
              }))
            })

            // Create new role assignments if divisionId provided
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
        }

        // Update user org profile if needed
        if (divisionId !== undefined || updateData.departmentId !== undefined) {
          const existingProfile = await tx.userOrgProfile.findUnique({
            where: { userId }
          })

          if (existingProfile) {
            await tx.userOrgProfile.update({
              where: { userId },
              data: {
                divisionId: divisionId || existingProfile.divisionId,
                departmentId: updateData.departmentId || existingProfile.departmentId
              }
            })
          } else if (divisionId || updateData.departmentId) {
            await tx.userOrgProfile.create({
              data: {
                userId,
                divisionId: divisionId || null,
                departmentId: updateData.departmentId || null,
                joiningDate: new Date()
              }
            })
          }
        }
        
        return updatedUser
      })
      
      // Get updated user with relations
      const userWithRelations = await this.findById(userId, null, language)
      
      return createLocalizedSuccess('user.user_updated', language, {
        user: userWithRelations.data.user
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update user error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete user (soft delete by deactivating)
   * @param {number} userId - User ID
   * @param {number} organizationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(userId, organizationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organizationId) {
        where.organizationId = organizationId
      }
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where })
      
      if (!existingUser) {
        throw createLocalizedError('user.user_not_found', language, 404)
      }
      
      // Soft delete user and revoke tokens in transaction
      await prisma.$transaction(async (tx) => {
        // Deactivate user
        await tx.user.update({
          where,
          data: { 
            status: 'INACTIVE',
            updatedAt: new Date()
          }
        })
        
        // Revoke all refresh tokens
        await tx.refreshToken.deleteMany({
          where: { userId }
        })

        // Revoke all sessions
        await tx.session.deleteMany({
          where: { userId }
        })
      })
      
      return createLocalizedSuccess('user.user_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete user error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Hard delete user (permanently remove from database)
   * @param {number} userId - User ID
   * @param {number} organizationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async hardDelete(userId, organizationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organizationId) {
        where.organizationId = organizationId
      }
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where })
      
      if (!existingUser) {
        throw createLocalizedError('user.user_not_found', language, 404)
      }
      
      // Hard delete user (cascade will handle related records)
      await prisma.user.delete({ where })
      
      return createLocalizedSuccess('user.user_permanently_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Hard delete user error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get user's course enrollments
   * @param {number} userId - User ID
   * @param {string} language - Language for response
   * @returns {Object} User's course enrollments
   */
  static async getUserEnrollments(userId, language = 'en') {
    try {
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnailUrl: true,
              durationInMinutes: true,
              totalPoints: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return createLocalizedSuccess('success.data_retrieved', language, {
        enrollments
      })
    } catch (error) {
      console.error('Get user enrollments error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get user's quiz attempts
   * @param {number} userId - User ID
   * @param {string} language - Language for response
   * @returns {Object} User's quiz attempts
   */
  static async getUserQuizAttempts(userId, language = 'en') {
    try {
      const attempts = await prisma.quizAttempt.findMany({
        where: { userId },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              passThreshold: true
            }
          }
        },
        orderBy: { startedAt: 'desc' }
      })

      return createLocalizedSuccess('success.data_retrieved', language, {
        attempts
      })
    } catch (error) {
      console.error('Get user quiz attempts error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}