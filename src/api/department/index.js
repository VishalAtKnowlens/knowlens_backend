import { prisma } from '../../config/database.js'
import { authenticate, enforceOrganizationScope, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedSuccess, createLocalizedError } from '../../config/i18n.js'

/**
 * Department routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function departmentRoutes(fastify) {
  // Add hooks for all department routes
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  
  /**
   * GET /api/departments
   * Get all departments in organization
   */
  fastify.get('/', {
    preHandler: [requirePermissions(['admin', 'department_management', 'organization_read'])],
    schema: {
      description: 'Get all departments in organization',
      tags: ['Departments'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          divisionId: { type: 'integer' },
          sortBy: { type: 'string', enum: ['name', 'createdAt'], default: 'name' },
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
                departments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      divisionId: { type: 'integer' },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                      division: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          shortName: { type: 'string' }
                        }
                      },
                      _count: {
                        type: 'object',
                        properties: {
                          users: { type: 'integer' },
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
      const { page = 1, limit = 20, search, divisionId, sortBy = 'name', sortOrder = 'asc' } = request.query
      const skip = (page - 1) * limit

      // Build where clause
      const where = {
        division: {
          organizationId: request.organizationId
        }
      }

      if (divisionId) {
        where.divisionId = divisionId
      }

      if (search) {
        where.name = { contains: search, mode: 'insensitive' }
      }

      // Get departments with counts
      const [departments, total] = await Promise.all([
        prisma.department.findMany({
          where,
          include: {
            division: {
              select: {
                id: true,
                name: true,
                shortName: true
              }
            },
            _count: {
              select: {
                users: true,
                userOrgProfiles: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.department.count({ where })
      ])

      const pages = Math.ceil(total / limit)

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          departments,
          pagination: { page, limit, total, pages }
        })
      )
      
    } catch (error) {
      console.error('Get departments error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * POST /api/departments
   * Create a new department
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'department_management'])],
    schema: {
      description: 'Create a new department',
      tags: ['Departments'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'divisionId'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
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
                department: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    divisionId: { type: 'integer' },
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
      const { name, divisionId } = request.body

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

      // Check if department name already exists in division
      const existingDepartment = await prisma.department.findUnique({
        where: {
          divisionId_name: {
            divisionId,
            name
          }
        }
      })

      if (existingDepartment) {
        throw createLocalizedError('department.name_already_exists_in_division', request.language, 409)
      }

      const department = await prisma.department.create({
        data: {
          name,
          divisionId
        },
        include: {
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
        createLocalizedSuccess('department.created_successfully', request.language, {
          department
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create department error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * GET /api/departments/:id
   * Get specific department by ID
   */
  fastify.get('/:id', {
    preHandler: [requirePermissions(['admin', 'department_management', 'organization_read'])],
    schema: {
      description: 'Get specific department by ID',
      tags: ['Departments'],
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
                department: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    divisionId: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                    division: { type: 'object' },
                    users: { type: 'array' },
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

      const department = await prisma.department.findFirst({
        where: { 
          id: parseInt(id),
          division: {
            organizationId: request.organizationId
          }
        },
        include: {
          division: {
            select: {
              id: true,
              name: true,
              shortName: true,
              organizationId: true
            }
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              users: true,
              userOrgProfiles: true
            }
          }
        }
      })

      if (!department) {
        throw createLocalizedError('department.not_found', request.language, 404)
      }

      return reply.send(
        createLocalizedSuccess('success.data_retrieved', request.language, {
          department
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get department error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * PUT /api/departments/:id
   * Update a department
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'department_management'])],
    schema: {
      description: 'Update a department',
      tags: ['Departments'],
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
          divisionId: { type: 'integer' }
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
                department: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const { name, divisionId } = request.body

      // Check if department exists in organization
      const existingDepartment = await prisma.department.findFirst({
        where: { 
          id: parseInt(id),
          division: {
            organizationId: request.organizationId
          }
        }
      })

      if (!existingDepartment) {
        throw createLocalizedError('department.not_found', request.language, 404)
      }

      // If divisionId is being changed, verify new division exists
      if (divisionId && divisionId !== existingDepartment.divisionId) {
        const newDivision = await prisma.division.findUnique({
          where: { 
            id: divisionId,
            organizationId: request.organizationId
          }
        })

        if (!newDivision) {
          throw createLocalizedError('division.not_found', request.language, 404)
        }
      }

      // Check if new name conflicts with existing department in the same division
      if (name && name !== existingDepartment.name) {
        const targetDivisionId = divisionId || existingDepartment.divisionId
        const nameConflict = await prisma.department.findUnique({
          where: {
            divisionId_name: {
              divisionId: targetDivisionId,
              name
            }
          }
        })

        if (nameConflict) {
          throw createLocalizedError('department.name_already_exists_in_division', request.language, 409)
        }
      }

      const updatedDepartment = await prisma.department.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name }),
          ...(divisionId && { divisionId }),
          updatedAt: new Date()
        },
        include: {
          division: {
            select: {
              id: true,
              name: true,
              shortName: true
            }
          }
        }
      })

      return reply.send(
        createLocalizedSuccess('department.updated_successfully', request.language, {
          department: updatedDepartment
        })
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update department error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
  
  /**
   * DELETE /api/departments/:id
   * Delete a department
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'department_management'])],
    schema: {
      description: 'Delete a department',
      tags: ['Departments'],
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

      // Check if department exists in organization
      const existingDepartment = await prisma.department.findFirst({
        where: { 
          id: parseInt(id),
          division: {
            organizationId: request.organizationId
          }
        }
      })

      if (!existingDepartment) {
        throw createLocalizedError('department.not_found', request.language, 404)
      }

      // Check if department has users
      const userCount = await prisma.user.count({
        where: { departmentId: parseInt(id) }
      })

      if (userCount > 0) {
        throw createLocalizedError('department.cannot_delete_with_users', request.language, 400)
      }

      // Check if department has user org profiles
      const userOrgProfileCount = await prisma.userOrgProfile.count({
        where: { departmentId: parseInt(id) }
      })

      if (userOrgProfileCount > 0) {
        throw createLocalizedError('department.cannot_delete_with_user_profiles', request.language, 400)
      }

      // Delete department
      await prisma.department.delete({
        where: { id: parseInt(id) }
      })

      return reply.send(
        createLocalizedSuccess('department.deleted_successfully', request.language)
      )
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete department error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}