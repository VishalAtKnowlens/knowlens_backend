import authRoutes from './auth/index.js'
import userRoutes from './user/index.js'
import adminRoutes from './admin/index.js'
import organizationRoutes from './organization/index.js'
import divisionRoutes from './division/index.js'
import departmentRoutes from './department/index.js'
import roleAssignmentRoutes from './role-assignment/index.js'
import courseRoutes from './course/index.js'
import clipRoutes from './clip/index.js'
import videoRoutes from './video/index.js'
import documentRoutes from './document/index.js'
import contentCategoryRoutes from './content-category/index.js'
import quizRoutes from './quiz/index.js'
import assignmentRoutes from './assignment/index.js'
import discussionRoutes from './discussion/index.js'
import courseEnrollmentRoutes from './course-enrollment/index.js'
import clipProgressRoutes from './clip-progress/index.js'

/**
 * Register all API routes
 * @param {Object} fastify - Fastify instance
 */
export default async function apiRoutes(fastify) {
  // Health check endpoint
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    })
  })
  
  // API information endpoint
  fastify.get('/info', {
    schema: {
      description: 'API information',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string' },
            environment: { type: 'string' },
            features: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    return reply.send({
      name: 'JWT Authentication Backend',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Production-ready Node.js backend API with JWT authentication, refresh tokens, multi-tenancy, and internationalization',
      environment: process.env.NODE_ENV || 'development',
      features: [
        'JWT Authentication with Refresh Tokens',
        'Multi-tenancy (Organization-based)',
        'Role-based Access Control (RBAC)',
        'Internationalization (i18n)',
        'Rate Limiting',
        'CORS Support',
        'Security Headers',
        'Input Validation',
        'PostgreSQL with Prisma ORM'
      ]
    })
  })
  
  // Register route groups
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(userRoutes, { prefix: '/user' })
  await fastify.register(adminRoutes, { prefix: '/admin' })
  await fastify.register(organizationRoutes, { prefix: '/organization' })
  await fastify.register(divisionRoutes, { prefix: '/divisions' })
  await fastify.register(departmentRoutes, { prefix: '/departments' })
  await fastify.register(roleAssignmentRoutes, { prefix: '/role-assignments' })
  
  // Phase 1: Learning Content Management
  await fastify.register(courseRoutes, { prefix: '/courses' })
  await fastify.register(clipRoutes, { prefix: '/clips' })
  await fastify.register(videoRoutes, { prefix: '/videos' })
  await fastify.register(documentRoutes, { prefix: '/documents' })
  await fastify.register(contentCategoryRoutes, { prefix: '/content-categories' })
  
  // Phase 2: Assessments & Interactions
  await fastify.register(quizRoutes, { prefix: '/quizzes' })
  await fastify.register(assignmentRoutes, { prefix: '/assignments' })
  await fastify.register(discussionRoutes, { prefix: '/discussions' })
  
  // Phase 3: Progress Tracking & Enrollment
  await fastify.register(courseEnrollmentRoutes, { prefix: '/enrollments' })
  await fastify.register(clipProgressRoutes, { prefix: '/progress' })
  
  // 404 handler for API routes
  fastify.setNotFoundHandler((request, reply) => {
    const language = request.language || 'en'
    
    return reply.code(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: language === 'es' 
        ? 'Endpoint no encontrado'
        : language === 'fr'
        ? 'Point de terminaison non trouvé'
        : 'Endpoint not found',
      path: request.url
    })
  })
}
