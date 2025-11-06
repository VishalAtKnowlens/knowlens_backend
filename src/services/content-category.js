import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * ContentCategory service class for managing content category operations
 */
export class ContentCategoryService {
  /**
   * Create a new content category
   * @param {Object} categoryData - Category data
   * @param {string} language - Language for response
   * @returns {Object} Created category
   */
  static async create(categoryData, language = 'en') {
    try {
      const { 
        name,
        description,
        imageUrl,
        language: categoryLanguage = 'en'
      } = categoryData

      // Check if category name already exists
      const existingCategory = await prisma.contentCategory.findFirst({
        where: { 
          name,
          language: categoryLanguage
        }
      })
      
      if (existingCategory) {
        throw createLocalizedError('category.name_already_exists', language, 409)
      }

      // Create category
      const category = await prisma.contentCategory.create({
        data: {
          name,
          description,
          imageUrl,
          language: categoryLanguage
        },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      })

      return createLocalizedSuccess('category.category_created', language, {
        category
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create category error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all categories with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Categories list with pagination
   */
  static async findAll(options = {}, language = 'en') {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        categoryLanguage,
        sortBy = 'name',
        sortOrder = 'asc'
      } = options
      
      const skip = (page - 1) * limit
      const take = Math.min(limit, 100)
      
      // Build where clause
      const where = {}
      
      if (categoryLanguage) {
        where.language = categoryLanguage
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }
      
      // Get categories with pagination
      const [categories, total] = await Promise.all([
        prisma.contentCategory.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            courses: {
              include: {
                course: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    thumbnailUrl: true
                  }
                }
              },
              take: 5
            },
            _count: {
              select: {
                courses: true
              }
            }
          }
        }),
        prisma.contentCategory.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        categories,
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
      console.error('Find all categories error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find category by ID
   * @param {number} categoryId - Category ID
   * @param {string} language - Language for response
   * @returns {Object} Category data
   */
  static async findById(categoryId, language = 'en') {
    try {
      const category = await prisma.contentCategory.findUnique({
        where: { id: categoryId },
        include: {
          courses: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  thumbnailUrl: true,
                  durationInMinutes: true,
                  totalPoints: true,
                  isPublished: true,
                  status: true
                }
              }
            }
          },
          _count: {
            select: {
              courses: true
            }
          }
        }
      })
      
      if (!category) {
        throw createLocalizedError('category.category_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        category
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find category by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update category
   * @param {number} categoryId - Category ID
   * @param {Object} updateData - Data to update
   * @param {string} language - Language for response
   * @returns {Object} Updated category
   */
  static async update(categoryId, updateData, language = 'en') {
    try {
      // Check if category exists
      const existingCategory = await prisma.contentCategory.findUnique({
        where: { id: categoryId }
      })
      
      if (!existingCategory) {
        throw createLocalizedError('category.category_not_found', language, 404)
      }
      
      // If name is being updated, check for conflicts
      if (updateData.name && updateData.name !== existingCategory.name) {
        const nameConflict = await prisma.contentCategory.findFirst({
          where: { 
            name: updateData.name,
            language: updateData.language || existingCategory.language,
            id: { not: categoryId }
          }
        })
        
        if (nameConflict) {
          throw createLocalizedError('category.name_already_exists', language, 409)
        }
      }
      
      // Update category
      const updatedCategory = await prisma.contentCategory.update({
        where: { id: categoryId },
        data: updateData,
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('category.category_updated', language, {
        category: updatedCategory
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update category error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete category
   * @param {number} categoryId - Category ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(categoryId, language = 'en') {
    try {
      // Check if category exists
      const existingCategory = await prisma.contentCategory.findUnique({
        where: { id: categoryId },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      })
      
      if (!existingCategory) {
        throw createLocalizedError('category.category_not_found', language, 404)
      }
      
      // Check if category has courses
      if (existingCategory._count.courses > 0) {
        throw createLocalizedError('category.cannot_delete_with_courses', language, 400)
      }
      
      // Delete category
      await prisma.contentCategory.delete({
        where: { id: categoryId }
      })
      
      return createLocalizedSuccess('category.category_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete category error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Link course to category
   * @param {number} categoryId - Category ID
   * @param {number} courseId - Course ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async linkCourse(categoryId, courseId, language = 'en') {
    try {
      // Check if category exists
      const category = await prisma.contentCategory.findUnique({
        where: { id: categoryId }
      })

      if (!category) {
        throw createLocalizedError('category.category_not_found', language, 404)
      }

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      if (!course) {
        throw createLocalizedError('course.course_not_found', language, 404)
      }

      // Check if link already exists
      const existingLink = await prisma.courseCategoryLink.findUnique({
        where: {
          courseId_categoryId: {
            courseId,
            categoryId
          }
        }
      })

      if (existingLink) {
        throw createLocalizedError('category.course_already_linked', language, 409)
      }

      // Create link
      await prisma.courseCategoryLink.create({
        data: {
          courseId,
          categoryId
        }
      })

      return createLocalizedSuccess('category.course_linked', language)

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Link course to category error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Unlink course from category
   * @param {number} categoryId - Category ID
   * @param {number} courseId - Course ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async unlinkCourse(categoryId, courseId, language = 'en') {
    try {
      // Check if link exists
      const existingLink = await prisma.courseCategoryLink.findUnique({
        where: {
          courseId_categoryId: {
            courseId,
            categoryId
          }
        }
      })

      if (!existingLink) {
        throw createLocalizedError('category.course_not_linked', language, 404)
      }

      // Delete link
      await prisma.courseCategoryLink.delete({
        where: {
          courseId_categoryId: {
            courseId,
            categoryId
          }
        }
      })

      return createLocalizedSuccess('category.course_unlinked', language)

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Unlink course from category error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
