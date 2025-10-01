import { prisma } from '../../config/database.js'
import { authenticate, enforceOrganizationScope, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'

/**
 * Role Assignment routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function roleAssignmentRoutes(fastify) {
  // Add hooks for all role assignment routes
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  
  /**
   * GET /api/role-assignments
   * Get all role assignments in organization
   */
  fastify.get('/', {
    preHandler: [requirePermissions(['admin', 'role_management', 'user_management'])],
    schema: {
      description: 'Get all role assignments in organization',
      tags: ['Role Assignments'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          userId: { type: 'integer' },
          roleId: { type: 'integer' },
          divisionId: { type: 'integer' },
          sortBy: { type: 'string', enum: ['createdAt', 'user', 'role'], default: 'createdAt' },
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
                roleAssignments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      userId: { type: 'integer' },
                      roleId: { type: 'integer' },
                      divisionId: { type: 'integer' },
                      createdAt: { type: 'string', format: 'date-time' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          firstName: { type: 'string' },
                          lastName: { type: 'string' },
                          email: { type: 'string' }
                        }
                      },
                      role: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' }
                        }
                      },
                      division: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          shortName: { type: 'string' }
                        }
                      }
                    }
                  }
                },
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
      const { page = 1, limit = 20, userId, roleId, divisionId, sortBy = 'createdAt', sortOrder = 'desc' } = request.query
      const skip = (page - 1) * limit

      // Build where clause
      const where = {
        role: {
          organizationId: request.organizationId
        }
      }

      if (userId) where.userId = userId
      if (roleId) where.roleId = roleId
      if (divisionId) where.divisionId = divisionId

      // Build orderBy clause
      let orderBy = {}
      if (sortBy === 'user') {
        orderBy = { user: { firstName: sortOrder } }
      } else if (sortBy === 'role') {
        orderBy = { role: { name: sortOrder } }
      } else {
        orderBy = { [sortBy]: sortOrder }
      }

      // Get role assignments
      const [roleAssignments, total] = await Promise.all([
        prisma.roleAssignment.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                status: true
              }
            },
            role: {
              select: {
                id: true,
                name: true
              }
            },
            division: {
              select: {
                id: true,
                name: true,
                shortName: true
              }
            }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.roleAssignment.count({ where })
      ])

      const pages = Math.ceil(total / limit)

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          roleAssignments,
          pagination: { page, limit, total, pages }
        })
      )
      
    } catch (error) {
      console.error('Get role assignments error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * POST /api/role-assignments
   * Create a new role assignment
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Create a new role assignment',
      tags: ['Role Assignments'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userId', 'roleId', 'divisionId'],
        properties: {
          userId: { type: 'integer' },
          roleId: { type: 'integer' },
          divisionId: { type: 'integer' }
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
                roleAssignment: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    userId: { type: 'integer' },
                    roleId: { type: 'integer' },
                    divisionId: { type: 'integer' },
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
      const { userId, roleId, divisionId } = request.body

      // Verify user exists and belongs to organization
      const user = await prisma.user.findUnique({
        where: { 
          id: userId,
          organizationId: request.organizationId
        }
      })

      if (!user) {
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }

      // Verify role exists and belongs to organization
      const role = await prisma.role.findUnique({
        where: { 
          id: roleId,
          organizationId: request.organizationId
        }
      })

      if (!role) {
        throw createLocalizedError('role.role_not_found', request.language, 404)
      }

      // Verify division exists and belongs to organization
      const division = await prisma.division.findUnique({
        where: { 
          id: divisionId,
          organizationId: request.organizationId
        }
      })

      if (!division) {
        throw createLocalizedError('division.not_found', request.language, 404)
      }

      // Check if role assignment already exists
      const existingAssignment = await prisma.roleAssignment.findUnique({
        where: {
          userId_roleId_divisionId: {
            userId,
            roleId,
            divisionId
          }
        }
      })

      if (existingAssignment) {
        throw createLocalizedError('role_assignment.already_exists', request.language, 409)
      }

      const roleAssignment = await prisma.roleAssignment.create({
        data: {
          userId,
          roleId,
          divisionId
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          role: {
            select: {
              id: true,
              name: true
            }
          },
          division: {
            select: {
              id: true,
              name: true,
              shortName: true
            }
          }
        }
      })

      return reply.code(201).send(
        createLocalizedSuccess('role_assignment.created_successfully', request.language, {
          roleAssignment
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create role assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/role-assignments/:id
   * Get specific role assignment by ID
   */
  fastify.get('/:id', {
    preHandler: [requirePermissions(['admin', 'role_management', 'user_management'])],
    schema: {
      description: 'Get specific role assignment by ID',
      tags: ['Role Assignments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
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
                roleAssignment: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params

      const roleAssignment = await prisma.roleAssignment.findFirst({
        where: { 
          id: parseInt(id),
          role: {
            organizationId: request.organizationId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true
            }
          },
          role: {
            select: {
              id: true,
              name: true
            }
          },
          division: {
            select: {
              id: true,
              name: true,
              shortName: true
            }
          }
        }
      })

      if (!roleAssignment) {
        throw createLocalizedError('role_assignment.not_found', request.language, 404)
      }

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          roleAssignment
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get role assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * DELETE /api/role-assignments/:id
   * Delete a role assignment
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Delete a role assignment',
      tags: ['Role Assignments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
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

      // Check if role assignment exists in organization
      const existingAssignment = await prisma.roleAssignment.findFirst({
        where: { 
          id: parseInt(id),
          role: {
            organizationId: request.organizationId
          }
        }
      })

      if (!existingAssignment) {
        throw createLocalizedError('role_assignment.not_found', request.language, 404)
      }

      // Delete role assignment
      await prisma.roleAssignment.delete({
        where: { id: parseInt(id) }
      })

      return reply.send(
        createLocalizedSuccess('role_assignment.deleted_successfully', request.language)
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete role assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/role-assignments/user/:userId
   * Get all role assignments for a specific user
   */
  fastify.get('/user/:userId', {
    preHandler: [requirePermissions(['admin', 'role_management', 'user_management'])],
    schema: {
      description: 'Get all role assignments for a specific user',
      tags: ['Role Assignments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'integer' }
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
                roleAssignments: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userId } = request.params

      // Verify user exists and belongs to organization
      const user = await prisma.user.findUnique({
        where: { 
          id: parseInt(userId),
          organizationId: request.organizationId
        }
      })

      if (!user) {
        throw createLocalizedError('user.user_not_found', request.language, 404)
      }

      const roleAssignments = await prisma.roleAssignment.findMany({
        where: { 
          userId: parseInt(userId)
        },
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
              name: true,
              shortName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          roleAssignments
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get user role assignments error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * POST /api/role-assignments/bulk
   * Create multiple role assignments
   */
  fastify.post('/bulk', {
    preHandler: [requirePermissions(['admin', 'role_management'])],
    schema: {
      description: 'Create multiple role assignments',
      tags: ['Role Assignments'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['assignments'],
        properties: {
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['userId', 'roleId', 'divisionId'],
              properties: {
                userId: { type: 'integer' },
                roleId: { type: 'integer' },
                divisionId: { type: 'integer' }
              }
            },
            minItems: 1,
            maxItems: 50
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
                created: { type: 'integer' },
                skipped: { type: 'integer' },
                errors: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { assignments } = request.body
      const results = { created: 0, skipped: 0, errors: [] }

      for (const assignment of assignments) {
        try {
          const { userId, roleId, divisionId } = assignment

          // Verify all entities exist and belong to organization
          const [user, role, division] = await Promise.all([
            prisma.user.findUnique({
              where: { id: userId, organizationId: request.organizationId }
            }),
            prisma.role.findUnique({
              where: { id: roleId, organizationId: request.organizationId }
            }),
            prisma.division.findUnique({
              where: { id: divisionId, organizationId: request.organizationId }
            })
          ])

          if (!user || !role || !division) {
            results.errors.push({
              assignment,
              error: 'Invalid user, role, or division'
            })
            continue
          }

          // Check if assignment already exists
          const existing = await prisma.roleAssignment.findUnique({
            where: {
              userId_roleId_divisionId: {
                userId,
                roleId,
                divisionId
              }
            }
          })

          if (existing) {
            results.skipped++
            continue
          }

          // Create assignment
          await prisma.roleAssignment.create({
            data: { userId, roleId, divisionId }
          })

          results.created++

        } catch (error) {
          results.errors.push({
            assignment,
            error: error.message
          })
        }
      }

      return reply.code(201).send(
        createLocalizedSuccess('role_assignment.bulk_created', request.language, results)
      )
      
    } catch (error) {
      console.error('Bulk create role assignments error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}