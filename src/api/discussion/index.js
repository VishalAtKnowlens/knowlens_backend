import { DiscussionService } from '../../services/discussion.js'
import { validateSchema, createDiscussionSchema, updateDiscussionSchema, createDiscussionPostSchema, updateDiscussionPostSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions, enforceOrganizationScope } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

export default async function discussionRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  fastify.addHook('preHandler', enforceOrganizationScope)
  
  // POST /api/discussions - Create discussion
  fastify.post('/', {
    schema: { description: 'Create a new discussion', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const discussionData = validateSchema(createDiscussionSchema, request.body)
      const result = await DiscussionService.create(discussionData, request.userId, request.organizationId, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create discussion error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/discussions - List discussions
  fastify.get('/', {
    schema: { description: 'Get all discussions', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const result = await DiscussionService.findAll(request.query, request.organizationId, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get discussions error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/discussions/:id - Get discussion by ID
  fastify.get('/:id', {
    schema: { description: 'Get discussion by ID', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await DiscussionService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get discussion error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // PUT /api/discussions/:id - Update discussion
  fastify.put('/:id', {
    schema: { description: 'Update discussion by ID', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateDiscussionSchema, request.body)
      const result = await DiscussionService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update discussion error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // DELETE /api/discussions/:id - Delete discussion
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'moderator'])],
    schema: { description: 'Delete discussion by ID', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await DiscussionService.delete(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete discussion error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // POST /api/discussions/:id/posts - Create post
  fastify.post('/:id/posts', {
    schema: { description: 'Create discussion post', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const postData = validateSchema(createDiscussionPostSchema, request.body)
      const result = await DiscussionService.createPost(parseInt(id), request.userId, postData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create post error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // PUT /api/discussions/posts/:postId - Update post
  fastify.put('/posts/:postId', {
    schema: { description: 'Update discussion post', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { postId } = request.params
      const updateData = validateSchema(updateDiscussionPostSchema, request.body)
      const result = await DiscussionService.updatePost(parseInt(postId), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update post error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // DELETE /api/discussions/posts/:postId - Delete post
  fastify.delete('/posts/:postId', {
    schema: { description: 'Delete discussion post', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { postId } = request.params
      const result = await DiscussionService.deletePost(parseInt(postId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete post error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // POST /api/discussions/posts/:postId/like - Toggle like
  fastify.post('/posts/:postId/like', {
    schema: { description: 'Like/Unlike discussion post', tags: ['Discussions'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { postId } = request.params
      const result = await DiscussionService.toggleLike(parseInt(postId), request.userId, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Toggle like error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
