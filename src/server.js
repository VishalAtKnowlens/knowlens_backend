import Fastify from 'fastify'
import { config } from './config/index.js'
import { connectDatabase, cleanupExpiredTokens } from './config/database.js'
import { registerAllPlugins } from './plugins/index.js'
import { detectLanguage } from './middleware/language.js'
import apiRoutes from './api/index.js'

// Initialize Fastify instance
const fastify = Fastify({
  logger: config.nodeEnv === 'development' 
    ? {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      }
    : {
        level: 'warn'
      },
  ajv: {
    customOptions: {
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: 'array'
    }
  },
  trustProxy: true // Enable if behind a proxy (nginx, load balancer, etc.)
})

/**
 * Initialize the server
 */
async function initializeServer() {
  try {
    console.log('🚀 Starting JWT Authentication Backend...')
    
    // Connect to database
    await connectDatabase()
    
    // Register all plugins (CORS, security, JWT, etc.)
    await registerAllPlugins(fastify)
    
    // Add global language detection hook
    fastify.addHook('preHandler', detectLanguage)
    
    // Register API routes
    await fastify.register(apiRoutes, { prefix: '/api' })
    
    // Add Swagger documentation if in development (temporarily disabled due to plugin version conflicts)
    // if (config.nodeEnv === 'development') {
    //   await fastify.register(import('fastify-swagger'), {
    //     routePrefix: '/docs',
    //     swagger: {
    //       info: {
    //         title: 'JWT Authentication Backend API',
    //         description: 'Production-ready Node.js backend API with JWT authentication, refresh tokens, multi-tenancy, and internationalization',
    //         version: '1.0.0'
    //       },
    //       host: `localhost:${config.port}`,
    //       schemes: ['http', 'https'],
    //       consumes: ['application/json'],
    //       produces: ['application/json'],
    //       securityDefinitions: {
    //         bearerAuth: {
    //           type: 'apiKey',
    //           name: 'Authorization',
    //           in: 'header',
    //           description: 'Enter: Bearer [token]'
    //         }
    //       },
    //       tags: [
    //         { name: 'System', description: 'System endpoints' },
    //         { name: 'Authentication', description: 'Authentication endpoints' },
    //         { name: 'User', description: 'User management endpoints' },
    //         { name: 'Admin', description: 'Admin management endpoints' },
    //         { name: 'Organization', description: 'Organization management endpoints' }
    //       ]
    //     },
    //     exposeRoute: true
    //   })
    //   
    //   console.log('📚 Swagger documentation available at http://localhost:' + config.port + '/docs')
    // }
    
    // Global error handler for unhandled routes
    fastify.setNotFoundHandler((request, reply) => {
      const language = request.language || config.defaultLanguage
      
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: language === 'es' 
          ? 'Ruta no encontrada'
          : language === 'fr'
          ? 'Route non trouvée'
          : 'Route not found',
        path: request.url
      })
    })
    
    // Start server
    const address = await fastify.listen({
      port: config.port,
      host: '0.0.0.0' // Listen on all interfaces
    })
    
    console.log(`✅ Server running at ${address}`)
    console.log(`🌍 Environment: ${config.nodeEnv}`)
    console.log(`🔐 CORS origins: ${config.corsOrigins.join(', ')}`)
    console.log(`🌐 Default language: ${config.defaultLanguage}`)
    console.log(`⚡ Rate limiting: ${config.rateLimit.max} requests per ${config.rateLimit.window}`)
    
    // Setup periodic cleanup of expired tokens
    if (config.nodeEnv === 'production') {
      // Run cleanup every hour
      setInterval(cleanupExpiredTokens, 60 * 60 * 1000)
      console.log('🧹 Periodic token cleanup enabled (every hour)')
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  console.log(`\\n📶 Received ${signal}, shutting down gracefully...`)
  
  try {
    await fastify.close()
    console.log('✅ Server closed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at promise:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

// Start the server
initializeServer()

export default fastify
