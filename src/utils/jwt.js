import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} Access token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
    issuer: 'jwt-auth-backend',
    audience: 'jwt-auth-frontend'
  })
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} Refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'jwt-auth-backend',
    audience: 'jwt-auth-frontend'
  })
}

/**
 * Verify access token
 * @param {string} token - Access token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.accessSecret, {
      issuer: 'jwt-auth-backend',
      audience: 'jwt-auth-frontend'
    })
  } catch (error) {
    throw new Error(`Invalid access token: ${error.message}`)
  }
}

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'jwt-auth-backend',
      audience: 'jwt-auth-frontend'
    })
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`)
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Calculate token expiration date
 * @param {string} expiresIn - Expiration string (e.g., '7d', '15m')
 * @returns {Date} Expiration date
 */
export function calculateTokenExpiration(expiresIn) {
  const now = new Date()
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  
  if (!match) {
    throw new Error('Invalid expiration format')
  }
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  switch (unit) {
    case 's':
      return new Date(now.getTime() + value * 1000)
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000)
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000)
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000)
    default:
      throw new Error('Invalid expiration unit')
  }
}

/**
 * Generate secure random token for refresh tokens
 * @returns {string} Random token
 */
export function generateSecureToken() {
  return jwt.sign(
    { random: Math.random().toString(36) },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  )
}
