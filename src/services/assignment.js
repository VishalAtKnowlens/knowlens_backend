import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Assignment service class for managing assignment operations
 */
export class AssignmentService {
  /**
   * Create a new assignment
   */
  static async create(assignmentData, language = 'en') {
    try {
      const { 
        title,
        description,
        courseId,
        clipId,
        isPublished = false,
        status = 'ACTIVE',
        translations = []
      } = assignmentData

      // Validate course exists
      const course = await prisma.course.findUnique({ where: { id: courseId } })
      if (!course) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }

      // Validate clip if provided
      if (clipId) {
        const clip = await prisma.clip.findUnique({ where: { id: clipId } })
        if (!clip) {
          throw createLocalizedError('clip.clip_not_found', language, 404)
        }
      }

      const assignment = await prisma.assignment.create({
        data: {
          title,
          description,
          courseId,
          clipId,
          isPublished,
          status,
          translations: translations.length > 0 ? {
            create: translations
          } : undefined
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          clip: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          translations: true,
          _count: {
            select: {
              submissions: true
            }
          }
        }
      })

      return createLocalizedSuccess('assignment.assignment_created', language, {
        assignment
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create assignment error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all assignments with pagination and filtering
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        isPublished,
        courseId,
        clipId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      const where = {}
      
      if (status) where.status = status
      if (isPublished !== undefined) where.isPublished = isPublished === 'true' || isPublished === true
      if (courseId) where.courseId = parseInt(courseId)
      if (clipId) where.clipId = parseInt(clipId)
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      const [assignments, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            course: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            clip: {
              select: {
                id: true,
                title: true,
                slug: true
              }
            },
            _count: {
              select: {
                submissions: true
              }
            }
          }
        }),
        prisma.assignment.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        assignments,
        pagination: {
          page,
          limit: take,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      })
      
    } catch (error) {
      console.error('Find all assignments error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find assignment by ID
   */
  static async findById(assignmentId, language = 'en') {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          clip: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          translations: true,
          submissions: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            },
            orderBy: { submittedAt: 'desc' },
            take: 10
          },
          _count: {
            select: {
              submissions: true
            }
          }
        }
      })
      
      if (!assignment) {
        throw createLocalizedError('assignment.assignment_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        assignment
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Find assignment by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update assignment
   */
  static async update(assignmentId, updateData, language = 'en') {
    try {
      const existingAssignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      })
      
      if (!existingAssignment) {
        throw createLocalizedError('assignment.assignment_not_found', language, 404)
      }
      
      const updatedAssignment = await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          clip: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          _count: {
            select: {
              submissions: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('assignment.assignment_updated', language, {
        assignment: updatedAssignment
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update assignment error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete assignment (soft delete)
   */
  static async delete(assignmentId, language = 'en') {
    try {
      const existingAssignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      })
      
      if (!existingAssignment) {
        throw createLocalizedError('assignment.assignment_not_found', language, 404)
      }
      
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { 
          status: 'INACTIVE',
          isPublished: false,
          updatedAt: new Date()
        }
      })
      
      return createLocalizedSuccess('assignment.assignment_deleted', language)
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete assignment error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Submit assignment
   */
  static async submitAssignment(assignmentId, userId, submissionData, language = 'en') {
    try {
      const { submittedUrl, submittedText } = submissionData

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      })

      if (!assignment) {
        throw createLocalizedError('assignment.assignment_not_found', language, 404)
      }

      if (!assignment.isPublished) {
        throw createLocalizedError('assignment.assignment_not_published', language, 400)
      }

      // Check if already submitted
      const existingSubmission = await prisma.assignmentSubmission.findFirst({
        where: {
          assignmentId,
          userId
        }
      })

      if (existingSubmission) {
        // Update existing submission
        const updatedSubmission = await prisma.assignmentSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            submittedUrl,
            submittedText,
            updatedAt: new Date()
          }
        })

        return createLocalizedSuccess('assignment.submission_updated', language, {
          submission: updatedSubmission
        })
      }

      // Create new submission
      const submission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId,
          userId,
          submittedUrl,
          submittedText
        }
      })

      return createLocalizedSuccess('assignment.submission_created', language, {
        submission
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Submit assignment error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Grade assignment submission
   */
  static async gradeSubmission(submissionId, gradeData, language = 'en') {
    try {
      const { score, comments } = gradeData

      const submission = await prisma.assignmentSubmission.findUnique({
        where: { id: submissionId }
      })

      if (!submission) {
        throw createLocalizedError('assignment.submission_not_found', language, 404)
      }

      const gradedSubmission = await prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score,
          comments,
          gradedAt: new Date()
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })

      return createLocalizedSuccess('assignment.submission_graded', language, {
        submission: gradedSubmission
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Grade submission error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get assignment statistics
   */
  static async getStatistics(assignmentId, language = 'en') {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId }
      })

      if (!assignment) {
        throw createLocalizedError('assignment.assignment_not_found', language, 404)
      }

      const [
        totalSubmissions,
        gradedSubmissions,
        avgScore
      ] = await Promise.all([
        prisma.assignmentSubmission.count({
          where: { assignmentId }
        }),
        prisma.assignmentSubmission.count({
          where: {
            assignmentId,
            gradedAt: { not: null }
          }
        }),
        prisma.assignmentSubmission.aggregate({
          where: {
            assignmentId,
            score: { not: null }
          },
          _avg: {
            score: true
          }
        })
      ])

      const statistics = {
        totalSubmissions,
        gradedSubmissions,
        pendingGrading: totalSubmissions - gradedSubmissions,
        avgScore: avgScore._avg.score?.toFixed(2) || 0
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get assignment statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
