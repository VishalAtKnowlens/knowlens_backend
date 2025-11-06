import { AssignmentService } from '../../services/assignment.js'
import { validateSchema, createAssignmentSchema, updateAssignmentSchema, submitAssignmentSchema, gradeAssignmentSchema } from '../../utils/validation.js'
import { authenticate, requirePermissions } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { createLocalizedError } from '../../config/i18n.js'

export default async function assignmentRoutes(fastify) {
  fastify.addHook('preHandler', detectLanguage)
  fastify.addHook('preHandler', authenticate)
  
  // POST /api/assignments - Create assignment
  fastify.post('/', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Create a new assignment', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const assignmentData = validateSchema(createAssignmentSchema, request.body)
      const result = await AssignmentService.create(assignmentData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/assignments - List assignments
  fastify.get('/', {
    schema: { description: 'Get all assignments', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const result = await AssignmentService.findAll(request.query, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get assignments error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/assignments/:id - Get assignment by ID
  fastify.get('/:id', {
    schema: { description: 'Get assignment by ID', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await AssignmentService.findById(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // PUT /api/assignments/:id - Update assignment
  fastify.put('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Update assignment by ID', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = validateSchema(updateAssignmentSchema, request.body)
      const result = await AssignmentService.update(parseInt(id), updateData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // DELETE /api/assignments/:id - Delete assignment
  fastify.delete('/:id', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Delete assignment by ID', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await AssignmentService.delete(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // POST /api/assignments/:id/submit - Submit assignment
  fastify.post('/:id/submit', {
    schema: { description: 'Submit assignment', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const submissionData = validateSchema(submitAssignmentSchema, request.body)
      const result = await AssignmentService.submitAssignment(parseInt(id), request.userId, submissionData, request.language)
      return reply.code(201).send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Submit assignment error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // POST /api/assignments/submissions/:submissionId/grade - Grade submission
  fastify.post('/submissions/:submissionId/grade', {
    preHandler: [requirePermissions(['admin', 'course_management', 'facilitator'])],
    schema: { description: 'Grade assignment submission', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { submissionId } = request.params
      const gradeData = validateSchema(gradeAssignmentSchema, request.body)
      const result = await AssignmentService.gradeSubmission(parseInt(submissionId), gradeData, request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Grade submission error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })

  // GET /api/assignments/:id/stats - Get assignment statistics
  fastify.get('/:id/stats', {
    preHandler: [requirePermissions(['admin', 'course_management'])],
    schema: { description: 'Get assignment statistics', tags: ['Assignments'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const result = await AssignmentService.getStatistics(parseInt(id), request.language)
      return reply.send(result)
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get assignment statistics error:', error)
      throw createLocalizedError('error.internal_server_error', request.language, 500)
    }
  })
}
