import { CourseEnrollmentService } from '../../services/course-enrollment.js'
import { validateSchema, updateEnrollmentProgressSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

export default async function courseEnrollmentRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  // POST /api/enrollments/courses/:courseId - Enroll in course
  fastify.post('/courses/:courseId', {
    schema: { description: 'Enroll in a course', tags: ['Enrollments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { courseId } = request.params
      const result = await CourseEnrollmentService.enroll(request.userId, parseInt(courseId), request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Enroll error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/enrollments/my - Get my enrollments
  fastify.get('/my', {
    schema: { description: 'Get my course enrollments', tags: ['Enrollments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const result = await CourseEnrollmentService.getUserEnrollments(request.userId, request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get my enrollments error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/enrollments/courses/:courseId - Get course enrollments (admin)
  fastify.get('/courses/:courseId', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Get course enrollments', tags: ['Enrollments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { courseId } = request.params
      const result = await CourseEnrollmentService.getCourseEnrollments(parseInt(courseId), request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get course enrollments error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/enrollments/:id - Get enrollment by ID
  fastify.get('/:id', {
    schema: { description: 'Get enrollment by ID', tags: ['Enrollments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await CourseEnrollmentService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get enrollment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // PUT /api/enrollments/:id/progress - Update enrollment progress
  fastify.put('/:id/progress', {
    schema: { description: 'Update enrollment progress', tags: ['Enrollments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const progressData = validateSchema(updateEnrollmentProgressSchema, request.body)
      const result = await CourseEnrollmentService.updateProgress(parseInt(id), progressData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update progress error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // DELETE /api/enrollments/:id - Unenroll from course
  fastify.delete('/:id', {
    schema: { description: 'Unenroll from course', tags: ['Enrollments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await CourseEnrollmentService.unenroll(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Unenroll error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/enrollments/courses/:courseId/stats - Get enrollment statistics
  fastify.get('/courses/:courseId/stats', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Get enrollment statistics', tags: ['Enrollments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { courseId } = request.params
      const result = await CourseEnrollmentService.getStatistics(parseInt(courseId), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get enrollment statistics error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
