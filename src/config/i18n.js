import i18next from 'i18next'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load translation files
const enTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'locales', 'en.json'), 'utf8')
)
const esTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'locales', 'es.json'), 'utf8')
)
const frTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'locales', 'fr.json'), 'utf8')
)

// Initialize i18next
await i18next.init({
  lng: config.defaultLanguage,
  fallbackLng: 'en',
  // debug: config.nodeEnv === 'development',
  debug: false,
  
  resources: {
    en: {
      translation: enTranslations
    },
    es: {
      translation: esTranslations
    },
    fr: {
      translation: frTranslations
    }
  },
  
  interpolation: {
    escapeValue: false // React already does escaping
  },
  
  // Return key if translation is missing
  returnKeyIfFunctionMissing: true,
  returnKeyIfFunctionMissingFromData: true
})

/**
 * Get translation for a key in specified language
 * @param {string} key - Translation key (e.g., 'auth.login_success')
 * @param {string} [language='en'] - Language code
 * @param {Object} [options={}] - Interpolation options
 * @returns {string} Translated text
 */
export function translate(key, language = 'en', options = {}) {
  return i18next.t(key, { lng: language, ...options })
}

/**
 * Get multiple translations for different keys
 * @param {Array<string>} keys - Array of translation keys
 * @param {string} [language='en'] - Language code
 * @returns {Object} Object with keys and their translations
 */
export function translateMultiple(keys, language = 'en') {
  const translations = {}
  for (const key of keys) {
    translations[key] = translate(key, language)
  }
  return translations
}

/**
 * Get all translations for a namespace
 * @param {string} namespace - Namespace (e.g., 'auth', 'validation')
 * @param {string} [language='en'] - Language code
 * @returns {Object} All translations in the namespace
 */
export function getNamespaceTranslations(namespace, language = 'en') {
  const translations = i18next.getResourceBundle(language, 'translation')
  return translations[namespace] || {}
}

/**
 * Check if language is supported
 * @param {string} language - Language code to check
 * @returns {boolean} True if language is supported
 */
export function isSupportedLanguage(language) {
  const supportedLanguages = ['en', 'es', 'fr']
  return supportedLanguages.includes(language)
}

/**
 * Get user's preferred language from various sources
 * @param {Object} request - Fastify request object
 * @param {Object} user - User object (optional)
 * @returns {string} Preferred language code
 */
export function getPreferredLanguage(request, user = null) {
  // Priority:
  // 1. User's saved language preference
  // 2. Accept-Language header
  // 3. Organization's default language
  // 4. System default language
  
  if (user?.language && isSupportedLanguage(user.language)) {
    return user.language
  }
  
  if (user?.organisation?.language && isSupportedLanguage(user.organisation.language)) {
    return user.organisation.language
  }
  
  // Parse Accept-Language header
  const acceptLanguage = request.headers['accept-language']
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, quality = 1] = lang.trim().split(';q=')
        return { code: code.split('-')[0], quality: parseFloat(quality) }
      })
      .sort((a, b) => b.quality - a.quality)
    
    for (const { code } of languages) {
      if (isSupportedLanguage(code)) {
        return code
      }
    }
  }
  
  return config.defaultLanguage
}

/**
 * Create localized error response
 * @param {string} errorKey - Error translation key
 * @param {string} language - Language code
 * @param {number} statusCode - HTTP status code
 * @param {Object} [details=null] - Additional error details
 * @returns {Object} Localized error response
 */
export function createLocalizedError(errorKey, language, statusCode = 500, details = null) {
  const message = translate(errorKey, language)
  
  const error = {
    statusCode,
    error: getHttpStatusText(statusCode),
    message
  }
  
  if (details) {
    error.details = details
  }
  
  return error
}

/**
 * Create localized success response
 * @param {string} messageKey - Success message translation key
 * @param {string} language - Language code
 * @param {Object} [data=null] - Response data
 * @returns {Object} Localized success response
 */
export function createLocalizedSuccess(messageKey, language, data = null) {
  const message = translate(messageKey, language)
  
  const response = {
    success: true,
    message
  }
  
  if (data !== null) {
    response.data = data
  }
  
  return response
}

/**
 * Get HTTP status text
 * @param {number} statusCode - HTTP status code
 * @returns {string} Status text
 */
function getHttpStatusText(statusCode) {
  const statusTexts = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  }
  
  return statusTexts[statusCode] || 'Unknown Error'
}

export default {
  translate,
  translateMultiple,
  getNamespaceTranslations,
  isSupportedLanguage,
  getPreferredLanguage,
  createLocalizedError,
  createLocalizedSuccess
}
