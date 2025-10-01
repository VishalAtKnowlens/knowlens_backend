import { prisma } from '../../config/database.js'
import { validateSchema, updateUserProfileSchema } from '../../utils/validation.js'
import { authenticate, enforceOrganizationScope } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'
import { UserService } from '../../services/user.js'

/**
 * User routes plugin - Profile and user-specific endpoints only
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
                    organization: { type: 'object' },
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
      const result = await UserService.findById(request.user.id, request.organizationId, request.language)
      return reply.send(result)

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
                    updatedAt: { type: 'string', format: 'date-time' },
                    organization: { type: 'object' },
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
      const updateData = validateSchema(updateUserProfileSchema, request.body)
      const result = await UserService.update(request.user.id, updateData, request.organizationId, request.language)
      return reply.send(result)

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
                      permissions: { type: 'array' }
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

      // Collect all unique permissions
      const allPermissions = new Set()
      const roles = userRoles.map(userRole => {
        const role = userRole.role
        if (Array.isArray(role.permissions)) {
          role.permissions.forEach(permission => allPermissions.add(permission))
        }
        return role
      })

      return reply.send(
        createLocalizedSuccess('user.permissions_retrieved', request.language, {
          permissions: Array.from(allPermissions),
          roles
        })
      )

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
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
                organization: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                    logoUrl: { type: 'string' },
                    language: { type: 'string' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' }
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
      const organization = await prisma.organization.findUnique({
        where: {
          id: request.organizationId,
          isActive: true
        }
      })

      if (!organization) {
        throw createLocalizedError('organization.organization_not_found', request.language, 404)
      }

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          organization
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
            organizationId: request.organizationId
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
        createLocalizedSuccess('user.account_deactivated', request.language)
      )

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Deactivate account error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  console.log("✅ User routes registered")
}