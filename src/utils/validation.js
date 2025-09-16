import { z } from 'zod'

// Common validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email format')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long')

// Language validation
export const languageSchema = z.enum(['en', 'es', 'fr'], {
  errorMap: () => ({ message: 'Language must be one of: en, es, fr' })
})

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  organisationId: uuidSchema,
  language: languageSchema.optional()
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

// User schemas
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  language: languageSchema.optional(),
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  profilePictureUrl: z.string().url('Invalid URL format').optional()
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
})

// User management schemas
export const userSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  organisationId: z.string().min(1, 'Organization ID is required'),
  language: languageSchema.optional(),
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  roleIds: z.array(z.string()).optional()
})

export const adminUpdateUserSchema = z.object({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  language: languageSchema.optional(),
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional()
})

// Organization schemas
export const createOrganisationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200, 'Organization name too long'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  logoUrl: z.string().url('Invalid URL format').optional(),
  language: languageSchema.optional()
})

export const updateOrganisationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200, 'Organization name too long').optional(),
  logoUrl: z.string().url('Invalid URL format').optional(),
  language: languageSchema.optional()
})

// Role schemas
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100, 'Role name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required')
})

export const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100, 'Role name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  permissions: z.array(z.string()).optional()
})

export const assignRoleSchema = z.object({
  userId: uuidSchema,
  roleId: z.string() // Using cuid format
})

// Admin schemas
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  language: languageSchema.optional(),
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  roleIds: z.array(z.string()).optional()
})

export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  language: languageSchema.optional(),
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional()
})

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  ...paginationSchema.shape
})

/**
 * Validate request body with Zod schema
 * @param {Object} schema - Zod schema
 * @param {Object} data - Data to validate
 * @returns {Object} Validated data
 * @throws {Error} Validation error
 */
export function validateSchema(schema, data) {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      
      const validationError = new Error('Validation failed')
      validationError.statusCode = 400
      validationError.details = formattedErrors
      throw validationError
    }
    throw error
  }
}

/**
 * Create Fastify schema from Zod schema for automatic validation
 * @param {Object} zodSchema - Zod schema
 * @returns {Object} Fastify schema
 */
export function createFastifySchema(zodSchema) {
  // This is a simplified version - in production you might want to use
  // @fastify/type-provider-zod for better integration
  return {
    body: zodSchema,
    response: {
      400: {
        type: 'object',
        properties: {
          statusCode: { type: 'number' },
          error: { type: 'string' },
          message: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Fastify preHandler to validate request body with Zod schema
 * @param {Object} schema - Zod schema
 * @returns {Function} Fastify preHandler
 */
export function validateRequest(schema) {
  return async (request, reply) => {
    try {
      request.body = validateSchema(schema, request.body)
    } catch (error) {
      return reply.code(error.statusCode || 400).send({
        statusCode: error.statusCode || 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.details || [{ field: 'body', message: error.message }]
      })
    }
  }
}
