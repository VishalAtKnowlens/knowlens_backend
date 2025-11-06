import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Course service class for managing course operations
 */
export class CourseService {
  /**
   * Create a new course
   * @param {Object} courseData - Course data
   * @param {string} language - Language for response
   * @returns {Object} Created course
   */
  static async create(courseData, language = 'en') {
    try {
      const { 
        name,
        subtitle,
        synopsis,
        description,
        targetAudience,
        learningObjectives,
        skillsLearned,
        prerequisites,
        thumbnailUrl,
        promotionalVideoUrl,
        sampleCertificateUrl,
        durationInMinutes = 0,
        totalHours = 0,
        totalPoints = 0,
        slug,
        layout = 'MULTI_CLIP',
        isPublished = true,
        showInCatalogue = false,
        status = 'ACTIVE',
        categoryIds = [],
        organizationIds = []
      } = courseData

      // Check if slug already exists
      const existingCourse = await prisma.course.findUnique({
        where: { slug }
      })
      
      if (existingCourse) {
        throw createLocalizedError('course.slug_already_exists', language, 409)
      }

      // Create course with relations
      const course = await prisma.course.create({
        data: {
          name,
          subtitle,
          synopsis,
          description,
          targetAudience,
          learningObjectives,
          skillsLearned,
          prerequisites,
          thumbnailUrl,
          promotionalVideoUrl,
          sampleCertificateUrl,
          durationInMinutes,
          totalHours,
          totalPoints,
          slug,
          layout,
          isPublished,
          showInCatalogue,
          status,
          categories: categoryIds.length > 0 ? {
            create: categoryIds.map(categoryId => ({
              categoryId
            }))
          } : undefined,
          organizations: organizationIds.length > 0 ? {
            create: organizationIds.map(organizationId => ({
              organizationId
            }))
          } : undefined
        },
        include: {
          categories: {
            include: {
              category: true
            }
          },
          organizations: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          },
          _count: {
            select: {
              clips: true,
              enrollments: true,
              quizzes: true,
              assignments: true
            }
          }
        }
      })

      return createLocalizedSuccess('course.course_created', language, {
        course
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create course error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all courses with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Courses list with pagination
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        isPublished,
        layout,
        categoryId,
        organizationId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      // Build where clause
      const where = {}
      
      if (status) {
        where.status = status
      }
      
      if (isPublished !== undefined) {
        where.isPublished = isPublished === 'true' || isPublished === true
      }

      if (layout) {
        where.layout = layout
      }

      if (categoryId) {
        where.categories = {
          some: {
            categoryId: parseInt(categoryId)
          }
        }
      }

      if (organizationId) {
        where.organizations = {
          some: {
            organizationId: parseInt(organizationId)
          }
        }
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { subtitle: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Get courses with pagination
      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            categories: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true
                  }
                }
              }
            },
            _count: {
              select: {
                clips: true,
                enrollments: true,
                quizzes: true,
                assignments: true
              }
            }
          }
        }),
        prisma.course.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        courses,
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
      console.error('Find all courses error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find course by ID
   * @param {number} courseId - Course ID
   * @param {string} language - Language for response
   * @returns {Object} Course data
   */
  static async findById(courseId, language = 'en') {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          clips: {
            orderBy: { sequence: 'asc' },
            include: {
              _count: {
                select: {
                  contentSequence: true,
                  progress: true
                }
              }
            }
          },
          assignments: {
            where: { status: 'ACTIVE' }
          },
          quizzes: {
            where: { status: 'ACTIVE' }
          },
          courseObjectives: {
            orderBy: { sortOrder: 'asc' }
          },
          courseFeatures: true,
          courseRoadmapSteps: true,
          courseHowItWorks: true,
          categories: {
            include: {
              category: true
            }
          },
          organizations: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          },
          relatedCourses: {
            include: {
              relatedCourse: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  thumbnailUrl: true,
                  durationInMinutes: true
                }
              }
            }
          },
          _count: {
            select: {
              clips: true,
              enrollments: true,
              quizzes: true,
              assignments: true
            }
          }
        }
      })
      
      if (!course) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        course
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find course by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update course
   * @param {number} courseId - Course ID
   * @param {Object} updateData - Data to update
   * @param {string} language - Language for response
   * @returns {Object} Updated course
   */
  static async update(courseId, updateData, language = 'en') {
    try {
      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id: courseId }
      })
      
      if (!existingCourse) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }
      
      // If slug is being updated, check for conflicts
      if (updateData.slug && updateData.slug !== existingCourse.slug) {
        const slugConflict = await prisma.course.findUnique({
          where: { slug: updateData.slug }
        })
        
        if (slugConflict) {
          throw createLocalizedError('course.slug_already_exists', language, 409)
        }
      }
      
      // Extract relation updates
      const { categoryIds, organizationIds, ...courseUpdateData } = updateData
      
      // Update course
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          ...courseUpdateData,
          updatedAt: new Date()
        },
        include: {
          categories: {
            include: {
              category: true
            }
          },
          organizations: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          },
          _count: {
            select: {
              clips: true,
              enrollments: true,
              quizzes: true,
              assignments: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('course.course_updated', language, {
        course: updatedCourse
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update course error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete course (soft delete)
   * @param {number} courseId - Course ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(courseId, language = 'en') {
    try {
      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id: courseId }
      })
      
      if (!existingCourse) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }
      
      // Soft delete course
      await prisma.course.update({
        where: { id: courseId },
        data: { 
          status: 'INACTIVE',
          isPublished: false,
          updatedAt: new Date()
        }
      })
      
      return createLocalizedSuccess('course.course_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete course error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get course statistics
   * @param {number} courseId - Course ID
   * @param {string} language - Language for response
   * @returns {Object} Course statistics
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
        totalClips,
        totalQuizzes,
        totalAssignments,
        avgQuizScore
      ] = await Promise.all([
        prisma.courseEnrollment.count({
          where: { courseId }
        }),
        prisma.courseEnrollment.count({
          where: { courseId, status: 'ACTIVE' }
        }),
        prisma.courseEnrollment.count({
          where: { courseId, isCompleted: true }
        }),
        prisma.clip.count({
          where: { courseId, status: 'ACTIVE' }
        }),
        prisma.quiz.count({
          where: { courseId, status: 'ACTIVE' }
        }),
        prisma.assignment.count({
          where: { courseId, status: 'ACTIVE' }
        }),
        prisma.quizAttempt.aggregate({
          where: {
            quiz: { courseId },
            isCompleted: true
          },
          _avg: {
            score: true
          }
        })
      ])

      const statistics = {
        enrollments: {
          total: totalEnrollments,
          active: activeEnrollments,
          completed: completedEnrollments,
          completionRate: totalEnrollments > 0 
            ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2) 
            : 0
        },
        content: {
          clips: totalClips,
          quizzes: totalQuizzes,
          assignments: totalAssignments
        },
        performance: {
          avgQuizScore: avgQuizScore._avg.score?.toFixed(2) || 0
        }
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get course statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
