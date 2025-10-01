import { prisma } from '../../config/database.js'
import { validateSchema, updateOrganizationSchema, createRoleSchema, updateRoleSchema, createOrganizationSchema } from '../../utils/validation.js'
import { authenticate, enforceOrganizationScope, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'
import { OrganizationService } from '../../services/organization.js'

/**
 * Organization routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function organizationRoutes(fastify) {
  // Add hooks for all organization routes
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  
  /**
   * POST /api/organization
   * Create a new organization
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['super_admin'])],
    schema: {
      description: 'Create a new organization',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          slug: { type: 'string', minLength: 3, maxLength: 50 },
          logoUrl: { type: 'string', format: 'uri' },
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
                organization: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await OrganizationService.create(request.body, request.language)
      return reply.code(201).send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Create organization error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/organization
   * Get all organizations
   */
  fastify.get('/', {
    preHandler: [requirePermissions(['super_admin'])],
    schema: {
      description: 'Get all organizations',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
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
                organizations: { type: 'array' },
                pagination: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await OrganizationService.findAll(request.query, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Get organizations error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/organization/:id
   * Get organization by ID
   */
  fastify.get('/:id', {
    preHandler: [requirePermissions(['super_admin', 'organization_read'])],
    schema: {
      description: 'Get organization by ID',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
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
                organization: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await OrganizationService.findById(id, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Get organization error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/organization/settings
   * Get organization settings
   */
  fastify.get('/settings', {
    preHandler: [requirePermissions(['admin', 'organization_settings'])],
    schema: {
      description: 'Get organization settings',
      tags: ['Organization'],
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
      const result = await OrganizationService.findById(request.organizationId, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get organization settings error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * PUT /api/organization/settings
   * Update organization settings
   */
  fastify.put('/settings', {
    preHandler: [requirePermissions(['admin', 'organization_settings'])],
    schema: {
      description: 'Update organization settings',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          logoUrl: { type: 'string', format: 'uri' },
          language: { type: 'string', enum: ['en', 'es', 'fr'] }
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
                organization: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const updateData = validateSchema(updateOrganizationSchema, request.body)
      const result = await OrganizationService.update(request.organizationId, updateData, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update organization settings error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/organization/roles
   * Get all roles in organization
   */
  fastify.get('/roles', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Get all roles in organization',
      tags: ['Organization'],
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
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      permissions: { type: 'array' },
                      isDefault: { type: 'boolean' },
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
    }
  }, async (request, reply) => {
    try {
      const roles = await prisma.role.findMany({
        where: { 
          organizationId: request.organizationId 
        },
        orderBy: {
          name: 'asc'
        }
      })
      
      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          roles
        })
      )
      
    } catch (error) {
      console.error('Get roles error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * POST /api/organization/roles
   * Create a new role
   */
  fastify.post('/roles', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Create a new role',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'permissions'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
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
                role: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const roleData = validateSchema(createRoleSchema, request.body)
      
      // Check if role name already exists in organization
      const existingRole = await prisma.role.findUnique({
        where: {
          name_organizationId: {
            name: roleData.name,
            organizationId: request.organizationId
          }
        }
      })
      
      if (existingRole) {
        throw createLocalizedError('role.role_name_exists', request.language, 409)
      }
      
      const role = await prisma.role.create({
        data: {
          ...roleData,
          organizationId: request.organizationId
        }
      })
      
      return reply.code(201).send(
        createLocalizedSuccess('role.role_created', request.language, {
          role
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create role error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/organization/roles/:id
   * Get specific role by ID
   */
  fastify.get('/roles/:id', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Get specific role by ID',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
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
                role: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      
      const role = await prisma.role.findUnique({
        where: { 
          id,
          organizationId: request.organizationId
        },
        include: {
          userRoles: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      })
      
      if (!role) {
        throw createLocalizedError('role.role_not_found', request.language, 404)
      }
      
      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          role
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get role error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * PUT /api/organization/roles/:id
   * Update a role
   */
  fastify.put('/roles/:id', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Update a role',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          permissions: {
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
                role: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateRoleSchema, request.body)
      
      // Check if role exists in organization
      const existingRole = await prisma.role.findUnique({
        where: { 
          id,
          organizationId: request.organizationId
        }
      })
      
      if (!existingRole) {
        throw createLocalizedError('role.role_not_found', request.language, 404)
      }
      
      // Check if new name conflicts with existing role
      if (updateData.name && updateData.name !== existingRole.name) {
        const nameConflict = await prisma.role.findUnique({
          where: {
            name_organizationId: {
              name: updateData.name,
              organizationId: request.organizationId
            }
          }
        })
        
        if (nameConflict) {
          throw createLocalizedError('role.role_name_exists', request.language, 409)
        }
      }
      
      const updatedRole = await prisma.role.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      })
      
      return reply.send(
        createLocalizedSuccess('role.role_updated', request.language, {
          role: updatedRole
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update role error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * DELETE /api/organization/roles/:id
   * Delete a role
   */
  fastify.delete('/roles/:id', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Delete a role',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
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
      
      // Check if role exists in organization
      const existingRole = await prisma.role.findUnique({
        where: { 
          id,
          organizationId: request.organizationId
        }
      })
      
      if (!existingRole) {
        throw createLocalizedError('role.role_not_found', request.language, 404)
      }
      
      // Prevent deletion of default roles
      if (existingRole.isDefault) {
        throw createLocalizedError('role.cannot_delete_default_role', request.language, 400)
      }
      
      // Check if role is assigned to any users
      const userRoleCount = await prisma.userRole.count({
        where: { roleId: id }
      })
      
      if (userRoleCount > 0) {
        throw createLocalizedError('role.cannot_delete_assigned_role', request.language, 400)
      }
      
      // Delete role
      await prisma.role.delete({
        where: { id }
      })
      
      return reply.send(
        createLocalizedSuccess('role.role_deleted', request.language)
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete role error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/organization/stats
   * Get organization statistics
   */
  fastify.get('/stats', {
    preHandler: [requirePermissions(['admin', 'organization_stats'])],
    schema: {
      description: 'Get organization statistics',
      tags: ['Organization'],
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
                stats: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'integer' },
                    activeUsers: { type: 'integer' },
                    totalRoles: { type: 'integer' },
                    recentLogins: { type: 'integer' }
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
      // Get current date for recent login calculation (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      // Run all queries in parallel
      const [totalUsers, activeUsers, totalRoles, recentLogins] = await Promise.all([
        prisma.user.count({
          where: { organizationId: request.organizationId }
        }),
        prisma.user.count({
          where: { 
            organizationId: request.organizationId,
            isActive: true
          }
        }),
        prisma.role.count({
          where: { organizationId: request.organizationId }
        }),
        prisma.user.count({
          where: {
            organizationId: request.organizationId,
            lastLoginAt: {
              gte: thirtyDaysAgo
            }
          }
        })
      ])
      
      const stats = {
        totalUsers,
        activeUsers,
        totalRoles,
        recentLogins
      }
      
      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          stats
        })
      )
      
    } catch (error) {
      console.error('Get organization stats error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * PUT /api/organization/:id
   * Update organization by ID
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['super_admin', 'organization_write'])],
    schema: {
      description: 'Update organization by ID',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          logoUrl: { type: 'string', format: 'uri' },
          language: { type: 'string', enum: ['en', 'es', 'fr'] }
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
                organization: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await OrganizationService.update(id, request.body, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Update organization error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * DELETE /api/organization/:id
   * Delete organization by ID
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['super_admin'])],
    schema: {
      description: 'Delete organization by ID',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
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
      const result = await OrganizationService.delete(id, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Delete organization error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * POST /api/organization/:id/divisions
   * Create a division in organization
   */
  fastify.post('/:id/divisions', {
    preHandler: [requirePermissions(['admin', 'organization_write'])],
    schema: {
      description: 'Create a division in organization',
      tags: ['Organization'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          shortName: { type: 'string', maxLength: 10 }
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
                division: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await OrganizationService.createDivision(id, request.body, request.language)
      return reply.code(201).send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Create division error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
