import { prisma } from '../config/database.js'
import { hashPassword } from '../utils/password.js'
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
      const { email, password, firstName, lastName, organisationId, language: userLanguage, employeeId, roleIds = [] } = userData
      
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        throw createLocalizedError('auth.email_already_exists', language, 409)
      }
      
      // Check if organization exists and is active
      const organisation = await prisma.organisation.findUnique({
        where: { 
          id: organisationId,
          isActive: true 
        }
      })
      
      if (!organisation) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password)
      
      // Create user in database transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            organisationId,
            language: userLanguage || organisation.language || 'en',
            employeeId: employeeId || null
          },
          include: {
            organisation: {
              select: {
                id: true,
                name: true,
                slug: true,
                language: true
              }
            }
          }
        })
        
        // Assign roles if provided
        if (roleIds && roleIds.length > 0) {
          // Verify all roles exist and belong to the organization
          const roles = await tx.role.findMany({
            where: {
              id: { in: roleIds },
              organisationId
            }
          })
          
          if (roles.length !== roleIds.length) {
            throw createLocalizedError('user.invalid_roles', language, 400)
          }
          
          // Create user role assignments
          await tx.userRole.createMany({
            data: roleIds.map(roleId => ({
              userId: user.id,
              roleId
            }))
          })
        } else {
          // Assign default user role if no roles specified
          const defaultRole = await tx.role.findFirst({
            where: {
              organisationId,
              name: 'user'
            }
          })
          
          if (defaultRole) {
            await tx.userRole.create({
              data: {
                userId: user.id,
                roleId: defaultRole.id
              }
            })
          }
        }
        
        return user
      })
      
      // Get the created user with all relations
      const createdUser = await prisma.user.findUnique({
        where: { id: result.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          language: true,
          employeeId: true,
          profilePictureUrl: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          organisationId: true,
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              language: true
            }
          },
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  permissions: true
                }
              }
            }
          }
        }
      })
      
      return createLocalizedSuccess('user.user_created', language, {
        user: createdUser
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
        organisationId,
        page = 1,
        limit = 20,
        search,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100) // Max 100 per page
      
      // Build where clause
      const where = {}
      
      if (organisationId) {
        where.organisationId = organisationId
      }
      
      if (typeof isActive === 'boolean') {
        where.isActive = isActive
      }
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
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
            email: true,
            firstName: true,
            lastName: true,
            language: true,
            employeeId: true,
            profilePictureUrl: true,
            isActive: true,
            emailVerified: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            organisationId: true,
            organisation: {
              select: {
                id: true,
                name: true,
                slug: true,
                language: true
              }
            },
            userRoles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    description: true
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
   * @param {string} userId - User ID
   * @param {string} organisationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} User data
   */
  static async findById(userId, organisationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organisationId) {
        where.organisationId = organisationId
      }
      
      const user = await prisma.user.findUnique({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          language: true,
          employeeId: true,
          profilePictureUrl: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          organisationId: true,
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              language: true
            }
          },
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  permissions: true
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
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {string} organisationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} Updated user
   */
  static async update(userId, updateData, organisationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organisationId) {
        where.organisationId = organisationId
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
      
      // Hash password if being updated
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password)
      }
      
      // Update user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Extract role IDs if provided
        const { roleIds, ...userData } = updateData
        
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
          
          // Add new roles if any
          if (roleIds && roleIds.length > 0) {
            // Verify all roles exist and belong to the organization
            const roles = await tx.role.findMany({
              where: {
                id: { in: roleIds },
                organisationId: existingUser.organisationId
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
          }
        }
        
        return updatedUser
      })
      
      // Get updated user with relations
      const userWithRelations = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          language: true,
          employeeId: true,
          profilePictureUrl: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          organisationId: true,
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              language: true
            }
          },
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  permissions: true
                }
              }
            }
          }
        }
      })
      
      return createLocalizedSuccess('user.user_updated', language, {
        user: userWithRelations
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
   * @param {string} userId - User ID
   * @param {string} organisationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(userId, organisationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organisationId) {
        where.organisationId = organisationId
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
            isActive: false,
            updatedAt: new Date()
          }
        })
        
        // Revoke all refresh tokens
        await tx.refreshToken.deleteMany({
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
   * @param {string} userId - User ID
   * @param {string} organisationId - Organization ID for scope
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async hardDelete(userId, organisationId = null, language = 'en') {
    try {
      const where = { id: userId }
      
      if (organisationId) {
        where.organisationId = organisationId
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
}
