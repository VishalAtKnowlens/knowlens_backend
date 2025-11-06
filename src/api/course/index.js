import { CourseService } from '../../services/course.js'
import { validateSchema, createCourseSchema, updateCourseSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

/**
 * Course routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function courseRoutes(fastify) {
  // Add hooks for all course routes
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  /**
   * POST /api/courses
   * Create a new course
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Create a new course',
      tags: ['Courses'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const courseData = validateSchema(createCourseSchema, request.body)
      const result = await CourseService.create(courseData, request.language)
      return reply.code(201).send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Create course error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/courses
   * Get all courses
   */
  fastify.get('/', {
    schema: {
      description: 'Get all courses',
      tags: ['Courses'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const result = await CourseService.findAll(request.query, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Get courses error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/courses/:id
   * Get course by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get course by ID',
      tags: ['Courses'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await CourseService.findById(parseInt(id), request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Get course error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * PUT /api/courses/:id
   * Update course by ID
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Update course by ID',
      tags: ['Courses'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateCourseSchema, request.body)
      const result = await CourseService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Update course error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * DELETE /api/courses/:id
   * Delete course by ID (soft delete)
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Delete course by ID',
      tags: ['Courses'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await CourseService.delete(parseInt(id), request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Delete course error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/courses/:id/stats
   * Get course statistics
   */
  fastify.get('/:id/stats', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Get course statistics',
      tags: ['Courses'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await CourseService.getStatistics(parseInt(id), request.language)
      return reply.send(result)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      console.error('Get course statistics error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
