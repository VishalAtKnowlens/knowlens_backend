import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * CourseEnrollment service class for managing course enrollments
 */
export class CourseEnrollmentService {
  /**
   * Enroll user in a course
   */
  static async enroll(userId, courseId, language = 'en') {
    try {
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      if (!course) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }

      if (!course.isPublished) {
        throw createLocalizedError('enrollment.course_not_published', language, 400)
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      })

      if (existingEnrollment) {
        if (existingEnrollment.status === 'ACTIVE') {
          throw createLocalizedError('enrollment.already_enrolled', language, 409)
        }
        // Reactivate if previously inactive
        const reactivated = await prisma.courseEnrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            updatedAt: new Date()
          },
          include: {
            course: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbnailUrl: true,
                durationInMinutes: true,
                totalPoints: true
              }
            }
          }
        })

        return createLocalizedSuccess('enrollment.enrollment_reactivated', language, {
          enrollment: reactivated
        })
      }

      // Create new enrollment
      const enrollment = await prisma.courseEnrollment.create({
        data: {
          userId,
          courseId
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnailUrl: true,
              durationInMinutes: true,
              totalPoints: true
            }
          }
        }
      })

      return createLocalizedSuccess('enrollment.enrollment_created', language, {
        enrollment
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Enroll user error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Get user's enrollments
   */
  static async getUserEnrollments(userId, options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        isCompleted,
        sortBy = 'enrolledAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      const where = { userId }
      
      if (isCompleted !== undefined) where.isCompleted = isCompleted === 'true' || isCompleted === true
      
      const [enrollments, total] = await Promise.all([
        prisma.courseEnrollment.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            course: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbnailUrl: true,
                durationInMinutes: true,
                totalPoints: true,
                status: true,
                isPublished: true
              }
            }
          }
        }),
        prisma.courseEnrollment.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        enrollments,
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
      console.error('Get user enrollments error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Get course enrollments (admin)
   */
  static async getCourseEnrollments(courseId, options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        isCompleted,
        sortBy = 'enrolledAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      const where = { courseId }
      
      if (isCompleted !== undefined) where.isCompleted = isCompleted === 'true' || isCompleted === true
      
      const [enrollments, total] = await Promise.all([
        prisma.courseEnrollment.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photoUrl: true
              }
            }
          }
        }),
        prisma.courseEnrollment.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        enrollments,
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
      console.error('Get course enrollments error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Get enrollment by ID
   */
  static async findById(enrollmentId, language = 'en') {
    try {
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnailUrl: true,
              durationInMinutes: true,
              totalPoints: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true
            }
          }
        }
      })
      
      if (!enrollment) {
        throw createLocalizedError('enrollment.enrollment_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        enrollment
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Find enrollment by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update enrollment progress
   */
  static async updateProgress(enrollmentId, progressData, language = 'en') {
    try {
      const { progressPercent, pointsEarned, isCompleted } = progressData

      const existingEnrollment = await prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId }
      })
      
      if (!existingEnrollment) {
        throw createLocalizedError('enrollment.enrollment_not_found', language, 404)
      }

      const updateData = {
        updatedAt: new Date()
      }

      if (progressPercent !== undefined) {
        updateData.percentComplete = progressPercent
      }

      if (pointsEarned !== undefined) {
        updateData.pointsAchieved = pointsEarned
      }

      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted
        if (isCompleted && !existingEnrollment.completedAt) {
          updateData.completedAt = new Date()
        }
      }

      if (!existingEnrollment.isStarted) {
        updateData.isStarted = true
        updateData.startedAt = new Date()
      }
      
      const updatedEnrollment = await prisma.courseEnrollment.update({
        where: { id: enrollmentId },
        data: updateData,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('enrollment.progress_updated', language, {
        enrollment: updatedEnrollment
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update enrollment progress error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Unenroll user from course
   */
  static async unenroll(enrollmentId, language = 'en') {
    try {
      const existingEnrollment = await prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId }
      })
      
      if (!existingEnrollment) {
        throw createLocalizedError('enrollment.enrollment_not_found', language, 404)
      }
      
      await prisma.courseEnrollment.delete({
        where: { id: enrollmentId }
      })
      
      return createLocalizedSuccess('enrollment.unenrolled', language)
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Unenroll user error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get enrollment statistics
   */
  static async getStatistics(courseId, language = 'en') {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      if (!course) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }

      const [
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        avgProgress,
        avgPoints
      ] = await Promise.all([
        prisma.courseEnrollment.count({
          where: { courseId }
        }),
        prisma.courseEnrollment.count({
          where: { courseId }
        }),
        prisma.courseEnrollment.count({
          where: { courseId, isCompleted: true }
        }),
        prisma.courseEnrollment.aggregate({
          where: { courseId },
          _avg: {
            percentComplete: true
          }
        }),
        prisma.courseEnrollment.aggregate({
          where: { courseId },
          _avg: {
            pointsAchieved: true
          }
        })
      ])

      const statistics = {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRate: totalEnrollments > 0 
          ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2) 
          : 0,
        avgProgress: avgProgress._avg.percentComplete?.toFixed(2) || 0,
        avgPoints: avgPoints._avg.pointsAchieved?.toFixed(2) || 0
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get enrollment statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
