import { VideoService } from '../../services/video.js'
import { validateSchema, createVideoSchema, updateVideoSchema, addVideoSourceSchema, addVideoSubtitleSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

/**
 * Video routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function videoRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  /**
   * POST /api/videos
   * Create a new video
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Create a new video',
      tags: ['Videos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const videoData = validateSchema(createVideoSchema, request.body)
      const result = await VideoService.create(videoData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create video error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/videos
   * Get all videos
   */
  fastify.get('/', {
    schema: {
      description: 'Get all videos',
      tags: ['Videos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const result = await VideoService.findAll(request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get videos error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/videos/:id
   * Get video by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get video by ID',
      tags: ['Videos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await VideoService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get video error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * PUT /api/videos/:id
   * Update video by ID
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Update video by ID',
      tags: ['Videos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateVideoSchema, request.body)
      const result = await VideoService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update video error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * DELETE /api/videos/:id
   * Delete video by ID (soft delete)
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Delete video by ID',
      tags: ['Videos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await VideoService.delete(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete video error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * POST /api/videos/:id/sources
   * Add video source
   */
  fastify.post('/:id/sources', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Add video source',
      tags: ['Videos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const sourceData = validateSchema(addVideoSourceSchema, request.body)
      const result = await VideoService.addSource(parseInt(id), sourceData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Add video source error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * POST /api/videos/:id/subtitles
   * Add video subtitle
   */
  fastify.post('/:id/subtitles', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Add video subtitle',
      tags: ['Videos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const subtitleData = validateSchema(addVideoSubtitleSchema, request.body)
      const result = await VideoService.addSubtitle(parseInt(id), subtitleData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Add video subtitle error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
