import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import { config } from '../config/index.js'

/**
 * Register CORS plugin with proper configuration
 * @param {Object} fastify - Fastify instance
 */
export async function registerCorsPlugin(fastify) {
  // CRITICAL: Register CORS before other plugins
  await fastify.register(fastifyCors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true)
      
      // Check if origin is in allowed list
      if (config.corsOrigins.includes(origin)) {
        return callback(null, true)
      }
      
      // In development, be more permissive
      if (config.nodeEnv === 'development') {
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
          return callback(null, true)
        }
      }
      
      return callback(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Origin', 
      'Accept', 
      'X-Requested-With',
      'Accept-Language',
      'Cache-Control'
    ],
    exposedHeaders: ['Set-Cookie', 'Content-Language'],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    preflightContinue: false
  })
  
  console.log('✅ CORS plugin registered with origins:', config.corsOrigins)
}

/**
 * Register Helmet security plugin
 * @param {Object} fastify - Fastify instance
 */
export async function registerHelmetPlugin(fastify) {
  await fastify.register(fastifyHelmet, {
    // Disable policies that interfere with CORS
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    
    // Security headers
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: config.nodeEnv === 'production'
    },
    
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' }
  })
  
  console.log('✅ Helmet security plugin registered')
}

/**
 * Register rate limiting plugin
 * @param {Object} fastify - Fastify instance
 */
export async function registerRateLimitPlugin(fastify) {
  await fastify.register(fastifyRateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
    skipOnError: true, // Don't count failed requests
    
    // Custom key generator for better rate limiting
    keyGenerator: (request) => {
      // Use user ID if authenticated, otherwise IP
      return request.user?.id || request.ip
    },
    
    // Skip rate limiting for certain routes in development
    skip: (request) => {
      if (config.nodeEnv === 'development') {
        return request.url.startsWith('/api/health')
      }
      return false
    },
    
    // Custom error response
    errorResponseBuilder: (request, context) => {
      const language = request.language || config.defaultLanguage
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: language === 'es' 
          ? 'Demasiadas solicitudes, inténtalo de nuevo más tarde'
          : language === 'fr'
          ? 'Trop de requêtes, veuillez réessayer plus tard'
          : 'Too many requests, please try again later',
        retryAfter: Math.round(context.ttl / 1000)
      }
    }
  })
  
  console.log(`✅ Rate limiting plugin registered (${config.rateLimit.max} requests per ${config.rateLimit.window})`)
}

/**
 * Register JWT plugin
 * @param {Object} fastify - Fastify instance
 */
export async function registerJwtPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret: config.jwt.accessSecret,
    sign: {
      expiresIn: config.jwt.accessExpiresIn,
      issuer: 'jwt-auth-backend',
      audience: 'jwt-auth-frontend'
    },
    verify: {
      issuer: 'jwt-auth-backend',
      audience: 'jwt-auth-frontend'
    },
    // Custom error messages
    messages: {
      badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
      noAuthorizationInHeaderMessage: 'Authorization header missing',
      authorizationTokenExpiredMessage: 'Authorization token expired',
      authorizationTokenInvalid: 'Authorization token is invalid'
    }
  })
  
  console.log('✅ JWT plugin registered')
}

/**
 * Register cookie plugin
 * @param {Object} fastify - Fastify instance
 */
export async function registerCookiePlugin(fastify) {
  await fastify.register(fastifyCookie, {
    secret: config.jwt.refreshSecret, // Sign cookies in production
    parseOptions: {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
      path: '/'
    }
  })
  
  console.log('✅ Cookie plugin registered')
}

/**
 * Register global error handler
 * @param {Object} fastify - Fastify instance
 */
export async function registerErrorHandler(fastify) {
  fastify.setErrorHandler(async (error, request, reply) => {
    const language = request.language || config.defaultLanguage
    
    // Log error details
    request.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      userId: request.user?.id
    })
    
    // Handle specific error types
    if (error.code === 'FST_JWT_BAD_REQUEST') {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: language === 'es' 
          ? 'Token de autorización inválido'
          : language === 'fr'
          ? 'Token d\'autorisation invalide'
          : 'Invalid authorization token'
      })
    }
    
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: language === 'es' 
          ? 'Falta el encabezado de autorización'
          : language === 'fr'
          ? 'En-tête d\'autorisation manquant'
          : 'Authorization header missing'
      })
    }
    
    // Handle validation errors
    if (error.validation) {
      const details = error.validation.map(validationError => ({
        field: validationError.instancePath.replace('/', '') || 'unknown',
        message: validationError.message
      }))
      
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: language === 'es' 
          ? 'Error de validación'
          : language === 'fr'
          ? 'Erreur de validation'
          : 'Validation error',
        details
      })
    }
    
    // Handle known HTTP errors
    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message
      })
    }
    
    // Handle database errors
    if (error.code?.startsWith('P')) { // Prisma error codes
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: language === 'es' 
          ? 'Error interno del servidor'
          : language === 'fr'
          ? 'Erreur interne du serveur'
          : 'Internal server error'
      })
    }
    
    // Default error response
    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: language === 'es' 
        ? 'Error interno del servidor'
        : language === 'fr'
        ? 'Erreur interne du serveur'
        : 'Internal server error'
    })
  })
  
  console.log('✅ Global error handler registered')
}

/**
 * Register all plugins in the correct order
 * @param {Object} fastify - Fastify instance
 */
export async function registerAllPlugins(fastify) {
  // Order is important!
  await registerCorsPlugin(fastify)    // Must be first
  await registerHelmetPlugin(fastify)  // Security headers
  await registerCookiePlugin(fastify)  // Cookie parsing
  await registerJwtPlugin(fastify)     // JWT handling
  await registerRateLimitPlugin(fastify) // Rate limiting
  await registerErrorHandler(fastify)  // Error handling
  
  console.log('✅ All plugins registered successfully')
}
