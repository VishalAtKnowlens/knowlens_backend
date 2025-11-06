import { ClipProgressService } from '../../services/clip-progress.js'
import { validateSchema, updateClipProgressSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

export default async function clipProgressRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  // PUT /api/progress/clips/:clipId - Update clip progress
  fastify.put('/clips/:clipId', {
    schema: { description: 'Update clip progress', tags: ['Progress'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { clipId } = request.params
      const progressData = validateSchema(updateClipProgressSchema, request.body)
      const result = await ClipProgressService.updateProgress(request.userId, parseInt(clipId), progressData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update clip progress error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/progress/my - Get my progress
  fastify.get('/my', {
    schema: { description: 'Get my clip progress', tags: ['Progress'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const result = await ClipProgressService.getUserProgress(request.userId, request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get my progress error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/progress/clips/:clipId - Get clip progress for all users (admin)
  fastify.get('/clips/:clipId', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Get clip progress for all users', tags: ['Progress'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { clipId } = request.params
      const result = await ClipProgressService.getClipProgress(parseInt(clipId), request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get clip progress error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/progress/clips/:clipId/my - Get my progress for specific clip
  fastify.get('/clips/:clipId/my', {
    schema: { description: 'Get my progress for specific clip', tags: ['Progress'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { clipId } = request.params
      const result = await ClipProgressService.findByUserAndClip(request.userId, parseInt(clipId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get clip progress error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/progress/clips/:clipId/stats - Get clip statistics
  fastify.get('/clips/:clipId/stats', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Get clip statistics', tags: ['Progress'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { clipId } = request.params
      const result = await ClipProgressService.getStatistics(parseInt(clipId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get clip statistics error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/progress/courses/:courseId/summary - Get course progress summary
  fastify.get('/courses/:courseId/summary', {
    schema: { description: 'Get course progress summary', tags: ['Progress'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { courseId } = request.params
      const result = await ClipProgressService.getCourseProgressSummary(request.userId, parseInt(courseId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get course progress summary error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
