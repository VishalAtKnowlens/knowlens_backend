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
    
    // Connect to database
    await connectDatabase()
    
    // Register all plugins (CORS, security, JWT, etc.)
    await registerAllPlugins(fastify)
    
    // Add global language detection hook
    fastify.addHook('preHandler', detectLanguage)
    
    // Register API routes
    await fastify.register(apiRoutes, { prefix: '/api' })
    
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
    console.log("address",address);
    
    // Setup periodic cleanup of expired tokens
    if (config.nodeEnv === 'production') {
      // Run cleanup every hour
      setInterval(cleanupExpiredTokens, 60 * 60 * 1000)
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
  
  try {
    await fastify.close()
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

/**
 * Build function for testing
 */
export async function build(opts = {}) {
  const app = Fastify({
    logger: opts.logger !== undefined ? opts.logger : false,
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: true,
        coerceTypes: 'array'
      }
    },
    trustProxy: true
  })

  try {
    // Connect to database
    await connectDatabase()
    
    // Register all plugins (CORS, security, JWT, etc.)
    await registerAllPlugins(app)
    
    // Add global language detection hook
    app.addHook('preHandler', detectLanguage)
    
    // Register API routes
    await app.register(apiRoutes, { prefix: '/api' })
    
    app.setNotFoundHandler((request, reply) => {
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

    return app
  } catch (error) {
    console.error('❌ Failed to build app:', error)
    throw error
  }
}

// Start the server only if this file is run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('src/server.js') || process.argv[1].endsWith('src\\server.js')) {
  initializeServer()
}

export default fastify
