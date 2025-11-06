import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Video service class for managing video operations
 */
export class VideoService {
  /**
   * Create a new video
   * @param {Object} videoData - Video data
   * @param {string} language - Language for response
   * @returns {Object} Created video
   */
  static async create(videoData, language = 'en') {
    try {
      const { 
        title,
        description,
        thumbnailUrl,
        durationInSeconds = 0,
        tags,
        points = 0,
        isPublished = true,
        status = 'ACTIVE',
        sources = [],
        subtitles = []
      } = videoData

      // Create video with sources and subtitles
      const video = await prisma.video.create({
        data: {
          title,
          description,
          thumbnailUrl,
          durationInSeconds,
          tags,
          points,
          isPublished,
          status,
          sources: sources.length > 0 ? {
            create: sources
          } : undefined,
          subtitles: subtitles.length > 0 ? {
            create: subtitles
          } : undefined
        },
        include: {
          sources: true,
          subtitles: true,
          _count: {
            select: {
              quizzes: true
            }
          }
        }
      })

      return createLocalizedSuccess('video.video_created', language, {
        video
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create video error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all videos with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Videos list with pagination
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        isPublished,
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
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Get videos with pagination
      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            sources: true,
            subtitles: true,
            _count: {
              select: {
                quizzes: true
              }
            }
          }
        }),
        prisma.video.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        videos,
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
      console.error('Find all videos error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find video by ID
   * @param {number} videoId - Video ID
   * @param {string} language - Language for response
   * @returns {Object} Video data
   */
  static async findById(videoId, language = 'en') {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          sources: {
            orderBy: { createdAt: 'asc' }
          },
          subtitles: {
            orderBy: { language: 'asc' }
          },
          quizzes: {
            include: {
              quiz: {
                select: {
                  id: true,
                  title: true,
                  status: true
                }
              }
            },
            orderBy: { timestampInSeconds: 'asc' }
          },
          _count: {
            select: {
              quizzes: true
            }
          }
        }
      })
      
      if (!video) {
        throw createLocalizedError('video.video_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        video
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find video by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update video
   * @param {number} videoId - Video ID
   * @param {Object} updateData - Data to update
   * @param {string} language - Language for response
   * @returns {Object} Updated video
   */
  static async update(videoId, updateData, language = 'en') {
    try {
      // Check if video exists
      const existingVideo = await prisma.video.findUnique({
        where: { id: videoId }
      })
      
      if (!existingVideo) {
        throw createLocalizedError('video.video_not_found', language, 404)
      }
      
      // Update video
      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          sources: true,
          subtitles: true,
          _count: {
            select: {
              quizzes: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('video.video_updated', language, {
        video: updatedVideo
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update video error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete video (soft delete)
   * @param {number} videoId - Video ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(videoId, language = 'en') {
    try {
      // Check if video exists
      const existingVideo = await prisma.video.findUnique({
        where: { id: videoId }
      })
      
      if (!existingVideo) {
        throw createLocalizedError('video.video_not_found', language, 404)
      }
      
      // Soft delete video
      await prisma.video.update({
        where: { id: videoId },
        data: { 
          status: 'INACTIVE',
          isPublished: false,
          updatedAt: new Date()
        }
      })
      
      return createLocalizedSuccess('video.video_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete video error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Add video source
   * @param {number} videoId - Video ID
   * @param {Object} sourceData - Source data
   * @param {string} language - Language for response
   * @returns {Object} Created source
   */
  static async addSource(videoId, sourceData, language = 'en') {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      })

      if (!video) {
        throw createLocalizedError('video.video_not_found', language, 404)
      }

      const source = await prisma.videoSource.create({
        data: {
          videoId,
          ...sourceData
        }
      })

      return createLocalizedSuccess('video.source_added', language, {
        source
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Add video source error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Add video subtitle
   * @param {number} videoId - Video ID
   * @param {Object} subtitleData - Subtitle data
   * @param {string} language - Language for response
   * @returns {Object} Created subtitle
   */
  static async addSubtitle(videoId, subtitleData, language = 'en') {
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      })

      if (!video) {
        throw createLocalizedError('video.video_not_found', language, 404)
      }

      const subtitle = await prisma.subtitle.create({
        data: {
          videoId,
          ...subtitleData
        }
      })

      return createLocalizedSuccess('video.subtitle_added', language, {
        subtitle
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Add video subtitle error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
