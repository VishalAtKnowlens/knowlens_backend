import { prisma } from '../../config/database.js'
import { validateSchema, createUserSchema, updateUserSchema, paginationSchema, assignRoleSchema } from '../../utils/validation.js'
import { authenticate, enforceOrganizationScope, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'
import { hashPassword } from '../../utils/password.js'

/**
 * Admin routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function adminRoutes(fastify) {
  // Add hooks for all admin routes
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  fastify.addHook('preHandler', requirePermissions(['admin', 'user_management']))
  
  /**
   * GET /api/admin/users
   * Get all users in organization with pagination
   */
  fastify.get('/users', {
    schema: {
      description: 'Get all users in organization with pagination',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', enum: ['createdAt', 'firstName', 'lastName', 'email', 'lastLoginAt'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          search: { type: 'string' },
          isActive: { type: 'boolean' },
          roleId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                users: { type: 'array' },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    pages: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { page, limit, sortBy = 'createdAt', sortOrder, search, isActive, roleId } = request.query
      
      // Build where clause
      const where = {
        organisationId: request.organizationId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeId: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(roleId && {
          userRoles: {
            some: { roleId }
          }
        })
      }
      
      // Get total count
      const total = await prisma.user.count({ where })
      
      // Get users with pagination
      const users = await prisma.user.findMany({
        where,
        include: {
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
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip: (page - 1) * limit,
        take: limit
      })
      
      // Remove passwords from response
      const usersResponse = users.map(user => {
        const { password: _, ...userWithoutPassword } = user
        return userWithoutPassword
      })
      
      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
      
      return reply.send(
        createLocalizedSuccess('user.users_retrieved', request.language, {
          users: usersResponse,
          pagination
        })
      )
      
    } catch (error) {
      console.error('Get users error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/admin/users/:id
   * Get specific user by ID
   */
  fastify.get('/users/:id', {
    schema: {
      description: 'Get specific user by ID',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      
      const user = await prisma.user.findUnique({
        where: { 
          id,
          organisationId: request.organizationId
        },
        include: {
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
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }
      
      // Remove password from response
      const { password: _, ...userResponse } = user
      
      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          user: userResponse
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get user error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * POST /api/admin/users
   * Create a new user
   */
  fastify.post('/users', {
    schema: {
      description: 'Create a new user',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          language: { type: 'string', enum: ['en', 'es', 'fr'] },
          employeeId: { type: 'string', maxLength: 50 },
          roleIds: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userData = validateSchema(createUserSchema, request.body)
      
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (existingUser) {
        throw createLocalizedError('auth.email_already_exists', request.language, 409)
      }
      
      // Validate role IDs if provided
      if (userData.roleIds?.length > 0) {
        const roles = await prisma.role.findMany({
          where: {
            id: { in: userData.roleIds },
            organisationId: request.organizationId
          }
        })
        
        if (roles.length !== userData.roleIds.length) {
          throw createLocalizedError('role.role_not_found', request.language, 404)
        }
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password)
      
      // Create user with roles in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            organisationId: request.organizationId,
            language: userData.language || request.user.organisation.language || 'en',
            employeeId: userData.employeeId
          }
        })
        
        // Assign roles if provided
        if (userData.roleIds?.length > 0) {
          await tx.userRole.createMany({
            data: userData.roleIds.map(roleId => ({
              userId: user.id,
              roleId
            }))
          })
        } else {
          // Assign default user role
          const defaultRole = await tx.role.findFirst({
            where: {
              organisationId: request.organizationId,
              isDefault: true,
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
        
        // Fetch user with roles
        return await tx.user.findUnique({
          where: { id: user.id },
          include: {
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
        })
      })
      
      // Remove password from response
      const { password: _, ...userResponse } = result
      
      return reply.code(201).send(
        createLocalizedSuccess('user.user_created', request.language, {
          user: userResponse
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create user error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * PUT /api/admin/users/:id
   * Update a user
   */
  fastify.put('/users/:id', {
    schema: {
      description: 'Update a user',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          language: { type: 'string', enum: ['en', 'es', 'fr'] },
          employeeId: { type: 'string', maxLength: 50 },
          isActive: { type: 'boolean' },
          roleIds: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateUserSchema, request.body)
      
      // Check if user exists in organization
      const existingUser = await prisma.user.findUnique({
        where: { 
          id,
          organisationId: request.organizationId
        }
      })
      
      if (!existingUser) {
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }
      
      // Validate role IDs if provided
      if (updateData.roleIds?.length > 0) {
        const roles = await prisma.role.findMany({
          where: {
            id: { in: updateData.roleIds },
            organisationId: request.organizationId
          }
        })
        
        if (roles.length !== updateData.roleIds.length) {
          throw createLocalizedError('role.role_not_found', request.language, 404)
        }
      }
      
      // Update user with roles in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update user
        const { roleIds, ...userUpdateData } = updateData
        
        const user = await tx.user.update({
          where: { id },
          data: {
            ...userUpdateData,
            updatedAt: new Date()
          }
        })
        
        // Update roles if provided
        if (roleIds !== undefined) {
          // Delete existing role assignments
          await tx.userRole.deleteMany({
            where: { userId: id }
          })
          
          // Create new role assignments
          if (roleIds.length > 0) {
            await tx.userRole.createMany({
              data: roleIds.map(roleId => ({
                userId: id,
                roleId
              }))
            })
          }
        }
        
        // If user is deactivated, revoke all refresh tokens
        if (userUpdateData.isActive === false) {
          await tx.refreshToken.deleteMany({
            where: { userId: id }
          })
        }
        
        // Fetch updated user with roles
        return await tx.user.findUnique({
          where: { id },
          include: {
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
        })
      })
      
      // Remove password from response
      const { password: _, ...userResponse } = result
      
      return reply.send(
        createLocalizedSuccess('user.user_updated', request.language, {
          user: userResponse
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update user error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * DELETE /api/admin/users/:id
   * Delete (deactivate) a user
   */
  fastify.delete('/users/:id', {
    schema: {
      description: 'Delete (deactivate) a user',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      
      // Prevent self-deletion
      if (id === request.user.id) {
        throw createLocalizedError('user.cannot_delete_self', request.language, 400)
      }
      
      // Check if user exists in organization
      const existingUser = await prisma.user.findUnique({
        where: { 
          id,
          organisationId: request.organizationId
        }
      })
      
      if (!existingUser) {
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }
      
      // Deactivate user and revoke tokens in transaction
      await prisma.$transaction(async (tx) => {
        // Deactivate user
        await tx.user.update({
          where: { id },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        })
        
        // Revoke all refresh tokens
        await tx.refreshToken.deleteMany({
          where: { userId: id }
        })
      })
      
      return reply.send(
        createLocalizedSuccess('user.user_deleted', request.language)
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete user error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * POST /api/admin/users/:id/roles
   * Assign role to user
   */
  fastify.post('/users/:id/roles', {
    schema: {
      description: 'Assign role to user',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const { roleId } = request.body
      
      // Validate user exists in organization
      const user = await prisma.user.findUnique({
        where: { 
          id,
          organisationId: request.organizationId
        }
      })
      
      if (!user) {
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }
      
      // Validate role exists in organization
      const role = await prisma.role.findUnique({
        where: { 
          id: roleId,
          organisationId: request.organizationId
        }
      })
      
      if (!role) {
        throw createLocalizedError('role.role_not_found', request.language, 404)
      }
      
      // Check if role assignment already exists
      const existingAssignment = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: id,
            roleId
          }
        }
      })
      
      if (existingAssignment) {
        throw createLocalizedError('role.role_already_assigned', request.language, 409)
      }
      
      // Create role assignment
      await prisma.userRole.create({
        data: {
          userId: id,
          roleId
        }
      })
      
      return reply.send(
        createLocalizedSuccess('role.role_assigned', request.language)
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Assign role error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * DELETE /api/admin/users/:id/roles/:roleId
   * Remove role from user
   */
  fastify.delete('/users/:id/roles/:roleId', {
    schema: {
      description: 'Remove role from user',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id', 'roleId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          roleId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id, roleId } = request.params
      
      // Validate user exists in organization
      const user = await prisma.user.findUnique({
        where: { 
          id,
          organisationId: request.organizationId
        }
      })
      
      if (!user) {
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }
      
      // Delete role assignment
      const result = await prisma.userRole.deleteMany({
        where: {
          userId: id,
          roleId,
          role: {
            organisationId: request.organizationId
          }
        }
      })
      
      if (result.count === 0) {
        throw createLocalizedError('role.role_assignment_not_found', request.language, 404)
      }
      
      return reply.send(
        createLocalizedSuccess('role.role_unassigned', request.language)
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Remove role error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
