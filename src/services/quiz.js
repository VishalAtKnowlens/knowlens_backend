import { prisma } from '../config/database.js'
import { 
  createLocalizedError,
  createLocalizedSuccess 
} from '../config/i18n.js'

/**
 * Quiz service class for managing quiz operations
 */
export class QuizService {
  /**
   * Create a new quiz
   * @param {Object} quizData - Quiz data
   * @param {string} language - Language for response
   * @returns {Object} Created quiz
   */
  static async create(quizData, language = 'en') {
    try {
      const { 
        title,
        courseId,
        clipId,
        weightage = 0,
        passThreshold = 0,
        maxAttempts = 1,
        timeLimitInMinutes = 0,
        showAnalysis = true,
        randomizeQuestions = true,
        isPublished = true,
        status = 'ACTIVE',
        questions = []
      } = quizData

      // Validate course or clip exists
      if (courseId) {
        const course = await prisma.course.findUnique({ where: { id: courseId } })
        if (!course) {
          throw createLocalizedError('course.course_not_found', language, 404)
        }
      }

      if (clipId) {
        const clip = await prisma.clip.findUnique({ where: { id: clipId } })
        if (!clip) {
          throw createLocalizedError('clip.clip_not_found', language, 404)
        }
      }

      // Create quiz with questions
      const quiz = await prisma.quiz.create({
        data: {
          title,
          courseId,
          clipId,
          weightage,
          passThreshold,
          maxAttempts,
          timeLimitInMinutes,
          showAnalysis,
          randomizeQuestions,
          isPublished,
          status,
          questions: questions.length > 0 ? {
            create: questions.map((q, index) => ({
              text: q.text,
              type: q.type || 'MULTIPLE_CHOICE',
              points: q.points || 1,
              sequence: q.sequence !== undefined ? q.sequence : index,
              supportingVideoUrl: q.supportingVideoUrl,
              options: q.options ? {
                create: q.options.map((opt, optIndex) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect || false,
                  imageUrl: opt.imageUrl,
                  sequence: opt.sequence !== undefined ? opt.sequence : optIndex
                }))
              } : undefined
            }))
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
          questions: {
            include: {
              options: true
            },
            orderBy: { sequence: 'asc' }
          },
          _count: {
            select: {
              questions: true,
              attempts: true
            }
          }
        }
      })

      return createLocalizedSuccess('quiz.quiz_created', language, {
        quiz
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Create quiz error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find all quizzes with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} language - Language for response
   * @returns {Object} Quizzes list with pagination
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
      
      // Build where clause
      const where = {}
      
      if (status) {
        where.status = status
      }
      
      if (isPublished !== undefined) {
        where.isPublished = isPublished === 'true' || isPublished === true
      }

      if (courseId) {
        where.courseId = parseInt(courseId)
      }

      if (clipId) {
        where.clipId = parseInt(clipId)
      }
      
      if (search) {
        where.title = { contains: search, mode: 'insensitive' }
      }
      
      // Get quizzes with pagination
      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
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
                questions: true,
                attempts: true
              }
            }
          }
        }),
        prisma.quiz.count({ where })
      ])
      
      const totalPages = Math.ceil(total / take)
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        quizzes,
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
      console.error('Find all quizzes error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Find quiz by ID
   * @param {number} quizId - Quiz ID
   * @param {string} language - Language for response
   * @returns {Object} Quiz data
   */
  static async findById(quizId, language = 'en') {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
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
          questions: {
            include: {
              options: {
                orderBy: { sequence: 'asc' }
              }
            },
            orderBy: { sequence: 'asc' }
          },
          _count: {
            select: {
              questions: true,
              attempts: true
            }
          }
        }
      })
      
      if (!quiz) {
        throw createLocalizedError('quiz.quiz_not_found', language, 404)
      }
      
      return createLocalizedSuccess('success.data_retrieved', language, {
        quiz
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Find quiz by ID error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Update quiz
   * @param {number} quizId - Quiz ID
   * @param {Object} updateData - Data to update
   * @param {string} language - Language for response
   * @returns {Object} Updated quiz
   */
  static async update(quizId, updateData, language = 'en') {
    try {
      // Check if quiz exists
      const existingQuiz = await prisma.quiz.findUnique({
        where: { id: quizId }
      })
      
      if (!existingQuiz) {
        throw createLocalizedError('quiz.quiz_not_found', language, 404)
      }
      
      // Update quiz
      const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
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
              questions: true,
              attempts: true
            }
          }
        }
      })
      
      return createLocalizedSuccess('quiz.quiz_updated', language, {
        quiz: updatedQuiz
      })
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Update quiz error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
  
  /**
   * Delete quiz (soft delete)
   * @param {number} quizId - Quiz ID
   * @param {string} language - Language for response
   * @returns {Object} Success message
   */
  static async delete(quizId, language = 'en') {
    try {
      // Check if quiz exists
      const existingQuiz = await prisma.quiz.findUnique({
        where: { id: quizId }
      })
      
      if (!existingQuiz) {
        throw createLocalizedError('quiz.quiz_not_found', language, 404)
      }
      
      // Soft delete quiz
      await prisma.quiz.update({
        where: { id: quizId },
        data: { 
          status: 'INACTIVE',
          isPublished: false,
          updatedAt: new Date()
        }
      })
      
      return createLocalizedSuccess('quiz.quiz_deleted', language)
      
    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Delete quiz error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Start quiz attempt
   * @param {number} quizId - Quiz ID
   * @param {number} userId - User ID
   * @param {string} language - Language for response
   * @returns {Object} Quiz attempt
   */
  static async startAttempt(quizId, userId, language = 'en') {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          _count: {
            select: {
              attempts: {
                where: { userId, isCompleted: true }
              }
            }
          }
        }
      })

      if (!quiz) {
        throw createLocalizedError('quiz.quiz_not_found', language, 404)
      }

      // Check max attempts
      if (quiz.maxAttempts > 0 && quiz._count.attempts >= quiz.maxAttempts) {
        throw createLocalizedError('quiz.max_attempts_reached', language, 400)
      }

      // Create attempt
      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          userId,
          startedAt: new Date()
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              timeLimitInMinutes: true,
              randomizeQuestions: true
            }
          }
        }
      })

      return createLocalizedSuccess('quiz.attempt_started', language, {
        attempt
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Start quiz attempt error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Submit quiz answer
   * @param {number} attemptId - Attempt ID
   * @param {Object} answerData - Answer data
   * @param {string} language - Language for response
   * @returns {Object} Submitted answer
   */
  static async submitAnswer(attemptId, answerData, language = 'en') {
    try {
      const { questionId, selectedOptionId, responseText } = answerData

      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        include: { quiz: true }
      })

      if (!attempt) {
        throw createLocalizedError('quiz.attempt_not_found', language, 404)
      }

      if (attempt.isCompleted) {
        throw createLocalizedError('quiz.attempt_already_completed', language, 400)
      }

      // Get question with options
      const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: { options: true }
      })

      if (!question) {
        throw createLocalizedError('quiz.question_not_found', language, 404)
      }

      // Calculate points
      let pointsAchieved = 0
      if (selectedOptionId) {
        const selectedOption = question.options.find(opt => opt.id === selectedOptionId)
        if (selectedOption && selectedOption.isCorrect) {
          pointsAchieved = question.points
        }
      }

      // Create or update answer
      const answer = await prisma.quizAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId
          }
        },
        create: {
          attemptId,
          questionId,
          selectedOptionId,
          responseText,
          pointsAchieved
        },
        update: {
          selectedOptionId,
          responseText,
          pointsAchieved
        }
      })

      return createLocalizedSuccess('quiz.answer_submitted', language, {
        answer
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Submit quiz answer error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Complete quiz attempt
   * @param {number} attemptId - Attempt ID
   * @param {string} language - Language for response
   * @returns {Object} Completed attempt with score
   */
  static async completeAttempt(attemptId, language = 'en') {
    try {
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
          quiz: {
            include: {
              questions: true
            }
          },
          answers: true
        }
      })

      if (!attempt) {
        throw createLocalizedError('quiz.attempt_not_found', language, 404)
      }

      if (attempt.isCompleted) {
        throw createLocalizedError('quiz.attempt_already_completed', language, 400)
      }

      // Calculate total score
      const totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0)
      const achievedPoints = attempt.answers.reduce((sum, a) => sum + a.pointsAchieved, 0)
      const score = totalPoints > 0 ? (achievedPoints / totalPoints) * 100 : 0

      // Update attempt
      const completedAttempt = await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          score
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              passThreshold: true,
              showAnalysis: true
            }
          },
          answers: {
            include: {
              question: {
                include: {
                  options: true
                }
              },
              selectedOption: true
            }
          }
        }
      })

      const passed = score >= attempt.quiz.passThreshold

      return createLocalizedSuccess('quiz.attempt_completed', language, {
        attempt: completedAttempt,
        score,
        passed,
        totalPoints,
        achievedPoints
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Complete quiz attempt error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get quiz statistics
   * @param {number} quizId - Quiz ID
   * @param {string} language - Language for response
   * @returns {Object} Quiz statistics
   */
  static async getStatistics(quizId, language = 'en') {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId }
      })

      if (!quiz) {
        throw createLocalizedError('quiz.quiz_not_found', language, 404)
      }

      const [
        totalAttempts,
        completedAttempts,
        avgScore,
        passedAttempts
      ] = await Promise.all([
        prisma.quizAttempt.count({
          where: { quizId }
        }),
        prisma.quizAttempt.count({
          where: { quizId, isCompleted: true }
        }),
        prisma.quizAttempt.aggregate({
          where: { quizId, isCompleted: true },
          _avg: {
            score: true
          }
        }),
        prisma.quizAttempt.count({
          where: {
            quizId,
            isCompleted: true,
            score: {
              gte: quiz.passThreshold
            }
          }
        })
      ])

      const statistics = {
        totalAttempts,
        completedAttempts,
        passedAttempts,
        passRate: completedAttempts > 0 
          ? ((passedAttempts / completedAttempts) * 100).toFixed(2) 
          : 0,
        avgScore: avgScore._avg.score?.toFixed(2) || 0
      }

      return createLocalizedSuccess('success.data_retrieved', language, {
        statistics
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }
      
      console.error('Get quiz statistics error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
