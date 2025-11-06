import { DocumentService } from '../../services/document.js'
import { validateSchema, createDocumentSchema, updateDocumentSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

/**
 * Document routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function documentRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  /**
   * POST /api/documents
   * Create a new document
   */
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Create a new document',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const documentData = validateSchema(createDocumentSchema, request.body)
      const result = await DocumentService.create(documentData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create document error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/documents
   * Get all documents
   */
  fastify.get('/', {
    schema: {
      description: 'Get all documents',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const result = await DocumentService.findAll(request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get documents error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/documents/:id
   * Get document by ID
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get document by ID',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await DocumentService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get document error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * PUT /api/documents/:id
   * Update document by ID
   */
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Update document by ID',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateDocumentSchema, request.body)
      const result = await DocumentService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update document error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * DELETE /api/documents/:id
   * Delete document by ID (soft delete)
   */
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Delete document by ID',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await DocumentService.delete(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete document error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * POST /api/documents/:id/view
   * Record document view
   */
  fastify.post('/:id/view', {
    schema: {
      description: 'Record document view',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await DocumentService.recordView(parseInt(id), request.userId, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Record document view error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  /**
   * GET /api/documents/:id/stats
   * Get document statistics
   */
  fastify.get('/:id/stats', {
    preHandler: [requirePermissions(['admin', 'content_management'])],
    schema: {
      description: 'Get document statistics',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await DocumentService.getStatistics(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get document statistics error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
