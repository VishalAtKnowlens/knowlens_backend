import bcrypt from 'bcrypt'
import { config } from '../config/index.js'

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  try {
    const saltRounds = config.bcryptRounds
    return await bcrypt.hash(password, saltRounds)
  } catch (error) {
    throw new Error(`Failed to hash password: ${error.message}`)
  }
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function comparePassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    throw new Error(`Failed to compare password: ${error.message}`)
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export function validatePasswordStrength(password) {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  const errors = []
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`)
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number')
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  }
}

/**
 * Calculate password strength score
 * @param {string} password - Password to evaluate
 * @returns {string} Strength level (weak, medium, strong, very-strong)
 */
function calculatePasswordStrength(password) {
  let score = 0
  
  // Length bonus
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  
  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) score -= 1 // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 1 // Common sequences
  
  if (score < 3) return 'weak'
  if (score < 5) return 'medium'
  if (score < 7) return 'strong'
  return 'very-strong'
}
