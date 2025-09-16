import { prisma } from '../../config/database.js'
import { validateSchema, updateUserProfileSchema, userSchema, adminUpdateUserSchema, validateRequest } from '../../utils/validation.js'
import { authenticate, enforceOrganizationScope } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'
import { UserService } from '../../services/user.js'

/**
 * User routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function userRoutes(fastify) {
  // Add hooks for all user routes
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  
  /**
   * GET /api/user/profile
   * Get current user's profile
   */
  fastify.get('/profile', {
    schema: {
      description: 'Get current user profile',
      tags: ['User'],
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    language: { type: 'string' },
                    employeeId: { type: 'string' },
                    profilePictureUrl: { type: 'string' },
                    emailVerified: { type: 'boolean' },
                    isActive: { type: 'boolean' },
                    lastLoginAt: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    organisation: { type: 'object' },
                    userRoles: { type: 'array' }
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
      // Get user with full details
      const user = await prisma.user.findUnique({
        where: { 
          id: request.user.id,
          organisationId: request.organizationId
        },
        include: {
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
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
      
      console.error('Get profile error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * PUT /api/user/profile
   * Update current user's profile
   */
  fastify.put('/profile', {
    schema: {
      description: 'Update current user profile',
      tags: ['User'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          language: { type: 'string', enum: ['en', 'es', 'fr'] },
          employeeId: { type: 'string', maxLength: 50 },
          profilePictureUrl: { type: 'string', format: 'uri' }
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
      const updateData = validateSchema(updateUserProfileSchema, request.body)
      
      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { 
          id: request.user.id,
          organisationId: request.organizationId
        },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
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
      
      // Remove password from response
      const { password: _, ...userResponse } = updatedUser
      
      return reply.send(
        createLocalizedSuccess('user.profile_updated', request.language, {
          user: userResponse
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update profile error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/user/permissions
   * Get current user's permissions
   */
  fastify.get('/permissions', {
    schema: {
      description: 'Get current user permissions',
      tags: ['User'],
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
                permissions: {
                  type: 'array',
                  items: { type: 'string' }
                },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      permissions: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
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
      // Get user roles and permissions
      const userRoles = await prisma.userRole.findMany({
        where: { 
          userId: request.user.id
        },
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
      })
      
      // Extract unique permissions
      const allPermissions = new Set()
      const roles = []
      
      for (const userRole of userRoles) {
        const role = userRole.role
        roles.push(role)
        
        if (Array.isArray(role.permissions)) {
          for (const permission of role.permissions) {
            allPermissions.add(permission)
          }
        }
      }
      
      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          permissions: Array.from(allPermissions),
          roles
        })
      )
      
    } catch (error) {
      console.error('Get permissions error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/user/organization
   * Get current user's organization details
   */
  fastify.get('/organization', {
    schema: {
      description: 'Get current user organization details',
      tags: ['User'],
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
                organisation: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    logoUrl: { type: 'string' },
                    language: { type: 'string' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
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
      const organisation = await prisma.organisation.findUnique({
        where: { 
          id: request.organizationId,
          isActive: true
        }
      })
      
      if (!organisation) {
        throw createLocalizedError('organization.organization_not_found', request.language, 404)
      }
      
      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          organisation
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get organization error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * DELETE /api/user/account
   * Deactivate current user's account
   */
  fastify.delete('/account', {
    schema: {
      description: 'Deactivate current user account',
      tags: ['User'],
      security: [{ bearerAuth: [] }],
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
      // Deactivate user and revoke all tokens in transaction
      await prisma.$transaction(async (tx) => {
        // Deactivate user
        await tx.user.update({
          where: { 
            id: request.user.id,
            organisationId: request.organizationId
          },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        })
        
        // Revoke all refresh tokens
        await tx.refreshToken.deleteMany({
          where: { userId: request.user.id }
        })
      })
      
      return reply.send(
        createLocalizedSuccess('user.user_deleted', request.language)
      )
      
    } catch (error) {
      console.error('Deactivate account error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // ===========================
  // User Management CRUD APIs
  // ===========================

  /**
   * POST /api/user
   * Create a new user (Admin only)
   */
  fastify.post('/', {
    preHandler: [validateRequest(userSchema)],
    schema: {
      description: 'Create a new user',
      tags: ['User Management'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'organisationId'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          organisationId: { type: 'string', minLength: 1 },
          language: { type: 'string', enum: ['en', 'es', 'fr'] },
          employeeId: { type: 'string', maxLength: 50 },
          roleIds: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                user: { 
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log("👤 Creating new user...")
      const user = await UserService.create(request.body, request.language)
      reply.code(201).send(user)
    } catch (error) {
      console.error("❌ Create user error:", error)
      if (error.statusCode) {
        throw error
      }
      reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      })
    }
  })

  /**
   * GET /api/user
   * Get all users with pagination and filtering
   */
  fastify.get('/', {
    schema: {
      description: 'Get all users with pagination and filtering',
      tags: ['User Management'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          isActive: { type: 'boolean' },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
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
                pagination: { type: 'object' }
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
        organisationId: request.organizationId
      }
      const users = await UserService.findAll(options, request.language)
      reply.send(users)
    } catch (error) {
      console.error("❌ Get all users error:", error)
      if (error.statusCode) {
        throw error
      }
      reply.code(500).send({ 
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message 
      })
    }
  })

  /**
   * GET /api/user/:id
   * Get user by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get user by ID',
      tags: ['User Management'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                user: { 
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = await UserService.findById(request.params.id, request.organizationId, request.language)
      reply.send(user)
    } catch (error) {
      console.error("❌ Get user by ID error:", error)
      if (error.statusCode) {
        reply.code(error.statusCode).send({
          statusCode: error.statusCode,
          error: error.statusCode === 404 ? 'Not Found' : 'Error',
          message: error.message
        })
      } else {
        reply.code(500).send({ 
          statusCode: 500,
          error: 'Internal Server Error',
          message: error.message 
        })
      }
    }
  })

  /**
   * PUT /api/user/:id
   * Update user by ID
   */
  fastify.put('/:id', {
    preHandler: [validateRequest(adminUpdateUserSchema)],
    schema: {
      description: 'Update user by ID',
      tags: ['User Management'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          language: { type: 'string', enum: ['en', 'es', 'fr'] },
          employeeId: { type: 'string', maxLength: 50 },
          isActive: { type: 'boolean' },
          roleIds: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                user: { 
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = await UserService.update(request.params.id, request.body, request.organizationId, request.language)
      reply.send(user)
    } catch (error) {
      console.error("❌ Update user error:", error)
      if (error.statusCode) {
        throw error
      }
      reply.code(400).send({ 
        statusCode: 400,
        error: 'Bad Request',
        message: error.message 
      })
    }
  })

  /**
   * DELETE /api/user/:id
   * Delete user by ID (soft delete)
   */
  fastify.delete('/:id', {
    schema: {
      description: 'Delete user by ID (deactivate)',
      tags: ['User Management'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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
      await UserService.delete(request.params.id, request.organizationId, request.language)
      reply.send({
        success: true,
        message: 'User deleted successfully'
      })
    } catch (error) {
      console.error("❌ Delete user error:", error)
      if (error.statusCode) {
        throw error
      }
      reply.code(500).send({ 
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message 
      })
    }
  })

  console.log("✅ User routes registered")
}
