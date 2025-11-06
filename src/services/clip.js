import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Clip service class for managing clip operations
 */
export class ClipService {
  /**
   * Create a new clip
   * @param {Object} clipData - Clip data
   * @param {string} language - Language for response
   * @returns {Object} Created clip
   */
  static async create(clipData, language = 'en') {
    try {
      const { 
        title,
        description,
        type,
        sequence = 0,
        points = 0,
        durationInSeconds = 0,
        slug,
        courseId,
        status = 'ACTIVE'
      } = clipData

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })
      
      if (!course) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }

      // Create clip
      const clip = await prisma.clip.create({
        data: {
          title,
          description,
          type,
          sequence,
          points,
          durationInSeconds,
          slug,
          courseId,
          status
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              contentSequence: true,
              progress: true,
              assignments: true,
              quizzes: true
            }
          }
        }
      })

      return createLocalizedSuccess('clip.clip_created', language, {
        clip
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create clip error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all clips with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Clips list with pagination
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        type,
        courseId,
        sortBy = 'sequence',
        sortOrder = 'asc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      // Build where clause
      const where = {}
      
      if (status) {
        where.status = status
      }
      
      if (type) {
        where.type = type
      }

      if (courseId) {
        where.courseId = parseInt(courseId)
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Get clips with pagination
      const [clips, total] = await Promise.all([
        prisma.clip.findMany({
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
            _count: {
              select: {
                contentSequence: true,
                progress: true,
                assignments: true,
                quizzes: true
              }
            }
          }
        }),
        prisma.clip.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        clips,
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
      console.error('Find all clips error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find clip by ID
   * @param {number} clipId - Clip ID
   * @param {string} language - Language for response
   * @returns {Object} Clip data
   */
  static async findById(clipId, language = 'en') {
    try {
      const clip = await prisma.clip.findUnique({
        where: { id: clipId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnailUrl: true
            }
          },
          contentSequence: {
            orderBy: { sequence: 'asc' }
          },
          highlights: {
            orderBy: { sortOrder: 'asc' }
          },
          assignments: {
            where: { status: 'ACTIVE' }
          },
          quizzes: {
            where: { status: 'ACTIVE' }
          },
          _count: {
            select: {
              contentSequence: true,
              progress: true,
              assignments: true,
              quizzes: true
            }
          }
        }
      })
      
      if (!clip) {
        throw createLocalizedError('clip.clip_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        clip
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find clip by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update clip
   * @param {number} clipId - Clip ID
   * @param {Object} updateData - Data to update
   * @param {string} language - Language for response
   * @returns {Object} Updated clip
   */
  static async update(clipId, updateData, language = 'en') {
    try {
      // Check if clip exists
      const existingClip = await prisma.clip.findUnique({
        where: { id: clipId }
      })
      
      if (!existingClip) {
        throw createLocalizedError('clip.clip_not_found', language, 404)
      }
      
      // If courseId is being updated, verify course exists
      if (updateData.courseId && updateData.courseId !== existingClip.courseId) {
        const course = await prisma.course.findUnique({
          where: { id: updateData.courseId }
        })
        
        if (!course) {
          throw createLocalizedError('course.course_not_found', language, 404)
        }
      }
      
      // Update clip
      const updatedClip = await prisma.clip.update({
        where: { id: clipId },
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
          _count: {
            select: {
              contentSequence: true,
              progress: true,
              assignments: true,
              quizzes: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('clip.clip_updated', language, {
        clip: updatedClip
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update clip error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete clip (soft delete)
   * @param {number} clipId - Clip ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(clipId, language = 'en') {
    try {
      // Check if clip exists
      const existingClip = await prisma.clip.findUnique({
        where: { id: clipId }
      })
      
      if (!existingClip) {
        throw createLocalizedError('clip.clip_not_found', language, 404)
      }
      
      // Soft delete clip
      await prisma.clip.update({
        where: { id: clipId },
        data: { 
          status: 'INACTIVE',
          updatedAt: new Date()
        }
      })
      
      return createLocalizedSuccess('clip.clip_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete clip error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get clip progress statistics
   * @param {number} clipId - Clip ID
   * @param {string} language - Language for response
   * @returns {Object} Clip progress statistics
   */
  static async getProgressStatistics(clipId, language = 'en') {
    try {
      const clip = await prisma.clip.findUnique({
        where: { id: clipId }
      })

      if (!clip) {
        throw createLocalizedError('clip.clip_not_found', language, 404)
      }

      const [
        totalProgress,
        completedProgress,
        avgProgressPercent
      ] = await Promise.all([
        prisma.clipProgress.count({
          where: { clipId }
        }),
        prisma.clipProgress.count({
          where: { clipId, isCompleted: true }
        }),
        prisma.clipProgress.aggregate({
          where: { clipId },
          _avg: {
            progressPercent: true
          }
        })
      ])

      const statistics = {
        totalUsers: totalProgress,
        completedUsers: completedProgress,
        completionRate: totalProgress > 0 
          ? ((completedProgress / totalProgress) * 100).toFixed(2) 
          : 0,
        avgProgress: avgProgressPercent._avg.progressPercent?.toFixed(2) || 0
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get clip progress statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
