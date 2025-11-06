import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Discussion service class for managing discussion operations
 */
export class DiscussionService {
  /**
   * Create a new discussion
   */
  static async create(discussionData, authorId, organizationId, language = 'en') {
    try {
      const { 
        topic,
        description,
        contentType,
        contentId,
        isPublished = true,
        status = 'ACTIVE'
      } = discussionData

      const discussion = await prisma.discussion.create({
        data: {
          topic,
          description,
          contentType,
          contentId,
          isPublished,
          status,
          authorId,
          organizationId
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true
            }
          },
          _count: {
            select: {
              posts: true
            }
          }
        }
      })

      return createLocalizedSuccess('discussion.discussion_created', language, {
        discussion
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create discussion error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all discussions with pagination and filtering
   */
  static async findAll(options = {}, organizationId, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        isPublished,
        contentType,
        contentId,
        authorId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      const where = { organizationId }
      
      if (status) where.status = status
      if (isPublished !== undefined) where.isPublished = isPublished === 'true' || isPublished === true
      if (contentType) where.contentType = contentType
      if (contentId) where.contentId = parseInt(contentId)
      if (authorId) where.authorId = parseInt(authorId)
      if (search) {
        where.OR = [
          { topic: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      const [discussions, total] = await Promise.all([
        prisma.discussion.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photoUrl: true
              }
            },
            _count: {
              select: {
                posts: true
              }
            }
          }
        }),
        prisma.discussion.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        discussions,
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
      console.error('Find all discussions error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find discussion by ID
   */
  static async findById(discussionId, language = 'en') {
    try {
      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true
            }
          },
          posts: {
            where: { parentId: null },
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  photoUrl: true
                }
              },
              replies: {
                include: {
                  author: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      photoUrl: true
                    }
                  },
                  _count: {
                    select: {
                      likes: true
                    }
                  }
                },
                orderBy: { createdAt: 'asc' }
              },
              _count: {
                select: {
                  likes: true,
                  replies: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              posts: true
            }
          }
        }
      })
      
      if (!discussion) {
        throw createLocalizedError('discussion.discussion_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        discussion
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Find discussion by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update discussion
   */
  static async update(discussionId, updateData, language = 'en') {
    try {
      const existingDiscussion = await prisma.discussion.findUnique({
        where: { id: discussionId }
      })
      
      if (!existingDiscussion) {
        throw createLocalizedError('discussion.discussion_not_found', language, 404)
      }
      
      const updatedDiscussion = await prisma.discussion.update({
        where: { id: discussionId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true
            }
          },
          _count: {
            select: {
              posts: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('discussion.discussion_updated', language, {
        discussion: updatedDiscussion
      })
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update discussion error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete discussion (soft delete)
   */
  static async delete(discussionId, language = 'en') {
    try {
      const existingDiscussion = await prisma.discussion.findUnique({
        where: { id: discussionId }
      })
      
      if (!existingDiscussion) {
        throw createLocalizedError('discussion.discussion_not_found', language, 404)
      }
      
      await prisma.discussion.update({
        where: { id: discussionId },
        data: { 
          status: 'INACTIVE',
          isPublished: false,
          updatedAt: new Date()
        }
      })
      
      return createLocalizedSuccess('discussion.discussion_deleted', language)
      
    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete discussion error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Create discussion post
   */
  static async createPost(discussionId, authorId, postData, language = 'en') {
    try {
      const { text, parentId } = postData

      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId }
      })

      if (!discussion) {
        throw createLocalizedError('discussion.discussion_not_found', language, 404)
      }

      if (!discussion.isPublished) {
        throw createLocalizedError('discussion.discussion_not_published', language, 400)
      }

      // Validate parent post if replying
      if (parentId) {
        const parentPost = await prisma.discussionPost.findUnique({
          where: { id: parentId }
        })

        if (!parentPost || parentPost.discussionId !== discussionId) {
          throw createLocalizedError('discussion.parent_post_not_found', language, 404)
        }
      }

      const post = await prisma.discussionPost.create({
        data: {
          text,
          discussionId,
          authorId,
          parentId
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true
            }
          },
          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        }
      })

      return createLocalizedSuccess('discussion.post_created', language, {
        post
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Create discussion post error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Update discussion post
   */
  static async updatePost(postId, updateData, language = 'en') {
    try {
      const existingPost = await prisma.discussionPost.findUnique({
        where: { id: postId }
      })

      if (!existingPost) {
        throw createLocalizedError('discussion.post_not_found', language, 404)
      }

      const updatedPost = await prisma.discussionPost.update({
        where: { id: postId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photoUrl: true
            }
          },
          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        }
      })

      return createLocalizedSuccess('discussion.post_updated', language, {
        post: updatedPost
      })

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Update discussion post error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Delete discussion post
   */
  static async deletePost(postId, language = 'en') {
    try {
      const existingPost = await prisma.discussionPost.findUnique({
        where: { id: postId },
        include: {
          _count: {
            select: {
              replies: true
            }
          }
        }
      })

      if (!existingPost) {
        throw createLocalizedError('discussion.post_not_found', language, 404)
      }

      if (existingPost._count.replies > 0) {
        throw createLocalizedError('discussion.cannot_delete_post_with_replies', language, 400)
      }

      await prisma.discussionPost.delete({
        where: { id: postId }
      })

      return createLocalizedSuccess('discussion.post_deleted', language)

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Delete discussion post error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Like/Unlike discussion post
   */
  static async toggleLike(postId, userId, language = 'en') {
    try {
      const post = await prisma.discussionPost.findUnique({
        where: { id: postId }
      })

      if (!post) {
        throw createLocalizedError('discussion.post_not_found', language, 404)
      }

      const existingLike = await prisma.discussionPostLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId
          }
        }
      })

      if (existingLike) {
        // Unlike
        await prisma.discussionPostLike.delete({
          where: {
            postId_userId: {
              postId,
              userId
            }
          }
        })

        return createLocalizedSuccess('discussion.post_unliked', language)
      } else {
        // Like
        await prisma.discussionPostLike.create({
          data: {
            postId,
            userId
          }
        })

        return createLocalizedSuccess('discussion.post_liked', language)
      }

    } catch (error) {
      if (error.statusCode) throw error
      console.error('Toggle like error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
