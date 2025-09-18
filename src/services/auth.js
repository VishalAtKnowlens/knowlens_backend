import { prisma } from '../config/database.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  calculateTokenExpiration
} from '../utils/jwt.js'
import { config } from '../config/index.js'
import {
  translate,
  getPreferredLanguage,
  createLocalizedError,
  createLocalizedSuccess
} from '../config/i18n.js'

/**
 * Authentication service class
 */
export class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} language - Preferred language
   * @returns {Object} Registration result
   */
  static async register(userData, language = 'en') {
    const { email, password, firstName, lastName, organisationId, language: userLanguage } = userData

    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        throw createLocalizedError('auth.email_already_exists', language, 409)
      }

      // Check if organization exists and is active
      const organization = await prisma.organization.findUnique({
        where: {
          id: organisationId,
          status: 'ACTIVE'
        }
      })

      if (!organization) {
        throw createLocalizedError('organization.organization_not_found', language, 404)
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user in database transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            organizationId: organisationId,
            language: userLanguage || organization.language || 'en'
          },
          include: {
            organization: true
          }
        })

        // Assign default user role if it exists
        const defaultRole = await tx.role.findFirst({
          where: {
            organizationId: organisationId,
            name: 'Learner'
          }
        })

        if (defaultRole) {
          await tx.userRole.create({
            data: {
              userId: user.id,
              roleId: defaultRole.id
            }
          })
        }

        return user
      })

      // Remove password from response
      const { password: _, ...userResponse } = result

      return createLocalizedSuccess('auth.registration_success', language, {
        user: userResponse
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }

      console.error('Registration error:', error)
      throw createLocalizedError('auth.registration_failed', language, 500)
    }
  }

  /**
   * Login user and generate tokens
   * @param {Object} credentials - Login credentials
   * @param {string} language - Preferred language
   * @param {string} deviceInfo - Device/browser information
   * @param {string} ipAddress - Client IP address
   * @returns {Object} Login result with tokens
   */
  static async login(credentials, language = 'en', deviceInfo = null, ipAddress = null) {
    const { email, password } = credentials

    try {
      // Find user with organization and roles
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: true,
          userRoles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        throw createLocalizedError('auth.login_failed', language, 401)
      }

      // Check if user and organization are active
      if (user.status !== 'ACTIVE') {
        throw createLocalizedError('auth.account_inactive', language, 401)
      }

      if (!user.organization || user.organization.status !== 'ACTIVE') {
        throw createLocalizedError('auth.organization_inactive', language, 401)
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password)
      if (!isPasswordValid) {
        throw createLocalizedError('auth.login_failed', language, 401)
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email
      }

      const accessToken = generateAccessToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)

      // Store refresh token in database
      const refreshTokenExpiry = calculateTokenExpiration(config.jwt.refreshExpiresIn)

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiry,
          deviceInfo,
          ipAddress
        }
      })

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      // Remove password from response and format user data safely
      const userResponse = JSON.parse(JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        language: user.language,
        employeeId: user.employeeId,
        photoUrl: user.photoUrl,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        organizationId: user.organizationId,
        organization: {
          id: user.organization?.id,
          name: user.organization?.name,
          slug: user.organization?.slug
        },
        roles: user.userRoles?.map(ur => ({
          id: ur.role?.id,
          name: ur.role?.name,
          description: ur.role?.description,
          permissions: ur.role?.permissions
        })) || []
      }))

      return createLocalizedSuccess('auth.login_success', language, {
        user: userResponse,
        accessToken,
        refreshToken
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }

      console.error('Login error:', error)
      throw createLocalizedError('auth.login_failed', language, 500)
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @param {string} language - Preferred language
   * @param {string} deviceInfo - Device/browser information
   * @param {string} ipAddress - Client IP address
   * @returns {Object} New tokens
   */
  static async refreshToken(refreshToken, language = 'en', deviceInfo = null, ipAddress = null) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken)
      // Find refresh token in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            include: {
              organization: true,
              userRoles: {
                include: {
                  role: true
                }
              }
            }
          }
        }
      })

      if (!storedToken) {
        throw createLocalizedError('auth.invalid_refresh_token', language, 401)
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.refreshToken.delete({
          where: { id: storedToken.id }
        })
        throw createLocalizedError('auth.refresh_token_expired', language, 401)
      }

      // Check if user and organization are still active
      if (storedToken.user.status !== 'ACTIVE' || storedToken.user.organization?.status !== 'ACTIVE') {
        // Revoke all tokens for inactive users
        await prisma.refreshToken.deleteMany({
          where: { userId: storedToken.user.id }
        })
        throw createLocalizedError('auth.account_inactive', language, 401)
      }

      // Generate new tokens
      const tokenPayload = {
        userId: storedToken.user.id,
        organizationId: storedToken.user.organizationId,
        email: storedToken.user.email
      }

      const newAccessToken = generateAccessToken(tokenPayload)
      const newRefreshToken = generateRefreshToken(tokenPayload)

      // Perform token rotation in transaction
      await prisma.$transaction(async (tx) => {
        // Delete old refresh token
        await tx.refreshToken.delete({
          where: { id: storedToken.id }
        })

        // Create new refresh token
        const refreshTokenExpiry = calculateTokenExpiration(config.jwt.refreshExpiresIn)
        await tx.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: storedToken.user.id,
            expiresAt: refreshTokenExpiry,
            deviceInfo,
            ipAddress
          }
        })
      })

      // Remove password from user response and format user data safely
      const userResponse = JSON.parse(JSON.stringify({
        id: storedToken.user.id,
        email: storedToken.user.email,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
        language: storedToken.user.language,
        employeeId: storedToken.user.employeeId,
        photoUrl: storedToken.user.photoUrl,
        status: storedToken.user.status,
        lastLoginAt: storedToken.user.lastLoginAt,
        isEmailVerified: storedToken.user.isEmailVerified,
        createdAt: storedToken.user.createdAt,
        updatedAt: storedToken.user.updatedAt,
        organizationId: storedToken.user.organizationId,
        organization: {
          id: storedToken.user.organization?.id,
          name: storedToken.user.organization?.name,
          slug: storedToken.user.organization?.slug
        },
        roles: storedToken.user.userRoles?.map(ur => ({
          id: ur.role?.id,
          name: ur.role?.name,
          description: ur.role?.description,
          permissions: ur.role?.permissions
        })) || []
      }))

      return createLocalizedSuccess('auth.token_refresh_success', language, {
        user: userResponse,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }

      if (error.message.includes('expired') || error.message.includes('invalid')) {
        throw createLocalizedError('auth.invalid_refresh_token', language, 401)
      }

      console.error('Token refresh error:', error)
      throw createLocalizedError('auth.token_refresh_failed', language, 500)
    }
  }

  /**
   * Logout user (revoke refresh token)
   * @param {string} refreshToken - Refresh token to revoke
   * @param {string} language - Preferred language
   * @returns {Object} Logout result
   */
  static async logout(refreshToken, language = 'en') {
    try {
      if (!refreshToken) {
        return createLocalizedSuccess('auth.logout_success', language)
      }

      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      })

      return createLocalizedSuccess('auth.logout_success', language)

    } catch (error) {
      console.error('Logout error:', error)
      // Don't fail logout even if there's an error
      return createLocalizedSuccess('auth.logout_success', language)
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   * @param {string} userId - User ID
   * @param {string} language - Preferred language
   * @returns {Object} Revocation result
   */
  static async revokeAllTokens(userId, language = 'en') {
    try {
      // Delete all refresh tokens for the user
      const result = await prisma.refreshToken.deleteMany({
        where: { userId }
      })

      return createLocalizedSuccess('auth.all_sessions_revoked', language, {
        revokedTokens: result.count
      })

    } catch (error) {
      console.error('Token revocation error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Validate access token and return user data
   * @param {string} userId - User ID from token
   * @param {string} language - Preferred language
   * @returns {Object} User validation result
   */
  static async validateToken(userId, language = 'en') {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
          status: 'ACTIVE'
        },
        include: {
          organization: true,
          userRoles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user || user.organization?.status !== 'ACTIVE') {
        throw createLocalizedError('auth.account_inactive', language, 401)
      }

      // Remove password from response
      const { password: _, ...userResponse } = user

      return createLocalizedSuccess('success.data_retrieved', language, {
        user: userResponse
      })

    } catch (error) {
      if (error.statusCode) {
        throw error
      }

      console.error('Token validation error:', error)
      throw createLocalizedError('auth.token_invalid', language, 401)
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} language - Preferred language
   * @returns {Object} Password change result
   */
  static async changePassword(userId, currentPassword, newPassword, language = 'en') {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw createLocalizedError('user.user_not_found', language, 404)
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        throw createLocalizedError('auth.password_mismatch', language, 400)
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword)

      // Update password and revoke all refresh tokens in transaction
      await prisma.$transaction(async (tx) => {
        // Update password
        await tx.user.update({
          where: { id: userId },
          data: { password: hashedNewPassword }
        })

        // Revoke all refresh tokens (force re-login on all devices)
        await tx.refreshToken.deleteMany({
          where: { userId }
        })
      })

      return createLocalizedSuccess('auth.password_changed', language)

    } catch (error) {
      if (error.statusCode) {
        throw error
      }

      console.error('Password change error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }

  /**
   * Get user's active sessions (refresh tokens)
   * @param {string} userId - User ID
   * @param {string} language - Preferred language
   * @returns {Object} Active sessions
   */
  static async getActiveSessions(userId, language = 'en') {
    try {
      const sessions = await prisma.refreshToken.findMany({
        where: {
          userId,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return createLocalizedSuccess('success.data_retrieved', language, {
        sessions
      })

    } catch (error) {
      console.error('Get sessions error:', error)
      throw createLocalizedError('error.internal_server_error', language, 500)
    }
  }
}
