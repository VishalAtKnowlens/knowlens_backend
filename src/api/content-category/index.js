import { ContentCategoryService } from '../../services/content-category.js'
import { validateSchema, createContentCategorySchema, updateContentCategorySchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

/**
 * Content Category routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function contentCategoryRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  /**
   * POST /api/content-categories
   * Create a new content category
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Create a new content category',
      tags: ['Content Categories'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const categoryData = validateSchema(createContentCategorySchema, request.body)
      const result = await ContentCategoryService.create(categoryData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create category error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/content-categories
   * Get all content categories
   */
  fastify.get('/', {
    schema: {
      description: 'Get all content categories',
      tags: ['Content Categories'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const result = await ContentCategoryService.findAll(request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get categories error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/content-categories/:id
   * Get content category by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get content category by ID',
      tags: ['Content Categories'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await ContentCategoryService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get category error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * PUT /api/content-categories/:id
   * Update content category by ID
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Update content category by ID',
      tags: ['Content Categories'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateContentCategorySchema, request.body)
      const result = await ContentCategoryService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update category error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * DELETE /api/content-categories/:id
   * Delete content category by ID
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Delete content category by ID',
      tags: ['Content Categories'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await ContentCategoryService.delete(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete category error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * POST /api/content-categories/:id/courses/:courseId
   * Link course to category
   */
  fastify.post('/:id/courses/:courseId', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Link course to category',
      tags: ['Content Categories'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id, courseId } = request.params
      const result = await ContentCategoryService.linkCourse(parseInt(id), parseInt(courseId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Link course to category error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * DELETE /api/content-categories/:id/courses/:courseId
   * Unlink course from category
   */
  fastify.delete('/:id/courses/:courseId', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Unlink course from category',
      tags: ['Content Categories'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id, courseId } = request.params
      const result = await ContentCategoryService.unlinkCourse(parseInt(id), parseInt(courseId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Unlink course from category error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
