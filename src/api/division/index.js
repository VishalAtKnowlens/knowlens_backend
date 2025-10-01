import { prisma } from '../../config/database.js'
import { authenticate, enforceOrganizationScope, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'

/**
 * Division routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function divisionRoutes(fastify) {
  // Add hooks for all division routes
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  
  /**
   * GET /api/divisions
   * Get all divisions in organization
   */
  fastify.get('/', {
    preHandler: [requirePermissions(['admin', 'division_management', 'organization_read'])],
    schema: {
      description: 'Get all divisions in organization',
      tags: ['Divisions'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          sortBy: { type: 'string', enum: ['name', 'shortName', 'createdAt'], default: 'name' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
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
                divisions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      shortName: { type: 'string' },
                      organizationId: { type: 'integer' },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                      _count: {
                        type: 'object',
                        properties: {
                          departments: { type: 'integer' },
                          roleAssignments: { type: 'integer' },
                          userOrgProfiles: { type: 'integer' }
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
      const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = request.query
      const skip = (page - 1) * limit

      // Build where clause
      const where = {
        organizationId: request.organizationId
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { shortName: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get divisions with counts
      const [divisions, total] = await Promise.all([
        prisma.division.findMany({
          where,
          include: {
            _count: {
              select: {
                departments: true,
                roleAssignments: true,
                userOrgProfiles: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.division.count({ where })
      ])

      const pages = Math.ceil(total / limit)

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          divisions,
          pagination: { page, limit, total, pages }
        })
      )
      
    } catch (error) {
      console.error('Get divisions error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * POST /api/divisions
   * Create a new division
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'division_management'])],
    schema: {
      description: 'Create a new division',
      tags: ['Divisions'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          shortName: { type: 'string', maxLength: 20 }
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
                division: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    shortName: { type: 'string' },
                    organizationId: { type: 'integer' },
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
      const { name, shortName } = request.body

      // Check if division name already exists in organization
      const existingDivision = await prisma.division.findUnique({
        where: {
          organizationId_name: {
            organizationId: request.organizationId,
            name
          }
        }
      })

      if (existingDivision) {
        throw createLocalizedError('division.name_already_exists', request.language, 409)
      }

      const division = await prisma.division.create({
        data: {
          name,
          shortName,
          organizationId: request.organizationId
        }
      })

      return reply.code(201).send(
        createLocalizedSuccess('division.created_successfully', request.language, {
          division
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create division error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/divisions/:id
   * Get specific division by ID
   */
  fastify.get('/:id', {
    preHandler: [requirePermissions(['admin', 'division_management', 'organization_read'])],
    schema: {
      description: 'Get specific division by ID',
      tags: ['Divisions'],
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
                division: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    shortName: { type: 'string' },
                    organizationId: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    departments: { type: 'array' },
                    _count: { type: 'object' }
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
      const { id } = request.params

      const division = await prisma.division.findUnique({
        where: { 
          id: parseInt(id),
          organizationId: request.organizationId
        },
        include: {
          departments: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              _count: {
                select: {
                  users: true,
                  userOrgProfiles: true
                }
              }
            }
          },
          _count: {
            select: {
              departments: true,
              roleAssignments: true,
              userOrgProfiles: true
            }
          }
        }
      })

      if (!division) {
        throw createLocalizedError('division.not_found', request.language, 404)
      }

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          division
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get division error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * PUT /api/divisions/:id
   * Update a division
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'division_management'])],
    schema: {
      description: 'Update a division',
      tags: ['Divisions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          shortName: { type: 'string', maxLength: 20 }
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
      const { name, shortName } = request.body

      // Check if division exists in organization
      const existingDivision = await prisma.division.findUnique({
        where: { 
          id: parseInt(id),
          organizationId: request.organizationId
        }
      })

      if (!existingDivision) {
        throw createLocalizedError('division.not_found', request.language, 404)
      }

      // Check if new name conflicts with existing division
      if (name && name !== existingDivision.name) {
        const nameConflict = await prisma.division.findUnique({
          where: {
            organizationId_name: {
              organizationId: request.organizationId,
              name
            }
          }
        })

        if (nameConflict) {
          throw createLocalizedError('division.name_already_exists', request.language, 409)
        }
      }

      const updatedDivision = await prisma.division.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name }),
          ...(shortName !== undefined && { shortName }),
          updatedAt: new Date()
        }
      })

      return reply.send(
        createLocalizedSuccess('division.updated_successfully', request.language, {
          division: updatedDivision
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update division error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * DELETE /api/divisions/:id
   * Delete a division
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'division_management'])],
    schema: {
      description: 'Delete a division',
      tags: ['Divisions'],
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

      // Check if division exists in organization
      const existingDivision = await prisma.division.findUnique({
        where: { 
          id: parseInt(id),
          organizationId: request.organizationId
        }
      })

      if (!existingDivision) {
        throw createLocalizedError('division.not_found', request.language, 404)
      }

      // Check if division has departments
      const departmentCount = await prisma.department.count({
        where: { divisionId: parseInt(id) }
      })

      if (departmentCount > 0) {
        throw createLocalizedError('division.cannot_delete_with_departments', request.language, 400)
      }

      // Check if division has role assignments
      const roleAssignmentCount = await prisma.roleAssignment.count({
        where: { divisionId: parseInt(id) }
      })

      if (roleAssignmentCount > 0) {
        throw createLocalizedError('division.cannot_delete_with_role_assignments', request.language, 400)
      }

      // Delete division
      await prisma.division.delete({
        where: { id: parseInt(id) }
      })

      return reply.send(
        createLocalizedSuccess('division.deleted_successfully', request.language)
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete division error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}