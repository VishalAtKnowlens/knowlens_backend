import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Document service class for managing document operations
 */
export class DocumentService {
  /**
   * Create a new document
   * @param {Object} documentData - Document data
   * @param {string} language - Language for response
   * @returns {Object} Created document
   */
  static async create(documentData, language = 'en') {
    try {
      const { 
        title,
        url,
        requiresConsent = false,
        isPublished = true,
        status = 'ACTIVE',
        translations = []
      } = documentData

      // Create document with translations
      const document = await prisma.document.create({
        data: {
          title,
          url,
          requiresConsent,
          isPublished,
          status,
          translations: translations.length > 0 ? {
            create: translations
          } : undefined
        },
        include: {
          translations: true,
          _count: {
            select: {
              views: true
            }
          }
        }
      })

      return createLocalizedSuccess('document.document_created', language, {
        document
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create document error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all documents with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Documents list with pagination
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        isPublished,
        requiresConsent,
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

      if (requiresConsent !== undefined) {
        where.requiresConsent = requiresConsent === 'true' || requiresConsent === true
      }
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { url: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Get documents with pagination
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            translations: true,
            _count: {
              select: {
                views: true
              }
            }
          }
        }),
        prisma.document.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        documents,
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
      console.error('Find all documents error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find document by ID
   * @param {number} documentId - Document ID
   * @param {string} language - Language for response
   * @returns {Object} Document data
   */
  static async findById(documentId, language = 'en') {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          translations: true,
          views: {
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
            orderBy: { viewedAt: 'desc' },
            take: 10
          },
          _count: {
            select: {
              views: true
            }
          }
        }
      })
      
      if (!document) {
        throw createLocalizedError('document.document_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        document
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find document by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update document
   * @param {number} documentId - Document ID
   * @param {Object} updateData - Data to update
   * @param {string} language - Language for response
   * @returns {Object} Updated document
   */
  static async update(documentId, updateData, language = 'en') {
    try {
      // Check if document exists
      const existingDocument = await prisma.document.findUnique({
        where: { id: documentId }
      })
      
      if (!existingDocument) {
        throw createLocalizedError('document.document_not_found', language, 404)
      }
      
      // Update document
      const updatedDocument = await prisma.document.update({
        where: { id: documentId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          translations: true,
          _count: {
            select: {
              views: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('document.document_updated', language, {
        document: updatedDocument
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update document error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete document (soft delete)
   * @param {number} documentId - Document ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(documentId, language = 'en') {
    try {
      // Check if document exists
      const existingDocument = await prisma.document.findUnique({
        where: { id: documentId }
      })
      
      if (!existingDocument) {
        throw createLocalizedError('document.document_not_found', language, 404)
      }
      
      // Soft delete document
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          status: 'INACTIVE',
          isPublished: false,
          updatedAt: new Date()
        }
      })
      
      return createLocalizedSuccess('document.document_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete document error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Record document view
   * @param {number} documentId - Document ID
   * @param {number} userId - User ID
   * @param {string} language - Language for response
   * @returns {Object} Document view record
   */
  static async recordView(documentId, userId, language = 'en') {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        throw createLocalizedError('document.document_not_found', language, 404)
      }

      // Check if user already viewed this document
      const existingView = await prisma.documentUser.findUnique({
        where: {
          documentId_userId: {
            documentId,
            userId
          }
        }
      })

      if (existingView) {
        // Update view timestamp
        const updatedView = await prisma.documentUser.update({
          where: {
            documentId_userId: {
              documentId,
              userId
            }
          },
          data: {
            viewedAt: new Date()
          }
        })

        return createLocalizedSuccess('document.view_updated', language, {
          view: updatedView
        })
      }

      // Create new view record
      const view = await prisma.documentUser.create({
        data: {
          documentId,
          userId,
          viewedAt: new Date()
        }
      })

      return createLocalizedSuccess('document.view_recorded', language, {
        view
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Record document view error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get document statistics
   * @param {number} documentId - Document ID
   * @param {string} language - Language for response
   * @returns {Object} Document statistics
   */
  static async getStatistics(documentId, language = 'en') {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        throw createLocalizedError('document.document_not_found', language, 404)
      }

      const [
        totalViews,
        uniqueViewers,
        recentViews
      ] = await Promise.all([
        prisma.documentUser.count({
          where: { documentId }
        }),
        prisma.documentUser.count({
          where: { documentId },
          distinct: ['userId']
        }),
        prisma.documentUser.count({
          where: {
            documentId,
            viewedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })
      ])

      const statistics = {
        totalViews,
        uniqueViewers,
        recentViews
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get document statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
