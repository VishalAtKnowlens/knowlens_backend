import { getPreferredLanguage } from '../config/i18n.js'

/**
 * Language detection middleware - detects and sets user's preferred language
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function detectLanguage(request, reply) {
  // Get preferred language (will be determined from user, headers, etc.)
  const language = getPreferredLanguage(request, request.user)
  
  // Add language to request context
  request.language = language
  
  // Set Content-Language header in response
  reply.header('Content-Language', language)
}

/**
 * Language override middleware - allows overriding language via query parameter
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function languageOverride(request, reply) {
  const langQuery = request.query.lang || request.query.language
  
  if (langQuery && ['en', 'es', 'fr'].includes(langQuery)) {
    request.language = langQuery
    reply.header('Content-Language', langQuery)
  }
}
