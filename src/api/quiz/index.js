import { QuizService } from '../../services/quiz.js'
import { validateSchema, createQuizSchema, updateQuizSchema, submitQuizAnswerSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

export default async function quizRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  // POST /api/quizzes - Create quiz
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Create a new quiz', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const quizData = validateSchema(createQuizSchema, request.body)
      const result = await QuizService.create(quizData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create quiz error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/quizzes - List quizzes
  fastify.get('/', {
    schema: { description: 'Get all quizzes', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const result = await QuizService.findAll(request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get quizzes error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/quizzes/:id - Get quiz by ID
  fastify.get('/:id', {
    schema: { description: 'Get quiz by ID', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await QuizService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get quiz error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // PUT /api/quizzes/:id - Update quiz
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Update quiz by ID', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateQuizSchema, request.body)
      const result = await QuizService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update quiz error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // DELETE /api/quizzes/:id - Delete quiz
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Delete quiz by ID', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await QuizService.delete(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete quiz error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // POST /api/quizzes/:id/start - Start quiz attempt
  fastify.post('/:id/start', {
    schema: { description: 'Start quiz attempt', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await QuizService.startAttempt(parseInt(id), request.userId, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Start quiz attempt error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // POST /api/quizzes/attempts/:attemptId/answer - Submit answer
  fastify.post('/attempts/:attemptId/answer', {
    schema: { description: 'Submit quiz answer', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { attemptId } = request.params
      const answerData = validateSchema(submitQuizAnswerSchema, request.body)
      const result = await QuizService.submitAnswer(parseInt(attemptId), answerData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Submit answer error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // POST /api/quizzes/attempts/:attemptId/complete - Complete attempt
  fastify.post('/attempts/:attemptId/complete', {
    schema: { description: 'Complete quiz attempt', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { attemptId } = request.params
      const result = await QuizService.completeAttempt(parseInt(attemptId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Complete attempt error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/quizzes/:id/stats - Get quiz statistics
  fastify.get('/:id/stats', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Get quiz statistics', tags: ['Quizzes'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await QuizService.getStatistics(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get quiz statistics error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
