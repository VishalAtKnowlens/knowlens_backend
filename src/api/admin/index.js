import { prisma } from '../../config/database.js'
import { validateSchema, createUserSchema, updateUserSchema, paginationSchema, assignRoleSchema } from '../../utils/validation.js'
import { authenticate, enforceOrganizationScope, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'
import { hashPassword } from '../../utils/password.js'
import { AdminService } from '../../services/admin.js'

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
      const options = {
        ...request.query,
        organizationId: request.organizationId
      }
      
      const result = await AdminService.getAllUsers(options, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
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
          organizationId: request.organizationId
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
      
      const result = await AdminService.createUser(userData, request.organizationId, request.language)
      return reply.code(201).send(result)
      
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
      
      const result = await AdminService.updateUser(id, updateData, request.organizationId, request.language)
      return reply.send(result)
      
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
          organizationId: request.organizationId
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
          organizationId: request.organizationId
        }
      })
      
      if (!user) {
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }
      
      // Validate role exists in organization
      const role = await prisma.role.findUnique({
        where: { 
          id: roleId,
          organizationId: request.organizationId
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
          organizationId: request.organizationId
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
            organizationId: request.organizationId
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

  /**
   * POST /api/admin/system-admin
   * Create a system administrator
   */
  fastify.post('/system-admin', {
    schema: {
      description: 'Create a system administrator',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'username'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          username: { type: 'string', minLength: 3, maxLength: 50 },
          language: { type: 'string', enum: ['en', 'es', 'fr'] }
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
                admin: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await AdminService.createSystemAdmin(request.body, request.language)
      return reply.code(201).send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Create system admin error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/admin/dashboard-stats
   * Get dashboard statistics
   */
  fastify.get('/dashboard-stats', {
    schema: {
      description: 'Get dashboard statistics',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                stats: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await AdminService.getDashboardStats(request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Get dashboard stats error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * POST /api/admin/bulk-operations
   * Perform bulk operations on users
   */
  fastify.post('/bulk-operations', {
    schema: {
      description: 'Perform bulk operations on users',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['operation', 'userIds'],
        properties: {
          operation: { 
            type: 'string', 
            enum: ['activate', 'deactivate', 'delete', 'assign_role', 'remove_role'] 
          },
          userIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
          data: {
            type: 'object',
            properties: {
              roleId: { type: 'string' }
            }
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
                results: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await AdminService.bulkUserOperations(request.body, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Bulk operations error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
