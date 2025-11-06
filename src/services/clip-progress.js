import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * ClipProgress service class for managing clip progress tracking
 */
export class ClipProgressService {
  /**
   * Start or update clip progress
   */
  static async updateProgress(userId, clipId, progressData, language = 'en') {
    try {
      const {
        progressPercent,
        timeSpentSeconds,
        lastPosition,
        isCompleted
      } = progressData

      // Check if clip exists
      const clip = await prisma.clip.findUnique({
        where: { id: clipId }
      })

      if (!clip) {
        throw createLocalizedError('clip.clip_not_found', language, 404)
      }

      // Check if progress exists
      const existingProgress = await prisma.clipProgress.findUnique({
        where: {
          userId_clipId: {
            userId,
            clipId
          }
        }
      })

      const updateData = {
        isStarted: true,
        updatedAt: new Date()
      }

      if (progressPercent !== undefined) {
        updateData.percentComplete = Math.min(100, Math.max(0, progressPercent))
      }

      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted
        if (isCompleted) {
          updateData.percentComplete = 100
          updateData.completedAt = new Date()
        }
      }

      let progress

      if (existingProgress) {
        // Update existing progress
        progress = await prisma.clipProgress.update({
          where: {
            userId_clipId: {
              userId,
              clipId
            }
          },
          data: updateData,
          include: {
            clip: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                durationInSeconds: true,
                points: true
              }
            }
          }
        })
      } else {
        // Create new progress
        progress = await prisma.clipProgress.create({
          data: {
            userId,
            clipId,
            ...updateData
          },
          include: {
            clip: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                durationInSeconds: true,
                points: true
              }
            }
          }
        })
      }

      return createLocalizedSuccess('progress.progress_updated', language, {
        progress
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update clip progress error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Get user's clip progress
   */
  static async getUserProgress(userId, options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        courseId,
        isCompleted,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      const where = { userId }
      
      if (isCompleted !== undefined) {
        where.isCompleted = isCompleted === 'true' || isCompleted === true
      }

      if (courseId) {
        where.clip = {
          courseId: parseInt(courseId)
        }
      }
      
      const [progressList, total] = await Promise.all([
        prisma.clipProgress.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            clip: {
              select: {
                id: true,
                title: true,
                slug: true,
                type: true,
                sequence: true,
                durationInSeconds: true,
                points: true,
                courseId: true,
                course: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                }
              }
            }
          }
        }),
        prisma.clipProgress.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        progress: progressList,
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
      console.error('Get user progress error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Get clip progress for all users (admin)
   */
  static async getClipProgress(clipId, options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        isCompleted,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      const where = { clipId }
      
      if (isCompleted !== undefined) {
        where.isCompleted = isCompleted === 'true' || isCompleted === true
      }
      
      const [progressList, total] = await Promise.all([
        prisma.clipProgress.findMany({
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
        prisma.clipProgress.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        progress: progressList,
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
      console.error('Get clip progress error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Get specific progress record
   */
  static async findByUserAndClip(userId, clipId, language = 'en') {
    try {
      const progress = await prisma.clipProgress.findUnique({
        where: {
          userId_clipId: {
            userId,
            clipId
          }
        },
        include: {
          clip: {
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              durationInSeconds: true,
              points: true,
              course: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      })
      
      if (!progress) {
        throw createLocalizedError('progress.progress_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        progress
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Find progress error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get clip statistics
   */
  static async getStatistics(clipId, language = 'en') {
    try {
      const clip = await prisma.clip.findUnique({
        where: { id: clipId }
      })

      if (!clip) {
        throw createLocalizedError('clip.clip_not_found', language, 404)
      }

      const [
        totalUsers,
        completedUsers,
        avgProgress
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
            percentComplete: true
          }
        })
      ])

      const statistics = {
        totalUsers,
        completedUsers,
        completionRate: totalUsers > 0 
          ? ((completedUsers / totalUsers) * 100).toFixed(2) 
          : 0,
        avgProgress: avgProgress._avg.percentComplete?.toFixed(2) || 0,
        avgTimeSpent: avgTimeSpent._avg.timeSpentSeconds?.toFixed(0) || 0
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get clip statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get course progress summary for user
   */
  static async getCourseProgressSummary(userId, courseId, language = 'en') {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          clips: {
            where: { status: 'ACTIVE' },
            select: { id: true, points: true }
          }
        }
      })

      if (!course) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }

      const clipIds = course.clips.map(c => c.id)
      const totalClips = clipIds.length
      const totalPoints = course.clips.reduce((sum, c) => sum + c.points, 0)

      const [completedClips, earnedPoints, progressList] = await Promise.all([
        prisma.clipProgress.count({
          where: {
            userId,
            clipId: { in: clipIds },
            isCompleted: true
          }
        }),
        prisma.clipProgress.aggregate({
          where: {
            userId,
            clipId: { in: clipIds },
            isCompleted: true
          },
          _sum: {
            pointsAchieved: true
          }
        }),
        prisma.clipProgress.findMany({
          where: {
            userId,
            clipId: { in: clipIds }
          },
          select: {
            clipId: true,
            isCompleted: true,
            percentComplete: true
          }
        })
      ])

      const progressPercent = totalClips > 0 
        ? ((completedClips / totalClips) * 100).toFixed(2)
        : 0

      const summary = {
        courseId,
        userId,
        totalClips,
        completedClips,
        progressPercent,
        totalPoints,
        earnedPoints: earnedPoints._sum.pointsAchieved || 0,
        clipProgress: progressList
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        summary
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Get course progress summary error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
