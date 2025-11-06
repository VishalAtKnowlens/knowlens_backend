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
  organizationId: uuidSchema,
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
  organizationId: z.string().min(1, 'Organization ID is required'),
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
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200, 'Organization name too long'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  logoUrl: z.string().url('Invalid URL format').optional(),
  language: languageSchema.optional()
})

export const updateOrganizationSchema = z.object({
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
  roleIds: z.array(z.coerce.number().int().positive()).optional()
})

export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  language: languageSchema.optional(),
  employeeId: z.string().max(50, 'Employee ID too long').optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.coerce.number().int().positive()).optional()
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

// ==========================================
// Course schemas
// ==========================================
export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(200, 'Course name too long'),
  subtitle: z.string().max(500).optional(),
  synopsis: z.string().optional(),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  learningObjectives: z.string().optional(),
  skillsLearned: z.string().optional(),
  prerequisites: z.string().optional(),
  thumbnailUrl: z.string().url('Invalid URL format').optional(),
  promotionalVideoUrl: z.string().url('Invalid URL format').optional(),
  sampleCertificateUrl: z.string().url('Invalid URL format').optional(),
  durationInMinutes: z.coerce.number().int().min(0).default(0),
  totalHours: z.coerce.number().int().min(0).default(0),
  totalPoints: z.coerce.number().int().min(0).default(0),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  layout: z.enum(['MULTI_CLIP', 'SINGLE_PAGE']).default('MULTI_CLIP'),
  isPublished: z.boolean().default(true),
  showInCatalogue: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).default('ACTIVE'),
  categoryIds: z.array(z.coerce.number().int().positive()).optional(),
  organizationIds: z.array(z.coerce.number().int().positive()).optional()
})

export const updateCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(200, 'Course name too long').optional(),
  subtitle: z.string().max(500).optional(),
  synopsis: z.string().optional(),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  learningObjectives: z.string().optional(),
  skillsLearned: z.string().optional(),
  prerequisites: z.string().optional(),
  thumbnailUrl: z.string().url('Invalid URL format').optional(),
  promotionalVideoUrl: z.string().url('Invalid URL format').optional(),
  sampleCertificateUrl: z.string().url('Invalid URL format').optional(),
  durationInMinutes: z.coerce.number().int().min(0).optional(),
  totalHours: z.coerce.number().int().min(0).optional(),
  totalPoints: z.coerce.number().int().min(0).optional(),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens').optional(),
  layout: z.enum(['MULTI_CLIP', 'SINGLE_PAGE']).optional(),
  isPublished: z.boolean().optional(),
  showInCatalogue: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional(),
  categoryIds: z.array(z.coerce.number().int().positive()).optional(),
  organizationIds: z.array(z.coerce.number().int().positive()).optional()
})

// ==========================================
// Clip schemas
// ==========================================
export const createClipSchema = z.object({
  title: z.string().min(1, 'Clip title is required').max(200, 'Clip title too long'),
  description: z.string().optional(),
  type: z.enum(['VIDEO', 'TEXT', 'ASSIGNMENT', 'QUIZ', 'EXERCISE', 'DOCUMENT']),
  sequence: z.coerce.number().int().min(0).default(0),
  points: z.coerce.number().int().min(0).default(0),
  durationInSeconds: z.coerce.number().int().min(0).default(0),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug too long'),
  courseId: z.coerce.number().int().positive('Course ID is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).default('ACTIVE')
})

export const updateClipSchema = z.object({
  title: z.string().min(1, 'Clip title is required').max(200, 'Clip title too long').optional(),
  description: z.string().optional(),
  type: z.enum(['VIDEO', 'TEXT', 'ASSIGNMENT', 'QUIZ', 'EXERCISE', 'DOCUMENT']).optional(),
  sequence: z.coerce.number().int().min(0).optional(),
  points: z.coerce.number().int().min(0).optional(),
  durationInSeconds: z.coerce.number().int().min(0).optional(),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug too long').optional(),
  courseId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional()
})

// ==========================================
// Video schemas
// ==========================================
export const createVideoSchema = z.object({
  title: z.string().min(1, 'Video title is required').max(200, 'Video title too long'),
  description: z.string().optional(),
  thumbnailUrl: z.string().url('Invalid URL format').optional(),
  durationInSeconds: z.coerce.number().int().min(0).default(0),
  tags: z.string().optional(),
  points: z.coerce.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).default('ACTIVE'),
  sources: z.array(z.object({
    url: z.string().url('Invalid URL format'),
    language: z.string().default('en'),
    format: z.string(),
    quality: z.string(),
    sizeInMb: z.coerce.number().int().min(0).default(0)
  })).optional(),
  subtitles: z.array(z.object({
    language: z.string(),
    label: z.string(),
    url: z.string().url('Invalid URL format')
  })).optional()
})

export const updateVideoSchema = z.object({
  title: z.string().min(1, 'Video title is required').max(200, 'Video title too long').optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url('Invalid URL format').optional(),
  durationInSeconds: z.coerce.number().int().min(0).optional(),
  tags: z.string().optional(),
  points: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional()
})

export const addVideoSourceSchema = z.object({
  url: z.string().url('Invalid URL format'),
  language: z.string().default('en'),
  format: z.string().min(1, 'Format is required'),
  quality: z.string().min(1, 'Quality is required'),
  sizeInMb: z.coerce.number().int().min(0).default(0)
})

export const addVideoSubtitleSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  label: z.string().min(1, 'Label is required'),
  url: z.string().url('Invalid URL format')
})

