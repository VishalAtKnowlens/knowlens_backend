import { prisma } from '../config/database.js'
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.js'
import { getPreferredLanguage, createLocalizedError } from '../config/i18n.js'

/**
 * Authentication middleware - verifies JWT tokens and loads user data
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      const language = getPreferredLanguage(request)
      return reply.code(401).send(
        createLocalizedError('auth.token_invalid', language, 401)
      )
    }
    
    // Verify the token
    const decoded = verifyAccessToken(token)
    
    // Load user from database with all necessary relations
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        status: 'ACTIVE'
      },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    if (!user) {
      const language = getPreferredLanguage(request)
      return reply.code(401).send(
        createLocalizedError('auth.account_inactive', language, 401)
      )
    }
    
    // Check if organization is active
    if (!user.organization || user.organization.status !== 'ACTIVE') {
      const language = getPreferredLanguage(request, user)
      return reply.code(401).send(
        createLocalizedError('auth.organization_inactive', language, 401)
      )
    }
    
    // Add user data to request
    request.user = user
    request.userPermissions = extractUserPermissions(user)
    
    // Update last login time (don't await to avoid blocking)
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(console.error)
  } catch (error) {
    const language = getPreferredLanguage(request)
    
    if (error.message.includes('expired')) {
      return reply.code(401).send(
        createLocalizedError('auth.token_expired', language, 401)
      )
    }
    
    return reply.code(401).send(
      createLocalizedError('auth.token_invalid', language, 401)
    )
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function optionalAuthenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      // No token provided, continue without authentication
      request.user = null
      request.userPermissions = []
      return
    }
    
    // Try to authenticate, but don't fail if invalid
    const decoded = verifyAccessToken(token)
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        status: 'ACTIVE'
      },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    if (user && user.organization?.status === 'ACTIVE') {
      request.user = user
      request.userPermissions = extractUserPermissions(user)
    } else {
      request.user = null
      request.userPermissions = []
    }
  } catch (error) {
    // Authentication failed, but continue without user
    request.user = null
    request.userPermissions = []
  }
}

/**
 * Role-based authorization middleware
 * @param {Array<string>} requiredPermissions - Required permissions
 * @returns {Function} Middleware function
 */
export function requirePermissions(requiredPermissions = []) {
  return async function(request, reply) {
    if (!request.user) {
      const language = getPreferredLanguage(request)
      return reply.code(401).send(
        createLocalizedError('auth.access_denied', language, 401)
      )
    }
    
    // Check if user has required permissions
    const userPermissions = request.userPermissions || []
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    )
    
    if (!hasPermission) {
      const language = getPreferredLanguage(request, request.user)
      return reply.code(403).send(
        createLocalizedError('user.insufficient_permissions', language, 403)
      )
    }
  }
}

/**
 * Organization isolation middleware - ensures data access is scoped to user's organization
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function enforceOrganizationScope(request, reply) {
  if (!request.user?.organizationId) {
    const language = getPreferredLanguage(request, request.user)
    return reply.code(401).send(
      createLocalizedError('auth.access_denied', language, 401)
    )
  }
  
  // Add organization filter to request context
  request.organizationId = request.user.organizationId
}

/**
 * Admin-only middleware
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function requireAdmin(request, reply) {
  const userPermissions = request.userPermissions || []
  
  if (!userPermissions.includes('admin') && !userPermissions.includes('*')) {
    const language = getPreferredLanguage(request, request.user)
    return reply.code(403).send(
      createLocalizedError('user.insufficient_permissions', language, 403)
    )
  }
}

/**
 * Extract user permissions from roles
 * @param {Object} user - User object with roles
 * @returns {Array<string>} Array of permission strings
 */
function extractUserPermissions(user) {
  const permissions = new Set()
  
  if (user.userRoles) {
    for (const userRole of user.userRoles) {
      if (userRole.role?.permissions) {
        const rolePermissions = Array.isArray(userRole.role.permissions) 
          ? userRole.role.permissions 
          : []
        
        for (const permission of rolePermissions) {
          permissions.add(permission)
        }
      }
    }
  }
  
  return Array.from(permissions)
}

/**
 * Validation error handler middleware
 * @param {Object} error - Error object
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function validationErrorHandler(error, request, reply) {
  if (error.validation) {
    const language = getPreferredLanguage(request, request.user)
    
    // Format validation errors
    const details = error.validation.map(validationError => ({
      field: validationError.instancePath.replace('/', '') || validationError.schemaPath.split('/').pop(),
      message: validationError.message
    }))
    
    return reply.code(400).send(
      createLocalizedError('error.validation_failed', language, 400, details)
    )
  }
  
  // Handle other errors
  if (error.statusCode && error.details) {
    const language = getPreferredLanguage(request, request.user)
    return reply.code(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.message,
      details: error.details
    })
  }
  
  throw error
}
