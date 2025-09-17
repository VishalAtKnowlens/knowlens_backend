import { AuthService } from '../../services/auth.js'
import { validateSchema, loginSchema, registerSchema, changePasswordSchema } from '../../utils/validation.js'
import { authenticate } from '../../middleware/auth.js'
import { detectLanguage } from '../../middleware/language.js'
import { config } from '../../config/index.js'

/**
 * Authentication routes plugin
 * @param {Object} fastify - Fastify instance
 */
export default async function authRoutes(fastify) {
  // Add language detection to all auth routes
  fastify.addHook('preHandler', detectLanguage)
  
  /**
   * POST /api/auth/register
   * Register a new user
   */
  fastify.post('/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'organisationId'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          organisationId: { type: 'string', format: 'uuid' },
          language: { type: 'string', enum: ['en', 'es', 'fr'] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    organisationId: { type: 'string' },
                    language: { type: 'string' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userData = validateSchema(registerSchema, request.body)
    
    const result = await AuthService.register(userData, request.language)
    
    return reply.code(201).send(result)
  })
  
  /**
   * POST /api/auth/login
   * Login user and return tokens
   */
  fastify.post('/login', {
    schema: {
      description: 'Login user and return access and refresh tokens',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                user: { 
                  type: 'object',
                  additionalProperties: true
                },
                accessToken: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const credentials = validateSchema(loginSchema, request.body)
    
    // Get device and IP information
    const deviceInfo = request.headers['user-agent'] || 'Unknown'
    const ipAddress = request.ip
    
    const result = await AuthService.login(
      credentials, 
      request.language, 
      deviceInfo, 
      ipAddress
    )
    
    // Set refresh token as httpOnly cookie
    reply.setCookie('refreshToken', result.data.refreshToken, config.cookie)
    
    // Remove refresh token from response body for security
    const { refreshToken, ...responseData } = result.data
    
    return reply.send({
      ...result,
      data: responseData
    })
  })
  
  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post('/refresh', {
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['Authentication'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  additionalProperties: true,
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    language: { type: 'string' },
                    employeeId: { type: 'string' },
                    isActive: { type: 'boolean' },
                    emailVerified: { type: 'boolean' },
                    organisationId: { type: 'string' },
                    organisation: {
                      type: 'object',
                      additionalProperties: true
                    },
                    roles: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: true
                      }
                    }
                  }
                },
                accessToken: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken

   const decodedToken = decodeURIComponent(refreshToken);
// Send decodedToken to backend
    if (!refreshToken) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: request.language === 'es' 
          ? 'Token de actualización requerido'
          : request.language === 'fr'
          ? 'Token de rafraîchissement requis'
          : 'Refresh token required'
      })
    }
    
    const deviceInfo = request.headers['user-agent'] || 'Unknown'
    const ipAddress = request.ip
    
    const result = await AuthService.refreshToken(
      decodedToken, 
      request.language, 
      deviceInfo, 
      ipAddress
    )
    
    // Set new refresh token as httpOnly cookie
    reply.setCookie('refreshToken', result.data.refreshToken, config.cookie)
    
    // Remove refresh token from response body
    const { refreshToken: newRefreshToken, ...responseData } = result.data
    
    return reply.send({
      ...result,
      data: responseData
    })
  })
  
  /**
   * POST /api/auth/logout
   * Logout user (revoke refresh token)
   */
  fastify.post('/logout', {
    schema: {
      description: 'Logout user and revoke refresh token',
      tags: ['Authentication'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const refreshToken = request.cookies.refreshToken
    
    const result = await AuthService.logout(refreshToken, request.language)
    
    // Clear refresh token cookie
    reply.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax'
    })
    
    return reply.send(result)
  })
  
  /**
   * GET /api/auth/test-user
   * Test endpoint to debug user object serialization
   */
  fastify.get('/test-user', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    // Simple test to return user data directly
    return reply.send({
      success: true,
      message: 'Test user data',
      userId: request.user.id,
      email: request.user.email,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      language: request.user.language
    })
  })

  /**
   * GET /api/auth/validate
   * Validate access token and return user data
   */
  fastify.get('/validate', {
    preHandler: [authenticate],
    schema: {
      description: 'Validate access token and return user data',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = await AuthService.validateToken(request.user.id, request.language)
    
    return reply.send(result)
  })
  
  /**
   * POST /api/auth/revoke-all
   * Revoke all refresh tokens (logout from all devices)
   */
  fastify.post('/revoke-all', {
    preHandler: [authenticate],
    schema: {
      description: 'Revoke all refresh tokens for the user (logout from all devices)',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                revokedTokens: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = await AuthService.revokeAllTokens(request.user.id, request.language)
    
    // Clear refresh token cookie
    reply.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax'
    })
    
    return reply.send(result)
  })
  
  /**
   * POST /api/auth/change-password
   * Change user password
   */
  fastify.post('/change-password', {
    preHandler: [authenticate],
    schema: {
      description: 'Change user password',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { currentPassword, newPassword } = validateSchema(changePasswordSchema, request.body)
    
    const result = await AuthService.changePassword(
      request.user.id, 
      currentPassword, 
      newPassword, 
      request.language
    )
    
    // Clear refresh token cookie since all tokens are revoked
    reply.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax'
    })
    
    return reply.send(result)
  })
  
  /**
   * GET /api/auth/sessions
   * Get user's active sessions
   */
  fastify.get('/sessions', {
    preHandler: [authenticate],
    schema: {
      description: 'Get user\'s active sessions',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                sessions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      deviceInfo: { type: 'string' },
                      ipAddress: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                      expiresAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = await AuthService.getActiveSessions(request.user.id, request.language)
    
    return reply.send(result)
  })
}