// ==========================================
// Document schemas
// ==========================================
export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200, 'Document title too long'),
  url: z.string().url('Invalid URL format'),
  requiresConsent: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).default('ACTIVE'),
  translations: z.array(z.object({
    language: z.string(),
    title: z.string().optional(),
    url: z.string().url('Invalid URL format').optional()
  })).optional()
})

export const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200, 'Document title too long').optional(),
  url: z.string().url('Invalid URL format').optional(),
  requiresConsent: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional()
})

// ==========================================
// Content Category schemas
// ==========================================
export const createContentCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid URL format').optional(),
  language: z.string().default('en')
})

export const updateContentCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long').optional(),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid URL format').optional(),
  language: z.string().optional()
})

// ==========================================
// Quiz schemas
// ==========================================
export const createQuizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(200, 'Quiz title too long'),
  courseId: z.coerce.number().int().positive().optional(),
  clipId: z.coerce.number().int().positive().optional(),
  weightage: z.coerce.number().min(0).default(0),
  passThreshold: z.coerce.number().int().min(0).max(100).default(0),
  maxAttempts: z.coerce.number().int().min(1).default(1),
  timeLimitInMinutes: z.coerce.number().int().min(0).default(0),
  showAnalysis: z.boolean().default(true),
  randomizeQuestions: z.boolean().default(true),
  isPublished: z.boolean().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).default('ACTIVE'),
  questions: z.array(z.object({
    text: z.string().min(1, 'Question text is required'),
    type: z.enum(['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'FILL_IN_THE_BLANK', 'ESSAY', 'VIDEO_RESPONSE']).default('MULTIPLE_CHOICE'),
    points: z.coerce.number().min(0).default(1),
    sequence: z.coerce.number().int().min(0).optional(),
    supportingVideoUrl: z.string().url('Invalid URL format').optional(),
    options: z.array(z.object({
      text: z.string().min(1, 'Option text is required'),
      isCorrect: z.boolean().default(false),
      imageUrl: z.string().url('Invalid URL format').optional(),
      sequence: z.coerce.number().int().min(0).optional()
    })).optional()
  })).optional()
})

export const updateQuizSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(200, 'Quiz title too long').optional(),
  courseId: z.coerce.number().int().positive().optional(),
  clipId: z.coerce.number().int().positive().optional(),
  weightage: z.coerce.number().min(0).optional(),
  passThreshold: z.coerce.number().int().min(0).max(100).optional(),
  maxAttempts: z.coerce.number().int().min(1).optional(),
  timeLimitInMinutes: z.coerce.number().int().min(0).optional(),
  showAnalysis: z.boolean().optional(),
  randomizeQuestions: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional()
})

export const submitQuizAnswerSchema = z.object({
  questionId: z.coerce.number().int().positive('Question ID is required'),
  selectedOptionId: z.coerce.number().int().positive().optional(),
  responseText: z.string().optional()
})

// ==========================================
// Assignment schemas
// ==========================================
export const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Assignment title is required').max(200, 'Assignment title too long'),
  description: z.string().min(1, 'Description is required'),
  courseId: z.coerce.number().int().positive('Course ID is required'),
  clipId: z.coerce.number().int().positive().optional(),
  isPublished: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).default('ACTIVE'),
  translations: z.array(z.object({
    language: z.string(),
    title: z.string().optional(),
    description: z.string().optional()
  })).optional()
})

export const updateAssignmentSchema = z.object({
  title: z.string().min(1, 'Assignment title is required').max(200, 'Assignment title too long').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  courseId: z.coerce.number().int().positive().optional(),
  clipId: z.coerce.number().int().positive().optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional()
})

export const submitAssignmentSchema = z.object({
  submittedUrl: z.string().url('Invalid URL format').optional(),
  submittedText: z.string().optional()
}).refine(data => data.submittedUrl || data.submittedText, {
  message: 'Either submittedUrl or submittedText is required'
})

export const gradeAssignmentSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  comments: z.string().optional()
})

// ==========================================
// Discussion schemas
// ==========================================
export const createDiscussionSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic too long'),
  description: z.string().optional(),
  contentType: z.enum(['VIDEO', 'DOCUMENT', 'TEXT', 'ASSIGNMENT', 'QUIZ', 'EXERCISE', 'COURSE', 'CLIP']).optional(),
  contentId: z.coerce.number().int().positive().optional(),
  isPublished: z.boolean().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).default('ACTIVE')
})

export const updateDiscussionSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic too long').optional(),
  description: z.string().optional(),
  contentType: z.enum(['VIDEO', 'DOCUMENT', 'TEXT', 'ASSIGNMENT', 'QUIZ', 'EXERCISE', 'COURSE', 'CLIP']).optional(),
  contentId: z.coerce.number().int().positive().optional(),
  isPublished: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional()
})

export const createDiscussionPostSchema = z.object({
  text: z.string().min(1, 'Post text is required').max(5000, 'Post text too long'),
  parentId: z.coerce.number().int().positive().optional()
})

export const updateDiscussionPostSchema = z.object({
  text: z.string().min(1, 'Post text is required').max(5000, 'Post text too long')
})

// ==========================================
// Course Enrollment schemas
// ==========================================
export const updateEnrollmentProgressSchema = z.object({
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
  pointsEarned: z.coerce.number().int().min(0).optional(),
  isCompleted: z.boolean().optional()
})

// ==========================================
// Clip Progress schemas
// ==========================================
export const updateClipProgressSchema = z.object({
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
  timeSpentSeconds: z.coerce.number().int().min(0).optional(),
  lastPosition: z.coerce.number().int().min(0).optional(),
  isCompleted: z.boolean().optional()
})
