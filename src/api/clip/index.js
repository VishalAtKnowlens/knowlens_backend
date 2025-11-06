import { ClipService } from '../../services/clip.js'
import { validateSchema, createClipSchema, updateClipSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

/**
 * Clip routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function clipRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  /**
   * POST /api/clips
   * Create a new clip
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Create a new clip',
      tags: ['Clips'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const clipData = validateSchema(createClipSchema, request.body)
      const result = await ClipService.create(clipData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create clip error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/clips
   * Get all clips
   */
  fastify.get('/', {
    schema: {
      description: 'Get all clips',
      tags: ['Clips'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const result = await ClipService.findAll(request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get clips error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/clips/:id
   * Get clip by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get clip by ID',
      tags: ['Clips'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await ClipService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get clip error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * PUT /api/clips/:id
   * Update clip by ID
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Update clip by ID',
      tags: ['Clips'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateClipSchema, request.body)
      const result = await ClipService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update clip error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * DELETE /api/clips/:id
   * Delete clip by ID (soft delete)
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Delete clip by ID',
      tags: ['Clips'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await ClipService.delete(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete clip error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/clips/:id/stats
   * Get clip progress statistics
   */
  fastify.get('/:id/stats', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: {
      description: 'Get clip progress statistics',
      tags: ['Clips'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await ClipService.getProgressStatistics(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get clip statistics error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
